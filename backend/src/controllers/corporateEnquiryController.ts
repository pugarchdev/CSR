import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { notFoundResponse } from "../utils/apiResponse";
import { selectLeastLoadedRm } from "../services/rmAssignmentService";
import { ROLE_ID } from "../types/role";
import { notifyHierarchy } from "../services/hierarchyNotificationService";
import { generateCorporateEnquiryTrackingId } from "../services/trackingIdService";
import { createSLAEscalation } from "../services/slaEscalationService";
import { calculateSlaDueDate } from "../services/slaConfigService";
import { dispatchNotification, dispatchToContact } from "../services/notificationOrchestrator";
import { validateCorporateEnquirySubmission } from "../utils/workflowValidation";

export const submitCorporateEnquiry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Fetch user and organization to check onboarding status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    // Relationship Managers cannot submit corporate enquiries
    if (user?.roleId === ROLE_ID.RELATIONSHIP_MANAGER) {
      return res.status(403).json({
        error: "Relationship Managers are not allowed to submit corporate enquiries."
      });
    }

    // Enforce Onboarding Guard for suspended/rejected accounts only
    if (user?.roleId !== ROLE_ID.SUPER_ADMIN && user?.organization && ["REJECTED", "SUSPENDED"].includes(user.organization.status)) {
      return res.status(403).json({
        error: "Organization onboarding application is suspended or rejected."
      });
    }

    const validation = validateCorporateEnquirySubmission(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Corporate enquiry submission is incomplete.", validationErrors: validation.errors });
    }
    const submission = validation.value;
    const targetDepartment = await prisma.organization.findFirst({
      where: { id: submission.departmentId, kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" },
      select: { id: true, name: true }
    });
    if (!targetDepartment) {
      return res.status(400).json({ error: "Select an active government department." });
    }

    const preferredDistrict = submission.district;

    // Auto-assign RM via round-robin least loaded algorithm
    const assignedRmId = await selectLeastLoadedRm(preferredDistrict);
    if (!assignedRmId) {
      return res.status(503).json({ error: "No active Relationship Manager is available. Please retry shortly; your enquiry was not submitted." });
    }

    // Persist the complete submitted application. The tracking code is generated
    // before saving and retried on a unique collision so it remains safe to share.
    let enquiry;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        enquiry = await prisma.corporateEnquiry.create({
          data: {
        trackingId: await generateCorporateEnquiryTrackingId(),
        organizationId: user?.organizationId || null,
        corporateName: user?.organization?.name || submission.corporateName,
        contactEmail: submission.contactEmail,
        mca21CIN: user?.organization?.cin || submission.cin,
        sector: submission.sector,
        indicativeBudget: submission.indicativeBudget,
        preferredDivisions: Array.isArray(req.body.preferredDivisions) ? req.body.preferredDivisions : [],
        preferredDistricts: [submission.district],
        preferredCities: Array.isArray(req.body.preferredCities) ? req.body.preferredCities : [],
        preferredTalukas: Array.isArray(req.body.preferredTalukas) ? req.body.preferredTalukas : [],
        contactPersonName: submission.contactPersonName,
        mobile: submission.mobile,
        proposedCSRWork: submission.proposedCSRWork,
        documents: submission.documents,
        submittedByUserId: userId,
        assignedRelationshipManagerId: assignedRmId,
        status: "SUBMITTED"
          }
        });
        break;
      } catch (error: any) {
        if (error?.code !== "P2002" || attempt === 2) throw error;
      }
    }
    if (!enquiry) throw new Error("Unable to generate a unique enquiry tracking code");

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        userId,
        action: "CORPORATE_ENQUIRY_SUBMITTED",
        entityType: "CorporateEnquiry",
        entityId: enquiry.id,
        details: {
          trackingId: enquiry.trackingId,
          district: submission.district,
          departmentId: targetDepartment.id,
          departmentName: targetDepartment.name,
          declarationAccepted: true,
          submittedDocumentCount: submission.documents.length
        }
      }
    });

    await createSLAEscalation({ entityType: "CORPORATE_ENQUIRY", entityId: enquiry.id, stage: "RM_RESPONSE", responsibleUserId: assignedRmId, dueAt: await calculateSlaDueDate("RM_RESPONSE") });
    await Promise.all([
      dispatchNotification({
        recipientId: assignedRmId,
        templateName: "CORPORATE_ENQUIRY_ASSIGNED",
        channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
        variables: { title: "New corporate enquiry assigned", message: `Enquiry ${enquiry.trackingId} requires first contact and assessment.`, currentStatus: enquiry.status },
        actionButtonUrl: `/enquiries/${enquiry.id}`,
        correlationId: enquiry.id,
        notificationType: "CORPORATE_ENQUIRY_ASSIGNED"
      }),
      dispatchToContact({
        referenceId: enquiry.trackingId || enquiry.id,
        email: enquiry.contactEmail,
        phone: enquiry.mobile,
        title: "Corporate enquiry received",
        message: `Your corporate enquiry has been received. Your tracking ID is ${enquiry.trackingId}. Use it to follow progress.`,
        trackingId: enquiry.trackingId || undefined,
        currentStatus: enquiry.status,
        actionButtonUrl: `/track?trackingId=${encodeURIComponent(enquiry.trackingId || enquiry.id)}`,
        correlationId: enquiry.id,
        notificationType: "TRACKING_ID_ISSUED"
      })
    ]);

    notifyHierarchy({
      title: "New Corporate Enquiry Submitted",
      message: `Corporate enquiry ${enquiry.trackingId} submitted by "${enquiry.corporateName}".`,
      organizationId: enquiry.organizationId,
      assignedRmId: enquiry.assignedRelationshipManagerId,
      district: preferredDistrict,
      includePortalAdmins: true,
      includeRms: true,
      includeDistrictOfficers: true,
      actionButtonUrl: `/enquiries`
    }).catch(err => console.error("Notification dispatch failed:", err));

    return res.status(201).json({
      ...enquiry
    });
  } catch (error) {
    next(error);
  }
};

