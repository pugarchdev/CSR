import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { computeUserPermissions } from "../services/permissionService";

interface Kpi { key: string; label: string; value: number; href: string; description: string }
const card = (key: string, label: string, value: number, href: string, description: string): Kpi => ({ key, label, value, href, description });
const ACTIVE_CASES = ["RM_ASSIGNED", "RM_REVIEW", "CONTACT_IN_PROGRESS", "FEASIBILITY_IN_PROGRESS", "CLARIFICATION_REQUIRED", "JS_REVIEW", "JS_CLARIFICATION", "JS_APPROVED", "ASSIGNMENT_PENDING_ACCEPTANCE", "GOVERNMENT_ASSIGNED", "NODAL_REASSIGNMENT_REQUIRED", "ASSIGNMENT_ESCALATED"];
const ACTIVE_PROJECTS: any[] = ["APPROVED", "AGREEMENT_SIGNED", "EXECUTION_STARTED", "IN_PROGRESS", "FUNDED"];

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.setHeader("Cache-Control", "private, no-store");
    const userId = req.user!.id;
    const roleId = Number(req.user?.roleId);
    const orgId = req.user?.organizationId || null;
    const now = new Date();
    const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, kind: true, status: true, governmentLevel: true, parentOrganizationId: true } }) : null;
    const permissionData = await computeUserPermissions({ userId, role: req.user?.role, roleId: req.user?.roleId, organizationId: orgId }).catch(() => ({ permissions: [] as string[] } as any));
    const permissions = Object.fromEntries(["dashboard:view", "dashboard:widget-kpis", "dashboard:widget-workqueue", "dashboard:widget-activity", ...(permissionData.permissions || [])].map(key => [key, true]));
    let kpis: Kpi[] = [];

    if (roleId === 1 || roleId === 3) {
      const [mainOnboarding, jsCases, awaitingAssignment, unassigned, escalations, overdue] = await Promise.all([
        prisma.governmentOnboardingApplication.count({ where: { reviewerRoleCode: "JOINT_SECRETARY", status: "UNDER_VERIFICATION" } }),
        prisma.portalCase.count({ where: { currentStage: "JS_REVIEW", status: { notIn: ["JS_APPROVED", "JS_REJECTED"] } } }),
        prisma.portalCase.count({ where: { status: "JS_APPROVED", governmentAssignments: { none: { status: { notIn: ["CLOSED", "REVOKED"] } } } } }),
        prisma.portalCase.count({ where: { status: "UNASSIGNED" } }),
        prisma.governmentAssignment.count({ where: { status: { in: ["REJECTED_AWAITING_HEAD_REASSIGNMENT", "ESCALATED_TO_JS_WRONG_DISTRICT"] } } }),
        prisma.sLAEscalation.count({ where: { isResolved: false, dueDate: { lt: now } } }),
      ]);
      kpis = [card("mainOnboarding", "Main onboardings awaiting JS", mainOnboarding, "/admin/onboarding-approvals?reviewer=JOINT_SECRETARY&status=UNDER_VERIFICATION", "Main CSR Cell applications submitted for Joint Secretary decision"), card("jsCases", "Case decisions awaiting JS", jsCases, "/decisions?stage=JS_REVIEW", "Enquiry, pitch, and interest cases submitted for decision"), card("awaitingAssignment", "Approved cases awaiting assignment", awaitingAssignment, "/assignments?status=JS_APPROVED", "JS-approved cases without an active government assignment"), card("unassigned", "Cases without an RM", unassigned, "/admin/enquiry-routing?status=UNASSIGNED", "Cases queued because no eligible RM was available"), card("assignmentEscalations", "Assignment escalations", escalations, "/escalations?type=GOVERNMENT_ASSIGNMENT", "Rejected Nodal assignments and wrong-district escalations"), card("overdue", "Overdue workflow items", overdue, "/escalations?overdue=true", "Unresolved SLA items past their due date")];
    } else if (roleId === 2) {
      const [pending, clarifications, overdue, active, rejected] = await Promise.all([
        prisma.governmentOnboardingApplication.count({ where: { reviewerRoleCode: "PLANNING_SECRETARY", status: "UNDER_VERIFICATION" } }),
        prisma.governmentOnboardingApplication.count({ where: { reviewerRoleCode: "PLANNING_SECRETARY", status: "CLARIFICATION_REQUIRED" } }),
        prisma.sLAEscalation.count({ where: { isResolved: false, dueDate: { lt: now }, stage: { contains: "ONBOARD", mode: "insensitive" } } }),
        prisma.organization.count({ where: { governmentLevel: "SUB_DEPARTMENT", status: "ACTIVE" } }),
        prisma.organization.count({ where: { governmentLevel: "SUB_DEPARTMENT", status: "REJECTED" } }),
      ]);
      kpis = [card("pendingSubDepartments", "Sub-departments awaiting decision", pending, "/admin/onboarding-approvals?reviewer=PLANNING_SECRETARY&status=UNDER_VERIFICATION", "Submitted child-organization applications"), card("subDepartmentClarifications", "Clarifications outstanding", clarifications, "/admin/onboarding-approvals?reviewer=PLANNING_SECRETARY&status=CLARIFICATION_REQUIRED", "Applications returned for clarification"), card("overdueDecisions", "Overdue onboarding decisions", overdue, "/escalations?stage=ONBOARDING", "Unresolved onboarding SLA items past due"), card("activeSubDepartments", "Active sub-departments", active, "/departments?level=SUB_DEPARTMENT&status=ACTIVE", "Approved child organizations"), card("rejectedSubDepartments", "Rejected sub-departments", rejected, "/departments?level=SUB_DEPARTMENT&status=REJECTED", "Child applications rejected after review")];
    } else if (roleId === 6) {
      const staleAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const base = { assignedRmId: userId };
      const [active, uncontacted, assessments, clarifications, overdue, stale] = await Promise.all([
        prisma.portalCase.count({ where: { ...base, status: { in: ACTIVE_CASES } } }),
        prisma.portalCase.count({ where: { ...base, status: { in: ACTIVE_CASES }, firstContactedAt: null } }),
        prisma.portalCase.count({ where: { ...base, currentStage: "RM_FEASIBILITY", status: { in: ACTIVE_CASES } } }),
        prisma.portalCase.count({ where: { ...base, status: { in: ["CLARIFICATION_REQUIRED", "JS_CLARIFICATION"] } } }),
        prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
        prisma.portalCase.count({ where: { ...base, status: { in: ACTIVE_CASES }, OR: [{ lastInteractionAt: { lt: staleAt } }, { lastInteractionAt: null, createdAt: { lt: staleAt } }] } }),
      ]);
      kpis = [card("myActiveCases", "My active cases", active, "/rm?scope=active", "Open enquiry, pitch, and interest cases assigned to you"), card("uncontactedCases", "New cases not contacted", uncontacted, "/rm?contacted=false", "Assigned open cases with no first interaction"), card("assessmentsDue", "Feasibility assessments due", assessments, "/assessments?owner=me&status=due", "Cases at the RM feasibility stage"), card("clarificationsReturned", "Clarifications returned", clarifications, "/rm?status=clarification", "Cases requiring RM coordination and resubmission"), card("overdueCases", "Overdue cases", overdue, "/escalations?owner=me&overdue=true", "Your unresolved SLA items past due"), card("staleCases", "No interaction in 7 days", stale, "/rm?interaction=stale", "Active cases without recent contact")];
    } else if (roleId === 5) {
      const [supported, pending, escalated, overdue] = await Promise.all([
        prisma.governmentAssignmentDnc.count({ where: { dncUserId: userId, status: "ACTIVE", governmentAssignment: { status: "ACTIVE" } } }),
        prisma.governmentAssignmentDnc.count({ where: { dncUserId: userId, status: "ACTIVE", governmentAssignment: { status: "PENDING_ACCEPTANCE" } } }),
        prisma.governmentAssignmentDnc.count({ where: { dncUserId: userId, governmentAssignment: { status: { in: ["REJECTED_AWAITING_HEAD_REASSIGNMENT", "ESCALATED_TO_JS_WRONG_DISTRICT"] } } } }),
        prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
      ]);
      kpis = [card("supportedAssignments", "Supported active assignments", supported, "/assignments/dnc?status=ACTIVE", "Active assignments where you are linked as DNC support"), card("pendingSupport", "Pending support actions", pending, "/assignments/dnc?status=PENDING_ACCEPTANCE", "Linked assignments not yet accepted by the primary Nodal"), card("supportEscalations", "Reassignment/escalation requests", escalated, "/escalations?scope=dnc", "Supported assignments currently escalated"), card("overdueSupported", "Overdue support items", overdue, "/escalations?owner=me&overdue=true", "Your unresolved support SLA items past due")];
    } else if (roleId === 4) {
      const [pending, active, overdue] = await Promise.all([
        prisma.projectDistrictAssignment.count({ where: { nodalUserId: userId, status: "PENDING_ACCEPTANCE" } }),
        prisma.projectDistrictAssignment.count({ where: { nodalUserId: userId, status: "ACTIVE" } }),
        prisma.sLAEscalation.count({ where: { responsibleUserId: userId, isResolved: false, dueDate: { lt: now } } }),
      ]);
      kpis = [card("pendingAcceptance", "Assignments pending acceptance", pending, "/assignments?owner=me&status=PENDING_ACCEPTANCE", "District execution assignments awaiting your response"), card("activeDistrictProjects", "My active district assignments", active, "/assignments?owner=me&status=ACTIVE", "Accepted district execution responsibility"), card("overdueMonitoring", "Overdue monitoring actions", overdue, "/escalations?owner=me&overdue=true", "Monitoring SLA items past due")];
    } else if (roleId === 7 && orgId) {
      const pitchIds = await prisma.governmentPitch.findMany({ where: { OR: [{ organizationId: orgId }, { departmentId: orgId }, { parentOrganizationId: orgId }] }, select: { id: true } });
      const ids = pitchIds.map(p => p.id);
      const membership = await prisma.organizationMembership.findFirst({ where: { organizationId: orgId, userId, status: "ACTIVE" }, select: { membershipType: true } });
      const [activePitches, clarifications, publicPitches, interests, projects, incomingAssignments, activeNodals] = await Promise.all([
        prisma.governmentPitch.count({ where: { id: { in: ids }, status: { notIn: ["REJECTED", "CANCELLED"] } } }),
        prisma.governmentPitch.count({ where: { id: { in: ids }, status: { contains: "CLARIFICATION" } } }),
        prisma.governmentPitch.count({ where: { id: { in: ids }, status: { in: ["PUBLIC", "PUBLISHED", "APPROVED"] } } }),
        prisma.corporatePitchInterest.count({ where: { pitchId: { in: ids } } }),
        prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ organizationId: orgId }, { departmentOrganizationId: orgId }, { parentOrganizationId: orgId }] } }),
        prisma.governmentAssignment.count({ where: { governmentOrganizationId: orgId, status: { in: ["PENDING_ACCEPTANCE", "ACTIVE", "REJECTED_AWAITING_HEAD_REASSIGNMENT"] } } }),
        prisma.organizationMembership.count({ where: { organizationId: orgId, membershipType: "NODAL", status: "ACTIVE" } }),
      ]);
      kpis = [card("myPitches", "My pitches in active stages", activePitches, "/pitches?scope=organization&active=true", "Organization and child-organization pitches not closed or rejected"), card("pitchClarifications", "Pitch clarifications requiring response", clarifications, "/pitches?status=clarification", "Submitted pitches returned for clarification"), card("publicPitches", "Public pitches", publicPitches, "/pitches?status=PUBLIC", "Organization pitches approved for marketplace publication"), card("receivedInterests", "Corporate interests received", interests, "/interests?scope=organization", "Interest records linked only to this organization's pitches"), card("activeProjects", "Approved/active projects", projects, "/convergence-projects?scope=organization&active=true", "Visible projects in approved or execution statuses")];
      if (membership?.membershipType === "HEAD") kpis.push(card("incomingAssignments", "Incoming/active assignments", incomingAssignments, "/assignments?scope=organization", "Government assignments owned by this CSR Cell"), card("activeNodals", "Active Nodal Officers", activeNodals, "/organization/users?membership=NODAL&status=ACTIVE", "Active Nodal memberships in this organization"));
    } else if (roleId === 8 && orgId) {
      const [enquiries, enquiryClarifications, interests, projects, milestoneReviews, ngoActions] = await Promise.all([
        prisma.corporateEnquiry.count({ where: { organizationId: orgId, status: { notIn: ["REJECTED", "CLOSED"] } } }),
        prisma.corporateEnquiry.count({ where: { organizationId: orgId, status: { contains: "CLARIFICATION" } } }),
        prisma.corporatePitchInterest.count({ where: { corporateId: orgId, status: { notIn: ["REJECTED", "CLOSED"] } } }),
        prisma.project.count({ where: { status: { in: ACTIVE_PROJECTS }, OR: [{ corporatePartnerId: orgId }, { organizationId: orgId }] } }),
        prisma.projectMilestone.count({ where: { status: "SUBMITTED", project: { OR: [{ corporatePartnerId: orgId }, { organizationId: orgId }] } } }),
        prisma.corporateNgoMembership.count({ where: { corporateOrganizationId: orgId, status: { in: ["PENDING_CORPORATE_REVIEW", "CLARIFICATION_REQUIRED", "INVITED"] } } }),
      ]);
      kpis = [card("activeEnquiries", "My active enquiries", enquiries, "/enquiries?active=true", "Corporate enquiries that are not closed or rejected"), card("enquiryClarifications", "Enquiry clarifications", enquiryClarifications, "/enquiries?status=clarification", "Enquiries requiring a Corporate response through the RM"), card("interestsUnderReview", "Interests under review", interests, "/company/interests?active=true", "Your pitch-interest cases still in workflow"), card("activeProjects", "Approved/active projects", projects, "/company/projects?active=true", "Corporate projects in approved or execution statuses"), card("milestonePlansAwaiting", "Milestone plans awaiting decision", milestoneReviews, "/milestones?status=SUBMITTED", "NGO-proposed milestone plans requiring Corporate approval"), card("ngoActions", "NGO membership actions", ngoActions, "/organization/sub-logins?status=action-required", "Invited, clarification, or review-pending Corporate–NGO memberships")];
    } else if (roleId === 9 && req.user?.ngoAccessId) {
      const access = await prisma.corporateNgoAccess.findUnique({ where: { id: req.user.ngoAccessId }, include: { membership: true } });
      const projectIds = access?.projectIds || [];
      const [projects, planDue, progressDue, returned, overdue] = await Promise.all([
        prisma.project.count({ where: { id: { in: projectIds }, implementingAgencies: { some: { agencyOrganizationId: access?.membership.ngoOrganizationId, status: "ACTIVE" } } } }),
        prisma.project.count({ where: { id: { in: projectIds }, implementationPlanStatus: "PENDING" } }),
        prisma.projectMilestone.count({ where: { projectId: { in: projectIds }, status: { in: ["APPROVED", "IN_PROGRESS"] }, dueDate: { gte: now } } }),
        prisma.projectMilestone.count({ where: { projectId: { in: projectIds }, status: { in: ["REJECTED", "CHANGES_REQUIRED"] } } }),
        prisma.projectMilestone.count({ where: { projectId: { in: projectIds }, status: { notIn: ["VERIFIED", "COMPLETED"] }, dueDate: { lt: now } } }),
      ]);
      kpis = [card("contextProjects", "Projects in this Corporate context", projects, "/ngo/proposal-requests", "Only projects explicitly assigned to this Corporate–NGO access"), card("plansDue", "Milestone plans due", planDue, "/ngo/milestones?plan=pending", "Assigned projects without an approved implementation plan"), card("progressDue", "Progress updates due", progressDue, "/ngo/milestones?progress=due", "Approved/in-progress milestones with upcoming due dates"), card("returnedEvidence", "Evidence or plans returned", returned, "/ngo/milestones?status=returned", "Milestones needing NGO correction"), card("overdueMilestones", "Overdue milestones", overdue, "/ngo/milestones?overdue=true", "Incomplete milestones past their due date")];
    }

    const auditWhere: any = roleId === 1 || roleId === 3 ? {} : { OR: [{ actorUserId: userId }, { userId }] };
    const recent = await prisma.auditLog.findMany({ where: auditWhere, take: 8, orderBy: { createdAt: "desc" }, select: { id: true, action: true, entityType: true, createdAt: true } });
    const onboardingStatus = org && org.status !== "ACTIVE" ? { isPending: true, status: org.status, orgName: org.name, orgKind: org.kind, title: org.status === "CLARIFICATION_REQUIRED" ? "Onboarding clarification required" : "Organization onboarding in progress", message: `Current status: ${org.status.replace(/_/g, " ")}. Transactional actions remain restricted until approval.`, actionUrl: "/organization/onboarding/status", actionText: "View onboarding status" } : null;
    return res.json({ success: true, data: { generatedAt: now.toISOString(), asOf: now.toISOString(), permissions, kpis, pendingApprovals: kpis.filter(k => /awaiting|pending|due|required/i.test(k.label)).reduce((n, k) => n + k.value, 0), openEscalations: kpis.filter(k => /escalation|overdue/i.test(k.label)).reduce((n, k) => n + k.value, 0), recentActivity: recent.map(x => ({ ...x, createdAt: x.createdAt.toISOString(), actorRole: null })), onboardingStatus, orgName: org?.name || null, orgKind: org?.kind || null, orgStatus: org?.status || null, userRoleId: roleId } });
  } catch (error) { next(error); }
};

export const getDashboardWidgets = getDashboardSummary;
