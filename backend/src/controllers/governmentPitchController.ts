import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { RmAssignmentService } from "../services/rmAssignmentService";
import { ROLE_ID } from "../types/role";
import { notifyHierarchy } from "../services/hierarchyNotificationService";
import { generateGovernmentPitchTrackingId } from "../services/trackingIdService";
import { createSLAEscalation } from "../services/slaEscalationService";
import { calculateSlaDueDate } from "../services/slaConfigService";
import { dispatchNotification, dispatchToContact } from "../services/notificationOrchestrator";
import { PUBLIC_PITCH_SELECT, validateGovernmentPitchSubmission } from "../utils/workflowValidation";
import { generateInterestTrackingId } from "../services/trackingIdService";
import { routeApprovedGovernmentPitch } from "../services/approvedProjectRoutingService";
import { PortalCaseType } from "@prisma/client";
import { PortalCaseService } from "../services/portalCaseService";
import { verifyGovernmentPitch } from "./relationshipManagerController";
import { auditLog } from "../services/notificationService";
import { isCollectorOrg, getDistrictOrganizationIds } from "../services/districtScopeService";

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

const publishedStatusStage = (status: string) => {
  if (status === "PUBLIC_LISTED") return "PUBLICATION";
  if (status.includes("CLARIFICATION") || status.includes("CORRECTION")) return "RM_CLARIFICATION";
  return "CLOSED";
};

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
    if (
      user?.roleId !== ROLE_ID.SUPER_ADMIN &&
      (!user?.organization?.governmentLevel ||
        !["COLLECTORATE", "ZILLA_PARISHAD", "MUNICIPAL_CORPORATION", "SUB_DEPARTMENT"].includes(user.organization.governmentType || ""))
    ) {
      return res.status(403).json({ error: "Pitches can be submitted only by an approved District CSR Cell organization or approved sub-department." });
    }

    const validation = validateGovernmentPitchSubmission(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Government pitch submission is incomplete.", validationErrors: validation.errors });
    }
    const submission = validation.value;

    const preferredDistrict = submission.district;

    let pitch;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        pitch = await prisma.governmentPitch.create({
          data: {
        pitchReferenceId: await generateGovernmentPitchTrackingId(),
        title: req.body.title || submission.csrRequirement.slice(0, 120),
        budget: submission.estimatedCost,
        assignedRelationshipManagerId: null,
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

    const trackedCase = await PortalCaseService.createForLegacyEntity({
      type: PortalCaseType.GOVERNMENT_PITCH,
      sourceEntityId: pitch.id,
      trackingId: pitch.pitchReferenceId || pitch.id,
      submittingOrganizationId: user?.organizationId || null,
      submittedByUserId: userId,
      targetDistricts: pitch.districts,
      currentStage: "RM_ALLOCATION",
      status: "SUBMITTED",
      actorUserId: userId,
    });
    const assignedRmId = await RmAssignmentService.autoAssignRm({ caseId: trackedCase.id });
    pitch = await prisma.governmentPitch.update({
      where: { id: pitch.id },
      data: {
        assignedRelationshipManagerId: assignedRmId,
        status: assignedRmId ? "SUBMITTED" : "UNASSIGNED",
      },
    });

    if (assignedRmId) {
      await createSLAEscalation({ entityType: "GOVERNMENT_PITCH", entityId: pitch.id, stage: "GOVERNMENT_PITCH_VERIFICATION", responsibleUserId: assignedRmId, dueAt: await calculateSlaDueDate("GOVERNMENT_PITCH_VERIFICATION") });
    }
    await Promise.all([
      ...(assignedRmId ? [dispatchNotification({
        recipientId: assignedRmId,
        templateName: "GOVERNMENT_PITCH_ASSIGNED",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: { title: "New government pitch assigned", message: `Pitch ${pitch.pitchReferenceId} requires verification.`, currentStatus: pitch.status },
        actionButtonUrl: `/pitches/${pitch.id}`,
        correlationId: pitch.id,
        notificationType: "GOVERNMENT_PITCH_ASSIGNED"
      })] : []),
      dispatchToContact({
        referenceId: pitch.pitchReferenceId || pitch.id,
        email: pitch.email,
        phone: pitch.mobile,
        title: "Government pitch received",
        message: assignedRmId
          ? `Your pitch has been received. Your tracking ID is ${pitch.pitchReferenceId}. Use it to follow progress.`
          : `Your pitch has been received with tracking ID ${pitch.pitchReferenceId} and is queued for Relationship Manager allocation.`,
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
    const pitch = await prisma.governmentPitch.findFirst({
      where: {
        OR: [
          { id: req.params.id },
          { pitchReferenceId: req.params.id }
        ]
      }
    });
    if (!pitch) return res.status(404).json({ error: "Pitch not found" });

    let assignedRelationshipManager = null;
    if (pitch.assignedRelationshipManagerId) {
      const rmUser = await prisma.user.findUnique({
        where: { id: pitch.assignedRelationshipManagerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          email: true,
          mobile: true
        }
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

    // Retrieve RM Verification Details word-for-word
    let rmVerification: any = null;
    try {
      const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.GOVERNMENT_PITCH, pitch.id);
      if (trackedCase) {
        const assessment = await prisma.caseFeasibilityAssessment.findFirst({
          where: { caseId: trackedCase.id },
          orderBy: { updatedAt: "desc" }
        });
        if (assessment) {
          let assessorUser = null;
          if (assessment.assessedByUserId) {
            assessorUser = await prisma.user.findUnique({
              where: { id: assessment.assessedByUserId },
              select: { id: true, firstName: true, lastName: true, designation: true, email: true }
            });
          }
          rmVerification = {
            checklist: assessment.checklist,
            recommendation: assessment.recommendation,
            summary: assessment.executiveSummary,
            conditions: (assessment.conditions as any)?.text || (typeof assessment.conditions === "string" ? assessment.conditions : null),
            verifiedAt: assessment.submittedAt || assessment.createdAt,
            verifiedBy: assessorUser ? {
              id: assessorUser.id,
              name: [assessorUser.firstName, assessorUser.lastName].filter(Boolean).join(" ") || "Relationship Manager",
              designation: assessorUser.designation || "Relationship Manager",
              email: assessorUser.email
            } : null
          };
        }
      }

      if (!rmVerification) {
        const audit = await prisma.auditLog.findFirst({
          where: { action: "GOVERNMENT_PITCH_VERIFIED", entityId: pitch.id },
          orderBy: { createdAt: "desc" }
        });
        if (audit && audit.details) {
          const d = audit.details as any;
          let assessorUser = null;
          if (audit.actorUserId) {
            assessorUser = await prisma.user.findUnique({
              where: { id: audit.actorUserId },
              select: { id: true, firstName: true, lastName: true, designation: true, email: true }
            });
          }
          rmVerification = {
            checklist: d.checklist || {},
            recommendation: d.recommendation || "FEASIBLE",
            summary: d.summary || "",
            conditions: d.conditions || null,
            verifiedAt: audit.createdAt,
            verifiedBy: assessorUser ? {
              id: assessorUser.id,
              name: [assessorUser.firstName, assessorUser.lastName].filter(Boolean).join(" ") || "Relationship Manager",
              designation: assessorUser.designation || "Relationship Manager",
              email: assessorUser.email
            } : null
          };
        }
      }
    } catch (verErr) {
      console.warn("[getPitchById] Could not fetch RM verification details:", verErr);
    }

    // Retrieve all Department & RM interactions
    let interactions: any[] = [];
    try {
      const rawInteractions = await prisma.applicationInteraction.findMany({
        where: { entityType: "GOVERNMENT_PITCH", entityId: pitch.id },
        orderBy: { occurredAt: "desc" }
      });
      const actorIds = [...new Set(rawInteractions.map((i) => i.actorUserId).filter(Boolean))] as string[];
      const actorUsers = actorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, firstName: true, lastName: true, roleId: true, designation: true, email: true }
          })
        : [];
      const actorMap = new Map(actorUsers.map((u) => [u.id, {
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Official",
        designation: u.designation || "Officer",
        roleId: u.roleId,
        email: u.email
      }]));

      interactions = rawInteractions.map((i) => ({
        ...i,
        actor: i.actorUserId ? actorMap.get(i.actorUserId) || null : null
      }));
    } catch (intErr) {
      console.warn("[getPitchById] Could not fetch interactions:", intErr);
    }

    return res.json({
      ...pitch,
      assignedRelationshipManager,
      rmVerification,
      interactions
    });
  } catch (error) {
    next(error);
  }
};

export const getPitchByTrackingId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const pitch = await prisma.governmentPitch.findUnique({ where: { pitchReferenceId: req.params.trackingId }, select: { pitchReferenceId: true, status: true, createdAt: true, districts: true, cities: true, talukas: true, exactLocation: true, estimatedCost: true, budget: true, assignedRelationshipManagerId: true } });
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

    return res.json({ ...pitch, assignedRelationshipManager });
  } catch (error) {
    next(error);
  }
};

export const listGovernmentPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const roleIdNum = Number(user.roleId);
    const roleStr = String(user.role || "").toUpperCase();
    const roleSlugStr = String(user.roleSlug || "").toLowerCase();
    const isRM = roleIdNum === ROLE_ID.RELATIONSHIP_MANAGER || 
      String(user.roleId) === String(ROLE_ID.RELATIONSHIP_MANAGER) || 
      roleStr.includes("RELATIONSHIP_MANAGER") || 
      roleStr === "RM" || 
      roleSlugStr.includes("relationship-manager");
    const isSuperAdmin = roleIdNum === ROLE_ID.SUPER_ADMIN || roleStr.includes("SUPER_ADMIN");
    const isStateAdmin = ([ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY] as number[]).includes(roleIdNum) ||
      roleStr.includes("SECRETARY");
    const isDeptOfficer = roleIdNum === ROLE_ID.GOVERNMENT_OFFICER || user.organization?.kind === "GOVERNMENT_DEPARTMENT";

    let where: any = {};
    if (isRM) {
      where = { assignedRelationshipManagerId: user.id };
    } else if (isDeptOfficer && !isSuperAdmin && !isStateAdmin) {
      // Check if user is a Collector — expand visibility to all district orgs
      const userOrg = user.organizationId
        ? await prisma.organization.findUnique({
            where: { id: user.organizationId },
            select: { governmentType: true, governmentLevel: true, district: true },
          })
        : null;

      if (isCollectorOrg(userOrg) && userOrg?.district) {
        const districtOrgIds = await getDistrictOrganizationIds(userOrg.district);
        where = {
          OR: [
            { submittedByUserId: user.id },
            { departmentId: { in: districtOrgIds } },
            { organizationId: { in: districtOrgIds } },
            { parentOrganizationId: { in: districtOrgIds } },
            { departmentOrganizationId: { in: districtOrgIds } },
          ],
        };
      } else {
        where = {
          OR: [
            { submittedByUserId: user.id },
            ...(user.organizationId ? [{ departmentId: user.organizationId }] : [])
          ]
        };
      }
    } else if (!isSuperAdmin && !isStateAdmin) {
      where = { status: "PUBLIC_LISTED" };
    }

    const pitches = await prisma.governmentPitch.findMany({ where, orderBy: { createdAt: "desc" } });
    const rmIds = [...new Set(pitches.map((p) => p.assignedRelationshipManagerId).filter(Boolean))] as string[];
    const rmUsers = rmIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: rmIds } },
          select: { id: true, firstName: true, lastName: true, designation: true, email: true, mobile: true }
        })
      : [];
    const rmMap = new Map(rmUsers.map((u) => [u.id, {
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Relationship Manager",
      designation: u.designation || "Relationship Manager",
      email: u.email,
      mobile: u.mobile
    }]));

    const enrichedPitches = pitches.map((p) => ({
      ...p,
      assignedRelationshipManager: p.assignedRelationshipManagerId ? rmMap.get(p.assignedRelationshipManagerId) || null : null
    }));

    return res.json(enrichedPitches);
  } catch (error) {
    next(error);
  }
};

