import { Response, NextFunction } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { GovernmentPitchStatus, Role, ChecklistAnswer, FeasibilityResult } from "@prisma/client";
import { notify, notifyByRole, auditLog, sendTrackingIdNotification } from "../services/notificationService";
import { assertOtpVerified } from "../services/otpService";
import { SLAEscalationService, calculateDueDate } from "../services/slaEscalationService";
import { onboardApprovedAssessmentToProject } from "../services/convergenceOnboardingService";

// ─── Types ─────────────────────────────────────────────────────────
interface PhotoInput {
  fileUrl: string;
  latitude: number;
  longitude: number;
  capturedAt?: Date;
}

interface SubmitPitchBody {
  officialName: string;
  designation: string;
  department: string;
  officeName: string;
  serviceClass: "CLASS_1" | "CLASS_2" | "BELOW_CLASS_2";
  mobile: string;
  email: string;
  district: string;
  taluka: string;
  exactLocation: string;
  csrRequirement: string;
  estimatedCost: number;
  govtFundDeclaration: boolean;
  certificationType: "SELF" | "HOD";
  hodCertificationDocument?: string;
  photos: PhotoInput[];
  mobileVerificationToken?: string;
  emailVerificationToken?: string;
}

interface SubmitInterestBody {
  companyName: string;
  mca21Cin: string;
  contactPersonName: string;
  contactPersonDesignation: string;
  mobile: string;
  email: string;
  indicativeBudget?: number;
  preferredStartTimeline: string;
  implementationMode: "SELF" | "OWN_FOUNDATION" | "NGO_PARTNER";
  messageToGovernment?: string;
  declarationAccepted: boolean;
  mobileVerificationToken?: string;
  emailVerificationToken?: string;
}

interface VerifyPitchBody {
  status: "RM_VERIFIED" | "JS_APPROVED" | "JS_REJECTED";
  remarks?: string;
  rejectionReason?: string;
}

// ─── Helper: Generate Pitch Reference ID ────────────────────────────
const generatePitchReferenceId = async (tenantId?: string | null): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `GP-MH-${year}-`;

  const lastPitch = await prisma.governmentPitch.findFirst({
    where: {
      pitchReferenceId: { startsWith: prefix }
    },
    orderBy: { createdAt: "desc" }
  });

  let nextNumber = 1;
  if (lastPitch && lastPitch.pitchReferenceId) {
    const parts = lastPitch.pitchReferenceId.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};

