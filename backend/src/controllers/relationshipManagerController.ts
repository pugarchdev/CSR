import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { auditLog } from "../services/notificationService";
import { FEASIBILITY_CHECKLIST_SEED } from "../constants/mahacsr-framework";
import { createSLAEscalation } from "../services/slaEscalationService";
import { calculateSlaDueDate } from "../services/slaConfigService";
import { ROLE_ID } from "../types/role";
import { dispatchNotification, dispatchToContact } from "../services/notificationOrchestrator";
import { validatePitchVerificationChecklist } from "../utils/workflowValidation";
import { PortalCaseType } from "@prisma/client";
import { PortalCaseService } from "../services/portalCaseService";

function normalizeInteractionType(value: unknown): "CALL" | "VIDEO_CALL" | "PHYSICAL_MEETING" | "MESSAGE" {
  const normalized = String(value || "MESSAGE").trim().toUpperCase().replace(/[ -]+/g, "_");
  if (normalized === "CALL" || normalized === "VIDEO_CALL" || normalized === "PHYSICAL_MEETING") return normalized;
  return "MESSAGE";
}

function normalizeParticipants(value: unknown, fallbackSide: "CORPORATE" | "GOVERNMENT") {
  if (Array.isArray(value) && value.length > 0) {
    return value.slice(0, 50).map((participant: any) => ({
      name: participant?.name ? String(participant.name).slice(0, 160) : undefined,
      userId: participant?.userId ? String(participant.userId) : undefined,
      organizationId: participant?.organizationId ? String(participant.organizationId) : undefined,
      side: ["CORPORATE", "GOVERNMENT", "PORTAL"].includes(String(participant?.side).toUpperCase())
        ? String(participant.side).toUpperCase() as "CORPORATE" | "GOVERNMENT" | "PORTAL"
        : fallbackSide,
    }));
  }
  return [{ side: fallbackSide }];
}

export const getRMOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const [assignedEnquiries, assignedPitches, assignedInterests, activeWorkload, uncontacted, clarifications] = await Promise.all([
      prisma.portalCase.count({ where: { assignedRmId: userId, type: "CORPORATE_ENQUIRY" } }),
      prisma.portalCase.count({ where: { assignedRmId: userId, type: "GOVERNMENT_PITCH" } }),
      prisma.portalCase.count({ where: { assignedRmId: userId, type: "CORPORATE_PITCH_INTEREST" } }),
      prisma.portalCase.count({ where: { assignedRmId: userId, status: { notIn: ["APPROVED", "JS_APPROVED", "JS_REJECTED", "REJECTED", "RESOLVED", "CLOSED", "CANCELLED", "COMPLETED"] } } }),
      prisma.portalCase.count({ where: { assignedRmId: userId, firstContactedAt: null, status: { notIn: ["REJECTED", "CLOSED", "CANCELLED", "COMPLETED"] } } }),
      prisma.portalCase.count({ where: { assignedRmId: userId, currentStage: "RM_CLARIFICATION" } }),
    ]);

    return res.json({
      success: true,
      data: {
        assignedEnquiries,
        assignedPitches,
        assignedInterests,
        activeWorkload,
        uncontacted,
        clarifications,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listRMEnquiries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const enquiries = await prisma.corporateEnquiry.findMany({
      where: { assignedRelationshipManagerId: userId },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: enquiries });
  } catch (error) {
    next(error);
  }
};

export const getRMEnquiryById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const enquiry = await prisma.corporateEnquiry.findFirst({
      where: { id, assignedRelationshipManagerId: req.user!.id }
    });
    if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });
    return res.json({ success: true, data: enquiry });
  } catch (error) {
    next(error);
  }
};

export const listRMPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const pitches = await prisma.governmentPitch.findMany({
      where: { assignedRelationshipManagerId: userId },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: pitches });
  } catch (error) {
    next(error);
  }
};

export const getRMPitchById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const pitch = await prisma.governmentPitch.findFirst({
      where: { id, assignedRelationshipManagerId: req.user!.id }
    });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });
    return res.json({ success: true, data: pitch });
  } catch (error) {
    next(error);
  }
};

export const getRMEscalations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const escalations = await prisma.sLAEscalation.findMany({
      where: { responsibleUserId: userId, isResolved: false },
      orderBy: { dueDate: "asc" }
    });
    return res.json({ success: true, data: escalations });
  } catch (error) {
    next(error);
  }
};