export const getEnquiryByTrackingId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const enquiry = await prisma.corporateEnquiry.findUnique({
      where: { trackingId: req.params.trackingId },
      select: { trackingId: true, status: true, createdAt: true, preferredDistricts: true, preferredCities: true, preferredTalukas: true, indicativeBudget: true }
    });
    if (!enquiry) return notFoundResponse(res, "Enquiry not found");
    return res.json(enquiry);
  } catch (error) {
    next(error);
  }
};

export const listCorporateEnquiries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const roleIdNum = Number(user.roleId || user.role);
    const isRM = roleIdNum === ROLE_ID.RELATIONSHIP_MANAGER || String(user.roleId) === String(ROLE_ID.RELATIONSHIP_MANAGER);
    const isSuperAdmin = roleIdNum === ROLE_ID.SUPER_ADMIN || String(user.role) === "SUPER_ADMIN";
    const isGovAdmin = ([ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY, ROLE_ID.DISTRICT_NODAL_OFFICER, ROLE_ID.DISTRICT_NODAL_CONSULTANT, ROLE_ID.GOVERNMENT_OFFICER] as number[]).includes(roleIdNum);

    let where: any = {};
    if (isRM) {
      where = { assignedRelationshipManagerId: user.id };
    } else if (!isSuperAdmin && !isGovAdmin) {
      where = {
        OR: [
          { submittedByUserId: user.id },
          ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])
        ]
      };
    }

    const enquiries = await prisma.corporateEnquiry.findMany({ where, orderBy: { createdAt: "desc" } });
    return res.json(enquiries);
  } catch (error) {
    next(error);
  }
};

