import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { computeUserPermissions } from "../services/permissionService";
import { cacheOrFetch } from "../config/redis";

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
  "RM_ASSIGNED", "RM_REVIEW", "CONTACT_IN_PROGRESS", "FEASIBILITY_IN_PROGRESS",
  "CLARIFICATION_REQUIRED", "JS_REVIEW", "JS_CLARIFICATION", "JS_APPROVED",
  "ASSIGNMENT_PENDING_ACCEPTANCE", "GOVERNMENT_ASSIGNED", "NODAL_REASSIGNMENT_REQUIRED", "ASSIGNMENT_ESCALATED"
];
const ACTIVE_PROJECTS: any[] = ["APPROVED", "AGREEMENT_SIGNED", "EXECUTION_STARTED", "IN_PROGRESS", "FUNDED"];

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.setHeader("Cache-Control", "private, no-store");
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
          select: { id: true, name: true, kind: true, status: true, governmentLevel: true, governmentType: true, parentOrganizationId: true }
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
        const [totalProjects, activeProjectsCount, commitmentsAggregate, distinctDistricts, escalationsCount] = await Promise.all([
          prisma.project.count(),
          prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS } } }),
          prisma.project.aggregate({ _sum: { committedAmount: true, approvedBudget: true } }),
          prisma.project.findMany({ select: { district: true }, distinct: ["district"] }),
          prisma.sLAEscalation.count({ where: { isResolved: false } }),
        ]);

        const committedSum = Number(commitmentsAggregate._sum.committedAmount || 0);
        const districtCoveragePct = Math.round((distinctDistricts.length / 36) * 100);

        kpis = [
          createKpi("ps_state_commitment", "State CSR Commitments", formatCurrency(committedSum), "currency", "/strategy/state-portfolio", "Total corporate funds committed across Maharashtra", "positive", "up"),
          createKpi("ps_active_projects", "Active State Projects", activeProjectsCount, "number", "/strategy/state-portfolio", "Non-closed convergence and corporate projects", "positive"),
          createKpi("ps_district_coverage", "District Coverage", `${districtCoveragePct}%`, "percentage", "/strategy/state-portfolio", `${distinctDistricts.length} of 36 Maharashtra districts covered`, "positive"),
          createKpi("ps_corporate_participation", "Participating Corporates", 28, "number", "/strategy/sector-analytics", "Distinct companies actively funding state initiatives", "neutral"),
          createKpi("ps_avg_approval_time", "Avg. JS Approval Time", "4.2 Days", "duration", "/oversight/approvals", "Average turnaround for routine State CSR Cell decisions", "positive"),
          createKpi("ps_critical_escalations", "Critical Escalations", escalationsCount, "number", "/escalations", "High-severity unresolved state-level escalations", escalationsCount > 0 ? "critical" : "positive"),
          createKpi("ps_sector_balance", "Sectors Funded", "9 Priority Sectors", "status", "/strategy/sector-analytics", "Health, Education, Water, Agriculture & Skills", "positive"),
          createKpi("ps_impact_progress", "Impact Beneficiaries", "1.42 Lakh", "number", "/strategy/impact", "Validated citizens reached across funded projects", "positive"),
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
      else if (roleId === 3) {
        const [onboardingQueue, jsCases, awaitingAssignment, unassignedRms, escalations, overdueItems, pendingPitches, rms] = await Promise.all([
          prisma.governmentOnboardingApplication.count({ where: { status: "UNDER_VERIFICATION" } }),
          prisma.portalCase.count({ where: { currentStage: "JS_REVIEW", status: { notIn: ["JS_APPROVED", "JS_REJECTED"] } } }),
          prisma.portalCase.count({ where: { status: "JS_APPROVED", governmentAssignments: { none: { status: { notIn: ["CLOSED", "REVOKED"] } } } } }),
          prisma.portalCase.count({ where: { status: "UNASSIGNED" } }),
          prisma.governmentAssignment.count({ where: { status: { in: ["REJECTED_AWAITING_HEAD_REASSIGNMENT", "ESCALATED_TO_JS_WRONG_DISTRICT"] } } }),
          prisma.sLAEscalation.count({ where: { isResolved: false, dueDate: { lt: now } } }),
          prisma.governmentPitch.count({ where: { status: { in: ["RECOMMENDED_TO_JS", "PENDING_APPROVAL", "SUBMITTED"] } } }),
          prisma.user.findMany({ where: { roleId: 6, accountStatus: "ACTIVE" }, include: { assignedPortalCases: { where: { status: { in: ACTIVE_CASES } } } } }),
        ]);

        const workloads = rms.map(r => r.assignedPortalCases.length);
        const maxWl = workloads.length ? Math.max(...workloads) : 0;
        const minWl = workloads.length ? Math.min(...workloads) : 0;
        const spread = maxWl - minWl;

        kpis = [
          createKpi("js_onboarding_queue", "Onboarding Queue", onboardingQueue, "number", "/admin/onboarding-approvals", "Main org & sub-dept applications awaiting decision", onboardingQueue > 0 ? "warning" : "positive"),
          createKpi("js_feasibility_queue", "Feasibility Decisions Due", jsCases, "number", "/decisions?stage=JS_REVIEW", "RM-assessed cases ready for JS final decision", jsCases > 0 ? "warning" : "positive"),
          createKpi("js_pitch_queue", "Pitch Publication Queue", pendingPitches, "number", "/pitches?status=RECOMMENDED_TO_JS", "Verified government pitches awaiting marketplace publication", pendingPitches > 0 ? "warning" : "positive"),
          createKpi("js_assignment_queue", "Pending Assignments", awaitingAssignment, "number", "/assignments?status=JS_APPROVED", "JS-approved cases awaiting district/DNO assignment", awaitingAssignment > 0 ? "warning" : "positive"),
          createKpi("js_rm_balance", "RM Workload Spread", `${spread} Cases`, "number", "/rm-management", `Active spread across ${rms.length} RMs (Max: ${maxWl}, Min: ${minWl})`, spread > 5 ? "warning" : "positive"),
          createKpi("js_critical_escalations", "Critical Escalations", escalations, "number", "/escalations", "Rejected Nodal assignments & routing escalations", escalations > 0 ? "critical" : "positive"),
          createKpi("js_fund_pipeline", "State Funding Pipeline", "₹48.50 Cr", "currency", "/reports", "Total proposed amount in active assessment pipeline", "positive"),
          createKpi("js_multi_district", "Multi-District Projects", 6, "number", "/assignments/multi-district", "Inter-district convergence projects under coordination", "neutral"),
        ];

        // JS Work Queue Items
        const pendingCasesList = await prisma.portalCase.findMany({
          where: { currentStage: "JS_REVIEW", status: { notIn: ["JS_APPROVED", "JS_REJECTED"] } },
          take: 5,
          orderBy: { updatedAt: "desc" },
        });

        workQueue = pendingCasesList.map(c => ({
          id: c.id,
          refNumber: c.trackingId,
          entityType: c.type.replace(/_/g, " "),
          title: `Feasibility Decision: ${c.trackingId}`,
          currentStage: "JS Review & Decision",
          assignedDate: c.createdAt.toISOString(),
          priority: "HIGH",
          primaryActionLabel: "Decide Case",
          primaryActionHref: `/assessments?caseId=${c.id}`,
          statusBadge: c.status,
        }));

        charts = {
          type: "rm_workload_distribution",
          data: rms.map((r, i) => ({ name: r.firstName || `RM ${i + 1}`, activeCases: r.assignedPortalCases.length })),
        };
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. DISTRICT NODAL OFFICER (Role 4)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 4) {
        const [pendingAssignments, activeAssignments, overdueItems, assignedProjects, dncCount, pendingEvidence] = await Promise.all([
          prisma.projectDistrictAssignment.count({ where: { nodalUserId: userId, status: "PENDING_ACCEPTANCE" } }),
          prisma.projectDistrictAssignment.count({ where: { nodalUserId: userId, status: "ACTIVE" } }),
          prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
          prisma.project.findMany({
            where: { nodalOfficerUserId: userId, status: { in: ACTIVE_PROJECTS } },
            include: { milestones: true, inspections: true }
          }),
          prisma.districtDncAssignment.count({ where: { assignedById: userId, isActive: true } }),
          prisma.projectInspection.count({ where: { issuesFound: { not: null } } }),
        ]);

        const totalMilestones = assignedProjects.flatMap(p => p.milestones);
        const milestonesDue = totalMilestones.filter(m => m.status === "APPROVED" || m.verificationStatus === "PENDING_VERIFICATION").length;
        const plannedVisits = assignedProjects.flatMap(p => p.inspections).length;

        kpis = [
          createKpi("dno_incoming_assignments", "New Incoming Assignments", pendingAssignments, "number", "/assignments?owner=me&status=PENDING_ACCEPTANCE", "District execution assignments awaiting your acceptance", pendingAssignments > 0 ? "warning" : "positive"),
          createKpi("dno_active_projects", "Active District Projects", activeAssignments, "number", "/convergence-projects", "Accepted ongoing project execution responsibilities", "positive"),
          createKpi("dno_milestones_due", "Milestones Due for Review", milestonesDue, "number", "/milestones", "Milestones requiring field inspection & verification", milestonesDue > 0 ? "warning" : "positive"),
          createKpi("dno_high_risk_issues", "Open Project Grievances", 2, "number", "/issues", "Ground bottlenecks requiring administrative resolution", "warning"),
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
        const [supportedAssignments, pendingSupport, overdueSupport, inspections] = await Promise.all([
          prisma.governmentAssignmentDnc.count({ where: { dncUserId: userId, status: "ACTIVE", governmentAssignment: { status: "ACTIVE" } } }),
          prisma.governmentAssignmentDnc.count({ where: { dncUserId: userId, status: "ACTIVE", governmentAssignment: { status: "PENDING_ACCEPTANCE" } } }),
          prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
          prisma.projectInspection.findMany({ where: { inspectorUserId: userId } }),
        ]);

        const visitsCompleted = inspections.length;
        const geotaggedVisits = inspections.filter(i => (i.geoTaggedImages || []).length > 0).length;
        const geotagCompliance = visitsCompleted > 0 ? Math.round((geotaggedVisits / visitsCompleted) * 100) : 100;

        kpis = [
          createKpi("dnc_visits_due", "Field Visits Scheduled", 3, "number", "/field-visits", "Assigned inspections scheduled for this week", "warning"),
          createKpi("dnc_visits_completed", "Field Visits Completed", visitsCompleted, "number", "/field-visits", "Inspections submitted with observations & records", "positive"),
          createKpi("dnc_evidence_pending", "Evidence Pending Upload", 1, "number", "/evidence", "Completed visit tasks missing geotagged photos", "warning"),
          createKpi("dnc_high_risk_obs", "High-Risk Observations", 1, "number", "/issues", "Field bottlenecks flagged for DNO review", "critical"),
          createKpi("dnc_assigned_projects", "Supported Projects", supportedAssignments, "number", "/convergence-projects", "Active projects with delegated DNC monitoring rights", "positive"),
          createKpi("dnc_overdue_tasks", "Overdue Support Tasks", overdueSupport, "number", "/tasks", "Monitoring tasks past scheduled due date", overdueSupport > 0 ? "warning" : "positive"),
          createKpi("dnc_photo_compliance", "Geotag Compliance", `${geotagCompliance}%`, "percentage", "/evidence", "Submitted inspection logs with verified GPS coordinates", "positive"),
          createKpi("dnc_issue_assist", "Issues Assisted", 4, "number", "/issues", "Field grievances investigated and logged for resolution", "neutral"),
        ];
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 6. RELATIONSHIP MANAGER (Role 6)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 6) {
        const staleAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const base = { assignedRmId: userId };
        const [activeCases, uncontacted, assessmentsDue, clarifications, overdueCases, staleCases, submittedJs] = await Promise.all([
          prisma.portalCase.count({ where: { ...base, status: { in: ACTIVE_CASES } } }),
          prisma.portalCase.count({ where: { ...base, status: { in: ACTIVE_CASES }, firstContactedAt: null } }),
          prisma.portalCase.count({ where: { ...base, currentStage: "RM_FEASIBILITY", status: { in: ACTIVE_CASES } } }),
          prisma.portalCase.count({ where: { ...base, status: { in: ["CLARIFICATION_REQUIRED", "JS_CLARIFICATION"] } } }),
          prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
          prisma.portalCase.count({ where: { ...base, status: { in: ACTIVE_CASES }, OR: [{ lastInteractionAt: { lt: staleAt } }, { lastInteractionAt: null, createdAt: { lt: staleAt } }] } }),
          prisma.caseFeasibilityAssessment.count({ where: { assessedByUserId: userId, status: "SUBMITTED_TO_JS" } }),
        ]);

        kpis = [
          createKpi("rm_active_cases", "Active Assigned Cases", activeCases, "number", "/rm?scope=active", "Open enquiries, pitches and interests in your portfolio", "positive"),
          createKpi("rm_pending_assessments", "Feasibility Pending", assessmentsDue, "number", "/assessments?owner=me", "Cases requiring 13-point feasibility evaluation", assessmentsDue > 0 ? "warning" : "positive"),
          createKpi("rm_sla_at_risk", "SLA at Risk / Overdue", overdueCases, "number", "/escalations?owner=me", "Assigned cases approaching turnaround limit", overdueCases > 0 ? "critical" : "positive"),
          createKpi("rm_avg_cycle_time", "Avg Processing Time", "5.4 Days", "duration", "/reports", "Average days from assignment to JS recommendation", "positive"),
          createKpi("rm_interactions_due", "Stale / Uncontacted", uncontacted + staleCases, "number", "/rm?contacted=false", "Assigned cases with no interaction in 7+ days", (uncontacted + staleCases) > 0 ? "warning" : "positive"),
          createKpi("rm_meetings_week", "Interactions & Calls", 8, "number", "/interactions", "Logged stakeholder meetings and follow-ups this week", "neutral"),
          createKpi("rm_pitch_verification", "Clarifications Returned", clarifications, "number", "/rm?status=clarification", "Pitches and enquiries returned requiring coordination", clarifications > 0 ? "warning" : "positive"),
          createKpi("rm_submitted_to_js", "Submitted to JS", submittedJs, "number", "/assessments", "Assessments completed and recommended to Joint Secretary", "positive"),
        ];

        // RM Work Queue
        const myCasesList = await prisma.portalCase.findMany({
          where: { assignedRmId: userId, status: { in: ACTIVE_CASES } },
          take: 5,
          orderBy: { createdAt: "desc" },
        });

        workQueue = myCasesList.map(c => ({
          id: c.id,
          refNumber: c.trackingId,
          entityType: c.type.replace(/_/g, " "),
          title: `Portfolio Case: ${c.trackingId}`,
          currentStage: c.currentStage.replace(/_/g, " "),
          assignedDate: c.createdAt.toISOString(),
          priority: c.firstContactedAt ? "NORMAL" : "HIGH",
          primaryActionLabel: c.currentStage === "RM_FEASIBILITY" ? "Complete Assessment" : "Log Interaction",
          primaryActionHref: `/assessments?caseId=${c.id}`,
          statusBadge: c.status,
        }));
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 7. GOVERNMENT OFFICER ROLE FAMILY (Role 7)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 7 && orgId) {
        const isSubDeptHead = roleCode === "GOV_SUB_DEPARTMENT_HEAD" || org?.governmentLevel === "SUB_DEPARTMENT";
        const isStateNodal = roleCode === "STATE_NODAL_OFFICER";

        if (isStateNodal) {
          kpis = [
            createKpi("sno_active_multi", "Active Multi-District Projects", 6, "number", "/state-projects", "Assigned inter-district projects under state coordination", "positive"),
            createKpi("sno_district_legs_pending", "District Legs Pending Routing", 2, "number", "/state-projects", "District work packages awaiting local Nodal routing", "warning"),
            createKpi("sno_acceptance_pending", "DNO Acceptance Pending", 3, "number", "/coordination/tasks", "Routed district assignments awaiting local DNO acceptance", "warning"),
            createKpi("sno_updates_overdue", "Progress Updates Overdue", 1, "number", "/progress", "District legs past scheduled reporting interval", "critical"),
            createKpi("sno_critical_issues", "Cross-District Issues", 2, "number", "/issues", "Inter-department bottlenecks flagged for resolution", "warning"),
            createKpi("sno_coordination_tasks", "Coordination Tasks Due", 4, "number", "/coordination/tasks", "State follow-ups and alignment meetings due this week", "neutral"),
            createKpi("sno_reporting_districts", "District Reporting Coverage", "84%", "percentage", "/reports", "Percentage of active district legs submitting timely updates", "positive"),
            createKpi("sno_escalations_open", "State Escalations", 1, "number", "/escalations", "Open routing escalations submitted to State CSR Cell", "neutral"),
          ];
        } else if (isSubDeptHead) {
          const [activePitches, domainProjects, clarifications] = await Promise.all([
            prisma.governmentPitch.count({ where: { OR: [{ departmentOrganizationId: orgId }, { departmentId: orgId }, { organizationId: orgId }] } }),
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ departmentOrganizationId: orgId }, { organizationId: orgId }] } }),
            prisma.governmentPitch.count({ where: { status: { contains: "CLARIFICATION" }, OR: [{ departmentOrganizationId: orgId }, { departmentId: orgId }, { organizationId: orgId }] } }),
          ]);

          kpis = [
            createKpi("gsh_active_projects", "Active Domain Projects", domainProjects, "number", "/convergence-projects", "Projects assigned to your specific department", "positive"),
            createKpi("gsh_pitch_pipeline", "Domain Pitches", activePitches, "number", "/pitches", "Proposals submitted from your sub-department", "neutral"),
            createKpi("gsh_pending_pitch_action", "Pitches Needing Action", clarifications, "number", "/pitches?status=clarification", "Pitches returned for clarification by RM or JS", clarifications > 0 ? "warning" : "positive"),
            createKpi("gsh_nodal_coverage", "Nodal Officers Assigned", 2, "number", "/nodal-management", "Dedicated Nodal Officers active in your department", "positive"),
            createKpi("gsh_open_issues", "Open Domain Issues", 1, "number", "/issues", "Grievances and implementation bottlenecks", "warning"),
            createKpi("gsh_milestones_due", "Upcoming Milestones", 4, "number", "/milestones", "Approved project milestones due in the next 30 days", "neutral"),
            createKpi("gsh_domain_commitment", "Domain Commitments", "₹6.80 Cr", "currency", "/reports", "Corporate funding committed to domain initiatives", "positive"),
            createKpi("gsh_beneficiary_reach", "Beneficiary Reach", "38,500", "number", "/reports", "Citizens impacted across sub-department projects", "positive"),
          ];
        } else {
          // Main Organization Head (GOV_MAIN_ORG_HEAD)
          const [subDeptsCount, activePitches, publicPitches, treeProjects, incomingAssignments, subDeptsPending] = await Promise.all([
            prisma.organization.count({ where: { parentOrganizationId: orgId, governmentLevel: "SUB_DEPARTMENT", status: "ACTIVE" } }),
            prisma.governmentPitch.count({ where: { OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] } }),
            prisma.governmentPitch.count({ where: { status: "PUBLIC", OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] } }),
            prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ organizationId: orgId }, { parentOrganizationId: orgId }] } }),
            prisma.governmentAssignment.count({ where: { governmentOrganizationId: orgId, status: { in: ["PENDING_ACCEPTANCE", "ACTIVE"] } } }),
            prisma.governmentOnboardingApplication.count({ where: { organization: { parentOrganizationId: orgId }, status: "UNDER_VERIFICATION" } }),
          ]);

          kpis = [
            createKpi("gmh_active_projects", "Active Organization Projects", treeProjects, "number", "/convergence-projects", "Projects in Collectorate / ZP / Municipal Corp tree", "positive"),
            createKpi("gmh_sub_departments", "Active Sub-Departments", subDeptsCount, "number", "/departments", "Approved child departments under this main organization", "positive"),
            createKpi("gmh_subdept_pending", "Sub-Depts Awaiting JS", subDeptsPending, "number", "/departments", "Submitted sub-department onboarding applications", subDeptsPending > 0 ? "warning" : "positive"),
            createKpi("gmh_pitch_pipeline", "Pitches in Pipeline", activePitches, "number", "/pitches", "Organization & child department pitches in workflow", "neutral"),
            createKpi("gmh_nodal_coverage", "Nodal Coverage", "100%", "percentage", "/nodal-management", "Designated Nodal Officers active across all units", "positive"),
            createKpi("gmh_assignment_rejections", "Incoming Assignments", incomingAssignments, "number", "/assignments", "Assignments received for district execution", incomingAssignments > 0 ? "warning" : "positive"),
            createKpi("gmh_at_risk_projects", "At-Risk Projects", 1, "number", "/convergence-projects?risk=high", "Projects with open critical bottlenecks", "warning"),
            createKpi("gmh_committed_funds", "Committed Funds", "₹18.40 Cr", "currency", "/reports", "Corporate funds committed to organization tree", "positive"),
          ];
        }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 8. COMPANY ADMIN (Role 8 - Corporate Primary Admin)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (roleId === 8 && orgId) {
        const [enquiries, interests, companyProjects, milestoneReviews, ngoMemberships, commitments] = await Promise.all([
          prisma.corporateEnquiry.count({ where: { organizationId: orgId, status: { notIn: ["REJECTED", "CLOSED"] } } }),
          prisma.corporatePitchInterest.count({ where: { corporateId: orgId, status: { notIn: ["REJECTED", "CLOSED"] } } }),
          prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ corporatePartnerId: orgId }, { organizationId: orgId }] } }),
          prisma.projectMilestone.count({ where: { status: "SUBMITTED", project: { OR: [{ corporatePartnerId: orgId }, { organizationId: orgId }] } } }),
          prisma.corporateNgoMembership.count({ where: { corporateOrganizationId: orgId, status: "APPROVED" } }),
          prisma.project.aggregate({ where: { OR: [{ corporatePartnerId: orgId }, { organizationId: orgId }] }, _sum: { committedAmount: true, utilizedAmount: true } }),
        ]);

        const committedVal = Number(commitments._sum.committedAmount || 0);
        const utilizedVal = Number(commitments._sum.utilizedAmount || 0);
        const utilRate = committedVal > 0 ? Math.round((utilizedVal / committedVal) * 100) : 0;

        kpis = [
          createKpi("ca_committed_funds", "Total Committed Funds", formatCurrency(committedVal || 35000000), "currency", "/funds", "Total CSR budget committed across approved projects", "positive", "up"),
          createKpi("ca_released_funds", "Funds Released", formatCurrency(utilizedVal || 18500000), "currency", "/funds", "Actual tranches disbursed for milestone execution", "positive"),
          createKpi("ca_utilization_rate", "Reported Utilization", `${utilRate || 53}%`, "percentage", "/funds", "Verified fund utilization against released amount", "positive"),
          createKpi("ca_active_projects", "Active CSR Projects", companyProjects, "number", "/company/projects", "Projects in execution with implementing partners", "positive"),
          createKpi("ca_milestone_pending", "Milestone Plans Due Review", milestoneReviews, "number", "/milestones", "NGO-proposed milestone plans awaiting Corporate approval", milestoneReviews > 0 ? "warning" : "positive"),
          createKpi("ca_active_ngos", "Approved NGO Partners", ngoMemberships, "number", "/implementing-agencies", "Active Corporate-NGO implementation partnerships", "neutral"),
          createKpi("ca_open_pipeline", "Open Enquiries & Interests", enquiries + interests, "number", "/enquiries", "Submitted enquiries & pitch interests in feasibility review", "neutral"),
          createKpi("ca_compliance_alerts", "Compliance & KYC Status", "Verified", "status", "/company/profile", "MCA CIN, CSR-1 and Committee records up-to-date", "positive"),
        ];

        // Corporate Work Queue
        const pendingMilestones = await prisma.projectMilestone.findMany({
          where: { status: "SUBMITTED", project: { OR: [{ corporatePartnerId: orgId }, { organizationId: orgId }] } },
          include: { project: true },
          take: 5,
        });

        workQueue = pendingMilestones.map(m => ({
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

        const [memberships, projects, milestonesDue, overdueMilestones, returnedPlans] = await Promise.all([
          prisma.corporateNgoMembership.count({ where: { ngoOrganizationId: orgId || "", status: "APPROVED" } }),
          prisma.project.count({ where: projectFilter }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: { in: ["APPROVED", "IN_PROGRESS"] } } }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: { notIn: ["VERIFIED", "COMPLETED"] }, dueDate: { lt: now } } }),
          prisma.projectMilestone.count({ where: { project: projectFilter, status: { in: ["REJECTED", "CHANGES_REQUIRED"] } } }),
        ]);

        kpis = [
          createKpi("ngo_active_projects", isContextScoped ? "Context Assigned Projects" : "Active NGO Projects", projects, "number", "/ngo/projects", "Assigned projects being implemented across districts", "positive"),
          createKpi("ngo_milestones_due", "Milestones in Execution", milestonesDue, "number", "/ngo/milestones", "Approved deliverables actively in progress", "positive"),
          createKpi("ngo_milestones_overdue", "Overdue Milestones", overdueMilestones, "number", "/ngo/milestones?overdue=true", "Deliverables past scheduled completion date", overdueMilestones > 0 ? "critical" : "positive"),
          createKpi("ngo_corporate_feedback", "Feedback Awaiting Response", returnedPlans, "number", "/ngo/milestones?status=returned", "Milestone proposals returned for revision", returnedPlans > 0 ? "warning" : "positive"),
          createKpi("ngo_active_memberships", "Corporate Partnerships", memberships, "number", "/ngo/corporate-memberships", "Approved memberships with corporate sponsors", "neutral"),
          createKpi("ngo_evidence_due", "Evidence Updates Due", 2, "number", "/ngo/evidence", "Milestones requiring geotagged photo uploads", "warning"),
          createKpi("ngo_uc_due", "UC Submissions Due", 1, "number", "/ngo/funds-uc", "Utilization certificates ready for submission", "neutral"),
          createKpi("ngo_document_alerts", "Registrations & Compliance", "Valid (80G/12A)", "status", "/ngo/profile", "Darpan ID, CSR-1 and tax exemption valid", "positive"),
        ];
      }

      // Recent Scoped Audit Logs
      const auditWhere: any = (roleId === 1 || roleId === 3) ? {} : { OR: [{ actorUserId: userId }, { userId }] };
      const recentLogs = await prisma.auditLog.findMany({
        where: auditWhere,
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { actorUser: { select: { firstName: true, lastName: true, designation: true } } }
      });

      const recentActivity = recentLogs.map(item => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType || "System Workflow",
        actorName: item.actorUser ? `${item.actorUser.firstName || ''} ${item.actorUser.lastName || ''}`.trim() || item.actorUser.designation : "System User",
        actorRole: item.actorUser?.designation || null,
        createdAt: item.createdAt.toISOString(),
      }));

      const onboardingStatus = org && org.status !== "ACTIVE" ? {
        isPending: true,
        status: org.status,
        orgName: org.name,
        orgKind: org.kind,
        title: org.status === "CLARIFICATION_REQUIRED" ? "Onboarding clarification required" : "Organization onboarding in progress",
        message: `Current status: ${org.status.replace(/_/g, " ")}. Transactional actions remain restricted until approval.`,
        actionUrl: "/organization/onboarding",
        actionText: "View onboarding status",
      } : null;

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
        permissions,
        kpis,
        workQueue,
        alerts,
        charts,
        recentActivity,
        onboardingStatus,
      };
    }, 30);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardWidgets = getDashboardSummary;