export const getCorporateInterests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const interests = await prisma.corporatePitchInterest.findMany({
      where: { assignedRelationshipManagerId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ success: true, data: interests });
  } catch (error) {
    next(error);
  }
};

export const updateCorporateInterest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    const assignedInterest = await prisma.corporatePitchInterest.findFirst({ where: { id, assignedRelationshipManagerId: userId } });
    if (!assignedInterest) return res.status(404).json({ error: "Corporate interest not found in your assigned portfolio" });
    const interest = await prisma.corporatePitchInterest.update({
      where: { id: assignedInterest.id },
      data: { ...(status ? { status } : {}) }
    });

    await auditLog(userId, "CORPORATE_INTEREST_UPDATED", { interestId: id, status });
    return res.json({ success: true, data: interest });
  } catch (error) {
    next(error);
  }
};

export const verifyGovernmentPitch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const verification = validatePitchVerificationChecklist(req.body);
    if (!verification.ok) {
      return res.status(400).json({ error: "Complete the mandatory pitch verification before submitting to JS.", validationErrors: verification.errors });
    }

    const assignedPitch = await prisma.governmentPitch.findFirst({
      where: { id, assignedRelationshipManagerId: userId },
      select: { id: true, status: true }
    });
    if (!assignedPitch) return res.status(404).json({ error: "Pitch not found" });
    if (!["SUBMITTED", "UNDER_RM_REVIEW", "RETURNED_FOR_CORRECTION", "RETURNED_FOR_CLARIFICATION"].includes(assignedPitch.status)) {
      return res.status(409).json({ error: "This pitch is not in an RM-reviewable state." });
    }

    const jointSecretary = await prisma.user.findFirst({
      where: { roleId: ROLE_ID.JOINT_SECRETARY, accountStatus: "ACTIVE" },
      select: { id: true }
    });
    const nextStatus = "JS_APPROVAL_PENDING";
    const pitch = await prisma.governmentPitch.update({
      where: { id },
      data: { status: nextStatus }
    });
    const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.GOVERNMENT_PITCH, pitch.id);
    if (trackedCase) {
      await PortalCaseService.transition({
        caseId: trackedCase.id,
        toStatus: nextStatus,
        stage: "JS_REVIEW",
        action: "RM_VERIFICATION_SUBMITTED",
        actorUserId: userId,
        metadata: {
          checklist: verification.value.checklist,
          recommendation: verification.value.recommendation,
          summary: verification.value.summary,
          conditions: req.body.conditions || null,
        },
      });
    }

    if (jointSecretary && nextStatus === "JS_APPROVAL_PENDING") {
      const existingEscalation = await prisma.sLAEscalation.findFirst({
        where: { entityType: "GOVERNMENT_PITCH", entityId: id, stage: "JS_DECISION", isResolved: false },
        select: { id: true }
      });
      if (!existingEscalation) {
        await createSLAEscalation({ entityType: "GOVERNMENT_PITCH", entityId: id, stage: "JS_DECISION", responsibleUserId: jointSecretary.id, dueAt: await calculateSlaDueDate("JS_DECISION") });
      }
    }

    if (jointSecretary && nextStatus === "JS_APPROVAL_PENDING") {
      await dispatchNotification({
        recipientId: jointSecretary.id,
        templateName: "GOVERNMENT_PITCH_JS_REVIEW",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: { title: "Pitch ready for JS decision", message: `Pitch ${pitch.pitchReferenceId} was verified by the Relationship Manager.`, currentStatus: nextStatus },
        actionButtonUrl: `/pitches/${pitch.id}`,
        correlationId: pitch.id,
        notificationType: "GOVERNMENT_PITCH_JS_REVIEW"
      });
      await dispatchToContact({
        referenceId: pitch.pitchReferenceId || pitch.id,
        email: pitch.email,
        phone: pitch.mobile,
        title: "Pitch submitted for Joint Secretary decision",
        message: `Your pitch ${pitch.pitchReferenceId || pitch.id} has been verified and sent to the Joint Secretary.`,
        trackingId: pitch.pitchReferenceId || undefined,
        currentStatus: nextStatus,
        actionButtonUrl: `/track?trackingId=${encodeURIComponent(pitch.pitchReferenceId || pitch.id)}`,
        correlationId: pitch.id,
        notificationType: "PITCH_JS_REVIEW"
      });
    }

    await auditLog(userId, "GOVERNMENT_PITCH_VERIFIED", {
      pitchId: id,
      status: nextStatus,
      checklist: verification.value.checklist,
      recommendation: verification.value.recommendation,
      summary: verification.value.summary,
      conditions: req.body.conditions || null
    });
    return res.json({ success: true, data: pitch });
  } catch (error) {
    next(error);
  }
};

