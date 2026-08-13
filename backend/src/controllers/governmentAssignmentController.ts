import { NextFunction, Response } from "express";
import crypto from "crypto";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

const FINAL_ASSIGNMENT_STATUSES = ["COMPLETED", "CLOSED", "REVOKED"];

export const listGovernmentAssignmentWorkspace = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.user?.roleId);
    const isJs = roleId === 3;
    const pendingCases = isJs ? await prisma.portalCase.findMany({
      where: { currentStage: { in: ["GOVERNMENT_ASSIGNMENT", "JS_ASSIGNMENT_CORRECTION"] }, status: { in: ["JS_APPROVED", "ASSIGNMENT_ESCALATED"] } },
      select: { id: true, trackingId: true, type: true, targetDistricts: true, geographicScope: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
    }) : [];
    const assignments = await prisma.governmentAssignment.findMany({
      where: isJs ? {} : { OR: [
        { primaryNodalUserId: req.user!.id }, { csrCellHeadUserId: req.user!.id },
        { governmentOrganization: { departmentHeadUserId: req.user!.id } }, { dncLinks: { some: { dncUserId: req.user!.id } } },
      ] },
      include: {
        case: { select: { id: true, trackingId: true, type: true, targetDistricts: true, status: true } },
        governmentOrganization: { select: { id: true, name: true, district: true, memberships: { where: { membershipType: "NODAL", status: "ACTIVE", user: { accountStatus: "ACTIVE", isVerified: true } }, select: { user: { select: { id: true, firstName: true, lastName: true, designation: true } } } } } },
        districtAssignments: true, dncLinks: true, events: { orderBy: { createdAt: "desc" }, take: 5 },
      },
      orderBy: { updatedAt: "desc" }, take: 100,
    });
    return res.json({ success: true, data: { pendingCases, assignments } });
  } catch (error) { next(error); }
};

async function activeNodal(organizationId: string, userId: string) {
  return prisma.organizationMembership.findFirst({
    where: { organizationId, userId, membershipType: "NODAL", status: "ACTIVE", user: { accountStatus: "ACTIVE", isVerified: true } },
  });
}

export const getGovernmentAssignmentOptions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const caseRecord = await prisma.portalCase.findUnique({ where: { id: req.params.caseId } });
    if (!caseRecord) return res.status(404).json({ error: "Case not found" });
    const multi = caseRecord.geographicScope !== "SINGLE_DISTRICT" || caseRecord.targetDistricts.length > 1;
    const organizations = await prisma.organization.findMany({
      where: { kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE", deletedAt: null, ...(multi ? { governmentType: "STATE_CSR_CELL" } : { governmentLevel: "MAIN", district: { in: caseRecord.targetDistricts } }) },
      select: { id: true, name: true, governmentType: true, district: true, memberships: { where: { membershipType: "NODAL", status: "ACTIVE", user: { accountStatus: "ACTIVE", isVerified: true } }, select: { user: { select: { id: true, firstName: true, lastName: true, designation: true } } } } },
    });
    return res.json({ data: { case: caseRecord, ownershipLevel: multi ? "STATE" : "DISTRICT", organizations } });
  } catch (error) { next(error); }
};