export const getPublicPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const districtFilter = typeof req.query?.district === "string" && req.query.district !== "All Districts" ? req.query.district : null;
    const where: any = {
      status: "PUBLIC_LISTED"
    };
    if (districtFilter) {
      where.districts = { has: districtFilter };
    }
    const pitches = await prisma.governmentPitch.findMany({
      where,
      select: {
        ...PUBLIC_PITCH_SELECT,
        officeName: true,
        divisions: true,
        exactLocation: true,
        geoTaggedPhotos: true,
        hodCertificationDocument: true,
        officialName: true,
        designation: true,
        mobile: true,
        email: true,
      },
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

    const corporateOrg = await prisma.organization.findFirst({ where: { id: corporateId } });
    if (!corporateOrg || corporateOrg.status !== "ACTIVE") {
      return res.status(403).json({
        error: "Your organization onboarding is not verified yet. Once approved by the State CSR Cell, you will be able to express interest in public government pitches.",
        unverifiedOrganization: true
      });
    }

    const pitch = await prisma.governmentPitch.findFirst({ where: { id: pitchId, status: "PUBLIC_LISTED" }, select: { id: true, pitchReferenceId: true, districts: true, district: true } });
    if (!pitch) return res.status(404).json({ error: "This public pitch is not available for expressions of interest." });
    const existing = await prisma.corporatePitchInterest.findFirst({ where: { pitchId, corporateId } });
    if (existing) return res.status(409).json({ error: "Your company has already expressed interest in this pitch.", data: existing });
    const indicativeBudget = Number(req.body.indicativeBudget);
    const preferredStartPeriod = typeof (req.body.preferredStartPeriod || req.body.preferredStartTimeline) === "string" && String(req.body.preferredStartPeriod || req.body.preferredStartTimeline).trim() ? String(req.body.preferredStartPeriod || req.body.preferredStartTimeline).trim() : "Q3 (Immediate)";
    const implementationMode = typeof req.body.implementationMode === "string" && req.body.implementationMode.trim() ? req.body.implementationMode.trim() : "DIRECT_GOVERNMENT";
    const message = typeof (req.body.message || req.body.messageToGovernment || req.body.remarks) === "string" && String(req.body.message || req.body.messageToGovernment || req.body.remarks).trim() ? String(req.body.message || req.body.messageToGovernment || req.body.remarks).trim() : "Corporate expression of interest for public development need.";
    if (!Number.isFinite(indicativeBudget) || indicativeBudget <= 0 || req.body.declarationAccepted !== true) {
      return res.status(400).json({ error: "Please enter a valid indicative budget and accept the submission declaration." });
    }
    let interest = await prisma.corporatePitchInterest.create({
      data: {
        interestTrackingId: await generateInterestTrackingId(),
        pitchId,
        corporateId,
        submittedByUserId: req.user?.id || null,
        indicativeBudget,
        preferredStartPeriod,
        implementationMode,
        ngoOrFoundationDetails: req.body.ngoOrFoundationDetails || null,
        message,
        declarationAccepted: true,
        assignedRelationshipManagerId: null,
        status: "SUBMITTED"
      }
    });
    const trackedCase = await PortalCaseService.createForLegacyEntity({
      type: PortalCaseType.CORPORATE_PITCH_INTEREST,
      sourceEntityId: interest.id,
      sourcePitchId: pitch.id,
      trackingId: interest.interestTrackingId || interest.id,
      submittingOrganizationId: corporateId,
      submittedByUserId: req.user?.id || null,
      targetDistricts: pitch.districts.length ? pitch.districts : (pitch.district ? [pitch.district] : []),
      currentStage: "RM_ALLOCATION",
      status: "SUBMITTED",
      actorUserId: req.user?.id || null,
    });
    const assignedRmId = await RmAssignmentService.autoAssignRm({ caseId: trackedCase.id });
    interest = await prisma.corporatePitchInterest.update({
      where: { id: interest.id },
      data: {
        portalCaseId: trackedCase.id,
        assignedRelationshipManagerId: assignedRmId,
        status: assignedRmId ? "SUBMITTED" : "UNASSIGNED",
      },
    });
    if (assignedRmId) {
      await createSLAEscalation({ entityType: "CORPORATE_PITCH_INTEREST", entityId: interest.id, stage: "RM_RESPONSE", responsibleUserId: assignedRmId, dueAt: await calculateSlaDueDate("RM_RESPONSE") });
      await dispatchNotification({
        recipientId: assignedRmId,
        templateName: "PITCH_INTEREST_ASSIGNED",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: { title: "New corporate pitch interest assigned", message: `Interest ${interest.interestTrackingId} requires interaction logging and feasibility assessment.`, currentStatus: interest.status },
        actionButtonUrl: `/interests`,
        correlationId: interest.id,
        notificationType: "PITCH_INTEREST_ASSIGNED",
      });
    } else {
      notifyHierarchy({
        title: "Corporate Pitch Interest Awaiting RM Allocation",
        message: `Interest ${interest.interestTrackingId} is queued because no Relationship Manager is currently available.`,
        organizationId: corporateId,
        includePortalAdmins: true,
        includeStateOfficers: true,
        actionButtonUrl: "/interests",
      }).catch(err => console.error("Notification dispatch failed:", err));
    }
    await prisma.auditLog.create({ data: { actorUserId: req.user?.id || null, userId: req.user?.id || null, action: "PITCH_INTEREST_SUBMITTED", entityType: "CorporatePitchInterest", entityId: interest.id, details: { pitchId, pitchReferenceId: pitch.pitchReferenceId, corporateId, indicativeBudget, preferredStartPeriod, implementationMode, ngoOrFoundationDetails: req.body.ngoOrFoundationDetails || null, message, declarationAccepted: true, trackingId: interest.interestTrackingId, assignedRmId } } });
    return res.status(201).json(interest);
  } catch (error) {
    next(error);
  }
};