// ─── Helper: Generate Interest Tracking ID ────────────────────────
const generateInterestTrackingId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INT-MH-${year}-`;

  const lastInterest = await prisma.corporatePitchInterest.findFirst({
    where: {
      interestTrackingId: { startsWith: prefix }
    },
    orderBy: { createdAt: "desc" }
  });

  let nextNumber = 1;
  if (lastInterest && lastInterest.interestTrackingId) {
    const parts = lastInterest.interestTrackingId.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};

// ─── Submit Pitch ─────────────────────────────────────────────────
export const submitPitch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || null;

    // Check if user is a government officer
    const allowedRoles: Role[] = [
      Role.GOVERNMENT_OFFICER,
      Role.DISTRICT_NODAL_OFFICER,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN
    ];

    if (req.user?.role && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Only government officers can submit pitches" });
    }

    const body = req.body as SubmitPitchBody;

    // Validation
    if (!body.officialName || !body.officialName.trim()) {
      return res.status(400).json({ error: "Official name is required" });
    }
    if (!body.designation || !body.designation.trim()) {
      return res.status(400).json({ error: "Designation is required" });
    }
    if (!body.department || !body.department.trim()) {
      return res.status(400).json({ error: "Department is required" });
    }
    if (!body.officeName || !body.officeName.trim()) {
      return res.status(400).json({ error: "Office name is required" });
    }
    if (!body.serviceClass) {
      return res.status(400).json({ error: "Service class is required" });
    }
    if (!body.mobile || !body.mobile.match(/^[0-9]{10}$/)) {
      return res.status(400).json({ error: "Valid 10-digit mobile number is required" });
    }
    if (!body.email || !body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!body.district || !body.district.trim()) {
      return res.status(400).json({ error: "District is required" });
    }
    if (!body.taluka || !body.taluka.trim()) {
      return res.status(400).json({ error: "Taluka is required" });
    }
    if (!body.exactLocation || !body.exactLocation.trim()) {
      return res.status(400).json({ error: "Exact location is required" });
    }
    if (!body.csrRequirement || !body.csrRequirement.trim()) {
      return res.status(400).json({ error: "CSR requirement description is required" });
    }
    if (body.csrRequirement.length > 2000) {
      return res.status(400).json({ error: "CSR requirement must be 2000 characters or less (approx 200 words)" });
    }
    if (!body.estimatedCost || body.estimatedCost <= 0) {
      return res.status(400).json({ error: "Valid estimated cost is required" });
    }
    if (typeof body.govtFundDeclaration !== "boolean") {
      return res.status(400).json({ error: "Government fund declaration is required" });
    }
    if (!body.certificationType) {
      return res.status(400).json({ error: "Certification type is required" });
    }
    if ((body.serviceClass === "CLASS_1" || body.serviceClass === "CLASS_2") && body.certificationType !== "SELF") {
      return res.status(400).json({ error: "Class-1 and Class-2 officials must use self-certification" });
    }
    if (body.serviceClass === "BELOW_CLASS_2" && body.certificationType !== "HOD") {
      return res.status(400).json({ error: "Below Class-2 officials require HOD certification" });
    }
    if (body.certificationType === "HOD" && (!body.hodCertificationDocument || !body.hodCertificationDocument.trim())) {
      return res.status(400).json({ error: "HOD certification document is required for HOD certification type" });
    }

    try {
      await assertOtpVerified("GOVERNMENT_PITCH", "MOBILE", body.mobile, body.mobileVerificationToken);
      await assertOtpVerified("GOVERNMENT_PITCH", "EMAIL", body.email, body.emailVerificationToken);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    // Photo validation - minimum 2 geo-tagged photos required
    if (!body.photos || !Array.isArray(body.photos)) {
      return res.status(400).json({ error: "At least 2 geo-tagged photos are required" });
    }
    if (body.photos.length < 2) {
      return res.status(400).json({ error: "Minimum 2 geo-tagged photos are required" });
    }

    // Validate each photo has geo-coordinates
    for (let i = 0; i < body.photos.length; i++) {
      const photo = body.photos[i];
      if (!photo.fileUrl || !photo.fileUrl.trim()) {
        return res.status(400).json({ error: `Photo ${i + 1}: file URL is required` });
      }
      if (typeof photo.latitude !== "number" || isNaN(photo.latitude)) {
        return res.status(400).json({ error: `Photo ${i + 1}: valid latitude is required` });
      }
      if (typeof photo.longitude !== "number" || isNaN(photo.longitude)) {
        return res.status(400).json({ error: `Photo ${i + 1}: valid longitude is required` });
      }
      if (photo.latitude < -90 || photo.latitude > 90) {
        return res.status(400).json({ error: `Photo ${i + 1}: latitude must be between -90 and 90` });
      }
      if (photo.longitude < -180 || photo.longitude > 180) {
        return res.status(400).json({ error: `Photo ${i + 1}: longitude must be between -180 and 180` });
      }
    }

    const pitchReferenceId = await generatePitchReferenceId(tenantId);

    const verificationDueAt = calculateDueDate("GOVERNMENT_PITCH_VERIFICATION");

    // Create pitch with photos
    const pitch = await prisma.governmentPitch.create({
      data: {
        tenantId,
        pitchReferenceId,
        officialName: body.officialName.trim(),
        designation: body.designation.trim(),
        department: body.department.trim(),
        officeName: body.officeName.trim(),
        serviceClass: body.serviceClass,
        mobile: body.mobile,
        mobileVerified: false,
        email: body.email,
        emailVerified: false,
        district: body.district.trim(),
        taluka: body.taluka.trim(),
        exactLocation: body.exactLocation.trim(),
        csrRequirement: body.csrRequirement.trim(),
        estimatedCost: new Decimal(body.estimatedCost),
        govtFundDeclaration: body.govtFundDeclaration,
        certificationType: body.certificationType,
        hodCertificationDocument: body.hodCertificationDocument,
        status: GovernmentPitchStatus.SUBMITTED,
        submittedAt: new Date(),
        verificationDueAt,
        photos: {
          create: body.photos.map((photo) => ({
            tenantId,
            fileUrl: photo.fileUrl,
            latitude: new Decimal(photo.latitude),
            longitude: new Decimal(photo.longitude),
            capturedAt: photo.capturedAt || new Date(),
            isGeoTagged: true
          }))
        }
      },
      include: {
        photos: true
      }
    });

    // Auto-assign to RM based on district
    const rm = await prisma.user.findFirst({
      where: {
        role: Role.CSR_RELATIONSHIP_MANAGER,
        assignedDistrict: body.district
      }
    });

    if (rm) {
      await prisma.governmentPitch.update({
        where: { id: pitch.id },
        data: {
          assignedRelationshipManagerId: rm.id,
          status: GovernmentPitchStatus.RM_VERIFICATION_PENDING
        }
      });

      await SLAEscalationService.create({
        entityType: "GOVERNMENT_PITCH",
        entityId: pitch.id,
        stage: "GOVERNMENT_PITCH_VERIFICATION",
        responsibleUserId: rm.id,
        dueAt: verificationDueAt,
        tenantId,
      });

      // Notify RM
      await notify(
        rm.id,
        "New Government Pitch Assigned",
        `A new government pitch '${pitch.pitchReferenceId}' has been assigned to you for verification.`
      );
    }

    await auditLog(userId, "GOVERNMENT_PITCH_SUBMITTED", {
      pitchId: pitch.id,
      pitchReferenceId: pitch.pitchReferenceId,
      district: body.district
    });

    await sendTrackingIdNotification({
      trackingId: pitch.pitchReferenceId,
      targetEmail: pitch.email,
      targetMobile: pitch.mobile,
      title: "Development need pitch received",
      message: `Your government development need pitch has been received. Tracking ID: ${pitch.pitchReferenceId}.`,
    });

    return res.status(201).json({
      message: "Pitch submitted successfully",
      pitch: {
        ...pitch,
        status: rm ? GovernmentPitchStatus.RM_VERIFICATION_PENDING : GovernmentPitchStatus.SUBMITTED
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Public Pitches ─────────────────────────────────────────────
export const getPublicPitches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { district, taluka, minBudget, maxBudget, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    // Only show JS-approved public pitches
    const where: any = {
      status: {
        in: [
          GovernmentPitchStatus.JS_APPROVED,
          GovernmentPitchStatus.PUBLIC_LISTED,
          GovernmentPitchStatus.CORPORATE_INTEREST_RECEIVED
        ]
      }
    };

    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || null;
    if (tenantId && req.user?.role !== Role.MASTER_ADMIN) {
      where.OR = [
        { tenantId: tenantId },
        { tenantId: null }
      ];
    }

    if (district) where.district = district as string;
    if (taluka) where.taluka = taluka as string;

    if (minBudget || maxBudget) {
      where.estimatedCost = {};
      if (minBudget) where.estimatedCost.gte = parseFloat(minBudget as string);
      if (maxBudget) where.estimatedCost.lte = parseFloat(maxBudget as string);
    }

    const [pitches, total] = await Promise.all([
      prisma.governmentPitch.findMany({
        where,
        include: {
          photos: {
            select: {
              id: true,
              fileUrl: true,
              latitude: true,
              longitude: true
            }
          },
          _count: {
            select: {
              interests: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      prisma.governmentPitch.count({ where })
    ]);

    return res.json({
      data: pitches,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Pitch By ID ────────────────────────────────────────────────
export const getPitchById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const pitch = await prisma.governmentPitch.findUnique({
      where: { id },
      include: {
        photos: true,
        _count: {
          select: {
            interests: true
          }
        },
        feasibilityAssessment: {
          include: {
            checklistItems: true,
            relationshipManager: {
              select: { id: true, email: true }
            },
            nodalOfficerAppointment: {
              select: {
                id: true,
                nodalOfficerName: true,
                designation: true,
                department: true,
                district: true,
                appointedAt: true,
                appointmentLetterUrl: true
              }
            }
          }
        },
        assignedRelationshipManager: {
          select: { id: true, email: true, assignedDistrict: true }
        }
      }
    });

    if (!pitch) {
      return res.status(404).json({ error: "Pitch not found" });
    }

    // Access control
    const isPublicPitch = pitch.status === GovernmentPitchStatus.JS_APPROVED ||
                         pitch.status === GovernmentPitchStatus.PUBLIC_LISTED;
    
    const isGovernmentOfficer = userRole === Role.GOVERNMENT_OFFICER ||
                                  userRole === Role.DISTRICT_NODAL_OFFICER;
    
    const isRM = userRole === Role.CSR_RELATIONSHIP_MANAGER;
    const isJS = userRole === Role.JOINT_SECRETARY || userRole === Role.STATE_CSR_CELL;
    const isAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.PORTAL_ADMIN;

    // Public can only see approved pitches
    if (!userId && !isPublicPitch) {
      return res.status(404).json({ error: "Pitch not found" });
    }

    // RM can see assigned or unassigned pitches
    if (isRM && pitch.assignedRelationshipManagerId !== userId && pitch.assignedRelationshipManagerId !== null && !isPublicPitch && !isAdmin) {
      return res.status(403).json({ error: "You can only view pitches assigned to you" });
    }

    // Remove sensitive information for public viewing
    let responsePitch = pitch;
    if (isPublicPitch && !isGovernmentOfficer && !isRM && !isJS && !isAdmin) {
      const { mobile, email, ...publicPitch } = pitch as any;
      responsePitch = publicPitch;
    }

    return res.json(responsePitch);
  } catch (error) {
    next(error);
  }
};

// ─── Verify Pitch (RM) ──────────────────────────────────────────────
export const verifyPitch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { remarks } = req.body;

    // Only RM can verify pitches
    if (req.user!.role !== Role.CSR_RELATIONSHIP_MANAGER &&
        req.user!.role !== Role.SUPER_ADMIN &&
        req.user!.role !== Role.PORTAL_ADMIN) {
      return res.status(403).json({ error: "Only Relationship Managers can verify pitches" });
    }

    const pitch = await prisma.governmentPitch.findUnique({
      where: { id }
    });

    if (!pitch) {
      return res.status(404).json({ error: "Pitch not found" });
    }

    // Check if pitch is assigned to this RM or is unassigned
    if (pitch.assignedRelationshipManagerId !== userId &&
        pitch.assignedRelationshipManagerId !== null &&
        req.user!.role !== Role.SUPER_ADMIN &&
        req.user!.role !== Role.PORTAL_ADMIN) {
      return res.status(403).json({ error: "This pitch is not assigned to you" });
    }

    // Check if pitch is in verifiable status
    const verifiableStatuses: GovernmentPitchStatus[] = [
      GovernmentPitchStatus.RM_VERIFICATION_PENDING,
      GovernmentPitchStatus.SUBMITTED
    ];

    if (!verifiableStatuses.includes(pitch.status)) {
      return res.status(400).json({ error: "Pitch cannot be verified in current status" });
    }

    const jsApprovalDueAt = calculateDueDate("JS_DECISION");

    const updateData: any = {
      status: GovernmentPitchStatus.JS_APPROVAL_PENDING,
      jsApprovalDueAt,
      updatedAt: new Date()
    };
    if (!pitch.assignedRelationshipManagerId) {
      updateData.assignedRelationshipManagerId = userId;
    }

    const updatedPitch = await prisma.governmentPitch.update({
      where: { id },
      data: updateData
    });

    await prisma.sLAEscalation.updateMany({
      where: {
        entityType: "GOVERNMENT_PITCH",
        entityId: id,
        stage: "GOVERNMENT_PITCH_VERIFICATION",
        isResolved: false,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    await SLAEscalationService.create({
      entityType: "GOVERNMENT_PITCH",
      entityId: id,
      stage: "JS_DECISION",
      dueAt: jsApprovalDueAt,
      tenantId: pitch.tenantId || undefined,
    });

    // Create feasibility assessment placeholder
    await prisma.feasibilityAssessment.create({
      data: {
        tenantId: pitch.tenantId,
        reportReference: `FES-${pitch.pitchReferenceId}`,
        governmentPitchId: id,
        relationshipManagerId: userId,
        companyName: "Government Pitch Assessment",
        cin: "N/A",
        sector: "Government",
        contactSummary: "",
        proposedLocationDistrict: pitch.district,
        indicativeBudget: pitch.estimatedCost,
        developmentNeedAddressed: pitch.csrRequirement,
        dateOfFirstContact: new Date(),
        summaryOfInteraction: remarks || "Pitch verified by RM",
        feasibilityResult: FeasibilityResult.FEASIBLE,
        recommendation: "Pending JS approval",
        suggestedNodalOfficerDomain: pitch.department,
        checklistItems: {
          create: [
            { itemNumber: 1, dimension: "Compliance", checkText: "Valid government officer", isCritical: true, answer: ChecklistAnswer.YES },
            { itemNumber: 2, dimension: "Location", checkText: "Geo-tagged location verified", isCritical: true, answer: ChecklistAnswer.YES },
            { itemNumber: 3, dimension: "Documentation", checkText: "Required documents present", isCritical: true, answer: ChecklistAnswer.YES }
          ]
        }
      }
    });

    // Notify JS
    await notifyByRole(
      Role.JOINT_SECRETARY,
      "Pitch Ready for JS Approval",
      `Pitch '${pitch.pitchReferenceId}' from ${pitch.district} has been verified by RM and is pending your approval.`
    );

    await auditLog(userId, "GOVERNMENT_PITCH_VERIFIED", {
      pitchId: id,
      pitchReferenceId: pitch.pitchReferenceId,
      remarks
    });

    return res.json({
      message: "Pitch verified successfully",
      pitch: updatedPitch
    });
  } catch (error) {
    next(error);
  }
};

// ─── Approve/Reject Pitch (JS) ──────────────────────────────────────
export const approvePitch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const body = req.body as VerifyPitchBody;

    // Only JS can approve/reject pitches
    if (req.user!.role !== Role.JOINT_SECRETARY &&
        req.user!.role !== Role.STATE_CSR_CELL &&
        req.user!.role !== Role.SUPER_ADMIN &&
        req.user!.role !== Role.PORTAL_ADMIN) {
      return res.status(403).json({ error: "Only Joint Secretary can approve/reject pitches" });
    }

    if (!body.status) {
      return res.status(400).json({ error: "Status is required (JS_APPROVED or JS_REJECTED)" });
    }

    const pitch = await prisma.governmentPitch.findUnique({
      where: { id },
      include: { photos: true }
    });

    if (!pitch) {
      return res.status(404).json({ error: "Pitch not found" });
    }

    // Check if pitch is in approvable status
    if (!([GovernmentPitchStatus.RM_VERIFIED, GovernmentPitchStatus.JS_APPROVAL_PENDING] as any[]).includes(pitch.status)) {
      return res.status(400).json({ error: "Pitch must be RM-verified before JS approval" });
    }

    let newStatus: GovernmentPitchStatus;
    let resultMessage: string;

    if (body.status === "JS_APPROVED") {
      newStatus = GovernmentPitchStatus.PUBLIC_LISTED;
      resultMessage = "Pitch approved and listed publicly";
    } else if (body.status === "JS_REJECTED") {
      if (!body.rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      newStatus = GovernmentPitchStatus.JS_REJECTED;
      resultMessage = "Pitch rejected";
    } else {
      return res.status(400). json({ error: "Invalid status. Use JS_APPROVED or JS_REJECTED" });
    }

    const updatedPitch = await prisma.governmentPitch.update({
      where: { id },
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    });

    // Update the feasibility assessment
    await prisma.feasibilityAssessment.updateMany({
      where: { governmentPitchId: id },
      data: {
        jsDecisionById: userId,
        jsDecisionAt: new Date(),
        jsDecisionRemarks: body.remarks || body.rejectionReason
      }
    });

    // Notify RM
    if (pitch.assignedRelationshipManagerId) {
      await notify(
        pitch.assignedRelationshipManagerId,
        `Pitch ${newStatus === GovernmentPitchStatus.PUBLIC_LISTED ? "Approved" : "Rejected"} by JS`,
        `Pitch '${pitch.pitchReferenceId}' has been ${newStatus === GovernmentPitchStatus.PUBLIC_LISTED ? "approved" : "rejected"} by Joint Secretary.`
      );
    }

    await auditLog(userId, `GOVERNMENT_PITCH_${body.status}`, {
      pitchId: id,
      pitchReferenceId: pitch.pitchReferenceId,
      remarks: body.remarks,
      rejectionReason: body.rejectionReason
    });

    return res.json({
      message: resultMessage,
      pitch: updatedPitch
    });
  } catch (error) {
    next(error);
  }
};

// ─── Submit Interest (Corporate) ────────────────────────────────────
export const submitInterest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || null;

    const body = req.body as SubmitInterestBody;

    // Validation
    if (!body.companyName || !body.companyName.trim()) {
      return res.status(400).json({ error: "Company name is required" });
    }
    if (!body.mca21Cin || !body.mca21Cin.trim()) {
      return res.status(400).json({ error: "MCA21 CIN is required" });
    }
    if (!body.contactPersonName || !body.contactPersonName.trim()) {
      return res.status(400).json({ error: "Contact person name is required" });
    }
    if (!body.contactPersonDesignation || !body.contactPersonDesignation.trim()) {
      return res.status(400).json({ error: "Contact person designation is required" });
    }
    if (!body.mobile || !body.mobile.match(/^[0-9]{10}$/)) {
      return res.status(400).json({ error: "Valid 10-digit mobile number is required" });
    }
    if (!body.email || !body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: "Valid email is required" });
    }
    if (!body.preferredStartTimeline || !body.preferredStartTimeline.trim()) {
      return res.status(400).json({ error: "Preferred start timeline is required" });
    }
    if (!body.implementationMode) {
      return res.status(400).json({ error: "Implementation mode is required" });
    }
    if (!body.declarationAccepted) {
      return res.status(400).json({ error: "Declaration must be accepted" });
    }

    if (!body.indicativeBudget || body.indicativeBudget <= 0) {
      return res.status(400).json({ error: "Indicative budget is required" });
    }

    try {
      await assertOtpVerified("CORPORATE_INTEREST", "MOBILE", body.mobile, body.mobileVerificationToken);
      await assertOtpVerified("CORPORATE_INTEREST", "EMAIL", body.email, body.emailVerificationToken);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    const pitch = await prisma.governmentPitch.findUnique({
      where: { id }
    });

    if (!pitch) {
      return res.status(404).json({ error: "Pitch not found" });
    }

    // Only JS-approved pitches can receive interest
    if (!([
      GovernmentPitchStatus.JS_APPROVED,
      GovernmentPitchStatus.PUBLIC_LISTED,
      GovernmentPitchStatus.CORPORATE_INTEREST_RECEIVED
    ] as any[]).includes(pitch.status)) {
      return res.status(400).json({ error: "Interest can only be submitted on approved pitches" });
    }

    const interestTrackingId = await generateInterestTrackingId();

    const interest = await prisma.corporatePitchInterest.create({
      data: {
        tenantId,
        interestTrackingId,
        governmentPitchId: id,
        companyName: body.companyName.trim(),
        mca21Cin: body.mca21Cin.trim(),
        contactPersonName: body.contactPersonName.trim(),
        contactPersonDesignation: body.contactPersonDesignation.trim(),
        mobile: body.mobile,
        mobileVerified: false,
        email: body.email,
        emailVerified: false,
        indicativeBudget: body.indicativeBudget ? new Decimal(body.indicativeBudget) : null,
        preferredStartTimeline: body.preferredStartTimeline,
        implementationMode: body.implementationMode,
        messageToGovernment: body.messageToGovernment?.substring(0, 1000),
        declarationAccepted: body.declarationAccepted,
        status: "INTERESTED"
      }
    });

    // Update pitch status if needed
    await prisma.governmentPitch.update({
      where: { id },
      data: {
        status: GovernmentPitchStatus.CORPORATE_INTEREST_RECEIVED,
        updatedAt: new Date()
      }
    });

    // Notify RM if assigned
    if (pitch.assignedRelationshipManagerId) {
      await notify(
        pitch.assignedRelationshipManagerId,
        "New Corporate Interest Received",
        `Corporate interest received on pitch '${pitch.pitchReferenceId}' from ${body.companyName}.`
      );
    }

    await auditLog(userId, "CORPORATE_PITCH_INTEREST_SUBMITTED", {
      pitchId: id,
      interestId: interest.id,
      interestTrackingId,
      companyName: body.companyName
    });

    await sendTrackingIdNotification({
      trackingId: interestTrackingId,
      targetEmail: interest.email,
      targetMobile: interest.mobile,
      title: "Corporate interest received",
      message: `Your interest on government pitch ${pitch.pitchReferenceId} has been received. Tracking ID: ${interestTrackingId}.`,
    });

    const assessment = await prisma.feasibilityAssessment.findUnique({
      where: { governmentPitchId: id },
      select: { id: true },
    });
    const onboarding = assessment
      ? await onboardApprovedAssessmentToProject({ assessmentId: assessment.id, actorUserId: userId })
      : null;

    return res.status(201).json({
      message: "Interest submitted successfully",
      interest,
      onboarding
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get My Pitches (Government Officer) ────────────────────────────
export const getMyPitches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    // Only government officers can view their pitches
    const allowedRoles: Role[] = [
      Role.GOVERNMENT_OFFICER,
      Role.DISTRICT_NODAL_OFFICER,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN
    ];

    if (!allowedRoles.includes(req.user!.role)) {
      return res.status(403).json({ error: "Only government officers can view their pitches" });
    }

    const pageNum = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    // Build filter - get pitches by matching mobile/email with the user
    // In a real system, you'd have a createdBy field, here we match by contact info
    const where: any = {};

    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;
    if (tenantId) {
      where.OR = [
        { tenantId: tenantId },
        { tenantId: null }
      ];
    }

    if (status) {
      where.status = status as GovernmentPitchStatus;
    }

    const [pitches, total] = await Promise.all([
      prisma.governmentPitch.findMany({
        where,
        include: {
          photos: {
            select: {
              id: true,
              fileUrl: true,
              latitude: true,
              longitude: true
            }
          },
          _count: {
            select: {
              interests: true
            }
          },
          assignedRelationshipManager: {
            select: { id: true, email: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      }),
      prisma.governmentPitch.count({ where })
    ]);

    return res.json({
      data: pitches,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};
