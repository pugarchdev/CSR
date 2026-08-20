import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { auditLog } from "../services/notificationService";
import { FEASIBILITY_CHECKLIST_SEED } from "../constants/mahacsr-framework";
import { createSLAEscalation } from "../services/slaEscalationService";
import { calculateSlaDueDate } from "../services/slaConfigService";
import { ROLE_ID } from "../types/role";
import { dispatchNotification, dispatchToContact } from "../services/notificationOrchestrator";
import { notifyHierarchy } from "../services/hierarchyNotificationService";
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
    const isSuperOrApex = ([ROLE_ID.SUPER_ADMIN, ROLE_ID.JOINT_SECRETARY, ROLE_ID.PLANNING_SECRETARY] as number[]).includes(Number(req.user?.roleId));
    const where: any = { id };
    if (!isSuperOrApex) {
      where.assignedRelationshipManagerId = req.user!.id;
    }

    const enquiry = await prisma.corporateEnquiry.findFirst({ where });
    if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });

    let assignedRelationshipManager = null;
    if (enquiry.assignedRelationshipManagerId) {
      const rmUser = await prisma.user.findUnique({
        where: { id: enquiry.assignedRelationshipManagerId },
        select: { id: true, firstName: true, lastName: true, designation: true, email: true, mobile: true }
      });
      if (rmUser) {
        assignedRelationshipManager = {
          id: rmUser.id,
          name: [rmUser.firstName, rmUser.lastName].filter(Boolean).join(" ") || "Relationship Manager",
          designation: rmUser.designation || "State CSR Relationship Manager",
          email: rmUser.email || "csr-cell@mahacsr.gov.in",
          mobile: rmUser.mobile || "+91 9876543210"
        };
      }
    }

    if (!assignedRelationshipManager) {
      const fallbackRm = await prisma.user.findFirst({
        where: {
          OR: [
            { roleId: ROLE_ID.RELATIONSHIP_MANAGER },
            { role: { name: { contains: "RELATIONSHIP_MANAGER", mode: "insensitive" } } },
            { email: { contains: "rm1" } }
          ],
          accountStatus: "ACTIVE"
        },
        select: { id: true, firstName: true, lastName: true, email: true, mobile: true, designation: true }
      });
      if (fallbackRm) {
        assignedRelationshipManager = {
          id: fallbackRm.id,
          name: [fallbackRm.firstName, fallbackRm.lastName].filter(Boolean).join(" ") || "State CSR Relationship Manager",
          designation: fallbackRm.designation || "State CSR Relationship Manager",
          email: fallbackRm.email || "csr-cell@mahacsr.gov.in",
          mobile: fallbackRm.mobile || "+91 9876543210"
        };
      }
    }

    let submittedByUser = null;
    if (enquiry.submittedByUserId) {
      submittedByUser = await prisma.user.findUnique({
        where: { id: enquiry.submittedByUserId },
        select: { id: true, firstName: true, lastName: true, designation: true, email: true, mobile: true }
      });
    }

    const contactPersonDesignation = submittedByUser?.designation || "Corporate CSR Representative";

    return res.json({
      success: true,
      data: {
        ...enquiry,
        contactPersonDesignation,
        assignedRelationshipManager,
        submittedByUser
      }
    });
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

    let assignedRelationshipManager = null;
    if (pitch.assignedRelationshipManagerId) {
      const rmUser = await prisma.user.findUnique({
        where: { id: pitch.assignedRelationshipManagerId },
        select: { id: true, firstName: true, lastName: true, designation: true, email: true, mobile: true }
      });
      if (rmUser) {
        assignedRelationshipManager = {
          id: rmUser.id,
          name: [rmUser.firstName, rmUser.lastName].filter(Boolean).join(" ") || "Relationship Manager",
          designation: rmUser.designation || "Relationship Manager",
          email: rmUser.email,
          mobile: rmUser.mobile
        };
      }
    }

    return res.json({ success: true, data: { ...pitch, assignedRelationshipManager } });
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
    const roleIdNum = Number(req.user!.roleId || req.user!.role);
    const isStateAdmin = ([ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY] as number[]).includes(roleIdNum);
    const verification = validatePitchVerificationChecklist(req.body);
    if (!verification.ok) {
      return res.status(400).json({ error: "Complete the mandatory pitch verification before submitting to JS.", validationErrors: verification.errors });
    }

    const assignedPitch = await prisma.governmentPitch.findFirst({
      where: isStateAdmin ? { id } : { id, assignedRelationshipManagerId: userId },
      select: { id: true, status: true }
    });
    if (!assignedPitch) return res.status(404).json({ error: "Pitch not found" });
    if (!["SUBMITTED", "UNDER_RM_REVIEW", "RETURNED_FOR_CORRECTION", "RETURNED_FOR_CLARIFICATION"].includes(assignedPitch.status)) {
      return res.status(409).json({ error: "This pitch is not in an RM-reviewable state." });
    }

    // Find all active Joint Secretaries and State Executive users
    const jsUsers = await prisma.user.findMany({
      where: {
        OR: [
          { roleId: { in: [ROLE_ID.JOINT_SECRETARY, 3] } },
          { role: { name: { contains: "JOINT_SECRETARY", mode: "insensitive" } } },
          { role: { name: { contains: "Joint Secretary", mode: "insensitive" } } },
          { userRoles: { some: { role: { name: { contains: "JOINT_SECRETARY", mode: "insensitive" } } } } }
        ],
        deletedAt: null
      },
      select: { id: true, email: true, firstName: true, lastName: true }
    });

    let targetRecipients = jsUsers;
    if (targetRecipients.length === 0) {
      targetRecipients = await prisma.user.findMany({
        where: {
          roleId: { in: [ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, 1, 2] },
          deletedAt: null
        },
        select: { id: true, email: true, firstName: true, lastName: true }
      });
    }

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

    if (targetRecipients.length > 0 && nextStatus === "JS_APPROVAL_PENDING") {
      const primaryJs = targetRecipients[0];
      const existingEscalation = await prisma.sLAEscalation.findFirst({
        where: { entityType: "GOVERNMENT_PITCH", entityId: id, stage: "JS_DECISION", isResolved: false },
        select: { id: true }
      });
      if (!existingEscalation) {
        await createSLAEscalation({
          entityType: "GOVERNMENT_PITCH",
          entityId: id,
          stage: "JS_DECISION",
          responsibleUserId: primaryJs.id,
          dueAt: await calculateSlaDueDate("JS_DECISION")
        });
      }

      const [primaryRecipient, ...ccRecipients] = targetRecipients.map((u) => u.id);
      await dispatchNotification({
        recipientId: primaryRecipient,
        ccRecipientIds: ccRecipients,
        templateName: "GOVERNMENT_PITCH_JS_REVIEW",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: {
          title: `Government Pitch Ready for JS Review: ${pitch.pitchReferenceId || pitch.title}`,
          message: `Government pitch ${pitch.pitchReferenceId} ("${pitch.title || pitch.department || "Government Development Pitch"}") has been verified by the Relationship Manager (Recommendation: ${verification.value.recommendation}). Assessment: "${verification.value.summary}". It is ready for your sign-off and public marketplace approval.`,
          currentStatus: nextStatus,
          workflowStatus: `RM Verification Completed (${verification.value.recommendation}). Summary: ${verification.value.summary}`
        },
        actionButtonUrl: `/pitches/${pitch.id}`,
        correlationId: pitch.id,
        notificationType: "GOVERNMENT_PITCH_JS_REVIEW"
      });
    }

    await dispatchToContact({
      referenceId: pitch.pitchReferenceId || pitch.id,
      email: pitch.email,
      phone: pitch.mobile,
      title: "Pitch verified and sent for Joint Secretary review",
      message: `Your pitch ${pitch.pitchReferenceId || pitch.id} has been verified by the assigned Relationship Manager and forwarded to the Joint Secretary for final review and approval.`,
      trackingId: pitch.pitchReferenceId || undefined,
      currentStatus: nextStatus,
      actionButtonUrl: `/track?trackingId=${encodeURIComponent(pitch.pitchReferenceId || pitch.id)}`,
      correlationId: pitch.id,
      notificationType: "PITCH_JS_REVIEW"
    });

    if (pitch.submittedByUserId) {
      await dispatchNotification({
        recipientId: pitch.submittedByUserId,
        templateName: "GOVERNMENT_PITCH_VERIFIED_SUBMITTER",
        channels: ["IN_APP", "SOCKET"],
        variables: {
          title: "Pitch Verified & Forwarded to Joint Secretary",
          message: `Your pitch ${pitch.pitchReferenceId || pitch.id} has been verified by the assigned Relationship Manager and forwarded to the Joint Secretary for final review and approval.`,
          currentStatus: nextStatus
        },
        actionButtonUrl: `/pitches/${pitch.id}`,
        correlationId: pitch.id,
        notificationType: "PITCH_VERIFIED"
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

export const requestPitchClarification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason, note } = req.body;
    const clarificationText = String(reason || note || "").trim();

    if (clarificationText.length < 5) {
      return res.status(400).json({ error: "Please enter a specific clarification remark (minimum 5 characters)." });
    }

    const roleIdNum = Number(req.user!.roleId || req.user!.role);
    const isStateAdmin = ([ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY] as number[]).includes(roleIdNum);

    const pitch = await prisma.governmentPitch.findFirst({
      where: isStateAdmin ? { id } : { id, assignedRelationshipManagerId: userId }
    });
    if (!pitch) return res.status(404).json({ error: "Pitch not found or not assigned to your portfolio." });

    const updated = await prisma.governmentPitch.update({
      where: { id },
      data: { status: "RETURNED_FOR_CLARIFICATION" }
    });

    const interaction = await prisma.applicationInteraction.create({
      data: {
        entityType: "GOVERNMENT_PITCH",
        entityId: pitch.id,
        actorUserId: userId,
        channel: "PORTAL_CLARIFICATION",
        note: `Clarification Requested by RM: ${clarificationText}`,
        occurredAt: new Date()
      }
    });

    const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.GOVERNMENT_PITCH, pitch.id);
    if (trackedCase) {
      await PortalCaseService.transition({
        caseId: trackedCase.id,
        toStatus: "CLARIFICATION_REQUIRED",
        stage: "RM_REVIEW",
        action: "CLARIFICATION_REQUESTED",
        actorUserId: userId,
        metadata: { reason: clarificationText }
      });
      await PortalCaseService.addInteraction({
        caseId: trackedCase.id,
        actorUserId: userId,
        interactionType: normalizeInteractionType("PORTAL_CLARIFICATION"),
        participants: normalizeParticipants(req.body.participants, "GOVERNMENT"),
        summary: `Clarification Requested: ${clarificationText}`,
        occurredAt: new Date()
      });
    }

    if (pitch.submittedByUserId) {
      await dispatchNotification({
        recipientId: pitch.submittedByUserId,
        templateName: "GOVERNMENT_PITCH_CLARIFICATION",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: {
          title: "Clarification Needed on Your Pitch",
          message: `The Relationship Manager has requested clarification on pitch ${pitch.pitchReferenceId || pitch.id}: "${clarificationText}"`,
          currentStatus: "RETURNED_FOR_CLARIFICATION"
        },
        actionButtonUrl: `/pitches/${pitch.id}`,
        correlationId: pitch.id,
        notificationType: "PITCH_CLARIFICATION"
      });
    }

    await dispatchToContact({
      referenceId: pitch.pitchReferenceId || pitch.id,
      email: pitch.email,
      phone: pitch.mobile,
      title: "Clarification Needed on Government Pitch",
      message: `The Relationship Manager has requested clarification on pitch ${pitch.pitchReferenceId || pitch.id}: "${clarificationText}"`,
      trackingId: pitch.pitchReferenceId || undefined,
      currentStatus: "RETURNED_FOR_CLARIFICATION",
      actionButtonUrl: `/track?trackingId=${encodeURIComponent(pitch.pitchReferenceId || pitch.id)}`,
      correlationId: pitch.id,
      notificationType: "PITCH_CLARIFICATION"
    });

    await auditLog(userId, "GOVERNMENT_PITCH_CLARIFICATION_REQUESTED", { pitchId: id, clarification: clarificationText });

    return res.json({ success: true, message: "Clarification request sent to the submitting department official.", data: updated, interaction });
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
    let validatedDepartmentId: string | null = null;
    if (targetDepartmentId && typeof targetDepartmentId === "string" && targetDepartmentId.trim() !== "") {
      const department = await prisma.organization.findFirst({
        where: { id: targetDepartmentId, kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" },
        select: { id: true }
      });
      if (department) {
        validatedDepartmentId = department.id;
      }
    }
    const cleanSummary = typeof executiveSummary === "string" && executiveSummary.trim().length > 0
      ? executiveSummary.trim()
      : "Feasibility assessment completed by Relationship Manager.";
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
        executiveSummary: cleanSummary,
        targetDistricts: districts,
        targetDepartmentId: validatedDepartmentId,
        conditions: normalisedConditions,
        assessedByUserId: userId,
        status: "SUBMITTED_TO_JS"
      },
      update: {
        checklist: normalizedChecklist,
        recommendation: result,
        executiveSummary: cleanSummary,
        targetDistricts: districts,
        targetDepartmentId: validatedDepartmentId,
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
    
    const roleIdNum = Number(req.user!.roleId || req.user!.role);
    const isStateAdmin = ([ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY] as number[]).includes(roleIdNum);
    const isRM = roleIdNum === ROLE_ID.RELATIONSHIP_MANAGER;

    const pitch = await prisma.governmentPitch.findFirst({
      where: isStateAdmin
        ? { id: req.params.id }
        : isRM
        ? { id: req.params.id, assignedRelationshipManagerId: req.user!.id }
        : {
            id: req.params.id,
            OR: [
              { submittedByUserId: req.user!.id },
              ...(req.user!.organizationId ? [{ departmentId: req.user!.organizationId }] : [])
            ]
          },
      select: { id: true }
    });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });

    const interaction = await prisma.applicationInteraction.create({
      data: {
        entityType: "GOVERNMENT_PITCH",
        entityId: pitch.id,
        actorUserId: req.user!.id,
        channel: String(req.body.channel || "PORTAL").slice(0, 40),
        note,
        occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : new Date()
      }
    });

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
    const isRM = roleIdNum === ROLE_ID.RELATIONSHIP_MANAGER;

    const pitch = await prisma.governmentPitch.findFirst({
      where: isStateAdmin
        ? { id: req.params.id }
        : isRM
        ? { id: req.params.id, assignedRelationshipManagerId: req.user!.id }
        : {
            id: req.params.id,
            OR: [
              { submittedByUserId: req.user!.id },
              ...(req.user!.organizationId ? [{ departmentId: req.user!.organizationId }] : [])
            ]
          },
      select: { id: true }
    });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });

    const rawInteractions = await prisma.applicationInteraction.findMany({
      where: { entityType: "GOVERNMENT_PITCH", entityId: pitch.id },
      orderBy: { occurredAt: "desc" }
    });

    const actorIds = [...new Set(rawInteractions.map(i => i.actorUserId).filter(Boolean))] as string[];
    const users = actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true, roleId: true, designation: true }
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const data = rawInteractions.map(i => ({
      ...i,
      actor: i.actorUserId ? userMap.get(i.actorUserId) || null : null
    }));

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
