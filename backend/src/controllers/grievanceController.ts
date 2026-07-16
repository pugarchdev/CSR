import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  Role,
  GrievanceStatus,
  SLAStage,
  Prisma,
} from "@prisma/client";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
} from "../utils/apiResponse";
import {
  SLAEscalationService,
  calculateDueDate,
  SLA_TIMELINES,
} from "../services/slaEscalationService";

// ─── Types ─────────────────────────────────────────────────────────
interface RaiseGrievanceBody {
  issueTitle: string;
  issueDescription: string;
}

interface RespondToGrievanceBody {
  responseText: string;
  actionTaken?: string;
}

interface EscalateGrievanceBody {
  reason: string;
  escalateToLevel: 2 | 3; // Level 2 = State Cell, Level 3 = Joint Secretary
}

interface CloseGrievanceBody {
  resolutionText: string;
  closureReason: "RESOLVED" | "REJECTED" | "WITHDRAWN";
}

interface GrievanceFilters {
  status?: GrievanceStatus;
  page?: number;
  limit?: number;
}

// ─── Helper: Generate Grievance ID ──────────────────────────────────
const generateGrievanceId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `GRV-MH-${year}-`;

  const lastGrievance = await prisma.grievance.findFirst({
    where: {
      grievanceId: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (lastGrievance && lastGrievance.grievanceId) {
    const parts = lastGrievance.grievanceId.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};

// ─── Helper: Get Grievance Type from User Role ──────────────────────
const getGrievanceType = (role: Role): string => {
  switch (role) {
    case Role.CORPORATE_USER:
    case Role.COMPANY_ADMIN:
    case Role.COMPANY_MEMBER:
      return "CORPORATE";
    case Role.IMPLEMENTING_AGENCY_USER:
    case Role.NGO_ADMIN:
    case Role.NGO_MEMBER:
      return "IMPLEMENTING_AGENCY";
    case Role.DISTRICT_NODAL_OFFICER:
    case Role.GOVERNMENT_OFFICER:
      return "GOVERNMENT_OFFICER";
    default:
      return "OTHER";
  }
};

// ─── Helper: Calculate SLA Due Dates ───────────────────────────────
const calculateSLADueDates = () => {
  const now = new Date();
  const level1DueAt = new Date(now);
  level1DueAt.setDate(level1DueAt.getDate() + SLA_TIMELINES.GRIEVANCE_LEVEL_1);

  const level2DueAt = new Date(level1DueAt);
  level2DueAt.setDate(level2DueAt.getDate() + SLA_TIMELINES.GRIEVANCE_LEVEL_2);

  return { level1DueAt, level2DueAt };
};

// ─── Raise Grievance ────────────────────────────────────────────────
export const raiseGrievance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id: projectId } = req.params;
    const body = req.body as RaiseGrievanceBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validation
    if (!body.issueTitle || !body.issueTitle.trim()) {
      return validationErrorResponse(res, "Issue title is required");
    }

    if (body.issueTitle.length > 200) {
      return validationErrorResponse(
        res,
        "Issue title must be less than 200 characters"
      );
    }

    if (!body.issueDescription || !body.issueDescription.trim()) {
      return validationErrorResponse(res, "Issue description is required");
    }

    if (body.issueDescription.length > 5000) {
      return validationErrorResponse(
        res,
        "Issue description must be less than 5000 characters"
      );
    }

    // Find project and verify access — project members plus the owning
    // corporate (matched by direct link or verified enquiry email).
    const project = await prisma.convergenceProject.findFirst({
      where: {
        id: projectId,
        tenantId: tenantId || undefined,
        OR: [
          { nodalOfficerUserId: userId },
          { implementingAgencyUserId: userId },
          { corporateUserId: userId },
          ...(req.user?.email
            ? [{ corporateEnquiry: { email: { equals: req.user.email, mode: "insensitive" as const } } }]
            : []),
        ],
      },
      include: {
        nodalOfficerUser: {
          select: { id: true, email: true },
        },
      },
    });

    if (!project) {
      return notFoundResponse(
        res,
        "Project not found or you don't have access"
      );
    }

    // Generate grievance ID
    const grievanceId = await generateGrievanceId();

    // Calculate SLA due dates
    const { level1DueAt, level2DueAt } = calculateSLADueDates();

    // Create grievance
    const grievance = await prisma.grievance.create({
      data: {
        tenantId,
        grievanceId,
        convergenceProjectId: projectId,
        raisedByUserId: userId,
        raisedByType: getGrievanceType(userRole!),
        issueTitle: body.issueTitle.trim(),
        issueDescription: body.issueDescription.trim(),
        status: GrievanceStatus.RAISED,
        level1DueAt,
        level2DueAt,
        assignedNodalOfficerId: project.nodalOfficerUserId,
      },
      include: {
        convergenceProject: {
          select: {
            id: true,
            projectId: true,
            title: true,
          },
        },
        raisedByUser: {
          select: { id: true, email: true },
        },
        assignedNodalOfficer: {
          select: { id: true, email: true },
        },
      },
    });

    // Create initial action log
    await prisma.grievanceActionLog.create({
      data: {
        tenantId,
        grievanceId: grievance.id,
        actorUserId: userId,
        action: "GRIEVANCE_RAISED",
        note: `Grievance raised: ${body.issueTitle}`,
      },
    });

    // Create SLA escalation for Level 1
    await SLAEscalationService.create({
      entityType: "GRIEVANCE",
      entityId: grievance.id,
      stage: SLAStage.GRIEVANCE_LEVEL_1,
      responsibleUserId: project.nodalOfficerUserId,
      dueAt: level1DueAt,
      tenantId: tenantId || undefined,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "GRIEVANCE_RAISED",
        entityType: "Grievance",
        entityId: grievance.id,
        details: {
          grievanceId,
          projectId,
          issueTitle: body.issueTitle,
          level1DueAt,
        },
      },
    });

    return successResponse(
      res,
      { grievance },
      `Grievance raised successfully with ID: ${grievanceId}. Level 1 resolution due by ${level1DueAt.toISOString()}.`
    );
  } catch (error) {
    console.error("Error in raiseGrievance:", error);
    return errorResponse(res, "Failed to raise grievance", 500);
  }
};

