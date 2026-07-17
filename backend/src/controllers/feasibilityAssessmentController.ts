import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse, validationErrorResponse } from "../utils/apiResponse";
import { FeasibilityResult, ChecklistAnswer, CorporateEnquiryStatus, GovernmentPitchStatus, Prisma } from "@prisma/client";
import { Role } from "../types/role";
import { FEASIBILITY_CHECKLIST_TEMPLATE } from "../constants/feasibilityChecklist";
import { onboardApprovedAssessmentToProject } from "../services/convergenceOnboardingService";
import { onProjectApprovedByJS, recordNodalOfficerAssignment } from "../services/assignmentWorkflowService";

// Extended Request type with user info
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    tenantId?: string | null;
    organizationId?: string | null;
  };
}


/**
 * @desc Get pending feasibility assessments for JS Dashboard
 * @route GET /api/feasibility-assessments/pending
 * @access Private (JOINT_SECRETARY)
 */
export const getPendingAssessments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { search, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const where: Prisma.FeasibilityAssessmentWhereInput = {
      submittedToJsAt: { not: null }, // Only submitted ones
    };

    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: "insensitive" } },
        { cin: { contains: search as string, mode: "insensitive" } },
        { reportReference: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [assessments, totalCount] = await Promise.all([
      prisma.feasibilityAssessment.findMany({
        where,
        include: {
          relationshipManager: {
            select: {
              id: true,
              email: true,
            },
          },
          corporateEnquiry: {
            select: {
              trackingId: true,
              status: true,
            },
          },
          governmentPitch: {
            select: {
              pitchReferenceId: true,
              status: true,
              officialName: true,
              department: true,
            },
          },
          _count: {
            select: {
              checklistItems: true,
            },
          },
        },
        orderBy: { submittedToJsAt: "asc" }, // Oldest first (SLA priority)
        skip,
        take,
      }),
      prisma.feasibilityAssessment.count({ where }),
    ]);

    // Get counts for dashboard stats
    const [totalPending, byResult] = await Promise.all([
      prisma.feasibilityAssessment.count({
        where: {
          jsDecisionById: null,
          submittedToJsAt: { not: null },
        },
      }),
      prisma.feasibilityAssessment.groupBy({
        by: ["feasibilityResult"],
        where: {
          jsDecisionById: null,
          submittedToJsAt: { not: null },
        },
        _count: { feasibilityResult: true },
      }),
    ]);

    const response = {
      assessments: assessments.map((a) => ({
        id: a.id,
        reportReference: a.reportReference,
        companyName: a.companyName,
        cin: a.cin,
        sector: a.sector,
        proposedLocationDistrict: a.proposedLocationDistrict,
        indicativeBudget: a.indicativeBudget,
        feasibilityResult: a.feasibilityResult,
        relationshipManager: a.relationshipManager,
        source: a.corporateEnquiry ? "CORPORATE_ENQUIRY" : "GOVERNMENT_PITCH",
        sourceReference: a.corporateEnquiry?.trackingId || a.governmentPitch?.pitchReferenceId,
        sourceDetails: a.governmentPitch
          ? {
              officialName: a.governmentPitch.officialName,
              department: a.governmentPitch.department,
            }
          : null,
        submittedToJsAt: a.submittedToJsAt,
        checklistItemsCount: a._count.checklistItems,
        conditionText: a.conditionText,
      })),
      stats: {
        totalPending,
        byResult: byResult.reduce((acc, item) => {
          acc[item.feasibilityResult] = item._count.feasibilityResult;
          return acc;
        }, {} as Record<string, number>),
      },
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNextPage: skip + assessments.length < totalCount,
        hasPrevPage: Number(page) > 1,
      },
    };

    return successResponse(res, response, "Pending assessments retrieved successfully");
  } catch (error) {
    console.error("Error in getPendingAssessments:", error);
    return errorResponse(res, "Failed to retrieve pending assessments", 500);
  }
};