export const assignRelationshipManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rm = await prisma.user.findFirst({ where: { id: req.body.relationshipManagerId, roleId: ROLE_ID.RELATIONSHIP_MANAGER, accountStatus: "ACTIVE", isVerified: true }, select: { id: true } });
    if (!rm) return res.status(400).json({ error: "Select an active, verified Relationship Manager." });
    const updated = await prisma.corporateEnquiry.update({
      where: { id: req.params.id },
      data: { assignedRelationshipManagerId: req.body.relationshipManagerId }
    });
    await dispatchNotification({ recipientId: rm.id, templateName: "CORPORATE_ENQUIRY_REASSIGNED", channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"], variables: { title: "Enquiry reassigned by Joint Secretary", message: `Enquiry ${updated.trackingId} is now assigned to you.`, currentStatus: updated.status }, actionButtonUrl: `/enquiries/${updated.id}`, correlationId: updated.id, notificationType: "RM_REASSIGNMENT" });
    await dispatchToContact({ referenceId: updated.trackingId || updated.id, email: updated.contactEmail, phone: updated.mobile, title: "Relationship Manager reassigned", message: `A Relationship Manager has been reassigned to application ${updated.trackingId || updated.id}.`, trackingId: updated.trackingId || undefined, currentStatus: updated.status, actionButtonUrl: `/track?trackingId=${encodeURIComponent(updated.trackingId || updated.id)}`, correlationId: updated.id, notificationType: "RM_REASSIGNMENT" });

    notifyHierarchy({
      title: "Relationship Manager Assigned",
      message: `Relationship Manager assigned to Corporate Enquiry ${updated.trackingId}.`,
      assignedRmId: req.body.relationshipManagerId,
      organizationId: updated.organizationId,
      includePortalAdmins: true,
      actionButtonUrl: `/enquiries`
    }).catch(err => console.error("Notification dispatch failed:", err));

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const listActiveDepartmentsForEnquiry = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await prisma.organization.findMany({
      where: { kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE", deletedAt: null },
      select: { id: true, name: true, district: true },
      orderBy: { name: "asc" }
    });
    return res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

export const recordRmContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return res.status(410).json({ error: "Use the assigned Relationship Manager interaction endpoint." });
};

export const convertToConvergenceProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const enquiry = await prisma.corporateEnquiry.findUnique({ where: { id: req.params.id } });
    if (!enquiry) return notFoundResponse(res, "Enquiry not found");

    await prisma.corporateEnquiry.update({
      where: { id: req.params.id },
      data: { status: "CONVERTED_TO_PROJECT" }
    });

    return res.json({ success: true, message: "Converted to project" });
  } catch (error) {
    next(error);
  }
};

export const acceptEnquiry = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updated = await prisma.corporateEnquiry.update({
      where: { id },
      data: { status: "UNDER_RM_REVIEW" }
    });
    return res.json({ success: true, message: "Enquiry accepted. Case status updated to UNDER_RM_REVIEW.", data: updated });
  } catch (error) {
    next(error);
  }
};

export const getEnquiryById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const roleIdNum = Number(user.roleId || user.role);
    const isRM = roleIdNum === ROLE_ID.RELATIONSHIP_MANAGER || String(user.roleId) === String(ROLE_ID.RELATIONSHIP_MANAGER);
    const isSuperAdmin = roleIdNum === ROLE_ID.SUPER_ADMIN || String(user.role) === "SUPER_ADMIN";
    const isGovAdmin = ([ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY, ROLE_ID.DISTRICT_NODAL_OFFICER, ROLE_ID.DISTRICT_NODAL_CONSULTANT, ROLE_ID.GOVERNMENT_OFFICER] as number[]).includes(roleIdNum);

    let where: any = { id: req.params.id };
    if (isRM) {
      where.assignedRelationshipManagerId = user.id;
    } else if (!isSuperAdmin && !isGovAdmin) {
      where.OR = [
        { submittedByUserId: user.id },
        ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])
      ];
    }

    const enquiry = await prisma.corporateEnquiry.findFirst({ where });
    if (!enquiry) return notFoundResponse(res, "Enquiry not found");
    return res.json(enquiry);
  } catch (error) {
    next(error);
  }
};

