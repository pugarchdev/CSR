import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  Role,
  CorporateEnquiryStatus,
  Prisma,
} from "@prisma/client";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
  createdResponse,
} from "../utils/apiResponse";
import { generateCorporateEnquiryTrackingId } from "../services/trackingIdService";
import { assertOtpVerified } from "../services/otpService";
import { sendTrackingIdNotification } from "../services/notificationService";
import { SLAEscalationService, calculateDueDate } from "../services/slaEscalationService";

// ─── Types ─────────────────────────────────────────────────────────
interface SubmitEnquiryBody {
  companyName: string;
  sector: string;
  preferredDistricts: string[];
  indicativeBudget?: number;
  contactPersonName: string;
  contactPersonDesignation?: string;
  mobile: string;
  email: string;
  mca21Cin: string;
  proposedCsrWork: string;
  mobileVerificationToken?: string;
  emailVerificationToken?: string;
}

interface AssignRMBody {
  relationshipManagerId: string;
}

interface RecordContactBody {
  note: string;
  interactionType: "CALL" | "EMAIL" | "MEETING" | "PORTAL_NOTE";
  attachmentUrls?: string[];
}

interface EnquiryFilters {
  status?: CorporateEnquiryStatus;
  page?: number;
  limit?: number;
  district?: string;
}

// ─── Validation Helpers ────────────────────────────────────────────

/**
 * Validate word count (max 200 words)
 */
const validateWordCount = (text: string, maxWords: number = 200): boolean => {
  const wordCount = text.trim().split(/\s+/).length;
  return wordCount <= maxWords;
};

/**
 * Validate Indian mobile number (10 digits, starts with 6-9)
 */
const validateMobile = (mobile: string): boolean => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

/**
 * Validate email format
 */
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate CIN (Corporate Identification Number)
 * Format: L12345XX1234XXX123456 (21 characters)
 * L = Listing status (U/L), 5 digits, 2 chars state code, 4 digits year, 3 chars entity type, 6 digits
 */
const validateCIN = (cin: string): boolean => {
  const cinRegex = /^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;
  return cinRegex.test(cin);
};

// ─── Submit Enquiry (Public) ────────────────────────────────────────
/**
 * POST handler for public submission of corporate enquiries
 * LEGACY NGO MARKETPLACE FLOW DISABLED - This is the convergence framework entry point
 */