/**
 * @desc Get full assessment with 13 checklist items
 * @route GET /api/feasibility-assessments/:id
 * @access Private (JOINT_SECRETARY, CSR_RELATIONSHIP_MANAGER)
 */
export const getAssessmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const assessment = await prisma.feasibilityAssessment.findFirst({
      where: {
        id,
      },
      include: {
        checklistItems: {
          orderBy: { itemNumber: "asc" },
        },
        relationshipManager: {
          select: {
            id: true,
            email: true,
          },
        },
        jsDecisionBy: {
          select: {
            id: true,
            email: true,
          },
        },
        corporateEnquiry: {
          select: {
            trackingId: true,
            status: true,
            companyName: true,
            sector: true,
            contactPersonName: true,
            contactPersonDesignation: true,
            mobile: true,
            email: true,
            proposedCsrWork: true,
          },
        },
        governmentPitch: {
          select: {
            pitchReferenceId: true,
            status: true,
            officialName: true,
            designation: true,
            department: true,
            officeName: true,
            csrRequirement: true,
            estimatedCost: true,
            district: true,
            taluka: true,
            photos: true,
          },
        },
        nodalOfficerAppointment: {
          select: {
            id: true,
            nodalOfficerName: true,
            designation: true,
            department: true,
            district: true,
            appointedAt: true,
          },
        },
      },
    });

    if (!assessment) {
      return notFoundResponse(res, "Assessment not found");
    }

    // If checklist items don't exist (legacy data), return template
    const checklistItems = assessment.checklistItems.length > 0
      ? assessment.checklistItems
      : FEASIBILITY_CHECKLIST_TEMPLATE.map((item) => ({
          ...item,
          id: null,
          answer: null,
          remarks: null,
        }));

    const response = {
      id: assessment.id,
      reportReference: assessment.reportReference,
      companyName: assessment.companyName,
      cin: assessment.cin,
      sector: assessment.sector,
      contactSummary: assessment.contactSummary,
      proposedLocationDistrict: assessment.proposedLocationDistrict,
      indicativeBudget: assessment.indicativeBudget,
      developmentNeedAddressed: assessment.developmentNeedAddressed,
      dateOfFirstContact: assessment.dateOfFirstContact,
      summaryOfInteraction: assessment.summaryOfInteraction,
      feasibilityResult: assessment.feasibilityResult,
      recommendation: assessment.recommendation,
      suggestedNodalOfficerDomain: assessment.suggestedNodalOfficerDomain,
      conditionText: assessment.conditionText,
      submittedToJsAt: assessment.submittedToJsAt,
      jsDecisionAt: assessment.jsDecisionAt,
      jsDecisionRemarks: assessment.jsDecisionRemarks,
      relationshipManager: assessment.relationshipManager,
      jsDecisionBy: assessment.jsDecisionBy,
      checklistItems,
      source: assessment.corporateEnquiry ? "CORPORATE_ENQUIRY" : "GOVERNMENT_PITCH",
      sourceData: assessment.corporateEnquiry || assessment.governmentPitch,
      nodalOfficerAppointment: assessment.nodalOfficerAppointment,
    };

    return successResponse(res, response, "Assessment retrieved successfully");
  } catch (error) {
    console.error("Error in getAssessmentById:", error);
    return errorResponse(res, "Failed to retrieve assessment", 500);
  }
};

/**
 * @desc Submit JS Decision (Approve/Reject with conditions)
 * @route POST /api/feasibility-assessments/:id/js-decision
 * @access Private (JOINT_SECRETARY)
 */