export const createGovernmentAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId, projectId, governmentOrganizationId, primaryNodalUserId, districtAssignments = [], dncUserIds = [] } = req.body;
    const caseRecord = await prisma.portalCase.findUnique({ where: { id: caseId } });
    if (!caseRecord) return res.status(404).json({ error: "Case not found" });
    if (!caseRecord.status.includes("APPROV") && caseRecord.currentStage !== "GOVERNMENT_ASSIGNMENT") return res.status(409).json({ error: "Only a JS-approved case can be assigned" });
    const organization = await prisma.organization.findFirst({ where: { id: governmentOrganizationId, kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" } });
    if (!organization) return res.status(400).json({ error: "Select an active Government CSR Cell" });
    const multi = caseRecord.geographicScope !== "SINGLE_DISTRICT" || caseRecord.targetDistricts.length > 1;
    if (multi && organization.governmentType !== "STATE_CSR_CELL") return res.status(400).json({ error: "Multi-district cases must be owned by the State CSR Cell" });
    if (!multi && (organization.governmentLevel !== "MAIN" || !caseRecord.targetDistricts.includes(organization.district || ""))) return res.status(400).json({ error: "Select an active main CSR Cell in the approved district" });
    if (!(await activeNodal(organization.id, primaryNodalUserId))) return res.status(400).json({ error: "Primary Nodal Officer must be active in the selected CSR Cell" });
    if (projectId && !(await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } }))) return res.status(400).json({ error: "Linked project does not exist" });
    const duplicate = await prisma.governmentAssignment.findFirst({ where: { caseId, status: { notIn: FINAL_ASSIGNMENT_STATUSES } } });
    if (duplicate) return res.status(409).json({ error: "This case already has an active government assignment" });
    const normalizedDistricts = multi ? caseRecord.targetDistricts : [organization.district || caseRecord.targetDistricts[0]].filter(Boolean);
    if (multi && normalizedDistricts.some(d => !districtAssignments.some((a: any) => a.district === d))) return res.status(400).json({ error: "Every target district requires a district execution assignment entry" });
    const letterPayload = JSON.stringify({ caseId, trackingId: caseRecord.trackingId, governmentOrganizationId, primaryNodalUserId, districts: normalizedDistricts, issuedAt: new Date().toISOString(), templateVersion: "assignment-v1" });
    const letterHash = crypto.createHash("sha256").update(letterPayload).digest("hex");
    const assignment = await prisma.$transaction(async tx => {
      const created = await tx.governmentAssignment.create({ data: {
        caseId, projectId: projectId || null, governmentOrganizationId, primaryNodalUserId, stateNodalUserId: multi ? primaryNodalUserId : null, csrCellHeadUserId: organization.departmentHeadUserId,
        ownershipLevel: multi ? "STATE" : "DISTRICT", assignedByUserId: req.user!.id,
        status: "PENDING_ACCEPTANCE", assignmentLetterHash: letterHash, letterTemplateVersion: "assignment-v1",
      }});
      if (normalizedDistricts.length) await tx.projectDistrictAssignment.createMany({ data: normalizedDistricts.map(district => {
        const supplied = districtAssignments.find((a: any) => a.district === district) || {};
        return { governmentAssignmentId: created.id, projectId: projectId || null, district, governmentOrganizationId: supplied.governmentOrganizationId || (multi ? null : organization.id), nodalUserId: supplied.nodalUserId || (multi ? null : primaryNodalUserId), assignedByUserId: req.user!.id, status: supplied.nodalUserId || !multi ? "PENDING_ACCEPTANCE" : "AWAITING_DISTRICT_OWNER" };
      }) });
      if (dncUserIds.length) {
        const dncs = await tx.user.findMany({ where: { id: { in: dncUserIds }, roleId: 5, accountStatus: "ACTIVE", isVerified: true }, select: { id: true } });
        if (dncs.length !== new Set(dncUserIds).size) throw new Error("Every DNC must be active and verified");
        await tx.governmentAssignmentDnc.createMany({ data: dncs.map(d => ({ governmentAssignmentId: created.id, dncUserId: d.id, permissions: ["assignment:view", "assignment:comment"], linkedByUserId: req.user!.id })) });
      }
      await tx.governmentAssignmentEvent.create({ data: { governmentAssignmentId: created.id, eventType: "ASSIGNED_BY_JS", toOwnerUserId: primaryNodalUserId, actorUserId: req.user!.id, metadata: { letterHash, targetDistricts: normalizedDistricts } } });
      await tx.portalCase.update({ where: { id: caseId }, data: { currentStage: "GOVERNMENT_ACCEPTANCE", status: "ASSIGNMENT_PENDING_ACCEPTANCE", version: { increment: 1 } } });
      await tx.caseStatusHistory.create({ data: { caseId, version: caseRecord.version + 1, fromStatus: caseRecord.status, toStatus: "ASSIGNMENT_PENDING_ACCEPTANCE", stage: "GOVERNMENT_ACCEPTANCE", action: "GOVERNMENT_ASSIGNED", actorUserId: req.user!.id, metadata: { assignmentId: created.id, letterHash } } });
      await tx.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: "GOVERNMENT_CASE_ASSIGNED", entityType: "GovernmentAssignment", entityId: created.id, details: { caseId, organizationId: organization.id, primaryNodalUserId, ownershipLevel: multi ? "STATE" : "DISTRICT", letterHash } } });
      return created;
    });
    return res.status(201).json({ success: true, assignmentId: assignment.id, status: assignment.status, letter: { templateVersion: "assignment-v1", sha256: letterHash } });
  } catch (error) { next(error); }
};

