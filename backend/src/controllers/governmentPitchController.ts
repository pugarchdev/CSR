import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { selectLeastLoadedRm } from "../services/rmAssignmentService";
import { ROLE_ID } from "../types/role";
import { notifyHierarchy } from "../services/hierarchyNotificationService";
import { generateGovernmentPitchTrackingId } from "../services/trackingIdService";
import { createSLAEscalation } from "../services/slaEscalationService";
import { calculateSlaDueDate } from "../services/slaConfigService";
import { dispatchNotification, dispatchToContact } from "../services/notificationOrchestrator";
import { PUBLIC_PITCH_SELECT, validateGovernmentPitchSubmission } from "../utils/workflowValidation";
import { generateInterestTrackingId } from "../services/trackingIdService";
import { routeApprovedGovernmentPitch } from "../services/approvedProjectRoutingService";

export const submitGovernmentPitch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Check organization onboarding status guard
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    // Relationship Managers cannot submit government pitches
    if (user?.roleId === ROLE_ID.RELATIONSHIP_MANAGER) {
      return res.status(403).json({
        error: "Relationship Managers are not allowed to submit government pitches."
      });
    }

    if (user?.roleId !== ROLE_ID.SUPER_ADMIN && user?.organization?.status !== "ACTIVE") {
      return res.status(403).json({
        error: "Organization onboarding must be completed and approved by Super Admin before submitting pitches."
      });
    }

    const validation = validateGovernmentPitchSubmission(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Government pitch submission is incomplete.", validationErrors: validation.errors });
    }
    const submission = validation.value;

    const preferredDistrict = submission.district;

    // Auto-assign Relationship Manager via round-robin least loaded algorithm
    const assignedRmId = await selectLeastLoadedRm(preferredDistrict);
    if (!assignedRmId) {
      return res.status(503).json({ error: "No active Relationship Manager is available. Please retry shortly; your pitch was not submitted." });
    }

    let pitch;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        pitch = await prisma.governmentPitch.create({
          data: {
        pitchReferenceId: await generateGovernmentPitchTrackingId(),
        title: req.body.title || submission.csrRequirement.slice(0, 120),
        budget: submission.estimatedCost,
        assignedRelationshipManagerId: assignedRmId,
        departmentId: req.body.departmentId || user?.organizationId || null,
        officialName: submission.officialName,
        designation: submission.designation,
        department: req.body.department || user?.organization?.name || null,
        officeName: req.body.officeName || null,
        serviceClass: submission.serviceClass,
        mobile: submission.mobile,
        email: submission.email,
        divisions: Array.isArray(req.body.divisions) ? req.body.divisions : [],
        districts: [submission.district],
        cities: Array.isArray(req.body.cities) ? req.body.cities : [],
        talukas: submission.talukas,
        exactLocation: submission.exactLocation,
        csrRequirement: submission.csrRequirement,
        estimatedCost: submission.estimatedCost,
        govtFundDeclaration: true,
        certificationType: submission.certificationType,
        hodCertificationDocument: submission.hodCertificationDocument,
        supportingDocuments: submission.supportingDocuments,
        geoTaggedPhotos: submission.geoTaggedPhotos,
        submittedByUserId: userId,
        status: "SUBMITTED"
          }
        });
        break;
      } catch (error: any) {
        if (error?.code !== "P2002" || attempt === 2) throw error;
      }
    }
    if (!pitch) throw new Error("Unable to generate a unique pitch tracking code");

    await createSLAEscalation({ entityType: "GOVERNMENT_PITCH", entityId: pitch.id, stage: "GOVERNMENT_PITCH_VERIFICATION", responsibleUserId: assignedRmId, dueAt: await calculateSlaDueDate("GOVERNMENT_PITCH_VERIFICATION") });
    await Promise.all([
      dispatchNotification({
        recipientId: assignedRmId,
        templateName: "GOVERNMENT_PITCH_ASSIGNED",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: { title: "New government pitch assigned", message: `Pitch ${pitch.pitchReferenceId} requires verification.`, currentStatus: pitch.status },
        actionButtonUrl: `/pitches/${pitch.id}`,
        correlationId: pitch.id,
        notificationType: "GOVERNMENT_PITCH_ASSIGNED"
      }),
      dispatchToContact({
        referenceId: pitch.pitchReferenceId || pitch.id,
        email: pitch.email,
        phone: pitch.mobile,
        title: "Government pitch received",
        message: `Your pitch has been received. Your tracking ID is ${pitch.pitchReferenceId}. Use it to follow progress.`,
        trackingId: pitch.pitchReferenceId || undefined,
        currentStatus: pitch.status,
        actionButtonUrl: `/track?trackingId=${encodeURIComponent(pitch.pitchReferenceId || pitch.id)}`,
        correlationId: pitch.id,
        notificationType: "TRACKING_ID_ISSUED"
      })
    ]);

    notifyHierarchy({
      title: "New Government Pitch Submitted",
      message: `Government pitch ${pitch.pitchReferenceId} ("${pitch.title}") submitted for review.`,
      organizationId: pitch.departmentId,
      assignedRmId: pitch.assignedRelationshipManagerId,
      district: preferredDistrict,
      includePortalAdmins: true,
      includeRms: true,
      includeDistrictOfficers: true,
      includeStateOfficers: true,
      actionButtonUrl: `/pitches`
    }).catch(err => console.error("Notification dispatch failed:", err));

    return res.status(201).json(pitch);
  } catch (error) {
    next(error);
  }
};