export const submitJSDecision = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { decision, remarks, conditions } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validate decision
    if (!decision || !["APPROVE", "REJECT", "APPROVE_WITH_CONDITIONS"].includes(decision)) {
      return validationErrorResponse(res, "Valid decision (APPROVE, REJECT, or APPROVE_WITH_CONDITIONS) is required");
    }

    // Check if assessment exists and is pending
    const assessment = await prisma.feasibilityAssessment.findFirst({
      where: {
        id,
        jsDecisionById: null,
        submittedToJsAt: { not: null },
      },
      include: {
        corporateEnquiry: true,
        governmentPitch: true,
      },
    });

    if (!assessment) {
      return notFoundResponse(res, "Assessment not found or already decided");
    }

    // Validate conditions for conditional approval
    if (decision === "APPROVE_WITH_CONDITIONS" && (!conditions || conditions.trim().length < 10)) {
      return validationErrorResponse(res, "Conditions text is required for conditional approval (min 10 chars)");
    }

    const now = new Date();

    // Map decision to FeasibilityResult
    const feasibilityResult: FeasibilityResult =
      decision === "REJECT" ? FeasibilityResult.NOT_FEASIBLE :
      decision === "APPROVE_WITH_CONDITIONS" ? FeasibilityResult.PROCEED_WITH_CONDITIONS :
      FeasibilityResult.FEASIBLE;

    // Apply the decision atomically: assessment, source entity status,
    // SLA resolution and audit either all commit or none do.
    const updatedAssessment = await prisma.$transaction(async (tx) => {
      const updated = await tx.feasibilityAssessment.update({
        where: { id },
        data: {
          feasibilityResult,
          jsDecisionBy: { connect: { id: userId } },
          jsDecisionAt: now,
          jsDecisionRemarks: remarks || null,
          conditionText: decision === "APPROVE_WITH_CONDITIONS" ? conditions : null,
          updatedAt: now,
        },
      });

      // Update source entity status
      if (assessment.corporateEnquiry) {
        const newStatus =
          decision === "REJECT" ? CorporateEnquiryStatus.JS_REJECTED :
          CorporateEnquiryStatus.JS_APPROVED;

        await tx.corporateEnquiry.update({
          where: { id: assessment.corporateEnquiry.id },
          data: { status: newStatus },
        });
      }

      if (assessment.governmentPitch) {
        const newStatus =
          decision === "REJECT" ? GovernmentPitchStatus.JS_REJECTED :
          GovernmentPitchStatus.JS_APPROVED;

        await tx.governmentPitch.update({
          where: { id: assessment.governmentPitch.id },
          data: { status: newStatus },
        });
      }

      // Resolve SLA escalation
      await tx.sLAEscalation.updateMany({
        where: {
          entityType: assessment.corporateEnquiry ? "CORPORATE_ENQUIRY" : "GOVERNMENT_PITCH",
          entityId: assessment.corporateEnquiry?.id || assessment.governmentPitch?.id,
          stage: "JS_DECISION",
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: now,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: `FEASIBILITY_ASSESSMENT_${decision}`,
          entityType: "FeasibilityAssessment",
          entityId: id,
          details: {
            decision,
            feasibilityResult,
            remarks,
            conditions,
            corporateEnquiryId: assessment.corporateEnquiry?.id,
            governmentPitchId: assessment.governmentPitch?.id,
          },
        },
      });

      return updated;
    });

    // Post-commit: auto-trigger the assignment workflow on approval.
    // Non-fatal by design — the JS decision must never be rolled back by
    // notification/workflow infrastructure failures.
    if (decision !== "REJECT") {
      const entityType = assessment.corporateEnquiry ? "CORPORATE_ENQUIRY" as const : "GOVERNMENT_PITCH" as const;
      const entityId = assessment.corporateEnquiry?.id || assessment.governmentPitch?.id;
      if (entityId) {
        onProjectApprovedByJS({
          entityType,
          entityId,
          approvedById: userId,
          remarks: remarks || null,
          ipAddress: req.ip,
        }).catch((error) =>
          console.error("Assignment workflow trigger failed (non-fatal):", error)
        );
      }
    }

    return successResponse(
      res,
      { assessment: updatedAssessment },
      `Assessment ${decision.toLowerCase().replace("_", " ")} successfully`
    );
  } catch (error) {
    console.error("Error in submitJSDecision:", error);
    return errorResponse(res, "Failed to submit decision", 500);
  }
};