export const respondToGovernmentAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { decision, reason } = req.body;
    const assignment = await prisma.governmentAssignment.findUnique({ where: { id: req.params.assignmentId }, include: { case: true } });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.primaryNodalUserId !== req.user!.id) return res.status(403).json({ error: "Only the selected primary Nodal Officer may respond" });
    if (assignment.status !== "PENDING_ACCEPTANCE") return res.status(409).json({ error: "Assignment has already been responded to" });
    if (decision === "REJECT" && !String(reason || "").trim()) return res.status(400).json({ error: "A rejection reason is required" });
    const nextStatus = decision === "ACCEPT" ? "ACTIVE" : "REJECTED_AWAITING_HEAD_REASSIGNMENT";
    await prisma.$transaction(async tx => {
      await tx.governmentAssignment.update({ where: { id: assignment.id }, data: { status: nextStatus, acceptedAt: decision === "ACCEPT" ? new Date() : null } });
      await tx.governmentAssignmentEvent.create({ data: { governmentAssignmentId: assignment.id, eventType: decision === "ACCEPT" ? "NODAL_ACCEPTED" : "NODAL_REJECTED", fromOwnerUserId: req.user!.id, actorUserId: req.user!.id, reasonCode: decision === "REJECT" ? "NODAL_DECLINED" : null, remarks: reason || null } });
      await tx.portalCase.update({ where: { id: assignment.caseId }, data: { currentStage: decision === "ACCEPT" ? "PROJECT_EXECUTION" : "CSR_CELL_REASSIGNMENT", status: decision === "ACCEPT" ? "GOVERNMENT_ASSIGNED" : "NODAL_REASSIGNMENT_REQUIRED", version: { increment: 1 } } });
      await tx.caseStatusHistory.create({ data: { caseId: assignment.caseId, version: assignment.case.version + 1, fromStatus: assignment.case.status, toStatus: decision === "ACCEPT" ? "GOVERNMENT_ASSIGNED" : "NODAL_REASSIGNMENT_REQUIRED", stage: decision === "ACCEPT" ? "PROJECT_EXECUTION" : "CSR_CELL_REASSIGNMENT", action: decision === "ACCEPT" ? "NODAL_ACCEPTED" : "NODAL_REJECTED", actorUserId: req.user!.id, remarks: reason || null } });
    });
    return res.json({ success: true, status: nextStatus });
  } catch (error) { next(error); }
};

