import { NextFunction, Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { PortalCaseService } from "../services/portalCaseService";

export const listMyCases = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.portalCase.findMany({ where: { assignedRmId: req.user!.id }, include: { assessments: { orderBy: { version: "desc" }, take: 1 }, _count: { select: { interactions: true } } }, orderBy: { updatedAt: "desc" } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getCaseDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const record = await PortalCaseService.getCase(req.params.caseId);
    if (!record) return res.status(404).json({ error: "Case not found" });
    const privileged = [1, 3].includes(Number(req.user?.roleId));
    const participant = record.assignedRmId === req.user!.id || record.submittedByUserId === req.user!.id || record.submittingOrganizationId === req.user?.organizationId;
    if (!privileged && !participant) return res.status(403).json({ error: "Case is outside your scope" });
    return res.json({ success: true, data: record });
  } catch (error) { next(error); }
};

export const logCaseInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interaction = await PortalCaseService.addInteraction({ caseId: req.params.caseId, actorUserId: req.user!.id, interactionType: req.body.interactionType, participants: req.body.participants, summary: req.body.summary, budgetDiscussion: req.body.budgetDiscussion, notes: req.body.notes, attachmentUrls: req.body.attachmentUrls || [], occurredAt: new Date(req.body.occurredAt) });
    return res.status(201).json({ success: true, data: interaction });
  } catch (error) { next(error); }
};

export const submitCaseFeasibility = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { checklist, recommendation, executiveSummary, targetDistricts, targetDepartmentId, conditions } = req.body;
    if (!Array.isArray(checklist) || checklist.length !== 13) return res.status(400).json({ error: "The complete 13-point feasibility checklist is required" });
    if (checklist.some((item: any, index: number) => !item || item.answer === undefined || item.answer === null || (item.answer === "CONDITIONAL" && !String(item.remarks || "").trim()))) return res.status(400).json({ error: "Every feasibility item needs an answer; conditional answers also require remarks" });
    if (!Array.isArray(targetDistricts) || targetDistricts.length < 1) return res.status(400).json({ error: "At least one target district is required" });
    const caseRecord = await prisma.portalCase.findUnique({ where: { id: req.params.caseId }, include: { assessments: { orderBy: { version: "desc" }, take: 1 } } });
    if (!caseRecord) return res.status(404).json({ error: "Case not found" });
    if (caseRecord.assignedRmId !== req.user!.id) return res.status(403).json({ error: "Only the assigned RM may submit feasibility" });
    const last = caseRecord.assessments[0];
    if (last && !["CLARIFICATION_REQUIRED", "DRAFT"].includes(last.status)) return res.status(409).json({ error: "The latest assessment is not editable or awaiting resubmission" });
    const nextVersion = (last?.version || 0) + 1;
    const result = await prisma.$transaction(async tx => {
      const assessment = await tx.caseFeasibilityAssessment.create({ data: { caseId: caseRecord.id, version: nextVersion, checklist, recommendation, executiveSummary: executiveSummary || null, targetDistricts, targetDepartmentId: targetDepartmentId || null, conditions: conditions || undefined, assessedByUserId: req.user!.id, status: "SUBMITTED_TO_JS", submittedAt: new Date() } });
      const updated = await tx.portalCase.update({ where: { id: caseRecord.id }, data: { targetDistricts, geographicScope: targetDistricts.length > 1 ? "MULTI_DISTRICT" : "SINGLE_DISTRICT", currentStage: "JS_REVIEW", status: "FEASIBILITY_SUBMITTED", version: { increment: 1 } } });
      await tx.caseStatusHistory.create({ data: { caseId: caseRecord.id, version: updated.version, fromStatus: caseRecord.status, toStatus: "FEASIBILITY_SUBMITTED", stage: "JS_REVIEW", action: last ? "FEASIBILITY_RESUBMITTED" : "FEASIBILITY_SUBMITTED", actorUserId: req.user!.id, metadata: { assessmentId: assessment.id, assessmentVersion: nextVersion } } });
      await tx.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: last ? "CASE_FEASIBILITY_RESUBMITTED" : "CASE_FEASIBILITY_SUBMITTED", entityType: "PortalCase", entityId: caseRecord.id, details: { assessmentId: assessment.id, version: nextVersion, recommendation, targetDistricts } } });
      return assessment;
    });
    return res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const listJsCaseDecisions = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.caseFeasibilityAssessment.findMany({ where: { status: "SUBMITTED_TO_JS", case: { currentStage: "JS_REVIEW" } }, include: { case: true }, orderBy: { submittedAt: "asc" } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const decideCaseFeasibility = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { decision, reason, conditions } = req.body;
    const assessment = await prisma.caseFeasibilityAssessment.findUnique({ where: { id: req.params.assessmentId }, include: { case: true } });
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    if (assessment.status !== "SUBMITTED_TO_JS" || assessment.case.currentStage !== "JS_REVIEW") return res.status(409).json({ error: "Assessment is not awaiting JS decision" });
    if (decision !== "APPROVE" && !String(reason || "").trim()) return res.status(400).json({ error: "A reason is required for clarification or rejection" });
    const assessmentStatus = decision === "APPROVE" ? "APPROVED" : decision === "CLARIFICATION" ? "CLARIFICATION_REQUIRED" : "REJECTED";
    const caseStatus = decision === "APPROVE" ? "JS_APPROVED" : decision === "CLARIFICATION" ? "JS_CLARIFICATION" : "JS_REJECTED";
    const stage = decision === "APPROVE" ? "GOVERNMENT_ASSIGNMENT" : decision === "CLARIFICATION" ? "RM_CLARIFICATION" : "CLOSED";
    await prisma.$transaction(async tx => {
      await tx.caseFeasibilityAssessment.update({ where: { id: assessment.id }, data: { status: assessmentStatus, jsDecision: decision, jsDecisionReason: reason || null, jsDecidedByUserId: req.user!.id, jsDecidedAt: new Date(), conditions: conditions || assessment.conditions || undefined } });
      const updated = await tx.portalCase.update({ where: { id: assessment.caseId }, data: { status: caseStatus, currentStage: stage, closedAt: decision === "REJECT" ? new Date() : null, version: { increment: 1 } } });
      await tx.caseStatusHistory.create({ data: { caseId: assessment.caseId, version: updated.version, fromStatus: assessment.case.status, toStatus: caseStatus, stage, action: `JS_${decision}`, actorUserId: req.user!.id, remarks: reason || null, metadata: { assessmentId: assessment.id, assessmentVersion: assessment.version, conditions: conditions || null } } });
      await tx.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: `CASE_FEASIBILITY_JS_${decision}`, entityType: "PortalCase", entityId: assessment.caseId, details: { assessmentId: assessment.id, version: assessment.version, reason: reason || null, conditions: conditions || null } } });
    });
    return res.json({ success: true, status: caseStatus, stage });
  } catch (error) { next(error); }
};