/**
 * @desc Create Nodal Officer Appointment
 * @route POST /api/feasibility-assessments/:id/appoint-nodal-officer
 * @access Private (JOINT_SECRETARY)
 */
export const appointNodalOfficer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const {
      district,
      domain,
      nodalOfficerUserId,
      designation,
      department,
      appointmentLetterUrl,
      collectorCc = true,
      zpCeoCc = true,
    } = req.body;
    let { nodalOfficerName } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    if (!nodalOfficerUserId) {
      return validationErrorResponse(res, "Missing required field: nodalOfficerUserId");
    }

    // Verify nodal officer user exists and has correct role
    const nodalOfficer = await prisma.user.findFirst({
      where: {
        id: nodalOfficerUserId,
        role: Role.DISTRICT_NODAL_OFFICER,
      },
    });

    if (!nodalOfficer) {
      return validationErrorResponse(res, "Invalid nodal officer user ID or user is not a District Nodal Officer");
    }

    // If name is missing or is the string "undefined", derive it from email
    if (!nodalOfficerName || nodalOfficerName === "undefined") {
      const emailPrefix = nodalOfficer.email.split("@")[0];
      nodalOfficerName = emailPrefix
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }

    // Validate required fields
    const requiredFields = {
      district,
      domain,
      nodalOfficerUserId,
      nodalOfficerName,
      designation,
      department,
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, val]) => !val)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return validationErrorResponse(res, `Missing required fields: ${missingFields.join(", ")}`);
    }

    // Check if assessment exists and is approved
    const assessment = await prisma.feasibilityAssessment.findFirst({
      where: {
        id,
        feasibilityResult: {
          in: [FeasibilityResult.FEASIBLE, FeasibilityResult.PROCEED_WITH_CONDITIONS],
        },
      },
      include: {
        corporateEnquiry: true,
        governmentPitch: true,
        nodalOfficerAppointment: true,
      },
    });

    if (!assessment) {
      return notFoundResponse(res, "Assessment not found or not approved");
    }

    if (assessment.nodalOfficerAppointment) {
      return validationErrorResponse(res, "Nodal officer already appointed for this assessment");
    }

    const now = new Date();

    // Create nodal officer appointment
    const appointment = await prisma.nodalOfficerAppointment.create({
      data: {
        district,
        domain,
        nodalOfficerUser: { connect: { id: nodalOfficerUserId } },
        nodalOfficerName,
        designation,
        department,
        appointmentLetterUrl: appointmentLetterUrl || null,
        appointedByJs: { connect: { id: userId } },
        appointedAt: now,
        collectorCc,
        zpCeoCc,
        assessment: { connect: { id } },
        corporateEnquiry: assessment.corporateEnquiry?.id
          ? { connect: { id: assessment.corporateEnquiry.id } }
          : undefined,
        governmentPitch: assessment.governmentPitch?.id
          ? { connect: { id: assessment.governmentPitch.id } }
          : undefined,
      },
      include: {
        nodalOfficerUser: {
          select: {
            id: true,
            email: true,
          },
        },
        appointedByJs: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Update source entity status
    if (assessment.corporateEnquiry) {
      await prisma.corporateEnquiry.update({
        where: { id: assessment.corporateEnquiry.id },
        data: { status: CorporateEnquiryStatus.NODAL_OFFICER_APPOINTED },
      });
    }

    if (assessment.governmentPitch) {
      await prisma.governmentPitch.update({
        where: { id: assessment.governmentPitch.id },
        data: { status: GovernmentPitchStatus.NODAL_OFFICER_ASSIGNED },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "NODAL_OFFICER_APPOINTED",
        entityType: "NodalOfficerAppointment",
        entityId: appointment.id,
        details: {
          assessmentId: id,
          nodalOfficerUserId,
          nodalOfficerName,
          district,
          domain,
          corporateEnquiryId: assessment.corporateEnquiry?.id,
          governmentPitchId: assessment.governmentPitch?.id,
        },
      },
    });

    const onboarding = await onboardApprovedAssessmentToProject({
      assessmentId: id,
      actorUserId: userId,
    });

    // Record the nodal officer assignment + advance the lifecycle workflow
    // (NODAL_OFFICER_ASSIGNMENT -> FIELD_OFFICER_ASSIGNMENT). Non-fatal.
    {
      const assignEntityType = assessment.corporateEnquiry ? "CORPORATE_ENQUIRY" : "GOVERNMENT_PITCH";
      const assignEntityId = assessment.corporateEnquiry?.id || assessment.governmentPitch?.id;
      if (assignEntityId) {
        recordNodalOfficerAssignment({
          entityType: assignEntityType,
          entityId: assignEntityId,
          nodalOfficerId: nodalOfficerUserId,
          assignedById: userId,
          remarks: `Appointed via nodal officer appointment (${domain || "general"})`,
          ipAddress: req.ip,
        }).catch((error) =>
          console.error("Nodal assignment workflow update failed (non-fatal):", error)
        );
      }
    }

    return successResponse(
      res,
      { appointment, onboarding },
      onboarding.status === "WAITING_FOR_CORPORATE_INTEREST"
        ? "Nodal officer appointed. Project onboarding will complete after corporate interest is received."
        : "Nodal officer appointed and project onboarding completed."
    );
  } catch (error) {
    console.error("Error in appointNodalOfficer:", error);
    return errorResponse(res, "Failed to appoint nodal officer", 500);
  }
};

/**
 * @desc Retry or manually trigger MoU/project onboarding for an approved assessment.
 * @route POST /api/feasibility/:id/onboard-project
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN)
 */
export const onboardAssessmentProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const onboarding = await onboardApprovedAssessmentToProject({
      assessmentId: id,
      actorUserId: userId,
    });

    return successResponse(
      res,
      { onboarding },
      onboarding.status === "WAITING_FOR_CORPORATE_INTEREST"
        ? "Project onboarding is waiting for the remaining prerequisite."
        : "Project onboarding checked successfully."
    );
  } catch (error) {
    console.error("Error in onboardAssessmentProject:", error);
    return errorResponse(res, "Failed to onboard project", 500);
  }
};