export const getRMAssessments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.caseFeasibilityAssessment.findMany({
      where: { case: { assignedRmId: req.user!.id } },
      include: { case: { select: { id: true, trackingId: true, type: true, status: true, currentStage: true } } },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    });
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const logEnquiryInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { note, channel = "PORTAL", occurredAt } = req.body;
    if (typeof note !== "string" || note.trim().length < 3 || note.trim().length > 4000) {
      return res.status(400).json({ error: "Enter an interaction note between 3 and 4,000 characters." });
    }

    const assignedEnquiry = await prisma.corporateEnquiry.findFirst({
      where: { id, assignedRelationshipManagerId: userId },
      select: { id: true, status: true }
    });
    if (!assignedEnquiry) return res.status(404).json({ error: "Enquiry not found" });

    const interaction = await prisma.applicationInteraction.create({
      data: { entityType: "CORPORATE_ENQUIRY", entityId: id, actorUserId: userId, channel: String(channel).slice(0, 40), note: note.trim(), occurredAt: occurredAt ? new Date(occurredAt) : new Date() }
    });
    const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.CORPORATE_ENQUIRY, id);
    if (trackedCase) {
      await PortalCaseService.addInteraction({
        caseId: trackedCase.id,
        actorUserId: userId,
        interactionType: normalizeInteractionType(channel),
        participants: normalizeParticipants(req.body.participants, "CORPORATE"),
        summary: note.trim(),
        budgetDiscussion: req.body.budgetDiscussion || null,
        notes: req.body.notes || null,
        attachmentUrls: Array.isArray(req.body.attachmentUrls) ? req.body.attachmentUrls : [],
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      });
    }
    await prisma.corporateEnquiry.updateMany({ where: { id, firstContactedAt: null }, data: { firstContactedAt: new Date() } });
    await auditLog(userId, "ENQUIRY_INTERACTION_LOGGED", { enquiryId: id, interactionId: interaction.id, channel });
    return res.status(201).json({ success: true, message: "Interaction logged successfully", data: interaction });
  } catch (error) {
    next(error);
  }
};