// ─── Get My Grievances ──────────────────────────────────────────────
export const getMyGrievances = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { status, page = 1, limit = 20 } = req.query as unknown as GrievanceFilters;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const pageNum = parseInt(page as unknown as string) || 1;
    const pageSize = parseInt(limit as unknown as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    // Build filter based on user role
    const where: Prisma.GrievanceWhereInput = {
      tenantId: tenantId || undefined,
    };

    // Role-based filtering
    if (
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.PORTAL_ADMIN ||
      userRole === Role.STATE_CSR_CELL
    ) {
      // Admins and State Cell can see all grievances
    } else if (userRole === Role.JOINT_SECRETARY) {
      // JS can see escalated grievances
      where.status = {
        in: [
          GrievanceStatus.ESCALATED_TO_JS_SECRETARY,
          GrievanceStatus.LEVEL_2_RESOLVED,
        ],
      };
      where.finalAuthorityUserId = userId;
    } else if (userRole === Role.DISTRICT_NODAL_OFFICER) {
      // Nodal officers can see grievances for their projects
      where.OR = [
        { assignedNodalOfficerId: userId },
        {
          convergenceProject: {
            nodalOfficerUserId: userId,
          },
        },
      ];
    } else {
      // Regular users can see grievances they raised
      where.raisedByUserId = userId;
    }

    // Apply status filter
    if (status) {
      where.status = status;
    }

    const [grievances, totalCount] = await Promise.all([
      prisma.grievance.findMany({
        where,
        select: {
          id: true,
          grievanceId: true,
          issueTitle: true,
          status: true,
          raisedByType: true,
          createdAt: true,
          updatedAt: true,
          level1DueAt: true,
          level2DueAt: true,
          convergenceProject: {
            select: {
              id: true,
              projectId: true,
              title: true,
            },
          },
          raisedByUser: {
            select: { id: true, email: true },
          },
          assignedNodalOfficer: {
            select: { id: true, email: true },
          },
          assignedStateCellUser: {
            select: { id: true, email: true },
          },
          _count: {
            select: {
              actionLogs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.grievance.count({ where }),
    ]);

    // Calculate SLA status for each grievance
    const now = new Date();
    const grievancesWithSLA = grievances.map((g) => {
      let slaStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK";
      let slaDueDate: Date | null = null;

      if (g.status === GrievanceStatus.RAISED || g.status === GrievanceStatus.LEVEL_1_REVIEW) {
        slaDueDate = g.level1DueAt;
      } else if (
        g.status === GrievanceStatus.ESCALATED_TO_STATE_CELL ||
        g.status === GrievanceStatus.LEVEL_2_RESOLVED
      ) {
        slaDueDate = g.level2DueAt;
      }

      if (slaDueDate) {
        const daysRemaining = Math.floor(
          (slaDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysRemaining < 0) {
          slaStatus = "OVERDUE";
        } else if (daysRemaining <= 2) {
          slaStatus = "DUE_SOON";
        }
      }

      return {
        ...g,
        slaStatus,
        slaDueDate,
      };
    });

    const response = {
      grievances: grievancesWithSLA,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount,
        hasNextPage: skip + grievances.length < totalCount,
        hasPrevPage: pageNum > 1,
      },
    };

    return successResponse(res, response, "Grievances retrieved successfully");
  } catch (error) {
    console.error("Error in getMyGrievances:", error);
    return errorResponse(res, "Failed to retrieve grievances", 500);
  }
};

// ─── Get Grievance By ID ────────────────────────────────────────────
export const getGrievanceById = async (
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

    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
      include: {
        convergenceProject: {
          select: {
            id: true,
            projectId: true,
            title: true,
            district: true,
            taluka: true,
            nodalOfficerUserId: true,
          },
        },
        raisedByUser: {
          select: { id: true, email: true, role: true },
        },
        assignedNodalOfficer: {
          select: { id: true, email: true },
        },
        assignedStateCellUser: {
          select: { id: true, email: true },
        },
        finalAuthorityUser: {
          select: { id: true, email: true },
        },
        actionLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            actorUser: {
              select: { id: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!grievance) {
      return notFoundResponse(res, "Grievance not found");
    }

    // Role-based access verification
    const isAuthorized =
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.PORTAL_ADMIN ||
      userRole === Role.STATE_CSR_CELL ||
      userRole === Role.JOINT_SECRETARY ||
      grievance.raisedByUserId === userId ||
      grievance.assignedNodalOfficerId === userId ||
      grievance.assignedStateCellUserId === userId ||
      grievance.finalAuthorityUserId === userId ||
      grievance.convergenceProject.nodalOfficerUserId === userId;

    if (!isAuthorized) {
      return forbiddenResponse(res, "You don't have access to this grievance");
    }

    // Calculate SLA status
    const now = new Date();
    let slaStatus: "ON_TRACK" | "DUE_SOON" | "OVERDUE" = "ON_TRACK";
    let slaDueDate: Date | null = null;
    let slaDaysRemaining: number | null = null;

    if (
      grievance.status === GrievanceStatus.RAISED ||
      grievance.status === GrievanceStatus.LEVEL_1_REVIEW
    ) {
      slaDueDate = grievance.level1DueAt;
    } else if (
      grievance.status === GrievanceStatus.ESCALATED_TO_STATE_CELL ||
      grievance.status === GrievanceStatus.LEVEL_2_RESOLVED
    ) {
      slaDueDate = grievance.level2DueAt;
    }

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
      ...grievance,
      sla: {
        status: slaStatus,
        dueDate: slaDueDate,
        daysRemaining: slaDaysRemaining,
        level1DueAt: grievance.level1DueAt,
        level2DueAt: grievance.level2DueAt,
      },
    };

    return successResponse(res, response, "Grievance retrieved successfully");
  } catch (error) {
    console.error("Error in getGrievanceById:", error);
    return errorResponse(res, "Failed to retrieve grievance", 500);
  }
};

// ─── Respond to Grievance ───────────────────────────────────────────
export const respondToGrievance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const body = req.body as RespondToGrievanceBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validation
    if (!body.responseText || !body.responseText.trim()) {
      return validationErrorResponse(res, "Response text is required");
    }

    if (body.responseText.length < 10) {
      return validationErrorResponse(
        res,
        "Response text must be at least 10 characters"
      );
    }

    // Find grievance
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
      include: {
        convergenceProject: {
          select: {
            id: true,
            title: true,
            nodalOfficerUserId: true,
          },
        },
      },
    });

    if (!grievance) {
      return notFoundResponse(res, "Grievance not found");
    }

    // Determine response level and permissions
    let newStatus: GrievanceStatus | null = null;
    let actionType: string = "";
    let canRespond = false;

    // Level 1: Nodal Officer response
    if (
      grievance.status === GrievanceStatus.RAISED ||
      grievance.status === GrievanceStatus.LEVEL_1_REVIEW
    ) {
      if (
        userRole === Role.DISTRICT_NODAL_OFFICER &&
        grievance.convergenceProject.nodalOfficerUserId === userId
      ) {
        canRespond = true;
        newStatus = GrievanceStatus.LEVEL_1_RESOLVED;
        actionType = "LEVEL_1_RESPONSE";
      } else if (
        userRole === Role.STATE_CSR_CELL ||
        userRole === Role.SUPER_ADMIN ||
        userRole === Role.PORTAL_ADMIN
      ) {
        canRespond = true;
        newStatus = GrievanceStatus.LEVEL_1_RESOLVED;
        actionType = "LEVEL_1_RESPONSE";
      }
    }

    // Level 2: State Cell response
    if (
      grievance.status === GrievanceStatus.ESCALATED_TO_STATE_CELL ||
      grievance.status === GrievanceStatus.LEVEL_2_RESOLVED
    ) {
      if (
        userRole === Role.STATE_CSR_CELL ||
        userRole === Role.SUPER_ADMIN ||
        userRole === Role.PORTAL_ADMIN
      ) {
        canRespond = true;
        newStatus = GrievanceStatus.LEVEL_2_RESOLVED;
        actionType = "LEVEL_2_RESPONSE";
      }
    }

    // Final authority response
    if (grievance.status === GrievanceStatus.ESCALATED_TO_JS_SECRETARY) {
      if (
        userRole === Role.JOINT_SECRETARY ||
        userRole === Role.SUPER_ADMIN ||
        userRole === Role.PORTAL_ADMIN
      ) {
        canRespond = true;
        newStatus = GrievanceStatus.CLOSED;
        actionType = "FINAL_RESPONSE";
      }
    }

    if (!canRespond) {
      return forbiddenResponse(
        res,
        "You don't have permission to respond to this grievance at its current level"
      );
    }

    // Update grievance
    const updateData: Prisma.GrievanceUpdateInput = {
      status: newStatus!,
      updatedAt: new Date(),
    };

    if (newStatus === GrievanceStatus.LEVEL_1_RESOLVED) {
      updateData.assignedNodalOfficer = { connect: { id: userId } };
    } else if (newStatus === GrievanceStatus.LEVEL_2_RESOLVED) {
      updateData.assignedStateCellUser = { connect: { id: userId } };
    } else if (newStatus === GrievanceStatus.CLOSED) {
      updateData.finalAuthorityUser = { connect: { id: userId } };
      updateData.resolutionText = body.responseText;
    }

    const updatedGrievance = await prisma.grievance.update({
      where: { id },
      data: updateData,
    });

    // Create action log
    await prisma.grievanceActionLog.create({
      data: {
        tenantId,
        grievanceId: id,
        actorUserId: userId,
        action: actionType,
        note: body.responseText,
      },
    });

    // Resolve SLA escalations
    if (newStatus === GrievanceStatus.LEVEL_1_RESOLVED) {
      await prisma.sLAEscalation.updateMany({
        where: {
          entityType: "GRIEVANCE",
          entityId: id,
          stage: SLAStage.GRIEVANCE_LEVEL_1,
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    } else if (newStatus === GrievanceStatus.LEVEL_2_RESOLVED) {
      await prisma.sLAEscalation.updateMany({
        where: {
          entityType: "GRIEVANCE",
          entityId: id,
          stage: SLAStage.GRIEVANCE_LEVEL_2,
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
        action: actionType,
        entityType: "Grievance",
        entityId: id,
        details: {
          newStatus,
          responseLength: body.responseText.length,
          actionTaken: body.actionTaken,
        },
      },
    });

    // Notify the grievance raiser
    await prisma.notification.create({
      data: {
        userId: grievance.raisedByUserId,
        title: "Grievance Response Received",
        message: `Your grievance ${grievance.grievanceId} has received a response. Status: ${newStatus}`,
        type: "IN_APP",
      },
    });

    return successResponse(
      res,
      { grievance: updatedGrievance },
      `Grievance response submitted successfully. Status updated to ${newStatus}.`
    );
  } catch (error) {
    console.error("Error in respondToGrievance:", error);
    return errorResponse(res, "Failed to respond to grievance", 500);
  }
};

// ─── Escalate Grievance ─────────────────────────────────────────────
export const escalateGrievance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const body = req.body as EscalateGrievanceBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validation
    if (!body.reason || !body.reason.trim()) {
      return validationErrorResponse(res, "Escalation reason is required");
    }

    if (!body.escalateToLevel || ![2, 3].includes(body.escalateToLevel)) {
      return validationErrorResponse(
        res,
        "Valid escalation level is required (2 or 3)"
      );
    }

    // Find grievance
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
      include: {
        convergenceProject: {
          select: {
            id: true,
            title: true,
            district: true,
          },
        },
      },
    });

    if (!grievance) {
      return notFoundResponse(res, "Grievance not found");
    }

    // Verify user has permission to escalate
    let canEscalate = false;
    let newStatus: GrievanceStatus | null = null;
    let targetRole: Role | null = null;
    let targetStage: SLAStage | null = null;

    // Level 1 to Level 2: Nodal Officer escalates to State Cell
    if (
      body.escalateToLevel === 2 &&
      (grievance.status === GrievanceStatus.RAISED ||
        grievance.status === GrievanceStatus.LEVEL_1_REVIEW)
    ) {
      if (
        userRole === Role.DISTRICT_NODAL_OFFICER ||
        grievance.raisedByUserId === userId ||
        userRole === Role.SUPER_ADMIN ||
        userRole === Role.PORTAL_ADMIN
      ) {
        canEscalate = true;
        newStatus = GrievanceStatus.ESCALATED_TO_STATE_CELL;
        targetRole = Role.STATE_CSR_CELL;
        targetStage = SLAStage.GRIEVANCE_LEVEL_2;
      }
    }

    // Level 2 to Level 3: State Cell escalates to Joint Secretary
    if (
      body.escalateToLevel === 3 &&
      (grievance.status === GrievanceStatus.ESCALATED_TO_STATE_CELL ||
        grievance.status === GrievanceStatus.LEVEL_2_RESOLVED)
    ) {
      if (
        userRole === Role.STATE_CSR_CELL ||
        userRole === Role.SUPER_ADMIN ||
        userRole === Role.PORTAL_ADMIN
      ) {
        canEscalate = true;
        newStatus = GrievanceStatus.ESCALATED_TO_JS_SECRETARY;
        targetRole = Role.JOINT_SECRETARY;
        targetStage = null; // Final level
      }
    }

    if (!canEscalate) {
      return forbiddenResponse(
        res,
        "You don't have permission to escalate this grievance to the requested level"
      );
    }

    // Find target user
    let targetUserId: string | null = null;
    if (targetRole) {
      const targetUser = await prisma.user.findFirst({
        where: {
          role: targetRole,
          ...((targetRole as Role) === Role.DISTRICT_NODAL_OFFICER && {
            assignedDistrict: grievance.convergenceProject.district,
          }),
        },
        select: { id: true },
      });
      targetUserId = targetUser?.id || null;
    }

    // Update grievance
    const updateData: Prisma.GrievanceUpdateInput = {
      status: newStatus!,
      updatedAt: new Date(),
    };

    if (newStatus === GrievanceStatus.ESCALATED_TO_STATE_CELL && targetUserId) {
      updateData.assignedStateCellUser = { connect: { id: targetUserId } };
    } else if (
      newStatus === GrievanceStatus.ESCALATED_TO_JS_SECRETARY &&
      targetUserId
    ) {
      updateData.finalAuthorityUser = { connect: { id: targetUserId } };
    }

    const updatedGrievance = await prisma.grievance.update({
      where: { id },
      data: updateData,
    });

    // Create action log
    await prisma.grievanceActionLog.create({
      data: {
        tenantId,
        grievanceId: id,
        actorUserId: userId,
        action: `ESCALATED_TO_LEVEL_${body.escalateToLevel}`,
        note: `Escalated to level ${body.escalateToLevel}. Reason: ${body.reason}`,
      },
    });

    // Resolve previous level SLA and create new one if applicable
    if (newStatus === GrievanceStatus.ESCALATED_TO_STATE_CELL) {
      await prisma.sLAEscalation.updateMany({
        where: {
          entityType: "GRIEVANCE",
          entityId: id,
          stage: SLAStage.GRIEVANCE_LEVEL_1,
          isResolved: false,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });

      // Create Level 2 SLA
      if (targetUserId) {
        await SLAEscalationService.create({
          entityType: "GRIEVANCE",
          entityId: id,
          stage: SLAStage.GRIEVANCE_LEVEL_2,
          responsibleUserId: targetUserId,
          dueAt: calculateDueDate(SLAStage.GRIEVANCE_LEVEL_2),
          tenantId: tenantId || undefined,
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: `GRIEVANCE_ESCALATED_TO_LEVEL_${body.escalateToLevel}`,
        entityType: "Grievance",
        entityId: id,
        details: {
          fromStatus: grievance.status,
          toStatus: newStatus,
          escalationReason: body.reason,
          escalatedToRole: targetRole,
        },
      },
    });

    // Notify target user if found
    if (targetUserId) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: "Grievance Escalated",
          message: `Grievance ${grievance.grievanceId} has been escalated to level ${body.escalateToLevel}. Reason: ${body.reason}`,
          type: "IN_APP",
        },
      });
    }

    return successResponse(
      res,
      { grievance: updatedGrievance },
      `Grievance escalated to level ${body.escalateToLevel} successfully`
    );
  } catch (error) {
    console.error("Error in escalateGrievance:", error);
    return errorResponse(res, "Failed to escalate grievance", 500);
  }
};