export const submitEnquiry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const body = req.body as SubmitEnquiryBody;

    // ─── Validation ─────────────────────────────────────────────────
    if (!body.companyName || body.companyName.trim().length < 2) {
      return validationErrorResponse(res, "Company name is required (min 2 characters)");
    }

    if (!body.sector || body.sector.trim().length === 0) {
      return validationErrorResponse(res, "Sector is required");
    }

    if (!body.preferredDistricts || body.preferredDistricts.length === 0) {
      return validationErrorResponse(res, "At least one preferred district is required");
    }

    if (!body.contactPersonName || body.contactPersonName.trim().length < 2) {
      return validationErrorResponse(res, "Contact person name is required (min 2 characters)");
    }

    if (!body.mobile || !validateMobile(body.mobile)) {
      return validationErrorResponse(res, "Valid 10-digit mobile number is required");
    }

    if (!body.email || !validateEmail(body.email)) {
      return validationErrorResponse(res, "Valid email address is required");
    }

    if (!body.mca21Cin || !validateCIN(body.mca21Cin)) {
      return validationErrorResponse(
        res,
        "Valid CIN is required (format: L12345XX1234XXX123456)"
      );
    }

    if (!body.proposedCsrWork || body.proposedCsrWork.trim().length === 0) {
      return validationErrorResponse(res, "Proposed CSR work description is required");
    }

    if (!validateWordCount(body.proposedCsrWork, 200)) {
      return validationErrorResponse(
        res,
        "Proposed CSR work must not exceed 200 words"
      );
    }

    // OTP verification is only for anonymous public submissions —
    // any authenticated user has already verified their identity at login
    const isAuthenticatedUser = Boolean(req.user);

    if (!isAuthenticatedUser) {
      try {
        await assertOtpVerified("CORPORATE_ENQUIRY", "MOBILE", body.mobile, body.mobileVerificationToken);
        await assertOtpVerified("CORPORATE_ENQUIRY", "EMAIL", body.email, body.emailVerificationToken);
      } catch (error: any) {
        return validationErrorResponse(res, error.message);
      }
    }

    // Check for duplicate CIN in active enquiries
    const existingEnquiry = await prisma.corporateEnquiry.findFirst({
      where: {
        mca21Cin: body.mca21Cin.toUpperCase(),
        status: {
          in: [
            CorporateEnquiryStatus.SUBMITTED,
            CorporateEnquiryStatus.TRACKING_ID_GENERATED,
            CorporateEnquiryStatus.RM_ASSIGNED,
            CorporateEnquiryStatus.RM_CONTACTED,
            CorporateEnquiryStatus.ASSESSMENT_PENDING,
            CorporateEnquiryStatus.ASSESSMENT_SUBMITTED_TO_JS,
            CorporateEnquiryStatus.JS_APPROVED,
          ],
        },
      },
    });

    if (existingEnquiry) {
      return validationErrorResponse(
        res,
        `An active enquiry already exists for this CIN with tracking ID: ${existingEnquiry.trackingId}`
      );
    }

    // Generate tracking ID
    const trackingId = await generateCorporateEnquiryTrackingId();

    // Resolve tenant context or get default tenant
    let tenantId = (req as any).tenantContext?.tenantId;
    if (!tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { code: "MH-CSR" } });
      tenantId = tenant?.id || null;
    }

    // Create enquiry
    const enquiry = await prisma.corporateEnquiry.create({
      data: {
        trackingId,
        companyName: body.companyName.trim(),
        sector: body.sector.trim(),
        preferredDistricts: body.preferredDistricts,
        indicativeBudget: body.indicativeBudget ? new Prisma.Decimal(body.indicativeBudget) : null,
        contactPersonName: body.contactPersonName.trim(),
        contactPersonDesignation: body.contactPersonDesignation?.trim() || null,
        mobile: body.mobile,
        mobileVerified: false,
        email: body.email.toLowerCase(),
        emailVerified: false,
        mca21Cin: body.mca21Cin.toUpperCase(),
        proposedCsrWork: body.proposedCsrWork.trim(),
        status: CorporateEnquiryStatus.TRACKING_ID_GENERATED,
        tenantId,
        submittedAt: new Date(),
        firstResponseDueAt: calculateDueDate("RM_RESPONSE"),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "CORPORATE_ENQUIRY_SUBMITTED",
        entityType: "CorporateEnquiry",
        entityId: enquiry.id,
        details: {
          trackingId,
          companyName: body.companyName,
          cin: body.mca21Cin,
          contactEmail: body.email,
          contactMobile: body.mobile,
        },
      },
    });

    await sendTrackingIdNotification({
      trackingId,
      targetEmail: enquiry.email,
      targetMobile: enquiry.mobile,
      title: "Corporate enquiry received",
      message: `Your MahaCSR corporate enquiry has been received. Tracking ID: ${trackingId}.`,
    });

    return createdResponse(
      res,
      {
        enquiry: {
          id: enquiry.id,
          trackingId: enquiry.trackingId,
          status: enquiry.status,
          submittedAt: enquiry.submittedAt,
        },
      },
      `Enquiry submitted successfully. Your tracking ID is: ${trackingId}. Please save this for future reference.`
    );
  } catch (error) {
    console.error("Error in submitEnquiry:", error);
    return errorResponse(res, "Failed to submit enquiry", 500);
  }
};

// ─── Get Enquiry by Tracking ID (Public) ────────────────────────────
/**
 * GET handler for public tracking of corporate enquiries
 * LEGACY NGO MARKETPLACE FLOW DISABLED - Public tracking uses tracking ID only
 */
export const getEnquiryByTrackingId = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { trackingId } = req.params;

    if (!trackingId || !trackingId.trim()) {
      return validationErrorResponse(res, "Tracking ID is required");
    }

    const enquiry = await prisma.corporateEnquiry.findUnique({
      where: { trackingId: trackingId.trim().toUpperCase() },
      select: {
        id: true,
        trackingId: true,
        companyName: true,
        sector: true,
        preferredDistricts: true,
        indicativeBudget: true,
        contactPersonName: true,
        contactPersonDesignation: true,
        mobile: true,
        email: true,
        mca21Cin: true,
        proposedCsrWork: true,
        status: true,
        assignedRelationshipManager: {
          select: {
            id: true,
            email: true,
          },
        },
        submittedAt: true,
        firstContactedAt: true,
        updatedAt: true,
      },
    });

    if (!enquiry) {
      return notFoundResponse(res, "Enquiry not found with the provided tracking ID");
    }

    // Return limited info for public access
    return successResponse(
      res,
      {
        enquiry: {
          ...enquiry,
          // Mask sensitive information
          mobile: enquiry.mobile ? `XXXXXX${enquiry.mobile.slice(-4)}` : null,
          email: enquiry.email ? `${enquiry.email.charAt(0)}***@${enquiry.email.split("@")[1]}` : null,
        },
      },
      "Enquiry retrieved successfully"
    );
  } catch (error) {
    console.error("Error in getEnquiryByTrackingId:", error);
    return errorResponse(res, "Failed to retrieve enquiry", 500);
  }
};