export const submitPitch = submitGovernmentPitch;

export const getPitchById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pitch = await prisma.governmentPitch.findUnique({ where: { id: req.params.id } });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });
    return res.json(pitch);
  } catch (error) {
    next(error);
  }
};

export const getPitchByTrackingId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pitch = await prisma.governmentPitch.findUnique({ where: { pitchReferenceId: req.params.trackingId }, select: { pitchReferenceId: true, status: true, createdAt: true, districts: true, cities: true, talukas: true, exactLocation: true, estimatedCost: true, budget: true } });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });
    return res.json(pitch);
  } catch (error) {
    next(error);
  }
};

export const listGovernmentPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pitches = await prisma.governmentPitch.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(pitches);
  } catch (error) {
    next(error);
  }
};

export const getPublicPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const districtFilter = typeof req.query?.district === "string" && req.query.district !== "All Districts" ? req.query.district : null;
    const where: any = { status: "PUBLIC_LISTED" };
    if (districtFilter) {
      where.districts = { has: districtFilter };
    }
    const pitches = await prisma.governmentPitch.findMany({
      where,
      select: PUBLIC_PITCH_SELECT,
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.setHeader("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
    return res.json(pitches);
  } catch (error) { next(error); }
};

export const getMyPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pitches = await prisma.governmentPitch.findMany({ where: { departmentId: req.user?.organizationId || "__none__" }, orderBy: { createdAt: "desc" } });
    return res.json(pitches);
  } catch (error) { next(error); }
};

export const assignPitchRelationshipManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rm = await prisma.user.findFirst({ where: { id: req.body.relationshipManagerId, roleId: ROLE_ID.RELATIONSHIP_MANAGER, accountStatus: "ACTIVE", isVerified: true }, select: { id: true } });
    if (!rm) return res.status(400).json({ error: "Select an active, verified Relationship Manager." });
    const updated = await prisma.governmentPitch.update({
      where: { id: req.params.id },
      data: { assignedRelationshipManagerId: req.body.relationshipManagerId }
    });
    await dispatchNotification({ recipientId: rm.id, templateName: "GOVERNMENT_PITCH_REASSIGNED", channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"], variables: { title: "Pitch reassigned by Joint Secretary", message: `Pitch ${updated.pitchReferenceId} is now assigned to you.`, currentStatus: updated.status }, actionButtonUrl: `/pitches/${updated.id}`, correlationId: updated.id, notificationType: "RM_REASSIGNMENT" });
    await dispatchToContact({ referenceId: updated.pitchReferenceId || updated.id, email: updated.email, phone: updated.mobile, title: "Relationship Manager reassigned", message: `A Relationship Manager has been reassigned to pitch ${updated.pitchReferenceId || updated.id}.`, trackingId: updated.pitchReferenceId || undefined, currentStatus: updated.status, actionButtonUrl: `/track?trackingId=${encodeURIComponent(updated.pitchReferenceId || updated.id)}`, correlationId: updated.id, notificationType: "RM_REASSIGNMENT" });

    notifyHierarchy({
      title: "Relationship Manager Assigned to Pitch",
      message: `Relationship Manager assigned to Government Pitch ${updated.pitchReferenceId}.`,
      assignedRmId: req.body.relationshipManagerId,
      organizationId: updated.departmentId,
      includePortalAdmins: true,
      actionButtonUrl: `/pitches`
    }).catch(err => console.error("Notification dispatch failed:", err));

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const recordPitchRmContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return res.status(410).json({ error: "Use the assigned Relationship Manager interaction endpoint." });
};

export const convertPitchToProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pitchId = req.params.id;
    const { interestId, corporateId } = req.body || {};
    const actorUserId = req.user?.id;
    if (!actorUserId) return res.status(401).json({ error: "Unauthorized" });

    const result = await routeApprovedGovernmentPitch({
      pitchId,
      interestId,
      corporateId,
      actorUserId
    });

    return res.json({
      success: true,
      message: "Government pitch successfully converted to project and assigned to District DNC and Department Admin.",
      data: result.project
    });
  } catch (error) {
    next(error);
  }
};