export const submitFeasibilityAssessment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { checklist, executiveSummary, targetDistricts, targetDepartmentId, conditions = [], recommendation } = req.body;

    const assignedEnquiry = await prisma.corporateEnquiry.findFirst({
      where: { id, assignedRelationshipManagerId: userId },
      select: { id: true }
    });
    if (!assignedEnquiry) return res.status(404).json({ error: "Enquiry not found" });

    if (!Array.isArray(checklist)) {
      return res.status(400).json({ error: "All 13 feasibility checks are required before submission." });
    }

    const normalizedChecklist = FEASIBILITY_CHECKLIST_SEED.map((item) => {
      const submitted = checklist.find((entry: any) => Number(entry.itemNumber) === item.itemNumber);
      return { ...item, answer: submitted?.answer || "", note: submitted?.note?.trim() || "" };
    });
    if (normalizedChecklist.some((item) => !["YES", "NO", "NA"].includes(item.answer))) {
      return res.status(400).json({ error: "Every one of the 13 feasibility checks must have an answer." });
    }

    const districts = Array.isArray(targetDistricts) ? [...new Set(targetDistricts.map((district: unknown) => String(district).trim()).filter(Boolean))] : [];
    if (!targetDepartmentId || districts.length < 1) {
      return res.status(400).json({ error: "Select a target Government Department and at least one target district before sending the assessment to JS." });
    }
    if (typeof executiveSummary !== "string" || executiveSummary.trim().length < 20) {
      return res.status(400).json({ error: "Assessment summary must contain at least 20 characters." });
    }
    const department = await prisma.organization.findFirst({ where: { id: targetDepartmentId, kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" }, select: { id: true } });
    if (!department) return res.status(400).json({ error: "Select an active Government Department." });
    const criticalGaps = normalizedChecklist.filter((item) => item.isCritical && item.answer !== "YES");
    const normalisedConditions = Array.isArray(conditions) ? conditions
      .filter((condition: any) => condition && Number.isInteger(Number(condition.itemNumber)))
      .map((condition: any) => ({
        itemNumber: Number(condition.itemNumber),
        remediation: String(condition.remediation || "").trim(),
        owner: String(condition.owner || "").trim(),
        targetDate: String(condition.targetDate || "").trim()
      })) : [];
    const missingConditions = criticalGaps.filter((gap) => !normalisedConditions.some((condition) =>
      condition.itemNumber === gap.itemNumber && condition.remediation && condition.owner && condition.targetDate
    ));
    if (missingConditions.length) {
      return res.status(400).json({ error: `Critical gaps ${missingConditions.map((gap) => gap.itemNumber).join(", ")} may proceed only with a remediation, owner, and target date.` });
    }
    const result = recommendation === "NOT_FEASIBLE" ? "NOT_FEASIBLE" : (criticalGaps.length || normalizedChecklist.some((item) => !item.isCritical && item.answer !== "YES") ? "PROCEED_WITH_CONDITIONS" : "FEASIBLE");

    const assessment = await prisma.feasibilityAssessment.upsert({
      where: { enquiryId: id },
      create: {
        enquiryId: id,
        checklist: normalizedChecklist,
        recommendation: result,
        executiveSummary: executiveSummary?.trim() || null,
        targetDistricts: districts,
        targetDepartmentId,
        conditions: normalisedConditions,
        assessedByUserId: userId,
        status: "SUBMITTED_TO_JS"
      },
      update: {
        checklist: normalizedChecklist,
        recommendation: result,
        executiveSummary: executiveSummary?.trim() || null,
        targetDistricts: districts,
        targetDepartmentId,
        conditions: normalisedConditions,
        assessedByUserId: userId,
        submittedAt: new Date(),
        status: "SUBMITTED_TO_JS",
        jsDecision: null,
        jsDecisionReason: null,
        jsDecidedByUserId: null,
        jsDecidedAt: null
      }
    });

    const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.CORPORATE_ENQUIRY, id);
    let caseAssessment = null;
    if (trackedCase) {
      const latest = await prisma.caseFeasibilityAssessment.findFirst({
        where: { caseId: trackedCase.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      caseAssessment = await prisma.caseFeasibilityAssessment.create({
        data: {
          caseId: trackedCase.id,
          version: (latest?.version || 0) + 1,
          checklist: normalizedChecklist,
          recommendation: result,
          executiveSummary: executiveSummary.trim(),
          targetDistricts: districts,
          targetDepartmentId,
          conditions: normalisedConditions,
          assessedByUserId: userId,
          status: "SUBMITTED_TO_JS",
          submittedAt: new Date(),
        },
      });
      await PortalCaseService.transition({
        caseId: trackedCase.id,
        toStatus: "ASSESSMENT_SUBMITTED_TO_JS",
        stage: "JS_REVIEW",
        action: "FEASIBILITY_SUBMITTED",
        actorUserId: userId,
        metadata: { assessmentId: caseAssessment.id, assessmentVersion: caseAssessment.version },
      });
    }

    await prisma.corporateEnquiry.update({
      where: { id },
      data: { status: "ASSESSMENT_SUBMITTED_TO_JS" }
    });

    const jointSecretary = await prisma.user.findFirst({
      where: { roleId: ROLE_ID.JOINT_SECRETARY, accountStatus: "ACTIVE" },
      select: { id: true }
    });
    if (jointSecretary) {
      const existingEscalation = await prisma.sLAEscalation.findFirst({
        where: { entityType: "CORPORATE_ENQUIRY", entityId: id, stage: "JS_DECISION", isResolved: false },
        select: { id: true }
      });
      if (!existingEscalation) {
        await createSLAEscalation({
          entityType: "CORPORATE_ENQUIRY",
          entityId: id,
          stage: "JS_DECISION",
          responsibleUserId: jointSecretary.id,
          dueAt: await calculateSlaDueDate("JS_DECISION")
        });
      }
    }

    if (jointSecretary) {
      await dispatchNotification({
        recipientId: jointSecretary.id,
        templateName: "FEASIBILITY_JS_REVIEW",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: { title: "Feasibility assessment ready", message: `Assessment for ${id} is ready for a Joint Secretary decision.`, currentStatus: "SUBMITTED_TO_JS" },
        actionButtonUrl: `/assessments/${assessment.id}`,
        correlationId: assessment.id,
        notificationType: "FEASIBILITY_JS_REVIEW"
      });
    }
    await auditLog(userId, "FEASIBILITY_ASSESSMENT_SUBMITTED_TO_JS", { enquiryId: id, assessmentId: assessment.id, recommendation: result, criticalGapCount: criticalGaps.length });
    return res.json({ success: true, message: jointSecretary ? "13-factor assessment submitted to the Joint Secretary." : "Assessment saved; no active Joint Secretary is currently configured.", data: { ...assessment, caseAssessmentId: caseAssessment?.id || null, version: caseAssessment?.version || assessment.version } });
  } catch (error) {
    next(error);
  }
};

export const listRMEnquiryInteractions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roleIdNum = Number(req.user!.roleId || req.user!.role);
    const isStateAdmin = ([ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY] as number[]).includes(roleIdNum);
    const enquiry = await prisma.corporateEnquiry.findFirst({
      where: isStateAdmin ? { id: req.params.id } : { id: req.params.id, assignedRelationshipManagerId: req.user!.id },
      select: { id: true }
    });
    if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });
    const data = await prisma.applicationInteraction.findMany({ where: { entityType: "CORPORATE_ENQUIRY", entityId: enquiry.id }, orderBy: { occurredAt: "desc" } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const logPitchInteraction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const note = typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (note.length < 3 || note.length > 4000) return res.status(400).json({ error: "Enter an interaction note between 3 and 4,000 characters." });
    const pitch = await prisma.governmentPitch.findFirst({ where: { id: req.params.id, assignedRelationshipManagerId: req.user!.id }, select: { id: true } });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });
    const interaction = await prisma.applicationInteraction.create({ data: { entityType: "GOVERNMENT_PITCH", entityId: pitch.id, actorUserId: req.user!.id, channel: String(req.body.channel || "PORTAL").slice(0, 40), note, occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date() } });
    const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.GOVERNMENT_PITCH, pitch.id);
    if (trackedCase) {
      await PortalCaseService.addInteraction({
        caseId: trackedCase.id,
        actorUserId: req.user!.id,
        interactionType: normalizeInteractionType(req.body.channel),
        participants: normalizeParticipants(req.body.participants, "GOVERNMENT"),
        summary: note,
        budgetDiscussion: req.body.budgetDiscussion || null,
        notes: req.body.notes || null,
        attachmentUrls: Array.isArray(req.body.attachmentUrls) ? req.body.attachmentUrls : [],
        occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date(),
      });
    }
    return res.status(201).json({ success: true, data: interaction });
  } catch (error) { next(error); }
};