// ─── Get All Enquiries (RM Dashboard) ─────────────────────────────
/**
 * GET handler for Relationship Manager dashboard
 * LEGACY NGO MARKETPLACE FLOW DISABLED - RM dashboard shows convergence enquiries only
 */
export const getAllEnquiries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { status, page = 1, limit = 20, district } = req.query as unknown as EnquiryFilters;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Check if user has RM or admin roles
    const allowedRoles: Role[] = [
      Role.CSR_RELATIONSHIP_MANAGER,
      Role.STATE_CSR_CELL,
      Role.JOINT_SECRETARY,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
      Role.CSR_ADMIN,
      Role.DISTRICT_ADMIN,
    ];

    if (!allowedRoles.includes(userRole!)) {
      return forbiddenResponse(res, "You don't have permission to view all enquiries");
    }

    const pageNum = parseInt(page as unknown as string) || 1;
    const pageSize = parseInt(limit as unknown as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    // Build filter
    const where: Prisma.CorporateEnquiryWhereInput = {
      tenantId: tenantId || undefined,
    };

    // CSR Relationship Managers see only their assigned enquiries or unassigned
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER) {
      where.OR = [
        { assignedRelationshipManagerId: userId },
        { assignedRelationshipManagerId: null },
      ];
    }

    // Filter by district if specified
    if (district) {
      where.preferredDistricts = {
        has: district,
      };
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const [enquiries, totalCount] = await Promise.all([
      prisma.corporateEnquiry.findMany({
        where,
        select: {
          id: true,
          trackingId: true,
          companyName: true,
          sector: true,
          preferredDistricts: true,
          indicativeBudget: true,
          contactPersonName: true,
          contactPersonDesignation: true,
          mobile: true,
          email: true,
          mca21Cin: true,
          proposedCsrWork: true,
          status: true,
          assignedRelationshipManager: {
            select: {
              id: true,
              email: true,
            },
          },
          submittedAt: true,
          firstResponseDueAt: true,
          firstContactedAt: true,
          currentEscalationLevel: true,
          _count: {
            select: {
              interactions: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.corporateEnquiry.count({ where }),
    ]);

    // Calculate SLA status for each enquiry
    const now = new Date();
    const enquiriesWithSLA = enquiries.map((e) => {
      let slaStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK";
      let slaDueDate: Date | null = e.firstResponseDueAt;
      let slaDaysRemaining: number | null = null;

      if (slaDueDate) {
        slaDaysRemaining = Math.floor(
          (slaDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (slaDaysRemaining < 0) {
          slaStatus = "OVERDUE";
        } else if (slaDaysRemaining <= 2) {
          slaStatus = "DUE_SOON";
        }
      }

      return {
        ...e,
        slaStatus,
        slaDueDate,
        slaDaysRemaining,
      };
    });

    const response = {
      enquiries: enquiriesWithSLA,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount,
        hasNextPage: skip + enquiries.length < totalCount,
        hasPrevPage: pageNum > 1,
      },
    };

    return successResponse(res, response, "Enquiries retrieved successfully");
  } catch (error) {
    console.error("Error in getAllEnquiries:", error);
    return errorResponse(res, "Failed to retrieve enquiries", 500);
  }
};

// ─── Assign RM ────────────────────────────────────────────────────
/**
 * PATCH handler for admin/RM assignment
 * LEGACY NGO MARKETPLACE FLOW DISABLED - Assignment is for convergence framework only
 */
export const assignRM = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const body = req.body as AssignRMBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Check permissions
    const allowedRoles: Role[] = [
      Role.STATE_CSR_CELL,
      Role.JOINT_SECRETARY,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
      Role.CSR_ADMIN,
      Role.CSR_RELATIONSHIP_MANAGER,
    ];

    if (!allowedRoles.includes(userRole!)) {
      return forbiddenResponse(res, "You don't have permission to assign Relationship Managers");
    }

    // If they are RM, they can ONLY assign to themselves!
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER && body.relationshipManagerId !== userId) {
      return forbiddenResponse(res, "Relationship Managers can only claim enquiries for themselves");
    }

    // Validate RM ID
    if (!body.relationshipManagerId) {
      return validationErrorResponse(res, "Relationship Manager ID is required");
    }

    // Verify RM exists and has correct role
    const rmUser = await prisma.user.findFirst({
      where: {
        id: body.relationshipManagerId,
        role: Role.CSR_RELATIONSHIP_MANAGER,
      },
    });

    if (!rmUser) {
      return validationErrorResponse(res, "Invalid Relationship Manager ID");
    }

    // Find enquiry
    const enquiry = await prisma.corporateEnquiry.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
    });

    if (!enquiry) {
      return notFoundResponse(res, "Enquiry not found");
    }

    // Check if already assigned
    if (enquiry.assignedRelationshipManagerId) {
      return validationErrorResponse(
        res,
        `Enquiry is already assigned to another RM`
      );
    }

    // Update enquiry
    const updatedEnquiry = await prisma.corporateEnquiry.update({
      where: { id },
      data: {
        assignedRelationshipManagerId: body.relationshipManagerId,
        status: CorporateEnquiryStatus.RM_ASSIGNED,
        updatedAt: new Date(),
      },
      include: {
        assignedRelationshipManager: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await prisma.sLAEscalation.deleteMany({
      where: {
        entityType: "CORPORATE_ENQUIRY",
        entityId: id,
        stage: "RM_RESPONSE",
        isResolved: false,
      },
    });

    await SLAEscalationService.create({
      entityType: "CORPORATE_ENQUIRY",
      entityId: id,
      stage: "RM_RESPONSE",
      responsibleUserId: body.relationshipManagerId,
      dueAt: enquiry.firstResponseDueAt || calculateDueDate("RM_RESPONSE", enquiry.submittedAt),
      tenantId: tenantId || undefined,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "CORPORATE_ENQUIRY_RM_ASSIGNED",
        entityType: "CorporateEnquiry",
        entityId: id,
        details: {
          trackingId: enquiry.trackingId,
          assignedRMId: body.relationshipManagerId,
          assignedBy: userId,
          previousStatus: enquiry.status,
          newStatus: CorporateEnquiryStatus.RM_ASSIGNED,
        },
      },
    });

    return successResponse(
      res,
      { enquiry: updatedEnquiry },
      `Relationship Manager assigned successfully to enquiry ${enquiry.trackingId}`
    );
  } catch (error) {
    console.error("Error in assignRM:", error);
    return errorResponse(res, "Failed to assign Relationship Manager", 500);
  }
};

// ─── Record Contact ────────────────────────────────────────────────
/**
 * POST handler for RM to log first contact
 * LEGACY NGO MARKETPLACE FLOW DISABLED - First contact is part of convergence framework SLA
 */
export const recordContact = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const body = req.body as RecordContactBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validate input
    if (!body.note || body.note.trim().length < 10) {
      return validationErrorResponse(res, "Note must be at least 10 characters");
    }

    if (!body.interactionType) {
      return validationErrorResponse(res, "Interaction type is required");
    }

    // Check if user is assigned RM or has admin role
    const enquiry = await prisma.corporateEnquiry.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
    });

    if (!enquiry) {
      return notFoundResponse(res, "Enquiry not found");
    }

    const isAuthorized =
      enquiry.assignedRelationshipManagerId === userId ||
      userRole === Role.STATE_CSR_CELL ||
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.PORTAL_ADMIN;

    if (!isAuthorized) {
      return forbiddenResponse(
        res,
        "You don't have permission to record contact for this enquiry"
      );
    }

    // Check if this is the first contact
    const isFirstContact = !enquiry.firstContactedAt;

    // Create interaction log
    const interaction = await prisma.corporateEnquiryInteraction.create({
      data: {
        tenantId,
        corporateEnquiryId: id,
        actorUserId: userId,
        note: body.note.trim(),
        interactionType: body.interactionType,
        attachmentUrls: body.attachmentUrls || [],
      },
    });

    // Update enquiry status if first contact
    if (isFirstContact) {
      await prisma.corporateEnquiry.update({
        where: { id },
        data: {
          firstContactedAt: new Date(),
          status: CorporateEnquiryStatus.RM_CONTACTED,
          updatedAt: new Date(),
        },
      });

      await prisma.sLAEscalation.updateMany({
        where: {
          entityType: "CORPORATE_ENQUIRY",
          entityId: id,
          stage: "RM_RESPONSE",
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: isFirstContact
          ? "CORPORATE_ENQUIRY_FIRST_CONTACT"
          : "CORPORATE_ENQUIRY_CONTACT_LOGGED",
        entityType: "CorporateEnquiry",
        entityId: id,
        details: {
          trackingId: enquiry.trackingId,
          interactionType: body.interactionType,
          isFirstContact,
          noteLength: body.note.length,
        },
      },
    });

    return successResponse(
      res,
      { interaction },
      isFirstContact
        ? "First contact recorded successfully. Enquiry status updated to RM_CONTACTED."
        : "Contact logged successfully"
    );
  } catch (error) {
    console.error("Error in recordContact:", error);
    return errorResponse(res, "Failed to record contact", 500);
  }
};