export const submitInterest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const corporateId = req.user?.organizationId;
    const pitchId = req.params.id || req.body.pitchId;
    if (!corporateId) return res.status(403).json({ error: "An approved company organization is required." });

    const corporateOrg = await prisma.organization.findFirst({ where: { id: corporateId, status: "ACTIVE" } });
    if (!corporateOrg) return res.status(403).json({ error: "Your organization onboarding must be Super-Admin approved (status 'ACTIVE') before expressing interest in public government pitches." });

    const pitch = await prisma.governmentPitch.findFirst({ where: { id: pitchId, status: "PUBLIC_LISTED" }, select: { id: true, pitchReferenceId: true } });
    if (!pitch) return res.status(404).json({ error: "This public pitch is not available for expressions of interest." });
    const existing = await prisma.corporatePitchInterest.findFirst({ where: { pitchId, corporateId } });
    if (existing) return res.status(409).json({ error: "Your company has already expressed interest in this pitch.", data: existing });
    const indicativeBudget = Number(req.body.indicativeBudget);
    const preferredStartPeriod = typeof (req.body.preferredStartPeriod || req.body.preferredStartTimeline) === "string" ? String(req.body.preferredStartPeriod || req.body.preferredStartTimeline).trim() : "";
    const implementationMode = typeof req.body.implementationMode === "string" ? req.body.implementationMode.trim() : "";
    const message = typeof (req.body.message || req.body.messageToGovernment) === "string" ? String(req.body.message || req.body.messageToGovernment).trim() : "";
    if (!Number.isFinite(indicativeBudget) || indicativeBudget <= 0 || !preferredStartPeriod || !implementationMode || message.length < 10 || req.body.declarationAccepted !== true) {
      return res.status(400).json({ error: "Complete the budget, start period, implementation mode, message, and declaration." });
    }
    const interest = await prisma.corporatePitchInterest.create({
      data: {
        interestTrackingId: await generateInterestTrackingId(),
        pitchId,
        corporateId,
        status: "INTERESTED"
      }
    });
    await prisma.auditLog.create({ data: { actorUserId: req.user?.id || null, userId: req.user?.id || null, action: "PITCH_INTEREST_SUBMITTED", entityType: "CorporatePitchInterest", entityId: interest.id, details: { pitchId, pitchReferenceId: pitch.pitchReferenceId, corporateId, indicativeBudget, preferredStartPeriod, implementationMode, ngoOrFoundationDetails: req.body.ngoOrFoundationDetails || null, message, declarationAccepted: true } } });
    return res.status(201).json(interest);
  } catch (error) {
    next(error);
  }
};

export const verifyPitch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return res.status(410).json({ error: "Use the assigned Relationship Manager verification workspace, including the mandatory checklist and recommendation." });
};

/**
 * JS Pitch Approval — Auto-assigns project to both DNC (District Nodal Consultant) and Govt Department Admin
 */