// ─── Close Grievance ────────────────────────────────────────────────
export const closeGrievance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const body = req.body as CloseGrievanceBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validation
    if (!body.resolutionText || !body.resolutionText.trim()) {
      return validationErrorResponse(res, "Resolution text is required");
    }

    if (!body.closureReason || !["RESOLVED", "REJECTED", "WITHDRAWN"].includes(body.closureReason)) {
      return validationErrorResponse(
        res,
        "Valid closure reason is required (RESOLVED, REJECTED, or WITHDRAWN)"
      );
    }

    // Find grievance
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
    });

    if (!grievance) {
      return notFoundResponse(res, "Grievance not found");
    }

    // Check if grievance can be closed
    const closableStatuses: GrievanceStatus[] = [
      GrievanceStatus.RAISED,
      GrievanceStatus.LEVEL_1_REVIEW,
      GrievanceStatus.LEVEL_1_RESOLVED,
      GrievanceStatus.ESCALATED_TO_STATE_CELL,
      GrievanceStatus.LEVEL_2_RESOLVED,
      GrievanceStatus.ESCALATED_TO_JS_SECRETARY,
    ];

    if (!closableStatuses.includes(grievance.status)) {
      return validationErrorResponse(
        res,
        `Cannot close grievance with status: ${grievance.status}`
      );
    }

    // Check permissions based on status
    let canClose = false;
    
    if (grievance.status === GrievanceStatus.ESCALATED_TO_JS_SECRETARY) {
      // Only JS or higher can close escalated grievances
      canClose = ([
        Role.JOINT_SECRETARY,
        Role.STATE_CSR_CELL,
        Role.SUPER_ADMIN,
        Role.PORTAL_ADMIN,
      ] as Role[]).includes(userRole!);
    } else if (
      grievance.status === GrievanceStatus.ESCALATED_TO_STATE_CELL ||
      grievance.status === GrievanceStatus.LEVEL_2_RESOLVED
    ) {
      // State Cell or higher
      canClose = ([
        Role.STATE_CSR_CELL,
        Role.SUPER_ADMIN,
        Role.PORTAL_ADMIN,
      ] as Role[]).includes(userRole!);
    } else {
      // Original raiser or nodal officer can close (withdraw)
      canClose =
        grievance.raisedByUserId === userId ||
        ([
          Role.DISTRICT_NODAL_OFFICER,
          Role.SUPER_ADMIN,
          Role.PORTAL_ADMIN,
        ] as Role[]).includes(userRole!);
    }

    if (!canClose) {
      return forbiddenResponse(
        res,
        "You don't have permission to close this grievance"
      );
    }

    // Update grievance
    const updatedGrievance = await prisma.grievance.update({
      where: { id },
      data: {
        status: GrievanceStatus.CLOSED,
        resolutionText: body.resolutionText,
        updatedAt: new Date(),
      },
    });

    // Create action log
    await prisma.grievanceActionLog.create({
      data: {
        tenantId,
        grievanceId: id,
        actorUserId: userId,
        action: "GRIEVANCE_CLOSED",
        note: `Grievance closed. Reason: ${body.closureReason}. Resolution: ${body.resolutionText}`,
      },
    });

    // Resolve any pending SLA escalations
    await prisma.sLAEscalation.updateMany({
      where: {
        entityType: "GRIEVANCE",
        entityId: id,
        isResolved: false,
      },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "GRIEVANCE_CLOSED",
        entityType: "Grievance",
        entityId: id,
        details: {
          fromStatus: grievance.status,
          toStatus: GrievanceStatus.CLOSED,
          closureReason: body.closureReason,
          resolutionText: body.resolutionText,
        },
      },
    });

    // Notify the grievance raiser
    await prisma.notification.create({
      data: {
        userId: grievance.raisedByUserId,
        title: "Grievance Closed",
        message: `Your grievance ${grievance.grievanceId} has been closed. Reason: ${body.closureReason}`,
        type: "IN_APP",
      },
    });

    return successResponse(
      res,
      { grievance: updatedGrievance },
      "Grievance closed successfully"
    );
  } catch (error) {
    console.error("Error in closeGrievance:", error);
    return errorResponse(res, "Failed to close grievance", 500);
  }
};