export const listRMPitchInteractions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roleIdNum = Number(req.user!.roleId || req.user!.role);
    const isStateAdmin = ([ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY] as number[]).includes(roleIdNum);
    const pitch = await prisma.governmentPitch.findFirst({
      where: isStateAdmin ? { id: req.params.id } : { id: req.params.id, assignedRelationshipManagerId: req.user!.id },
      select: { id: true }
    });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });
    const data = await prisma.applicationInteraction.findMany({ where: { entityType: "GOVERNMENT_PITCH", entityId: pitch.id }, orderBy: { occurredAt: "desc" } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getRMFeasibilityAssessment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roleIdNum = Number(req.user!.roleId || req.user!.role);
    const isStateAdmin = ([ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY] as number[]).includes(roleIdNum);
    const assignedEnquiry = await prisma.corporateEnquiry.findFirst({
      where: isStateAdmin ? { id: req.params.id } : { id: req.params.id, assignedRelationshipManagerId: req.user!.id },
      select: { id: true }
    });
    if (!assignedEnquiry) return res.status(404).json({ error: "Enquiry not found" });
    const assessment = await prisma.feasibilityAssessment.findUnique({ where: { enquiryId: req.params.id } });
    return res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

export const listActiveGovernmentDepartments = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.organization.findMany({ where: { kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" }, select: { id: true, name: true, district: true }, orderBy: { name: "asc" } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getFeasibilityAssessmentById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