export const verifyPitch = verifyGovernmentPitch;

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
    const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.GOVERNMENT_PITCH, pitch.id);
    if (trackedCase) {
      await PortalCaseService.transition({
        caseId: trackedCase.id,
        toStatus: updated.status,
        stage: publishedStatusStage(statusByDecision[decision]),
        action: `JS_${decision}`,
        actorUserId: req.user?.id || null,
        remarks: reason || conditions || null,
      });
    }
    await prisma.sLAEscalation.updateMany({ where: { entityType: "GOVERNMENT_PITCH", entityId: pitch.id, stage: "JS_DECISION", isResolved: false }, data: { isResolved: true, resolvedAt: new Date() } });
    await prisma.auditLog.create({ data: { actorUserId: req.user?.id || null, userId: req.user?.id || null, action: "GOVERNMENT_PITCH_JS_DECISION", entityType: "GovernmentPitch", entityId: pitch.id, details: { decision, reason: reason || null, conditions: conditions || null, resultingStatus: updated.status } } });

    // Log decision in ApplicationInteraction for transparent timeline history
    try {
      if (req.user?.id) {
        await prisma.applicationInteraction.create({
          data: {
            entityType: "GOVERNMENT_PITCH",
            entityId: pitch.id,
            actorUserId: req.user.id,
            channel: decision === "RETURN_FOR_CLARIFICATION" ? "JS_CLARIFICATION_REQUEST" : `JS_${decision}`,
            note: `Joint Secretary Decision: ${decision.replace(/_/g, " ")}${reason ? ` | Remarks: ${reason}` : ""}${conditions ? ` | Conditions: ${conditions}` : ""}`,
            occurredAt: new Date()
          }
        });
      }
    } catch (intErr) {
      console.warn("[approvePitch] Could not log interaction:", intErr);
    }

    const published = updated.status === "PUBLIC_LISTED";

    // If JS requests clarification or rejects, notify the assigned Relationship Manager directly
    if (updated.assignedRelationshipManagerId && (decision === "RETURN_FOR_CLARIFICATION" || decision === "RETURN_FOR_CORRECTION" || decision === "REJECT")) {
      dispatchNotification({
        recipientId: updated.assignedRelationshipManagerId,
        templateName: "GOVERNMENT_PITCH_JS_FEEDBACK",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: {
          title: decision === "RETURN_FOR_CLARIFICATION" ? "Joint Secretary Requested Clarification" : "Joint Secretary Decision on Pitch",
          message: `Joint Secretary has reviewed pitch ${updated.pitchReferenceId || updated.id} and recorded decision: ${decision.replace(/_/g, " ")}. Remarks: "${reason || conditions || "Please review and follow up with the department as needed."}"`,
          currentStatus: updated.status,
          workflowStatus: `JS Decision: ${decision.replace(/_/g, " ")}`
        },
        actionButtonUrl: `/pitches/${updated.id}`,
        correlationId: updated.id,
        notificationType: "JS_DECISION"
      }).catch(err => console.error("[approvePitch] RM notification failed:", err));
    }

    await dispatchToContact({
      referenceId: updated.pitchReferenceId || updated.id,
      email: updated.email,
      phone: updated.mobile,
      title: published ? "Government pitch approved and published" : "Joint Secretary decision recorded",
      message: published ? `Your pitch ${updated.pitchReferenceId || updated.id} has been approved by the Joint Secretary and is now publicly listed for corporate interest.` : `A Joint Secretary decision has been recorded for pitch ${updated.pitchReferenceId || updated.id}: ${decision.replace(/_/g, " ")}.${reason ? ` Remarks: ${reason}` : ""}`,
      trackingId: updated.pitchReferenceId || undefined,
      currentStatus: updated.status,
      actionButtonUrl: `/track?trackingId=${encodeURIComponent(updated.pitchReferenceId || updated.id)}`,
      correlationId: updated.id,
      notificationType: "JS_DECISION"
    });

    notifyHierarchy({
      title: published ? "Government Pitch Approved & Published" : "Joint Secretary Pitch Decision",
      message: published ? `Government pitch ${updated.pitchReferenceId || updated.id} ("${updated.title}") has been approved by Joint Secretary and published to the public marketplace.` : `Joint Secretary decision recorded for pitch ${updated.pitchReferenceId || updated.id}: ${decision.replace(/_/g, " ")}.`,
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

export const respondToPitchClarification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { responseNote, supportingDocumentUrl, supportingDocuments } = req.body;
    const noteText = String(responseNote || "").trim();

    if (noteText.length < 5) {
      return res.status(400).json({ error: "Please enter your clarification response (minimum 5 characters)." });
    }

    const pitch = await prisma.governmentPitch.findUnique({ where: { id } });
    if (!pitch) return res.status(404).json({ error: "Pitch not found." });

    const nextStatus = "UNDER_RM_REVIEW";
    
    // Append any supporting documents if uploaded
    let updatedDocs = Array.isArray(pitch.supportingDocuments) ? [...pitch.supportingDocuments] : [];
    if (supportingDocumentUrl && typeof supportingDocumentUrl === "string" && !updatedDocs.includes(supportingDocumentUrl)) {
      updatedDocs.push(supportingDocumentUrl);
    }
    if (Array.isArray(supportingDocuments)) {
      for (const d of supportingDocuments) {
        if (typeof d === "string" && !updatedDocs.includes(d)) {
          updatedDocs.push(d);
        }
      }
    }

    const updated = await prisma.governmentPitch.update({
      where: { id },
      data: {
        status: nextStatus,
        supportingDocuments: updatedDocs
      }
    });

    const docMsg = supportingDocumentUrl || (Array.isArray(supportingDocuments) && supportingDocuments.length > 0)
      ? `\n[Attached Document: ${supportingDocumentUrl || supportingDocuments.join(", ")}]`
      : "";

    const interaction = await prisma.applicationInteraction.create({
      data: {
        entityType: "GOVERNMENT_PITCH",
        entityId: pitch.id,
        actorUserId: userId,
        channel: "DEPARTMENT_RESPONSE",
        note: `Department Clarification Response: ${noteText}${docMsg}`,
        occurredAt: new Date()
      }
    });

    const trackedCase = await PortalCaseService.getByLegacyEntity(PortalCaseType.GOVERNMENT_PITCH, pitch.id);
    if (trackedCase) {
      await PortalCaseService.transition({
        caseId: trackedCase.id,
        toStatus: nextStatus,
        stage: "RM_REVIEW",
        action: "CLARIFICATION_PROVIDED",
        actorUserId: userId,
        metadata: { responseNote: noteText, supportingDocuments: updatedDocs }
      });
      await PortalCaseService.addInteraction({
        caseId: trackedCase.id,
        actorUserId: userId,
        interactionType: normalizeInteractionType("DEPARTMENT_RESPONSE"),
        participants: normalizeParticipants(req.body.participants, "GOVERNMENT"),
        summary: `Department Clarification Response: ${noteText}${docMsg}`,
        occurredAt: new Date()
      });
    }

    if (pitch.assignedRelationshipManagerId) {
      await dispatchNotification({
        recipientId: pitch.assignedRelationshipManagerId,
        templateName: "GOVERNMENT_PITCH_CLARIFICATION_RESPONDED",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: {
          title: "Clarification Provided for Pitch",
          message: `The submitting department has provided clarification for pitch ${pitch.pitchReferenceId || pitch.id}: "${noteText}"${docMsg ? " with attached document." : "."}`,
          currentStatus: nextStatus
        },
        actionButtonUrl: `/pitches/${pitch.id}`,
        correlationId: pitch.id,
        notificationType: "PITCH_CLARIFICATION_RESPONSE"
      });
    }

    notifyHierarchy({
      title: "Department Clarification Provided",
      message: `Clarification provided by department on pitch ${pitch.pitchReferenceId || pitch.id}: "${noteText}"`,
      organizationId: pitch.departmentId,
      assignedRmId: pitch.assignedRelationshipManagerId || undefined,
      district: Array.isArray(pitch.districts) && pitch.districts.length > 0 ? pitch.districts[0] : null,
      includeRms: true,
      includePortalAdmins: true,
      actionButtonUrl: `/pitches/${pitch.id}`
    }).catch((err) => console.error("[ClarificationResponded] Hierarchy notification dispatch failed:", err));

    await auditLog(userId, "GOVERNMENT_PITCH_CLARIFICATION_PROVIDED", { pitchId: id, responseNote: noteText, supportingDocuments: updatedDocs });

    return res.json({ success: true, message: "Clarification submitted to Relationship Manager.", data: updated, interaction });
  } catch (error) {
    next(error);
  }
};
