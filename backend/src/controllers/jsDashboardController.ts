import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { successResponse, errorResponse, unauthorizedResponse } from "../utils/apiResponse";
import { FeasibilityResult, CorporateEnquiryStatus, GovernmentPitchStatus, Prisma } from "@prisma/client";
import { Role } from "../types/role";

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
 * @desc Get JS Dashboard statistics
 * @route GET /api/js/dashboard
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN, CSR_ADMIN)
 */
export const getJSDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Get counts for various dashboard metrics
    const [
      pendingAssessments,
      assessmentsDueSoon,
      overdueDecisions,
      pitchesPendingApproval,
      nodalAppointmentsCount,
      rejectedCases,
      recentDecisions,
      escalations,
    ] = await Promise.all([
      // Pending assessment reports
      prisma.feasibilityAssessment.count({
        where: {
          jsDecisionById: null,
          submittedToJsAt: { not: null },
        },
      }),

      // Assessments due within 2 days
      prisma.feasibilityAssessment.count({
        where: {
          jsDecisionById: null,
          submittedToJsAt: {
            not: null,
            lte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Due within 2 days
          },
        },
      }),

      // Overdue JS decisions (older than 3 days)
      prisma.feasibilityAssessment.count({
        where: {
          jsDecisionById: null,
          submittedToJsAt: {
            lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Government pitches pending JS approval
      prisma.governmentPitch.count({
        where: {
          status: {
            in: [
              GovernmentPitchStatus.RM_VERIFIED,
              GovernmentPitchStatus.JS_APPROVAL_PENDING,
              GovernmentPitchStatus.JS_APPROVED,
              GovernmentPitchStatus.PUBLIC_LISTED
            ]
          },
          
        },
      }),

      // Nodal officers appointed
      prisma.nodalOfficerAppointment.count({
        where: {
        },
      }),

      // Rejected/returned cases
      prisma.feasibilityAssessment.count({
        where: {
          feasibilityResult: FeasibilityResult.NOT_FEASIBLE,
        },
      }),

      // Recent decisions (last 30 days)
      prisma.feasibilityAssessment.findMany({
        where: {
          jsDecisionAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          corporateEnquiry: {
            select: {
              trackingId: true,
            },
          },
          governmentPitch: {
            select: {
              pitchReferenceId: true,
            },
          },
          nodalOfficerAppointment: {
            select: {
              id: true,
              nodalOfficerName: true,
            },
          },
        },
        orderBy: { jsDecisionAt: "desc" },
        take: 10,
      }),

      // Active escalations to JS
      prisma.sLAEscalation.findMany({
        where: {
          stage: "JS_DECISION",
          isResolved: false,
        },
        include: {
          responsibleUser: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { dueAt: "asc" },
        take: 10,
      }),
    ]);

    // Get pending assessments for table
    const pendingAssessmentsList = await prisma.feasibilityAssessment.findMany({
      where: {
        jsDecisionById: null,
        submittedToJsAt: { not: null },
      },
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
            companyName: true,
            sector: true,
            preferredDistricts: true,
          },
        },
        governmentPitch: {
          select: {
            pitchReferenceId: true,
            officialName: true,
            department: true,
            district: true,
          },
        },
        checklistItems: {
          select: {
            itemNumber: true,
            answer: true,
            isCritical: true,
          },
        },
      },
      orderBy: { submittedToJsAt: "asc" },
      take: 20,
    });

    // Get government pitches awaiting JS approval
    const pendingPitches = await prisma.governmentPitch.findMany({
      where: {
        status: GovernmentPitchStatus.JS_APPROVAL_PENDING,
        
      },
      include: {
        assignedRelationshipManager: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
      take: 20,
    });

    // Calculate SLA status for each assessment
    const assessmentsWithSLA = pendingAssessmentsList.map((assessment) => {
      const submittedDate = new Date(assessment.submittedToJsAt!);
      const daysSinceSubmission = Math.floor(
        (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let slaStatus: "ON_TIME" | "DUE_SOON" | "OVERDUE" | "ESCALATED" = "ON_TIME";
      if (daysSinceSubmission > 3) {
        slaStatus = "ESCALATED";
      } else if (daysSinceSubmission > 2) {
        slaStatus = "OVERDUE";
      } else if (daysSinceSubmission > 1) {
        slaStatus = "DUE_SOON";
      }

      // Count critical NOs
      const criticalNos = assessment.checklistItems.filter(
        (item) => item.isCritical && item.answer === "NO"
      ).length;

      return {
        id: assessment.id,
        reportReference: assessment.reportReference,
        source: assessment.corporateEnquiry ? "CORPORATE_ENQUIRY" : "GOVERNMENT_PITCH",
        trackingId: assessment.corporateEnquiry?.trackingId || assessment.governmentPitch?.pitchReferenceId,
        companyOrDepartment: assessment.corporateEnquiry?.companyName || assessment.governmentPitch?.department,
        district: assessment.corporateEnquiry?.preferredDistricts?.[0] || assessment.governmentPitch?.district,
        sector: assessment.corporateEnquiry?.sector || "N/A",
        rmName: assessment.relationshipManager?.email?.split("@")[0] || "Unknown",
        feasibilityResult: assessment.feasibilityResult,
        submittedAt: assessment.submittedToJsAt,
        jsDecisionDueDate: new Date(submittedDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        slaStatus,
        criticalNos,
      };
    });

    // Format recent decisions
    const formattedRecentDecisions = recentDecisions.map((decision) => ({
      id: decision.id,
      caseId: decision.corporateEnquiry?.trackingId || decision.governmentPitch?.pitchReferenceId || decision.id,
      decision: decision.feasibilityResult,
      remarks: decision.jsDecisionRemarks,
      nodalOfficerAppointed: decision.nodalOfficerAppointment?.nodalOfficerName || null,
      date: decision.jsDecisionAt,
    }));

    // Format escalation alerts
    const escalationAlerts = escalations.map((esc) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(esc.dueAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: esc.id,
        entityType: esc.entityType,
        entityId: esc.entityId,
        stage: esc.stage,
        dueAt: esc.dueAt,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        responsibleUser: esc.responsibleUser?.email,
      };
    });

    const response = {
      stats: {
        pendingAssessments,
        assessmentsDueWithin2Days: assessmentsDueSoon,
        overdueJSDecisions: overdueDecisions,
        pitchesPendingApproval,
        nodalOfficersAppointed: nodalAppointmentsCount,
        rejectedCases,
      },
      pendingAssessments: assessmentsWithSLA,
      pendingPitches: pendingPitches.map((pitch) => ({
        id: pitch.id,
        pitchReferenceId: pitch.pitchReferenceId,
        officialName: pitch.officialName,
        department: pitch.department,
        district: pitch.district,
        estimatedCost: pitch.estimatedCost,
        govtFundDeclaration: pitch.govtFundDeclaration,
        photosCount: pitch._count.photos,
        rmVerificationStatus: (pitch.status === GovernmentPitchStatus.RM_VERIFIED || pitch.status === GovernmentPitchStatus.JS_APPROVAL_PENDING) ? "VERIFIED" : "PENDING",
        jsApprovalDueDate: pitch.jsApprovalDueAt,
        submittedAt: pitch.submittedAt,
      })),
      recentDecisions: formattedRecentDecisions,
      escalationAlerts,
    };

    return successResponse(res, response, "JS Dashboard data retrieved successfully");
  } catch (error) {
    console.error("Error in getJSDashboard:", error);
    return errorResponse(res, "Failed to retrieve dashboard data", 500);
  }
};

/**
 * @desc Get Government Pitches pending JS approval
 * @route GET /api/js/government-pitches
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN)
 */
export const getJSGovernmentPitches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const tenantId = req.user?.tenantId;
    const pitches = await prisma.governmentPitch.findMany({
      where: {
        status: {
          in: [
            GovernmentPitchStatus.RM_VERIFIED,
            GovernmentPitchStatus.JS_APPROVAL_PENDING,
            GovernmentPitchStatus.JS_APPROVED,
            GovernmentPitchStatus.PUBLIC_LISTED
          ]
        },
        
      },
      include: {
        assignedRelationshipManager: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });
    return successResponse(res, pitches, "Pending government pitches retrieved successfully");
  } catch (error) {
    console.error("Error in getJSGovernmentPitches:", error);
    return errorResponse(res, "Failed to retrieve government pitches", 500);
  }
};


/**
 * @desc Get JS Escalations
 * @route GET /api/js/escalations
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN)
 */
export const getJSEscalations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const now = new Date();

    // Get escalations where JS is the responsible party
    const escalations = await prisma.sLAEscalation.findMany({
      where: {
        stage: "JS_DECISION",
        isResolved: false,
      },
      include: {
        responsibleUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { dueAt: "asc" },
    });

    // Get details for each escalation
    const escalationsWithDetails = await Promise.all(
      escalations.map(async (esc) => {
        let entityDetails: any = null;
        let rmDetails: any = null;

        if (esc.entityType === "CORPORATE_ENQUIRY") {
          entityDetails = await prisma.corporateEnquiry.findUnique({
            where: { id: esc.entityId },
            include: {
              assignedRelationshipManager: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          });
          rmDetails = entityDetails?.assignedRelationshipManager;
        } else if (esc.entityType === "GOVERNMENT_PITCH") {
          entityDetails = await prisma.governmentPitch.findUnique({
            where: { id: esc.entityId },
            include: {
              assignedRelationshipManager: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          });
          rmDetails = entityDetails?.assignedRelationshipManager;
        }

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(esc.dueAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        const jsDueDate = new Date(esc.dueAt);

        return {
          id: esc.id,
          entityType: esc.entityType,
          entityId: esc.entityId,
          trackingId: entityDetails?.trackingId || entityDetails?.pitchReferenceId || esc.entityId,
          companyOrDepartment: entityDetails?.companyName || entityDetails?.department,
          district: entityDetails?.preferredDistricts?.[0] || entityDetails?.district,
          assignedRM: rmDetails?.email?.split("@")[0] || "Unassigned",
          rmDueDate: esc.createdAt,
          escalatedAt: esc.createdAt,
          jsDueDate,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          slaStatus: daysOverdue > 0 ? "OVERDUE" : daysOverdue > -1 ? "DUE_SOON" : "ON_TIME",
        };
      })
    );

    return successResponse(res, escalationsWithDetails, "JS Escalations retrieved successfully");
  } catch (error) {
    console.error("Error in getJSEscalations:", error);
    return errorResponse(res, "Failed to retrieve escalations", 500);
  }
};

/**
 * @desc Handle JS escalation action
 * @route POST /api/js/escalations/:id/action
 * @access Private (JOINT_SECRETARY, SUPER_ADMIN, PORTAL_ADMIN)
 */
export const handleEscalationAction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    if (!action || !["REASSIGN_RM", "MARK_RESPONDED", "ESCALATE_TO_SECRETARY"].includes(action)) {
      return errorResponse(res, "Invalid action specified", 400);
    }

    const escalation = await prisma.sLAEscalation.findFirst({
      where: {
        id,
      },
    });

    if (!escalation) {
      return errorResponse(res, "Escalation not found", 404);
    }

    const now = new Date();

    if (action === "ESCALATE_TO_SECRETARY") {
      // Create new escalation to Planning Secretary
      await prisma.sLAEscalation.create({
        data: {
          entityType: escalation.entityType,
          entityId: escalation.entityId,
          stage: "SECRETARY_ESCALATION",
          dueAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days
          isResolved: false,
        },
      });

      // Mark current escalation as escalated
      await prisma.sLAEscalation.update({
        where: { id },
        data: {
          escalatedToUserId: userId,
          escalatedAt: now,
        },
      });
    } else if (action === "MARK_RESPONDED") {
      // Mark as resolved
      await prisma.sLAEscalation.update({
        where: { id },
        data: {
          isResolved: true,
          resolvedAt: now,
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: `JS_ESCALATION_${action}`,
        entityType: "SLAEscalation",
        entityId: id,
        details: {
          action,
          notes,
          escalationId: id,
        },
      },
    });

    return successResponse(res, { action, notes }, "Escalation action processed successfully");
  } catch (error) {
    console.error("Error in handleEscalationAction:", error);
    return errorResponse(res, "Failed to process escalation action", 500);
  }
};