export const approvePitch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const decision = String(req.body.decision || "APPROVE").toUpperCase();
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    const conditions = typeof req.body.conditions === "string" ? req.body.conditions.trim() : "";
    const allowed = ["APPROVE", "APPROVE_WITH_CONDITIONS", "REJECT", "RETURN_FOR_CLARIFICATION", "RETURN_FOR_CORRECTION"];
    if (!allowed.includes(decision)) return res.status(400).json({ error: "Select a valid Joint Secretary decision." });
    if (decision !== "APPROVE" && reason.length < 5) return res.status(400).json({ error: "Record the reason for this decision." });
    if (decision === "APPROVE_WITH_CONDITIONS" && conditions.length < 10) return res.status(400).json({ error: "Document the approval conditions." });
    const pitch = await prisma.governmentPitch.findUnique({ where: { id: req.params.id } });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });
    if (pitch.status === "PUBLIC_LISTED") {
      return res.status(400).json({ error: "This pitch is already approved and published publicly." });
    }
    const statusByDecision: Record<string, string> = {
      APPROVE: "PUBLIC_LISTED",
      APPROVE_WITH_CONDITIONS: "PUBLIC_LISTED",
      REJECT: "JS_REJECTED",
      RETURN_FOR_CLARIFICATION: "RETURNED_FOR_CLARIFICATION",
      RETURN_FOR_CORRECTION: "RETURNED_FOR_CORRECTION"
    };
    // Approved pitches are published immediately through the public-safe field projection.
    const updated = await prisma.governmentPitch.update({ where: { id: pitch.id }, data: { status: statusByDecision[decision] } });
    await prisma.sLAEscalation.updateMany({ where: { entityType: "GOVERNMENT_PITCH", entityId: pitch.id, stage: "JS_DECISION", isResolved: false }, data: { isResolved: true, resolvedAt: new Date() } });
    await prisma.auditLog.create({ data: { actorUserId: req.user?.id || null, userId: req.user?.id || null, action: "GOVERNMENT_PITCH_JS_DECISION", entityType: "GovernmentPitch", entityId: pitch.id, details: { decision, reason: reason || null, conditions: conditions || null, resultingStatus: updated.status } } });
    const published = updated.status === "PUBLIC_LISTED";
    await dispatchToContact({
      referenceId: updated.pitchReferenceId || updated.id,
      email: updated.email,
      phone: updated.mobile,
      title: published ? "Government pitch approved and published" : "Joint Secretary decision recorded",
      message: published ? `Your pitch ${updated.pitchReferenceId || updated.id} has been approved by the Joint Secretary and is now publicly listed for corporate interest.` : `A Joint Secretary decision has been recorded for pitch ${updated.pitchReferenceId || updated.id}: ${decision.replace(/_/g, " ")}.`,
      trackingId: updated.pitchReferenceId || undefined,
      currentStatus: updated.status,
      actionButtonUrl: `/track?trackingId=${encodeURIComponent(updated.pitchReferenceId || updated.id)}`,
      correlationId: updated.id,
      notificationType: "JS_DECISION"
    });

    notifyHierarchy({
      title: published ? "Government Pitch Approved & Published" : "Joint Secretary Pitch Decision",
      message: published ? `Government pitch ${updated.pitchReferenceId || updated.id} ("${updated.title}") has been approved by Joint Secretary and published to the public marketplace.` : `Joint Secretary decision recorded for pitch ${updated.pitchReferenceId || updated.id}.`,
      organizationId: updated.departmentId,
      assignedRmId: updated.assignedRelationshipManagerId,
      district: Array.isArray(updated.districts) && updated.districts.length > 0 ? updated.districts[0] : null,
      includePortalAdmins: true,
      includeRms: true,
      includeDistrictOfficers: true,
      includeStateOfficers: true,
      includeOrgUsers: true,
      actionButtonUrl: `/pitches/${updated.id}`
    }).catch(err => console.error("Notification dispatch failed:", err));

    return res.json({ success: true, message: published ? "Pitch approved and published for corporate interest." : "Joint Secretary decision recorded.", pitch: updated, decision });
  } catch (error) {
    next(error);
  }
};
