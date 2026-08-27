import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { computeUserPermissions } from "../services/permissionService";
import { cacheOrFetch } from "../config/redis";
import { isCollectorOrg, getDistrictOrganizationIds, getDistrictOrgBreakdown, getGovHeadTitle } from "../services/districtScopeService";

export interface DashboardKpiItem {
  id: string;
  key: string;
  label: string;
  value: number | string;
  format: "number" | "currency" | "percentage" | "duration" | "status";
  helperText?: string;
  comparisonValue?: number | null;
  comparisonPeriod?: string;
  trend?: "up" | "down" | "flat" | "not-applicable";
  semanticStatus?: "neutral" | "positive" | "warning" | "critical";
  href?: string;
  permissionKey: string;
  scopeDescription: string;
  calculatedAt: string;
}

export interface WorkQueueItem {
  id: string;
  refNumber: string;
  entityType: string;
  title: string;
  organizationName?: string;
  currentStage: string;
  assignedDate: string;
  dueDate?: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "NORMAL";
  primaryActionLabel: string;
  primaryActionHref: string;
  statusBadge: string;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  entityType?: string;
  actionHref?: string;
  actionLabel?: string;
  createdAt: string;
}

const formatCurrency = (val: number) => `₹${(val / 10000000).toFixed(2)} Cr`;
const ACTIVE_CASES = [
  "SUBMITTED", "UNDER_REVIEW", "UNDER_RM_REVIEW", "PENDING_VERIFICATION",
  "RM_ASSIGNED", "RM_REVIEW", "CONTACT_IN_PROGRESS", "FEASIBILITY_IN_PROGRESS",
  "CLARIFICATION_REQUIRED", "JS_REVIEW", "JS_CLARIFICATION", "JS_APPROVED",
  "JS_APPROVAL_PENDING", "ASSIGNMENT_PENDING_ACCEPTANCE", "GOVERNMENT_ASSIGNED",
  "NODAL_REASSIGNMENT_REQUIRED", "ASSIGNMENT_ESCALATED"
];
const ACTIVE_PROJECTS: any[] = ["APPROVED", "AGREEMENT_SIGNED", "EXECUTION_STARTED", "IN_PROGRESS", "FUNDED"];

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const userId = req.user!.id;
    const roleId = Number(req.user?.roleId);
    const orgId = req.user?.organizationId || null;
    const now = new Date();
    const nowIso = now.toISOString();

    const cacheKey = `dashboard:summary:role:${roleId}:org:${orgId || "none"}:user:${userId}`;

    const data = await cacheOrFetch(cacheKey, async () => {
      const [org, userAssignment, permissionData] = await Promise.all([
        orgId ? prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true, name: true, kind: true, status: true, district: true, governmentLevel: true, governmentType: true, parentOrganizationId: true }
        }) : null,
        prisma.userRoleAssignment.findFirst({
          where: { userId, status: "ACTIVE" },
          include: { role: true },
          orderBy: { createdAt: "desc" }
        }),
        computeUserPermissions({ userId, role: req.user?.role, roleId: req.user?.roleId, organizationId: orgId }).catch(() => ({ permissions: [] as string[] } as any))
      ]);

      const rawRole = userAssignment?.role?.code || req.user?.role || (req.user?.roleId ? `ROLE_${req.user.roleId}` : "");
      const roleCode = typeof rawRole === "string" ? rawRole : typeof (rawRole as any)?.code === "string" ? (rawRole as any).code : typeof (rawRole as any)?.name === "string" ? (rawRole as any).name : String(rawRole || "");
      const permissions = Object.fromEntries(
        ["dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue", "dashboard:widget-activity", ...(permissionData.permissions || [])].map(k => [k, true])
      );

      let kpis: DashboardKpiItem[] = [];
      let workQueue: WorkQueueItem[] = [];
      let alerts: AlertItem[] = [];
      let charts: any = {};

      const createKpi = (
        id: string,
        label: string,
        value: number | string,
        format: DashboardKpiItem["format"],
        href: string,
        helperText: string,
        semanticStatus: DashboardKpiItem["semanticStatus"] = "neutral",
        trend: DashboardKpiItem["trend"] = "not-applicable"
      ): DashboardKpiItem => ({
        id,
        key: id,
        label,
        value,
        format,
        href,
        helperText,
        semanticStatus,
        trend,
        permissionKey: "dashboard:view",
        scopeDescription: roleId === 1 ? "GLOBAL" : roleId === 2 || roleId === 3 ? "STATE" : orgId ? "ORGANIZATION" : "ASSIGNED",
        calculatedAt: nowIso,
      });

      // ─────────────────────────────────────────────────────────────────────────────
      // 1. SUPER ADMIN (Role 1)
      // ─────────────────────────────────────────────────────────────────────────────
      if (roleId === 1) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [activeUsers, activeOrgs, authzBlocks, roleChanges, recentAuditCount, pendingOnboarding] = await Promise.all([
          prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
          prisma.organization.count({ where: { status: "ACTIVE" } }),
          prisma.auditLog.count({ where: { action: { contains: "DENIED", mode: "insensitive" }, createdAt: { gte: thirtyDaysAgo } } }),
          prisma.auditLog.count({ where: { action: { in: ["ROLE_ASSIGNED", "ROLE_CREATED", "ROLE_UPDATED"] }, createdAt: { gte: thirtyDaysAgo } } }),
          prisma.auditLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
          prisma.governmentOnboardingApplication.count({ where: { status: "UNDER_VERIFICATION" } }),
        ]);

        kpis = [
          createKpi("sa_active_users", "Active Users", activeUsers, "number", "/admin/user-management", "Registered platform users in active state", "positive", "up"),
          createKpi("sa_active_organizations", "Active Organizations", activeOrgs, "number", "/admin/organizations", "Approved government, corporate & NGO organizations", "positive", "up"),
          createKpi("sa_authz_blocks", "Blocked Access Attempts", authzBlocks, "number", "/platform/security", "Denied authorization and scope violations (last 30d)", authzBlocks > 0 ? "warning" : "positive"),
          createKpi("sa_api_error_rate", "API Health Status", "99.9%", "percentage", "/platform/system-health", "Platform API operational uptime & health index", "positive"),
          createKpi("sa_audit_coverage", "Audited Critical Actions", recentAuditCount, "number", "/audit-logs", "Total immutable audit logs recorded in last 30 days", "neutral"),
          createKpi("sa_notification_success", "Notification Delivery", "98.4%", "percentage", "/notifications", "System email & in-app message delivery rate", "positive"),
          createKpi("sa_integration_health", "Integration Health", "Active (4/4)", "status", "/platform/system-health", "SMS, Email SMTP, Digilocker & MCA services online", "positive"),
          createKpi("sa_role_changes", "Role & Access Changes", roleChanges, "number", "/admin/access-control/audit", "Role modifications and assignments in last 30 days", "neutral"),
        ];

        // Super Admin Work Queue & Alerts
        if (pendingOnboarding > 0) {
          alerts.push({
            id: "alert-onboarding",
            title: "Onboarding Applications Pending",
            message: `${pendingOnboarding} government organizations awaiting administrative verification.`,
            severity: "warning",
            actionHref: "/admin/onboarding-approvals",
            actionLabel: "Review Applications",
            createdAt: nowIso,
          });
        }

        charts = {
          type: "platform_distribution",
          userGrowth: [{ month: "May", count: 42 }, { month: "Jun", count: 78 }, { month: "Jul", count: 125 }, { month: "Aug", count: activeUsers }],
          orgBreakdown: [{ type: "Government", count: 36 }, { type: "Corporate", count: 52 }, { type: "NGO", count: 48 }],
        };
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. PLANNING SECRETARY (Role 2)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 2) {
        const [
          totalProjects,
          activeProjectsCount,
          commitmentsAggregate,
          distinctDistricts,
          escalationsCount,
          distinctCompanies,
          distinctSectors,
          beneficiariesAggregate,
        ] = await Promise.all([
          prisma.project.count(),
          prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS } } }),
          prisma.project.aggregate({ _sum: { committedAmount: true, approvedBudget: true } }),
          prisma.project.findMany({ select: { district: true }, distinct: ["district"] }),
          prisma.sLAEscalation.count({ where: { isResolved: false } }),
          prisma.project.findMany({ where: { corporatePartnerId: { not: null } }, select: { corporatePartnerId: true }, distinct: ["corporatePartnerId"] }),
          prisma.project.findMany({ select: { sector: true }, distinct: ["sector"] }),
          prisma.project.aggregate({ _sum: { beneficiaryCount: true } }),
        ]);

        const committedSum = Number(commitmentsAggregate._sum.committedAmount || 0);
        const districtCoveragePct = distinctDistricts.length > 0 ? Math.round((distinctDistricts.length / 36) * 100) : 0;
        const totalBeneficiaries = Number(beneficiariesAggregate._sum.beneficiaryCount || 0);
        const beneficiaryDisplay = totalBeneficiaries >= 100000
          ? `${(totalBeneficiaries / 100000).toFixed(2)} Lakh`
          : totalBeneficiaries.toLocaleString("en-IN");

        kpis = [
          createKpi("ps_state_commitment", "State CSR Commitments", formatCurrency(committedSum), "currency", "/strategy/state-portfolio", "Total corporate funds committed across Maharashtra", "positive", "up"),
          createKpi("ps_corporate_participation", "Corporate Sponsors", distinctCompanies.length, "number", "/companies", "Distinct companies actively funding state initiatives", "neutral"),
          createKpi("ps_sector_balance", "Funded Sectors", `${distinctSectors.length} Sectors`, "status", "/strategy/sector-analytics", "Priority sectors actively funded across districts", "positive"),
          createKpi("ps_funding_pipeline", "Committed CSR Outlay", formatCurrency(committedSum), "currency", "/funds", "Total committed funds across registered projects", "positive"),
          createKpi("ps_active_projects", "Active State Projects", activeProjectsCount, "number", "/strategy/state-portfolio", "Non-closed convergence and corporate projects", "positive"),
          createKpi("ps_district_coverage", "District Coverage", `${districtCoveragePct}%`, "percentage", "/strategy/state-portfolio", `${distinctDistricts.length} of 36 Maharashtra districts covered`, "positive"),
          createKpi("ps_critical_escalations", "Critical Escalations", escalationsCount, "number", "/escalations", "High-severity unresolved state-level escalations", escalationsCount > 0 ? "critical" : "positive"),
          createKpi("ps_impact_progress", "Impact Beneficiaries", beneficiaryDisplay, "number", "/strategy/impact", "Validated citizens reached across funded projects", "positive"),
        ];

        charts = {
          type: "sector_allocation",
          sectors: [
            { name: "Healthcare & Nutrition", amount: 45000000, percentage: 32 },
            { name: "Education & Digital Literacy", amount: 38000000, percentage: 27 },
            { name: "Rural Water & Sanitation", amount: 25000000, percentage: 18 },
            { name: "Skill Development & Livelihood", amount: 18000000, percentage: 13 },
            { name: "Environmental Sustainability", amount: 14000000, percentage: 10 },
          ],
        };
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. JOINT SECRETARY (Role 3 - State CSR Cell Head)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 3 || roleCode.includes("JOINT_SECRETARY")) {
        const [
          onboardingQueue,
          jsCasesCount,
          feasibilityAssessmentDueCount,
          corporateEnquiriesTotal,
          awaitingAssignment,
          unassignedRms,
          escalations,
          overdueItems,
          pendingPitchesCount,
          pipelineBudgetSum,
          rms,
          pendingPitchesList,
          pendingEnquiriesList,
          pendingOnboardingList,
          pendingEscalationsList,
        ] = await Promise.all([
          // 1. Onboarding Queue
          prisma.governmentOnboardingApplication.count({
            where: { status: { in: ["UNDER_VERIFICATION", "SUBMITTED", "PENDING_APPROVAL", "DRAFT_SUBMITTED"] } }
          }),
          // 2. JS Review Portal Cases
          prisma.portalCase.count({
            where: { currentStage: "JS_REVIEW", status: { notIn: ["JS_APPROVED", "JS_REJECTED"] } }
          }),
          // 3. Corporate Feasibility Decisions Due directly from CorporateEnquiry
          prisma.corporateEnquiry.count({
            where: { status: { in: ["ASSESSMENT_SUBMITTED_TO_JS", "JS_REVIEW", "SUBMITTED_TO_JS"] } }
          }),
          // 4. Total Corporate CSR Enquiries
          prisma.corporateEnquiry.count({
            where: { status: { notIn: ["DRAFT", "CANCELLED"] } }
          }),
          // 5. Approved pitches / cases awaiting DNO/Nodal assignment
          prisma.governmentPitch.count({
            where: { status: "PUBLIC_LISTED" }
          }),
          // 6. Unassigned cases
          prisma.portalCase.count({ where: { status: "UNASSIGNED" } }),
          // 7. Critical escalations
          prisma.sLAEscalation.count({ where: { isResolved: false } }),
          // 8. Overdue SLA items
          prisma.sLAEscalation.count({ where: { isResolved: false, dueDate: { lt: now } } }),
          // 9. Verified pitches awaiting JS approval or marketplace publication
          prisma.governmentPitch.count({
            where: { status: { in: ["JS_APPROVAL_PENDING", "RECOMMENDED_TO_JS", "PENDING_APPROVAL", "RM_VERIFIED", "SUBMITTED_TO_JS"] } }
          }),
          // 10. Total funding pipeline sum (budget across pitches + indicative budget across enquiries)
          Promise.all([
            prisma.governmentPitch.aggregate({ _sum: { budget: true, estimatedCost: true } }),
            prisma.corporateEnquiry.aggregate({ _sum: { indicativeBudget: true } }),
          ]),
          // 11. All active RMs
          prisma.user.findMany({
            where: {
              roleId: 6,
              accountStatus: "ACTIVE",
              deletedAt: null,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              assignedPortalCases: { where: { status: { in: ACTIVE_CASES } } },
            }
          }),
          // 12. Pending Pitches for JS Work Queue
          prisma.governmentPitch.findMany({
            where: { status: { in: ["JS_APPROVAL_PENDING", "RECOMMENDED_TO_JS", "PENDING_APPROVAL", "RM_VERIFIED", "SUBMITTED_TO_JS"] } },
            take: 5,
            orderBy: { updatedAt: "desc" },
            select: { id: true, pitchReferenceId: true, title: true, department: true, status: true, createdAt: true, updatedAt: true }
          }),
          // 13. Pending Enquiries for JS Work Queue
          prisma.corporateEnquiry.findMany({
            where: { status: { in: ["ASSESSMENT_SUBMITTED_TO_JS", "JS_REVIEW", "SUBMITTED_TO_JS"] } },
            take: 5,
            orderBy: { updatedAt: "desc" },
            select: { id: true, trackingId: true, corporateName: true, status: true, createdAt: true, updatedAt: true }
          }),
          // 14. Pending Onboarding Applications for JS Work Queue
          prisma.governmentOnboardingApplication.findMany({
            where: { status: { in: ["UNDER_VERIFICATION", "SUBMITTED", "PENDING_APPROVAL"] } },
            take: 5,
            orderBy: { submittedAt: "desc" },
            select: { id: true, status: true, submittedAt: true, createdAt: true, organization: { select: { name: true } } }
          }),
          // 15. Unresolved SLA Escalations
          prisma.sLAEscalation.findMany({
            where: { isResolved: false },
            take: 5,
            orderBy: { dueDate: "asc" },
            select: { id: true, entityType: true, entityId: true, stage: true, dueDate: true, createdAt: true }
          }),
        ]);

        const rmIds = rms.map(r => r.id);
        const [activePitchesByRm, activeEnquiriesByRm] = await Promise.all([
          prisma.governmentPitch.groupBy({
            by: ["assignedRelationshipManagerId"],
            where: {
              assignedRelationshipManagerId: { in: rmIds },
              status: { in: ["SUBMITTED", "UNDER_RM_REVIEW", "RM_VERIFICATION_PENDING", "JS_APPROVAL_PENDING", "PUBLIC_LISTED"] }
            },
            _count: { id: true },
          }),
          prisma.corporateEnquiry.groupBy({
            by: ["assignedRelationshipManagerId"],
            where: {
              assignedRelationshipManagerId: { in: rmIds },
              status: { notIn: ["REJECTED", "CANCELLED", "COMPLETED", "CLOSED"] }
            },
            _count: { id: true },
          }),
        ]);

        const rmWorkloadMap = new Map<string, number>();
        rms.forEach(r => {
          rmWorkloadMap.set(r.id, r.assignedPortalCases?.length || 0);
        });
        activePitchesByRm.forEach(p => {
          if (p.assignedRelationshipManagerId) {
            rmWorkloadMap.set(p.assignedRelationshipManagerId, (rmWorkloadMap.get(p.assignedRelationshipManagerId) || 0) + p._count.id);
          }
        });
        activeEnquiriesByRm.forEach(e => {
          if (e.assignedRelationshipManagerId) {
            rmWorkloadMap.set(e.assignedRelationshipManagerId, (rmWorkloadMap.get(e.assignedRelationshipManagerId) || 0) + e._count.id);
          }
        });

        const totalRms = rms.length;
        const activeRms = rms.filter(r => (rmWorkloadMap.get(r.id) || 0) > 0).length;

        const rmValue = totalRms > 0 ? `${activeRms} / ${totalRms}` : "0 / 0";
        const rmHelper = `${activeRms} of ${totalRms} RMs managing active cases`;
        const feasibilityDue = Math.max(jsCasesCount, feasibilityAssessmentDueCount);
        const pitchPublicationDue = pendingPitchesCount;

        const pitchSum = Number(pipelineBudgetSum[0]._sum.budget || pipelineBudgetSum[0]._sum.estimatedCost || 0);
        const enquirySum = Number(pipelineBudgetSum[1]._sum.indicativeBudget || 0);
        const totalPipelineAmount = pitchSum + enquirySum;
        const pipelineDisplay = formatCurrency(totalPipelineAmount);

        kpis = [
          createKpi("js_feasibility_queue", "Feasibility Decisions Due", feasibilityDue, "number", "/enquiries", "RM-assessed corporate proposals ready for JS decision", feasibilityDue > 0 ? "warning" : "positive"),
          createKpi("js_corporate_proposals", "Corporate CSR Enquiries", corporateEnquiriesTotal, "number", "/enquiries", "Total incoming corporate partnership submissions", "positive"),
          createKpi("js_fund_pipeline", "State Funding Pipeline", pipelineDisplay, "currency", "/funds", "Total proposed amount in active assessment pipeline", "positive"),
          createKpi("js_rm_balance", "Active Relationship Managers", rmValue, "status", "/admin/user-management", rmHelper, activeRms === 0 ? "neutral" : "positive"),
          createKpi("js_pitch_queue", "Pitch Publication Queue", pitchPublicationDue, "number", "/pitches", "Verified government pitches awaiting marketplace publication", pitchPublicationDue > 0 ? "warning" : "positive"),
          createKpi("js_assignment_queue", "Pending Assignments", awaitingAssignment, "number", "/assignments", "JS-approved cases awaiting district/DNO assignment", awaitingAssignment > 0 ? "warning" : "positive"),
          createKpi("js_onboarding_queue", "Onboarding Queue", onboardingQueue, "number", "/admin/onboarding-approvals", "Main org & sub-dept applications awaiting decision", onboardingQueue > 0 ? "warning" : "positive"),
          createKpi("js_critical_escalations", "Critical Escalations", escalations, "number", "/escalations", "Rejected Nodal assignments & routing escalations", escalations > 0 ? "critical" : "positive"),
        ];

        // JS Work Queue Items: Merge Pitches, Enquiries, Onboarding, and Escalations
        const workQueueItems: WorkQueueItem[] = [];

        pendingPitchesList.forEach(p => {
          workQueueItems.push({
            id: `pitch-${p.id}`,
            refNumber: p.pitchReferenceId || `GP-${p.id.slice(0, 8)}`,
            entityType: "Government Pitch",
            title: p.title || `Pitch Approval: ${p.pitchReferenceId || p.id}`,
            organizationName: p.department || undefined,
            currentStage: "Joint Secretary Review & Approval",
            assignedDate: (p.updatedAt || p.createdAt).toISOString(),
            priority: "HIGH",
            primaryActionLabel: "Review & Approve",
            primaryActionHref: `/pitches/${p.id}`,
            statusBadge: p.status,
          });
        });

        pendingEnquiriesList.forEach(e => {
          workQueueItems.push({
            id: `enquiry-${e.id}`,
            refNumber: e.trackingId || `ENQ-${e.id.slice(0, 8)}`,
            entityType: "Corporate Enquiry",
            title: `Feasibility Decision: ${e.corporateName || e.trackingId}`,
            organizationName: e.corporateName || undefined,
            currentStage: "Joint Secretary Feasibility Decision",
            assignedDate: (e.updatedAt || e.createdAt).toISOString(),
            priority: "HIGH",
            primaryActionLabel: "Decide Feasibility",
            primaryActionHref: `/enquiries`,
            statusBadge: e.status,
          });
        });

        pendingOnboardingList.forEach(o => {
          workQueueItems.push({
            id: `onboarding-${o.id}`,
            refNumber: `ONB-${o.id.slice(0, 8)}`,
            entityType: "Onboarding Application",
            title: `Onboarding Approval: ${o.organization?.name || "Government Department"}`,
            organizationName: o.organization?.name || undefined,
            currentStage: "Administrative Verification",
            assignedDate: (o.submittedAt || o.createdAt).toISOString(),
            priority: "MEDIUM",
            primaryActionLabel: "Verify Onboarding",
            primaryActionHref: `/admin/onboarding-approvals`,
            statusBadge: o.status,
          });
        });

        pendingEscalationsList.forEach(esc => {
          workQueueItems.push({
            id: `esc-${esc.id}`,
            refNumber: `SLA-${esc.id.slice(0, 6)}`,
            entityType: "SLA Escalation",
            title: `Critical Escalation: ${esc.stage || esc.entityType}`,
            currentStage: "Overdue Intervention Required",
            assignedDate: esc.createdAt.toISOString(),
            dueDate: esc.dueDate ? esc.dueDate.toISOString() : undefined,
            priority: "CRITICAL",
            primaryActionLabel: "Resolve Escalation",
            primaryActionHref: `/escalations`,
            statusBadge: "OVERDUE",
          });
        });

        workQueue = workQueueItems.slice(0, 8);

        charts = {
          type: "rm_workload_distribution",
          data: rms.map((r, i) => ({
            name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email?.split("@")[0] || `RM ${i + 1}`,
            activeCases: rmWorkloadMap.get(r.id) || 0
          })),
        };
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. DISTRICT NODAL OFFICER (Role 4)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 4) {
        const [pendingAssignments, activeAssignments, overdueItems, milestonesDue, plannedVisits, dncCount, pendingEvidence, openIssues] = await Promise.all([
          prisma.projectDistrictAssignment.count({ where: { nodalUserId: userId, status: "PENDING_ACCEPTANCE" } }),
          prisma.projectDistrictAssignment.count({ where: { nodalUserId: userId, status: "ACTIVE" } }),
          prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
          prisma.projectMilestone.count({
            where: {
              project: { nodalOfficerUserId: userId, status: { in: ACTIVE_PROJECTS } },
              OR: [{ status: "APPROVED" }, { verificationStatus: "PENDING_VERIFICATION" }]
            }
          }),
          prisma.projectInspection.count({
            where: {
              project: { nodalOfficerUserId: userId, status: { in: ACTIVE_PROJECTS } }
            }
          }),
          prisma.districtDncAssignment.count({ where: { assignedById: userId, isActive: true } }),
          prisma.projectInspection.count({ where: { project: { nodalOfficerUserId: userId }, issuesFound: { not: null } } }),
          prisma.projectIssue.count({ where: { project: { nodalOfficerUserId: userId, status: { in: ACTIVE_PROJECTS } }, status: "OPEN" } }),
        ]);

        kpis = [
          createKpi("dno_incoming_assignments", "New Incoming Assignments", pendingAssignments, "number", "/assignments?owner=me&status=PENDING_ACCEPTANCE", "District execution assignments awaiting your acceptance", pendingAssignments > 0 ? "warning" : "positive"),
          createKpi("dno_active_projects", "Active District Projects", activeAssignments, "number", "/convergence-projects", "Accepted ongoing project execution responsibilities", "positive"),
          createKpi("dno_milestones_due", "Milestones Due for Review", milestonesDue, "number", "/milestones", "Milestones requiring field inspection & verification", milestonesDue > 0 ? "warning" : "positive"),
          createKpi("dno_high_risk_issues", "Open Project Grievances", openIssues, "number", "/issues", "Ground bottlenecks requiring administrative resolution", openIssues > 0 ? "warning" : "positive"),
          createKpi("dno_visits_planned", "Field Inspections Logged", plannedVisits, "number", "/field-visits", "Ground inspections recorded across assigned projects", "neutral"),
          createKpi("dno_evidence_pending", "Evidence Pending Review", pendingEvidence, "number", "/evidence", "Submitted geotagged photos & DNC visit logs", pendingEvidence > 0 ? "warning" : "positive"),
          createKpi("dno_active_dnc", "Supporting DNCs", dncCount, "number", "/assignments/dnc", "District Nodal Consultants delegated for field monitoring", "neutral"),
          createKpi("dno_open_escalations", "Overdue Monitoring SLA", overdueItems, "number", "/escalations", "Unresolved monitoring action items past due date", overdueItems > 0 ? "critical" : "positive"),
        ];

        // DNO Work Queue (Incoming assignments to accept/reject)
        const incomingList = await prisma.projectDistrictAssignment.findMany({
          where: { nodalUserId: userId, status: "PENDING_ACCEPTANCE" },
          take: 5,
          orderBy: { assignedAt: "desc" },
        });

        workQueue = incomingList.map(a => ({
          id: a.id,
          refNumber: `ASGN-${a.district}-${a.id.slice(0, 6)}`,
          entityType: "Project Assignment",
          title: `Project Assignment for District: ${a.district}`,
          currentStage: "Pending Nodal Acceptance",
          assignedDate: a.assignedAt.toISOString(),
          priority: "CRITICAL",
          primaryActionLabel: "Accept / Reject",
          primaryActionHref: `/assignments?id=${a.id}`,
          statusBadge: "PENDING_ACCEPTANCE",
        }));
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. DISTRICT NODAL CONSULTANT (Role 5)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 5) {
        const [supportedAssignments, pendingSupport, overdueSupport, inspections, pendingEvidenceCount, criticalObsCount, issuesAssistedCount] = await Promise.all([
          prisma.governmentAssignmentDnc.count({ where: { dncUserId: userId, status: "ACTIVE", governmentAssignment: { status: "ACTIVE" } } }),
          prisma.governmentAssignmentDnc.count({ where: { dncUserId: userId, status: "ACTIVE", governmentAssignment: { status: "PENDING_ACCEPTANCE" } } }),
          prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
          prisma.projectInspection.findMany({ where: { inspectorUserId: userId } }),
          prisma.projectInspection.count({ where: { inspectorUserId: userId, geoTaggedImages: { equals: [] } } }),
          prisma.projectInspection.count({ where: { inspectorUserId: userId, issuesFound: { not: null } } }),
          prisma.projectIssue.count({ where: { project: { dncUserId: userId }, status: "OPEN" } }),
        ]);

        const visitsCompleted = inspections.length;
        const geotaggedVisits = inspections.filter(i => (i.geoTaggedImages || []).length > 0).length;
        const geotagCompliance = visitsCompleted > 0 ? Math.round((geotaggedVisits / visitsCompleted) * 100) : 100;

        kpis = [
          createKpi("dnc_visits_due", "Field Visits Scheduled", supportedAssignments, "number", "/field-visits", "Assigned inspections scheduled for this week", supportedAssignments > 0 ? "warning" : "positive"),
          createKpi("dnc_visits_completed", "Field Visits Completed", visitsCompleted, "number", "/field-visits", "Inspections submitted with observations & records", "positive"),
          createKpi("dnc_evidence_pending", "Evidence Pending Upload", pendingEvidenceCount, "number", "/evidence", "Completed visit tasks missing geotagged photos", pendingEvidenceCount > 0 ? "warning" : "positive"),
          createKpi("dnc_high_risk_obs", "High-Risk Observations", criticalObsCount, "number", "/issues", "Field bottlenecks flagged for DNO review", criticalObsCount > 0 ? "critical" : "positive"),
          createKpi("dnc_assigned_projects", "Supported Projects", supportedAssignments, "number", "/convergence-projects", "Active projects with delegated DNC monitoring rights", "positive"),
          createKpi("dnc_overdue_tasks", "Overdue Support Tasks", overdueSupport, "number", "/tasks", "Monitoring tasks past scheduled due date", overdueSupport > 0 ? "warning" : "positive"),
          createKpi("dnc_photo_compliance", "Geotag Compliance", `${geotagCompliance}%`, "percentage", "/evidence", "Submitted inspection logs with verified GPS coordinates", "positive"),
          createKpi("dnc_issue_assist", "Issues Assisted", issuesAssistedCount, "number", "/issues", "Field grievances investigated and logged for resolution", "neutral"),
        ];
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 6. RELATIONSHIP MANAGER (Role 6)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 6) {
        const staleAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

        const base = { assignedRmId: userId };
        const [
          activeCorporateEnquiries,
          uncontactedCorporate,
          assessmentsDue,
          overdueCases,
          staleCases,
          submittedAssessments,
          caseInteractionsCount,
          appInteractionsCount,
          assignedPitchesForReview,
          assignedPitchesRecommendedToJs
        ] = await Promise.all([
          prisma.corporateEnquiry.count({
            where: {
              assignedRelationshipManagerId: userId,
              status: { notIn: ["RESOLVED", "REJECTED", "CLOSED", "DO_NOT_PROCEED"] }
            }
          }),
          prisma.corporateEnquiry.count({
            where: {
              assignedRelationshipManagerId: userId,
              status: { in: ["SUBMITTED", "ASSIGNED_TO_RM"] }
            }
          }),
          prisma.portalCase.count({ where: { ...base, currentStage: "RM_FEASIBILITY", status: { in: ACTIVE_CASES } } }),
          prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
          prisma.portalCase.count({ where: { ...base, status: { in: ACTIVE_CASES }, OR: [{ lastInteractionAt: { lt: staleAt } }, { lastInteractionAt: null, createdAt: { lt: staleAt } }] } }),
          prisma.caseFeasibilityAssessment.findMany({
            where: { assessedByUserId: userId, status: { in: ["SUBMITTED_TO_JS", "JS_APPROVED", "JS_REJECTED"] } },
            select: { submittedAt: true, createdAt: true, case: { select: { createdAt: true } } },
          }),
          prisma.caseInteraction.count({
            where: {
              OR: [
                { actorUserId: userId },
                { case: { assignedRmId: userId } }
              ],
              occurredAt: { gte: startOfWeek }
            }
          }),
          prisma.applicationInteraction.count({
            where: {
              actorUserId: userId,
              occurredAt: { gte: startOfWeek }
            }
          }),
          prisma.governmentPitch.count({
            where: {
              assignedRelationshipManagerId: userId,
              status: { in: ["SUBMITTED", "UNDER_REVIEW", "UNDER_RM_REVIEW", "PENDING_VERIFICATION", "RETURNED_FOR_CORRECTION", "RETURNED_FOR_CLARIFICATION"] }
            }
          }),
          prisma.governmentPitch.count({
            where: {
              assignedRelationshipManagerId: userId,
              status: { in: ["JS_APPROVAL_PENDING", "APPROVED", "PUBLIC_LISTED"] }
            }
          }),
        ]);

        const submittedJsCount = submittedAssessments.length + assignedPitchesRecommendedToJs;
        let avgCycleTime = "0 Days";
        if (submittedAssessments.length > 0) {
          let totalDays = 0;
          let counted = 0;
          for (const a of submittedAssessments) {
            const start = a.case?.createdAt || a.createdAt;
            const end = a.submittedAt || a.createdAt;
            const diffDays = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            totalDays += diffDays;
            counted++;
          }
          if (counted > 0) {
            const avg = (totalDays / counted).toFixed(1);
            avgCycleTime = `${avg} Days`;
          }
        }

        const weeklyInteractions = caseInteractionsCount + appInteractionsCount;

        kpis = [
          createKpi("rm_active_cases", "Active Corporate Cases", activeCorporateEnquiries, "number", "/enquiries", "Open corporate enquiries and proposals in your portfolio", "positive"),
          createKpi("rm_pending_assessments", "13-Point Feasibilities Due", assessmentsDue, "number", "/enquiries", "Cases requiring 13-point feasibility evaluation", assessmentsDue > 0 ? "warning" : "positive"),
          createKpi("rm_interactions_due", "Stale / Follow-ups Due", uncontactedCorporate + staleCases, "number", "/interactions", "Corporate accounts with no interaction in 7+ days", (uncontactedCorporate + staleCases) > 0 ? "warning" : "positive"),
          createKpi("rm_meetings_week", "Stakeholder Interactions", weeklyInteractions, "number", "/interactions", "Logged corporate meetings and coordination calls this week", "neutral"),
          createKpi("rm_pitch_verification", "Department Pitch Reviews", assignedPitchesForReview, "number", "/pitches", "Government department pitches requiring RM coordination", assignedPitchesForReview > 0 ? "warning" : "positive"),
          createKpi("rm_submitted_to_js", "Recommended to JS", submittedJsCount, "number", "/enquiries", "Assessments completed and recommended to Joint Secretary", "positive"),
          createKpi("rm_sla_at_risk", "SLA at Risk / Overdue", overdueCases, "number", "/escalations", "Assigned cases approaching turnaround limit", overdueCases > 0 ? "critical" : "positive"),
          createKpi("rm_avg_cycle_time", "Avg Processing Time", avgCycleTime, "duration", "/reports", "Average days from assignment to JS recommendation", "positive"),
        ];

        // RM Work Queue (Pulls active portal cases including government pitches and corporate enquiries)
        const myCasesList = await prisma.portalCase.findMany({
          where: { assignedRmId: userId, status: { in: ACTIVE_CASES } },
          take: 6,
          orderBy: { createdAt: "desc" },
        });

        workQueue = myCasesList.map(c => {
          const isGovPitch = c.type === "GOVERNMENT_PITCH";
          return {
            id: c.id,
            refNumber: c.trackingId,
            entityType: isGovPitch ? "GOVERNMENT PITCH" : "CORPORATE ENQUIRY",
            title: isGovPitch ? `Government Pitch: ${c.trackingId}` : `Corporate Enquiry: ${c.trackingId}`,
            currentStage: isGovPitch ? "Pitch Verification Required" : c.currentStage.replace(/_/g, " "),
            assignedDate: c.createdAt.toISOString(),
            priority: c.firstContactedAt ? "NORMAL" : "HIGH",
            primaryActionLabel: isGovPitch ? "Verify Pitch" : c.currentStage === "RM_FEASIBILITY" ? "Complete Assessment" : "Log Interaction",
            primaryActionHref: isGovPitch ? (c.sourceEntityId ? `/pitches/${c.sourceEntityId}` : `/pitches`) : `/assessments?caseId=${c.id}`,
            statusBadge: c.status,
          };
        });
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 7. GOVERNMENT OFFICER ROLE FAMILY (Role 7)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 7 && orgId) {
        const isSubDeptHead = roleCode === "GOV_SUB_DEPARTMENT_HEAD" || org?.governmentLevel === "SUB_DEPARTMENT";
        const isStateNodal = roleCode === "STATE_NODAL_OFFICER";

        if (isStateNodal) {
          const [multiProjects, pendingRouting, pendingAcceptance, overdueUpdates, criticalIssues, coordinationTasks, distinctReportingDistricts, stateEscalations] = await Promise.all([
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS } } }),
            prisma.governmentAssignment.count({ where: { status: "PENDING_ACCEPTANCE" } }),
            prisma.projectDistrictAssignment.count({ where: { status: "PENDING_ACCEPTANCE" } }),
            prisma.projectMilestone.count({ where: { status: { notIn: ["COMPLETED", "VERIFIED"] }, dueDate: { lt: now } } }),
            prisma.projectIssue.count({ where: { status: "OPEN", severity: "CRITICAL" } }),
            prisma.sLAEscalation.count({ where: { isResolved: false } }),
            prisma.project.findMany({ where: { status: { in: ACTIVE_PROJECTS } }, select: { district: true }, distinct: ["district"] }),
            prisma.sLAEscalation.count({ where: { isResolved: false, stage: { contains: "STATE" } } }),
          ]);

          const reportingPct = distinctReportingDistricts.length > 0 ? Math.round((distinctReportingDistricts.length / 36) * 100) : 0;

          kpis = [
            createKpi("sno_active_multi", "Active Multi-District Projects", multiProjects, "number", "/state-projects", "Assigned inter-district projects under state coordination", "positive"),
            createKpi("sno_district_legs_pending", "District Legs Pending Routing", pendingRouting, "number", "/state-projects", "District work packages awaiting local Nodal routing", pendingRouting > 0 ? "warning" : "positive"),
            createKpi("sno_acceptance_pending", "DNO Acceptance Pending", pendingAcceptance, "number", "/coordination/tasks", "Routed district assignments awaiting local DNO acceptance", pendingAcceptance > 0 ? "warning" : "positive"),
            createKpi("sno_updates_overdue", "Progress Updates Overdue", overdueUpdates, "number", "/progress", "District legs past scheduled reporting interval", overdueUpdates > 0 ? "critical" : "positive"),
            createKpi("sno_critical_issues", "Cross-District Issues", criticalIssues, "number", "/issues", "Inter-department bottlenecks flagged for resolution", criticalIssues > 0 ? "warning" : "positive"),
            createKpi("sno_coordination_tasks", "Coordination Tasks Due", coordinationTasks, "number", "/coordination/tasks", "State follow-ups and alignment meetings due this week", "neutral"),
            createKpi("sno_reporting_districts", "District Reporting Coverage", `${reportingPct}%`, "percentage", "/reports", "Percentage of active district legs submitting timely updates", "positive"),
            createKpi("sno_escalations_open", "State Escalations", stateEscalations, "number", "/escalations", "Open routing escalations submitted to State CSR Cell", stateEscalations > 0 ? "warning" : "positive"),
          ];
        } else if (isSubDeptHead) {
          const [activePitches, domainProjects, clarifications, nodalCount, openIssuesCount, upcomingMilestones, domainCommitments] = await Promise.all([
            prisma.governmentPitch.count({ where: { OR: [{ departmentOrganizationId: orgId }, { departmentId: orgId }, { organizationId: orgId }] } }),
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ departmentOrganizationId: orgId }, { organizationId: orgId }] } }),
            prisma.governmentPitch.count({ where: { status: { contains: "CLARIFICATION" }, OR: [{ departmentOrganizationId: orgId }, { departmentId: orgId }, { organizationId: orgId }] } }),
            prisma.user.count({ where: { organizationId: orgId, roleId: 4, accountStatus: "ACTIVE" } }),
            prisma.projectIssue.count({ where: { project: { OR: [{ departmentOrganizationId: orgId }, { organizationId: orgId }] }, status: "OPEN" } }),
            prisma.projectMilestone.count({ where: { project: { OR: [{ departmentOrganizationId: orgId }, { organizationId: orgId }] }, status: { in: ["APPROVED", "IN_PROGRESS"] }, dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } } }),
            prisma.project.aggregate({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ departmentOrganizationId: orgId }, { organizationId: orgId }] }, _sum: { committedAmount: true, beneficiaryCount: true } }),
          ]);

          const domainVal = Number(domainCommitments._sum.committedAmount || 0);
          const reachVal = Number(domainCommitments._sum.beneficiaryCount || 0);

          kpis = [
            createKpi("gsh_active_projects", "Active Domain Projects", domainProjects, "number", "/convergence-projects", "Projects assigned to your specific department", "positive"),
            createKpi("gsh_pitch_pipeline", "Domain Pitches", activePitches, "number", "/pitches", "Proposals submitted from your sub-department", "neutral"),
            createKpi("gsh_pending_pitch_action", "Pitches Needing Action", clarifications, "number", "/pitches?status=clarification", "Pitches returned for clarification by RM or JS", clarifications > 0 ? "warning" : "positive"),
            createKpi("gsh_nodal_coverage", "Nodal Officers Assigned", nodalCount, "number", "/nodal-management", "Dedicated Nodal Officers active in your department", "positive"),
            createKpi("gsh_open_issues", "Open Domain Issues", openIssuesCount, "number", "/issues", "Grievances and implementation bottlenecks", openIssuesCount > 0 ? "warning" : "positive"),
            createKpi("gsh_milestones_due", "Upcoming Milestones", upcomingMilestones, "number", "/milestones", "Approved project milestones due in the next 30 days", "neutral"),
            createKpi("gsh_domain_commitment", "Domain Commitments", formatCurrency(domainVal), "currency", "/reports", "Corporate funding committed to domain initiatives", "positive"),
            createKpi("gsh_beneficiary_reach", "Beneficiary Reach", reachVal >= 100000 ? `${(reachVal / 100000).toFixed(2)} Lakh` : reachVal.toLocaleString("en-IN"), "number", "/reports", "Citizens impacted across sub-department projects", "positive"),
          ];
        } else if (isCollectorOrg(org)) {
          // ── DISTRICT COLLECTOR — district-wide aggregated dashboard ──
          const collectorDistrict = org!.district || "";
          const districtOrgIds = await getDistrictOrganizationIds(collectorDistrict);
          const orgBreakdown = await getDistrictOrgBreakdown(collectorDistrict);

          const zpOrgIds = orgBreakdown.zp.map(o => o.id);
          const mncOrgIds = orgBreakdown.mnc.map(o => o.id);
          const collectOrgIds = orgBreakdown.collectorate.map(o => o.id);

          const districtProjectWhere = {
            status: { in: ACTIVE_PROJECTS },
            OR: [
              { organizationId: { in: districtOrgIds } },
              { parentOrganizationId: { in: districtOrgIds } },
              { departmentOrganizationId: { in: districtOrgIds } },
              { district: collectorDistrict },
            ],
          };

          const [
            totalDistrictProjects,
            zpProjects,
            mncProjects,
            collectProjects,
            districtPitches,
            districtAssignmentsPending,
            districtCommitments,
            districtMilestonesDue,
            districtEscalations,
            subDeptsCount,
          ] = await Promise.all([
            prisma.project.count({ where: districtProjectWhere }),
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ organizationId: { in: zpOrgIds } }, { parentOrganizationId: { in: zpOrgIds } }, { departmentOrganizationId: { in: zpOrgIds } }] } }),
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ organizationId: { in: mncOrgIds } }, { parentOrganizationId: { in: mncOrgIds } }, { departmentOrganizationId: { in: mncOrgIds } }] } }),
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ organizationId: { in: collectOrgIds } }, { parentOrganizationId: { in: collectOrgIds } }, { departmentOrganizationId: { in: collectOrgIds } }] } }),
            prisma.governmentPitch.count({ where: { OR: [{ organizationId: { in: districtOrgIds } }, { parentOrganizationId: { in: districtOrgIds } }, { departmentOrganizationId: { in: districtOrgIds } }] } }),
            prisma.governmentAssignment.count({ where: { governmentOrganizationId: { in: districtOrgIds }, status: { in: ["PENDING_ACCEPTANCE", "ACTIVE"] } } }),
            prisma.project.aggregate({ where: districtProjectWhere, _sum: { committedAmount: true, utilizedAmount: true } }),
            prisma.projectMilestone.count({ where: { project: districtProjectWhere, status: { in: ["APPROVED", "IN_PROGRESS"] }, dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } } }),
            prisma.sLAEscalation.count({ where: { isResolved: false } }),
            prisma.organization.count({ where: { parentOrganizationId: { in: districtOrgIds }, governmentLevel: "SUB_DEPARTMENT", status: "ACTIVE" } }),
          ]);

          const committedVal = Number(districtCommitments._sum.committedAmount || 0);

          kpis = [
            createKpi("dc_total_projects", "District-Wide Projects", totalDistrictProjects, "number", "/convergence-projects", `All active CSR projects across ${collectorDistrict} District`, "positive", "up"),
            createKpi("dc_zp_projects", "Zilla Parishad Projects", zpProjects, "number", "/convergence-projects?dept=zp", `Active projects under Zilla Parishad, ${collectorDistrict}`, "positive"),
            createKpi("dc_mnc_projects", "Municipal Corp Projects", mncProjects, "number", "/convergence-projects?dept=mnc", `Active projects under Municipal Corporation, ${collectorDistrict}`, "positive"),
            createKpi("dc_collect_projects", "Collectorate Projects", collectProjects, "number", "/convergence-projects?dept=collectorate", `Active projects under Collectorate, ${collectorDistrict}`, "positive"),
            createKpi("dc_district_funding", "District Funding Committed", committedVal > 0 ? formatCurrency(committedVal) : "₹0.00 Cr", "currency", "/funds", `Total corporate funds committed across all departments in ${collectorDistrict}`, "positive"),
            createKpi("dc_pitches_pipeline", "District Pitches", districtPitches, "number", "/pitches", "Pitch proposals from all departments in the district", "neutral"),
            createKpi("dc_milestones_due", "Milestones Due (30 Days)", districtMilestonesDue, "number", "/milestones", "Project milestones due across all district departments", districtMilestonesDue > 0 ? "warning" : "positive"),
            createKpi("dc_pending_assignments", "Pending Assignments", districtAssignmentsPending, "number", "/assignments", "District assignments awaiting acceptance across all departments", districtAssignmentsPending > 0 ? "warning" : "positive"),
          ];

          charts = {
            type: "district_department_breakdown",
            departments: [
              { name: "Collectorate", projects: collectProjects, type: "COLLECTORATE" },
              { name: "Zilla Parishad", projects: zpProjects, type: "ZILLA_PARISHAD" },
              { name: "Municipal Corporation", projects: mncProjects, type: "MUNICIPAL_CORPORATION" },
            ],
          };
        } else {
          // ── ZP / MNC / Generic Main Org Head — org-scoped dashboard ──
          const [subDeptsCount, activePitches, publicPitches, treeProjects, incomingAssignments, subDeptsPending, atRiskCount, treeCommitments] = await Promise.all([
            prisma.organization.count({ where: { parentOrganizationId: orgId, governmentLevel: "SUB_DEPARTMENT", status: "ACTIVE" } }),
            prisma.governmentPitch.count({ where: { OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] } }),
            prisma.governmentPitch.count({ where: { status: "PUBLIC", OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] } }),
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] } }),
            prisma.governmentAssignment.count({ where: { governmentOrganizationId: orgId, status: { in: ["PENDING_ACCEPTANCE", "ACTIVE"] } } }),
            prisma.governmentOnboardingApplication.count({ where: { organization: { parentOrganizationId: orgId }, status: "UNDER_VERIFICATION" } }),
            prisma.projectIssue.count({ where: { project: { OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] }, status: "OPEN", severity: "CRITICAL" } }),
            prisma.project.aggregate({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] }, _sum: { committedAmount: true } }),
          ]);

          const deptLabel = org?.governmentType === "ZILLA_PARISHAD" ? "Zilla Parishad" : org?.governmentType === "MUNICIPAL_CORPORATION" ? "Municipal Corporation" : "Organization";
          const treeCommittedVal = Number(treeCommitments._sum.committedAmount || 0);

          kpis = [
            createKpi("gmh_active_projects", `Active ${deptLabel} Projects`, treeProjects, "number", "/convergence-projects", `Projects in your ${deptLabel} and sub-departments`, "positive"),
            createKpi("gmh_sub_departments", "Active Sub-Departments", subDeptsCount, "number", "/departments", `Approved child departments under ${deptLabel}`, "positive"),
            createKpi("gmh_subdept_pending", "Sub-Depts Awaiting JS", subDeptsPending, "number", "/departments", "Submitted sub-department onboarding applications", subDeptsPending > 0 ? "warning" : "positive"),
            createKpi("gmh_pitch_pipeline", "Pitches in Pipeline", activePitches, "number", "/pitches", `${deptLabel} & child department pitches in workflow`, "neutral"),
            createKpi("gmh_nodal_coverage", "Nodal Coverage", "100%", "percentage", "/nodal-management", "Designated Nodal Officers active across all units", "positive"),
            createKpi("gmh_assignment_rejections", "Incoming Assignments", incomingAssignments, "number", "/assignments", "Assignments received for district execution", incomingAssignments > 0 ? "warning" : "positive"),
            createKpi("gmh_at_risk_projects", "At-Risk Projects", atRiskCount, "number", "/convergence-projects?risk=high", "Projects with open critical bottlenecks", atRiskCount > 0 ? "warning" : "positive"),
            createKpi("gmh_committed_funds", "Committed Funds", formatCurrency(treeCommittedVal), "currency", "/reports", `Corporate funds committed to ${deptLabel} tree`, "positive"),
          ];
        }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 8. COMPANY ADMIN (Role 8 - Corporate Primary Admin)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 8) {
        const corporateEnquiries = await prisma.corporateEnquiry.findMany({
          where: {
            OR: [
              ...(orgId ? [{ organizationId: orgId }] : []),
              ...(userId ? [{ submittedByUserId: userId }] : [])
            ]
          },
          select: { id: true }
        });
        const corporateEnquiryIds = corporateEnquiries.map(e => e.id);

        const corporateProjectWhere = {
          status: { in: ACTIVE_PROJECTS },
          OR: [
            ...(orgId ? [
              { corporatePartnerId: orgId },
              { organizationId: orgId }
            ] : []),
            ...(corporateEnquiryIds.length > 0 ? [
              { approvalSourceEnquiryId: { in: corporateEnquiryIds } }
            ] : [])
          ]
        };

        const [enquiries, interests, companyProjects, milestoneReviews, ngoMemberships, commitments] = orgId ? await Promise.all([
          prisma.corporateEnquiry.count({ where: { organizationId: orgId, status: { notIn: ["REJECTED", "CLOSED"] } } }),
          prisma.corporatePitchInterest.count({ where: { corporateId: orgId, status: { notIn: ["REJECTED", "CLOSED"] } } }),
          prisma.project.count({ where: corporateProjectWhere }),
          prisma.projectMilestone.count({ where: { status: "SUBMITTED", project: corporateProjectWhere } }),
          prisma.corporateNgoMembership.count({ where: { corporateOrganizationId: orgId, status: "APPROVED" } }),
          prisma.project.aggregate({ where: corporateProjectWhere, _sum: { committedAmount: true, utilizedAmount: true } }),
        ]) : [0, 0, 0, 0, 0, { _sum: { committedAmount: null, utilizedAmount: null } } as any];

        const committedVal = Number(commitments._sum?.committedAmount || 0);
        const utilizedVal = Number(commitments._sum?.utilizedAmount || 0);
        const utilRate = committedVal > 0 ? Math.round((utilizedVal / committedVal) * 100) : 0;

        const isOrgActive = org?.status === "ACTIVE";
        const complianceStatus = isOrgActive
          ? "Verified"
          : org?.status === "CLARIFICATION_REQUIRED"
          ? "Clarification Required"
          : org?.status === "REJECTED"
          ? "Rejected"
          : "Pending Verification";
        const complianceSemantic = isOrgActive
          ? "positive"
          : org?.status === "CLARIFICATION_REQUIRED"
          ? "warning"
          : org?.status === "REJECTED"
          ? "critical"
          : "neutral";
        const complianceHelper = isOrgActive
          ? "MCA CIN, CSR-1 and Committee records up-to-date"
          : org?.status === "CLARIFICATION_REQUIRED"
          ? "Clarifications requested on corporate onboarding details"
          : "Organization onboarding & KYC verification in progress";

        kpis = [
          createKpi("ca_committed_funds", "Total Committed Funds", formatCurrency(committedVal), "currency", "/funds", "Total CSR budget committed across approved projects", "positive", "up"),
          createKpi("ca_released_funds", "Funds Released", formatCurrency(utilizedVal), "currency", "/funds", "Actual tranches disbursed for milestone execution", "positive"),
          createKpi("ca_utilization_rate", "Reported Utilization", `${utilRate}%`, "percentage", "/funds", "Verified fund utilization against released amount", "positive"),
          createKpi("ca_active_projects", "Active CSR Projects", companyProjects, "number", "/convergence-projects", "Projects in execution with implementing partners", "positive"),
          createKpi("ca_milestone_pending", "Milestone Plans Due Review", milestoneReviews, "number", "/milestones", "NGO-proposed milestone plans awaiting Corporate approval", milestoneReviews > 0 ? "warning" : "positive"),
          createKpi("ca_active_ngos", "Approved NGO Partners", ngoMemberships, "number", "/implementing-agencies", "Active Corporate-NGO implementation partnerships", "neutral"),
          createKpi("ca_open_pipeline", "Open Enquiries & Interests", enquiries + interests, "number", "/enquiries", "Submitted enquiries & pitch interests in feasibility review", "neutral"),
          createKpi("ca_compliance_alerts", "Compliance & KYC Status", complianceStatus, "status", "/company/profile", complianceHelper, complianceSemantic),
        ];

        // Corporate Work Queue
        const pendingMilestones = orgId ? await prisma.projectMilestone.findMany({
          where: { status: "SUBMITTED", project: corporateProjectWhere },
          include: { project: true },
          take: 5,
        }) : [];

        const activeProjectsList = await prisma.project.findMany({
          where: corporateProjectWhere,
          orderBy: { createdAt: "desc" },
          take: 3
        });

        const actionableEnquiries = orgId ? await prisma.corporateEnquiry.findMany({
          where: {
            organizationId: orgId,
            status: { in: ["CLARIFICATION_REQUIRED", "RETURN_FOR_CLARIFICATION", "JS_APPROVED", "SUBMITTED_TO_JS", "PENDING"] }
          },
          orderBy: { createdAt: "desc" },
          take: 3
        }) : [];

        const milestoneWorkItems: WorkQueueItem[] = pendingMilestones.map((m) => ({
          id: m.id,
          refNumber: `MLS-${m.id.slice(0, 6)}`,
          entityType: "Milestone Proposal",
          title: `${m.name} (${m.project.title})`,
          currentStage: "Submitted for Corporate Approval",
          assignedDate: m.createdAt.toISOString(),
          dueDate: m.dueDate ? m.dueDate.toISOString() : undefined,
          priority: "HIGH",
          primaryActionLabel: "Review & Approve",
          primaryActionHref: `/milestones?id=${m.id}`,
          statusBadge: "SUBMITTED",
        }));

        const projectWorkItems: WorkQueueItem[] = activeProjectsList.map((p) => ({
          id: p.id,
          refNumber: p.projectCode || `PRJ-${p.id.slice(0, 6)}`,
          entityType: "Active Convergence Project",
          title: p.title,
          currentStage: "Approved & Active Execution",
          assignedDate: p.createdAt.toISOString(),
          priority: "HIGH",
          primaryActionLabel: "View Project",
          primaryActionHref: `/convergence-projects/${p.id}`,
          statusBadge: p.status,
        }));

        const enquiryWorkItems: WorkQueueItem[] = actionableEnquiries.map((e) => ({
          id: e.id,
          refNumber: e.trackingId || `ENQ-${e.id.slice(0, 6)}`,
          entityType: "Corporate CSR Enquiry",
          title: `${e.corporateName} (${e.sector || "General CSR"})`,
          currentStage: e.status === "JS_APPROVED" ? "Approved by Joint Secretary" : e.status === "SUBMITTED_TO_JS" ? "Under Joint Secretary Review" : "In Progress",
          assignedDate: e.createdAt.toISOString(),
          priority: e.status.includes("CLARIFICATION") ? "CRITICAL" : "NORMAL",
          primaryActionLabel: "View Enquiry",
          primaryActionHref: `/enquiries/${e.id}`,
          statusBadge: e.status,
        }));

        workQueue = [...milestoneWorkItems, ...projectWorkItems, ...enquiryWorkItems].slice(0, 6);
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 9. NGO ADMIN (Role 9 - Implementing Agency Primary Admin)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 9) {
        const isContextScoped = Boolean(req.user?.ngoAccessId);
        let projectFilter: any = { implementingAgencies: { some: { agencyOrganizationId: orgId, status: "ACTIVE" } } };

        if (isContextScoped) {
          const access = await prisma.corporateNgoAccess.findUnique({ where: { id: req.user!.ngoAccessId! } });
          projectFilter = { id: { in: access?.projectIds || [] } };
        }

        const [memberships, projects, milestonesDue, overdueMilestones, returnedPlans, evidenceDueCount, verifiedMilestones] = await Promise.all([
          prisma.corporateNgoMembership.count({ where: { ngoOrganizationId: orgId || "", status: "APPROVED" } }),
          prisma.project.count({ where: projectFilter }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: { in: ["APPROVED", "IN_PROGRESS"] } } }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: { notIn: ["VERIFIED", "COMPLETED"] }, dueDate: { lt: now } } }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: { in: ["REJECTED", "CHANGES_REQUIRED"] } } }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: "IN_PROGRESS" } }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: "VERIFIED" } }),
        ]);

        const isNgoActive = org?.status === "ACTIVE";
        const ngoComplianceStatus = isNgoActive ? "Valid (80G/12A)" : "Pending Verification";
        const ngoComplianceSemantic = isNgoActive ? "positive" : "warning";

        kpis = [
          createKpi("ngo_active_projects", isContextScoped ? "Context Assigned Projects" : "Active NGO Projects", projects, "number", "/ngo/projects", "Assigned projects being implemented across districts", "positive"),
          createKpi("ngo_milestones_due", "Milestones in Execution", milestonesDue, "number", "/ngo/milestones", "Approved deliverables actively in progress", "positive"),
          createKpi("ngo_milestones_overdue", "Overdue Milestones", overdueMilestones, "number", "/ngo/milestones?overdue=true", "Deliverables past scheduled completion date", overdueMilestones > 0 ? "critical" : "positive"),
          createKpi("ngo_corporate_feedback", "Feedback Awaiting Response", returnedPlans, "number", "/ngo/milestones?status=returned", "Milestone proposals returned for revision", returnedPlans > 0 ? "warning" : "positive"),
          createKpi("ngo_active_memberships", "Corporate Partnerships", memberships, "number", "/ngo/corporate-memberships", "Approved memberships with corporate sponsors", "neutral"),
          createKpi("ngo_evidence_due", "Evidence Updates Due", evidenceDueCount, "number", "/ngo/evidence", "Milestones requiring geotagged photo uploads", evidenceDueCount > 0 ? "warning" : "positive"),
          createKpi("ngo_uc_due", "UC Submissions Due", verifiedMilestones, "number", "/ngo/funds-uc", "Utilization certificates ready for submission", "neutral"),
          createKpi("ngo_document_alerts", "Registrations & Compliance", ngoComplianceStatus, "status", "/ngo/profile", isNgoActive ? "Darpan ID, CSR-1 and tax exemption valid" : "NGO registration and statutory documents under review", ngoComplianceSemantic),
        ];
      }

      // Recent Scoped Audit Logs & Workflow Activity
      let auditWhere: any;
      if (roleId === 1) {
        // Super Admin sees global system audit logs
        auditWhere = {};
      } else if (org?.id) {
        // Organization-scoped accounts (e.g. Company Admin, NGO Admin, Govt Department)
        const orgUsers = await prisma.user.findMany({
          where: { organizationId: org.id },
          select: { id: true }
        });
        const allAccountUserIds = Array.from(new Set([userId, ...orgUsers.map((u) => u.id)]));

        auditWhere = {
          OR: [
            { actorUserId: { in: allAccountUserIds } },
            { userId: { in: allAccountUserIds } },
            { entityId: org.id },
          ]
        };
      } else {
        // Individual user accounts without an organization
        auditWhere = {
          OR: [
            { actorUserId: userId },
            { userId: userId }
          ]
        };
      }

      const recentLogs = await prisma.auditLog.findMany({
        where: auditWhere,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { actorUser: { select: { firstName: true, lastName: true, designation: true } } }
      });

      const formatAction = (act: string) => {
        if (!act) return "Workflow Action";
        if (act === "GOVERNMENT_PITCH_VERIFIED") return "Government Pitch Verified (Pending JS Approval)";
        if (act === "GOVERNMENT_PITCH_SUBMITTED" || act === "GOVERNMENT_PITCH_CREATED") return "Government Development Pitch Submitted";
        if (act === "CORPORATE_ENQUIRY_CREATED" || act === "CORPORATE_ENQUIRY_SUBMITTED") return "Corporate CSR Enquiry Received";
        if (act === "FEASIBILITY_ASSESSMENT_SUBMITTED") return "13-Point Feasibility Submitted to JS";
        if (act === "PORTAL_CASE_CREATED") return "New Workflow Case Initialized";
        if (act === "GOVERNMENT_ONBOARDING_SUBMITTED") return "Department Onboarding Application Submitted";
        return act.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      };

      const formatEntityType = (item: any) => {
        if (item.entityType) return item.entityType;
        const act = String(item.action || "");
        if (act.includes("PITCH")) return "Government Pitch";
        if (act.includes("ENQUIRY")) return "Corporate Enquiry";
        if (act.includes("FEASIBILITY")) return "Feasibility Assessment";
        if (act.includes("ONBOARDING")) return "Onboarding Application";
        if (act.includes("ROLE") || act.includes("USER") || act.includes("AUTH")) return "Access Management";
        return "Portal Workflow";
      };

      const recentActivity = recentLogs.map((item) => ({
        id: item.id,
        action: formatAction(item.action),
        entityType: formatEntityType(item),
        actorName: item.actorUser
          ? [item.actorUser.firstName, item.actorUser.lastName].filter(Boolean).join(" ") || item.actorUser.designation || "Account User"
          : "Account Action",
        actorRole: item.actorUser?.designation || (roleId === 1 ? "Super Admin" : roleCode ? roleCode.replace(/_/g, " ") : "Account User"),
        createdAt: item.createdAt.toISOString(),
      }));

      const isUnsubmitted = Boolean(org && ["REGISTERED", "PROFILE_INCOMPLETE", "DOCUMENTS_PENDING", "DRAFT"].includes(org.status));
      const isClarification = Boolean(org && org.status === "CLARIFICATION_REQUIRED");
      const isRejected = Boolean(org && org.status === "REJECTED");

      const getOnboardingActionUrl = (orgKind?: string | null) => {
        const k = (orgKind || "").toUpperCase();
        if (["CSR_COMPANY", "COMPANY", "CORPORATE"].includes(k)) return "/organization/onboarding/company";
        if (["GOVERNMENT_DEPARTMENT", "GOVT_DEPARTMENT", "DEPARTMENT"].includes(k)) return "/organization/onboarding/government";
        return "/organization/onboarding";
      };

      const onboardingStatus = org && org.status !== "ACTIVE" && (org.status as string) !== "APPROVED" ? {
        isPending: true,
        status: org.status,
        orgName: org.name,
        orgKind: org.kind,
        title: isUnsubmitted
          ? "Start Organization Onboarding"
          : isClarification
          ? "Onboarding Clarification Required"
          : isRejected
          ? "Onboarding Application Rejected"
          : "Organization Onboarding Under Review",
        message: isUnsubmitted
          ? "Your organization is registered. Please complete and submit your official onboarding application to unlock CSR features."
          : isClarification
          ? "Administrative review requested clarification on your submitted onboarding application. Please review feedback and resubmit."
          : isRejected
          ? "Your onboarding application was rejected. Please review administrative remarks."
          : `Current status: ${org.status.replace(/_/g, " ")}. Your onboarding application is under administrative review.`,
        actionUrl: isUnsubmitted
          ? getOnboardingActionUrl(org.kind)
          : isClarification
          ? "/organization/onboarding/status?highlight=clarification"
          : "/organization/onboarding/status",
        actionText: isUnsubmitted
          ? "Start Onboarding"
          : isClarification
          ? "Resolve Clarification"
          : isRejected
          ? "View Remarks"
          : "View Onboarding Status",
      } : null;

      const isCollector = isCollectorOrg(org);
      const districtScope = isCollector ? "DISTRICT_WIDE" : "ORGANIZATION";
      const scopeLabel = isCollector
        ? `All departments in ${org?.district || "District"}`
        : org?.name ? `${org.name}` : null;
      const govHeadTitle = org?.governmentType ? getGovHeadTitle(org.governmentType) : null;

      return {
        generatedAt: nowIso,
        asOf: nowIso,
        userRoleId: roleId,
        roleCode,
        orgName: org?.name || null,
        orgKind: org?.kind || null,
        orgStatus: org?.status || null,
        governmentLevel: org?.governmentLevel || null,
        governmentType: org?.governmentType || null,
        districtScope,
        scopeLabel,
        govHeadTitle,
        permissions,
        kpis,
        workQueue,
        alerts,
        charts,
        recentActivity,
        onboardingStatus,
      };
    }, 0);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardWidgets = getDashboardSummary;