export const reassignRejectedNodal = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { replacementNodalUserId, reason } = req.body;
    const assignment = await prisma.governmentAssignment.findUnique({ where: { id: req.params.assignmentId }, include: { governmentOrganization: true } });
    if (!assignment || assignment.status !== "REJECTED_AWAITING_HEAD_REASSIGNMENT" || !assignment.governmentOrganizationId) return res.status(409).json({ error: "Assignment is not awaiting Head reassignment" });
    if (assignment.governmentOrganization?.departmentHeadUserId !== req.user!.id) return res.status(403).json({ error: "Only the CSR Cell Head may reassign the Nodal Officer" });
    if (!(await activeNodal(assignment.governmentOrganizationId, replacementNodalUserId))) return res.status(400).json({ error: "Choose an active Nodal Officer from this CSR Cell" });
    const old = assignment.primaryNodalUserId;
    await prisma.$transaction([
      prisma.governmentAssignment.update({ where: { id: assignment.id }, data: { primaryNodalUserId: replacementNodalUserId, status: "PENDING_ACCEPTANCE", acceptedAt: null } }),
      prisma.governmentAssignmentEvent.create({ data: { governmentAssignmentId: assignment.id, eventType: "HEAD_REASSIGNED_NODAL", fromOwnerUserId: old, toOwnerUserId: replacementNodalUserId, actorUserId: req.user!.id, reasonCode: "AFTER_NODAL_REJECTION", remarks: reason || null } }),
    ]);
    return res.json({ success: true, status: "PENDING_ACCEPTANCE" });
  } catch (error) { next(error); }
};

export const escalateWrongDistrict = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    if (!String(reason || "").trim()) return res.status(400).json({ error: "A district correction reason is required" });
    const assignment = await prisma.governmentAssignment.findUnique({ where: { id: req.params.assignmentId }, include: { governmentOrganization: true, case: true } });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    const isHead = assignment.governmentOrganization?.departmentHeadUserId === req.user!.id;
    const isNodal = assignment.primaryNodalUserId === req.user!.id;
    if (!isHead && !isNodal) return res.status(403).json({ error: "Only the assigned CSR Cell Head or Nodal may escalate" });
    await prisma.$transaction([
      prisma.governmentAssignment.update({ where: { id: assignment.id }, data: { status: "ESCALATED_TO_JS_WRONG_DISTRICT" } }),
      prisma.governmentAssignmentEvent.create({ data: { governmentAssignmentId: assignment.id, eventType: "WRONG_DISTRICT_ESCALATED_TO_JS", actorUserId: req.user!.id, reasonCode: "WRONG_DISTRICT", remarks: reason } }),
      prisma.portalCase.update({ where: { id: assignment.caseId }, data: { currentStage: "JS_ASSIGNMENT_CORRECTION", status: "ASSIGNMENT_ESCALATED", version: { increment: 1 } } }),
      prisma.caseStatusHistory.create({ data: { caseId: assignment.caseId, version: assignment.case.version + 1, fromStatus: assignment.case.status, toStatus: "ASSIGNMENT_ESCALATED", stage: "JS_ASSIGNMENT_CORRECTION", action: "WRONG_DISTRICT_ESCALATED", actorUserId: req.user!.id, remarks: reason } }),
    ]);
    return res.json({ success: true, status: "ESCALATED_TO_JS_WRONG_DISTRICT" });
  } catch (error) { next(error); }
};

export const getGovernmentAssignmentDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignment = await prisma.governmentAssignment.findUnique({ where: { id: req.params.assignmentId }, include: { case: { include: { statusHistory: { orderBy: { createdAt: "asc" } } } }, governmentOrganization: true, districtAssignments: true, dncLinks: true, events: { orderBy: { createdAt: "asc" } } } });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    const allowed = [1, 2, 3].includes(Number(req.user?.roleId)) || assignment.primaryNodalUserId === req.user!.id || assignment.csrCellHeadUserId === req.user!.id || assignment.governmentOrganization?.departmentHeadUserId === req.user!.id || assignment.dncLinks.some(d => d.dncUserId === req.user!.id);
    if (!allowed) return res.status(403).json({ error: "You are not scoped to this assignment" });
    return res.json({ data: assignment });
  } catch (error) { next(error); }
};