/**
 * @desc Create or update checklist items for an assessment
 * @route PUT /api/feasibility-assessments/:id/checklist
 * @access Private (CSR_RELATIONSHIP_MANAGER)
 */
export const updateChecklistItems = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { items } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return validationErrorResponse(res, "Items array is required");
    }

    // Validate items
    for (const item of items) {
      if (!item.itemNumber || !item.answer) {
        return validationErrorResponse(res, "Each item must have itemNumber and answer");
      }
      if (!["YES", "NO", "NA"].includes(item.answer)) {
        return validationErrorResponse(res, "Answer must be YES, NO, or NA");
      }
    }

    // Check if assessment exists
    const assessment = await prisma.feasibilityAssessment.findFirst({
      where: {
        id,
        relationshipManagerId: userId, // Only RM who created can update
      },
    });

    if (!assessment) {
      return notFoundResponse(res, "Assessment not found or not accessible");
    }

    // Upsert checklist items
    const upsertPromises = items.map((item) =>
      prisma.feasibilityChecklistItem.upsert({
        where: {
          assessmentId_itemNumber: {
            assessmentId: id,
            itemNumber: item.itemNumber,
          },
        },
        update: {
          answer: item.answer as ChecklistAnswer,
          remarks: item.remarks || null,
        },
        create: {
          assessment: { connect: { id } },
          itemNumber: item.itemNumber,
          dimension: item.dimension || FEASIBILITY_CHECKLIST_TEMPLATE.find(t => t.itemNumber === item.itemNumber)?.dimension || "General",
          checkText: item.checkText || FEASIBILITY_CHECKLIST_TEMPLATE.find(t => t.itemNumber === item.itemNumber)?.checkText || "",
          isCritical: item.isCritical ?? FEASIBILITY_CHECKLIST_TEMPLATE.find(t => t.itemNumber === item.itemNumber)?.isCritical ?? false,
          answer: item.answer as ChecklistAnswer,
          remarks: item.remarks || null,
        },
      })
    );

    const updatedItems = await prisma.$transaction(upsertPromises);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CHECKLIST_ITEMS_UPDATED",
        entityType: "FeasibilityAssessment",
        entityId: id,
        details: {
          itemCount: items.length,
          items: items.map((i) => ({ itemNumber: i.itemNumber, answer: i.answer })),
        },
      },
    });

    return successResponse(
      res,
      { items: updatedItems },
      "Checklist items updated successfully"
    );
  } catch (error) {
    console.error("Error in updateChecklistItems:", error);
    return errorResponse(res, "Failed to update checklist items", 500);
  }
};