// ─── Get Enquiry by ID (RM Detail View) ──────────────────────────
/**
 * GET handler for RM detail view
 * LEGACY NGO MARKETPLACE FLOW DISABLED - Detail view shows convergence framework data only
 */
export const getEnquiryById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const enquiry = await prisma.corporateEnquiry.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
      include: {
        assignedRelationshipManager: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          include: {
            actorUser: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        },
        feasibilityAssessment: {
          select: {
            id: true,
            reportReference: true,
            feasibilityResult: true,
            submittedToJsAt: true,
            jsDecisionAt: true,
            jsDecisionRemarks: true,
          },
        },
        nodalOfficerAppointment: {
          select: {
            id: true,
            nodalOfficerName: true,
            designation: true,
            department: true,
            appointedAt: true,
          },
        },
        standardMou: {
          select: {
            id: true,
            mouReferenceId: true,
            status: true,
            signedDocumentUrl: true,
          },
        },
        convergenceProject: {
          select: {
            id: true,
            projectId: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!enquiry) {
      return notFoundResponse(res, "Enquiry not found");
    }

    // Check authorization
    const allowedRoles: Role[] = [
      Role.CSR_RELATIONSHIP_MANAGER,
      Role.STATE_CSR_CELL,
      Role.JOINT_SECRETARY,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
    ];

    const isAuthorized =
      allowedRoles.includes(userRole!) ||
      enquiry.assignedRelationshipManagerId === userId;

    if (!isAuthorized) {
      return forbiddenResponse(res, "You don't have access to this enquiry");
    }

    // Calculate SLA status
    const now = new Date();
    let slaStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK";
    let slaDueDate: Date | null = enquiry.firstResponseDueAt;
    let slaDaysRemaining: number | null = null;

    if (slaDueDate) {
      slaDaysRemaining = Math.floor(
        (slaDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (slaDaysRemaining < 0) {
        slaStatus = "OVERDUE";
      } else if (slaDaysRemaining <= 2) {
        slaStatus = "DUE_SOON";
      }
    }

    const response = {
      ...enquiry,
      sla: {
        status: slaStatus,
        dueDate: slaDueDate,
        daysRemaining: slaDaysRemaining,
      },
    };

    return successResponse(res, response, "Enquiry retrieved successfully");
  } catch (error) {
    console.error("Error in getEnquiryById:", error);
    return errorResponse(res, "Failed to retrieve enquiry", 500);
  }
};

/**
 * @desc Get all Relationship Managers
 * @route GET /api/corporate-enquiries/relationship-managers
 * @access Private (STATE_CSR_CELL, JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN, CSR_ADMIN)
 */
export const getRelationshipManagers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rms = await prisma.user.findMany({
      where: {
        role: Role.CSR_RELATIONSHIP_MANAGER,
        tenantId: tenantId || undefined,
        accountStatus: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        assignedDistrict: true,
      },
    });
    return successResponse(res, rms, "Relationship Managers retrieved successfully");
  } catch (error) {
    console.error("Error in getRelationshipManagers:", error);
    return errorResponse(res, "Failed to retrieve Relationship Managers", 500);
  }
};