/**
 * @desc Get all nodal officer appointments
 * @route GET /api/js/nodal-appointments
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN)
 */
export const getNodalAppointments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const tenantId = req.user?.tenantId;
    const appointments = await prisma.nodalOfficerAppointment.findMany({
      where: {
      },
      include: {
        nodalOfficerUser: {
          select: {
            email: true,
          },
        },
        corporateEnquiry: {
          select: {
            trackingId: true,
            companyName: true,
            status: true,
          },
        },
        governmentPitch: {
          select: {
            pitchReferenceId: true,
            officialName: true,
            status: true,
          },
        },
      },
      orderBy: { appointedAt: "desc" },
    });
    return successResponse(res, appointments, "Nodal appointments retrieved successfully");
  } catch (error) {
    console.error("Error in getNodalAppointments:", error);
    return errorResponse(res, "Failed to retrieve nodal appointments", 500);
  }
};

/**
 * @desc Get nodal officer appointment by ID
 * @route GET /api/js/nodal-appointments/:id
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN)
 */
export const getNodalAppointmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const appointment = await prisma.nodalOfficerAppointment.findFirst({
      where: {
        id,
      },
      include: {
        nodalOfficerUser: {
          select: {
            id: true,
            email: true,
          },
        },
        appointedByJs: {
          select: {
            email: true,
          },
        },
        corporateEnquiry: {
          select: {
            trackingId: true,
            companyName: true,
            sector: true,
            proposedCsrWork: true,
            status: true,
          },
        },
        governmentPitch: {
          select: {
            pitchReferenceId: true,
            officialName: true,
            department: true,
            csrRequirement: true,
            status: true,
          },
        },
        assessment: {
          select: {
            reportReference: true,
            feasibilityResult: true,
          },
        },
      },
    });

    if (!appointment) {
      return notFoundResponse(res, "Nodal officer appointment not found");
    }

    return successResponse(res, appointment, "Nodal appointment details retrieved successfully");
  } catch (error) {
    console.error("Error in getNodalAppointmentById:", error);
    return errorResponse(res, "Failed to retrieve nodal appointment details", 500);
  }
};

/**
 * @desc Get all Nodal Officers
 * @route GET /api/js/nodal-officers
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN)
 */
export const getNodalOfficers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const tenantId = req.user?.tenantId;
    const nodalOfficers = await prisma.user.findMany({
      where: {
        role: Role.DISTRICT_NODAL_OFFICER,
        accountStatus: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        assignedDistrict: true,
      },
    });

    const mappedOfficers = nodalOfficers.map(officer => {
      const emailPrefix = officer.email.split("@")[0];
      const name = emailPrefix
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return {
        ...officer,
        name: name || "District Nodal Officer",
      };
    });

    return successResponse(res, mappedOfficers, "Nodal officers retrieved successfully");
  } catch (error) {
    console.error("Error in getNodalOfficers:", error);
    return errorResponse(res, "Failed to retrieve nodal officers", 500);
  }
};
