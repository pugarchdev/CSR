import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse, validationErrorResponse } from "../utils/apiResponse";
import { SimpleMilestoneStatus, GrievanceStatus, Prisma, CorporateEnquiryStatus, GovernmentPitchStatus, VerificationStatus } from "@prisma/client";
import { Role } from "../types/role";

// Extended Request type with user info
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    tenantId?: string | null;
    organizationId?: string | null;
    assignedDistrict?: string | null;
  };
}

// Validation helper
const validateRequestBody = (body: any, requiredFields: string[]): boolean => {
  return requiredFields.every((field) => body[field] !== undefined && body[field] !== null && body[field] !== "");
};

/**
 * @desc Get Nodal Officer Dashboard
 * @route GET /api/nodal-officer/dashboard
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const getDashboard = async (
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

    // Get counts for dashboard
    const [
      assignedProjects,
      pendingMilestones,
      pendingGrievances,
      pendingUCs,
      completedProjects
    ] = await Promise.all([
      // Total assigned projects
      prisma.convergenceProject.count({
        where: {
          nodalOfficerUserId: userId,
        },
      }),
      // Pending milestones to verify
      prisma.projectDeliverableMilestone.count({
        where: {
          convergenceProject: {
            nodalOfficerUserId: userId,
          },
          status: SimpleMilestoneStatus.COMPLETED,
          verifiedAt: null,
        },
      }),
      // Pending grievances
      prisma.grievance.count({
        where: {
          convergenceProject: {
            nodalOfficerUserId: userId,
          },
          status: {
            in: [GrievanceStatus.RAISED, GrievanceStatus.LEVEL_1_REVIEW],
          },
        },
      }),
      // Pending utilization certificates
      prisma.utilizationCertificate.count({
        where: {
          convergenceProject: {
            nodalOfficerUserId: userId,
          },
          verificationStatus: "PENDING",
        },
      }),
      // Completed projects
      prisma.convergenceProject.count({
        where: {
          nodalOfficerUserId: userId,
          status: "COMPLETED",
        },
      }),
    ]);

    // Get recent projects
    const recentProjects = await prisma.convergenceProject.findMany({
      where: {
        nodalOfficerUserId: userId,
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        district: true,
        status: true,
        physicalProgressPercent: true,
        financialProgressPercent: true,
        createdAt: true,
        _count: {
          select: {
            milestones: true,
            grievances: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // Get upcoming SLA escalations
    const upcomingEscalations = await prisma.sLAEscalation.count({
      where: {
        responsibleUserId: userId,
        isResolved: false,
        dueAt: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      },
    });

    const dashboardData = {
      summary: {
        assignedProjects,
        pendingMilestones,
        pendingGrievances,
        pendingUCs,
        completedProjects,
        upcomingEscalations,
      },
      recentProjects,
    };

    return successResponse(res, dashboardData, "Dashboard data retrieved successfully");
  } catch (error) {
    console.error("Error in getDashboard:", error);
    return errorResponse(res, "Failed to retrieve dashboard data", 500);
  }
};

/**
 * @desc Get list of assigned projects
 * @route GET /api/nodal-officer/projects
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const getMyProjects = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { status, district, search, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const where: Prisma.ConvergenceProjectWhereInput = {
      nodalOfficerUserId: userId,
    };

    if (status && status !== "all") {
      where.status = status as string;
    }

    if (district) {
      where.district = district as string;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { projectId: { contains: search as string, mode: "insensitive" } },
        { corporateName: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [projects, totalCount] = await Promise.all([
      prisma.convergenceProject.findMany({
        where,
        select: {
          id: true,
          projectId: true,
          title: true,
          district: true,
          taluka: true,
          location: true,
          sector: true,
          corporateName: true,
          status: true,
          approvedBudget: true,
          utilizedAmount: true,
          physicalProgressPercent: true,
          financialProgressPercent: true,
          createdAt: true,
          updatedAt: true,
          implementingAgencyUser: {
            select: {
              id: true,
              email: true,
            },
          },
          _count: {
            select: {
              milestones: true,
              utilizationCertificates: {
                where: { verificationStatus: "PENDING" },
              },
              grievances: {
                where: {
                  status: {
                    in: [GrievanceStatus.RAISED, GrievanceStatus.LEVEL_1_REVIEW],
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      prisma.convergenceProject.count({ where }),
    ]);

    const response = {
      projects,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / take),
        totalCount,
        hasNextPage: skip + projects.length < totalCount,
        hasPrevPage: Number(page) > 1,
      },
    };

    return successResponse(res, response, "Projects retrieved successfully");
  } catch (error) {
    console.error("Error in getMyProjects:", error);
    return errorResponse(res, "Failed to retrieve projects", 500);
  }
};

/**
 * @desc Update milestone status (IN_PROGRESS or COMPLETED)
 * @route PATCH /api/nodal-officer/milestones/:id/status
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const updateMilestoneStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { status, remarks, geoTaggedPhotoUrls } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validate required fields
    if (!status || !["IN_PROGRESS", "COMPLETED"].includes(status)) {
      return validationErrorResponse(res, "Valid status (IN_PROGRESS or COMPLETED) is required");
    }

    // Check if milestone exists and belongs to nodal officer's project
    const milestone = await prisma.projectDeliverableMilestone.findFirst({
      where: {
        id,
        convergenceProject: {
          nodalOfficerUserId: userId,
        },
      },
      include: {
        convergenceProject: true,
      },
    });

    if (!milestone) {
      return notFoundResponse(res, "Milestone not found or not accessible");
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      NOT_STARTED: ["IN_PROGRESS"],
      IN_PROGRESS: ["COMPLETED"],
      COMPLETED: [],
    };

    const currentStatus = milestone.status;
    if (!validTransitions[currentStatus]?.includes(status)) {
      return validationErrorResponse(
        res,
        `Cannot transition from ${currentStatus} to ${status}`
      );
    }

    // Build update data
    const updateData: Prisma.ProjectDeliverableMilestoneUpdateInput = {
      status: status as SimpleMilestoneStatus,
      updatedAt: new Date(),
    };

    if (geoTaggedPhotoUrls && Array.isArray(geoTaggedPhotoUrls)) {
      // Append new photos to existing array
      const existingPhotos = milestone.geoTaggedPhotoUrls || [];
      updateData.geoTaggedPhotoUrls = [...existingPhotos, ...geoTaggedPhotoUrls];
    }

    // Update the milestone
    const updatedMilestone = await prisma.projectDeliverableMilestone.update({
      where: { id },
      data: updateData,
    });

    // If completed, update project progress
    if (status === "COMPLETED") {
      await updateProjectProgress(milestone.convergenceProjectId);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "MILESTONE_STATUS_UPDATED",
        entityType: "ProjectDeliverableMilestone",
        entityId: id,
        details: {
          oldStatus: currentStatus,
          newStatus: status,
          remarks,
          projectId: milestone.convergenceProjectId,
        },
      },
    });

    return successResponse(
      res,
      { milestone: updatedMilestone },
      `Milestone status updated to ${status} successfully`
    );
  } catch (error) {
    console.error("Error in updateMilestoneStatus:", error);
    return errorResponse(res, "Failed to update milestone status", 500);
  }
};

/**
 * @desc Verify milestone (Nodal Officer verification)
 * @route PATCH /api/nodal-officer/milestones/:id/verify
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const verifyMilestone = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { isVerified, remarks, verificationNotes } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    if (isVerified === undefined) {
      return validationErrorResponse(res, "isVerified (boolean) is required");
    }

    // Check if milestone exists and belongs to nodal officer's project
    const milestone = await prisma.projectDeliverableMilestone.findFirst({
      where: {
        id,
        convergenceProject: {
          nodalOfficerUserId: userId,
        },
        status: SimpleMilestoneStatus.COMPLETED,
      },
      include: {
        convergenceProject: true,
      },
    });

    if (!milestone) {
      return notFoundResponse(res, "Milestone not found, not completed, or not accessible");
    }

    if (milestone.verifiedByNodalOfficerId) {
      return validationErrorResponse(res, "Milestone has already been verified");
    }

    // Update milestone verification
    const updateData: Prisma.ProjectDeliverableMilestoneUpdateInput = {
      verifiedByNodalOfficer: { connect: { id: userId } },
      verifiedAt: new Date(),
      updatedAt: new Date(),
    };

    if (remarks) {
      updateData.description = milestone.description
        ? `${milestone.description}\n\nVerification Remarks: ${remarks}`
        : `Verification Remarks: ${remarks}`;
    }

    const updatedMilestone = await prisma.projectDeliverableMilestone.update({
      where: { id },
      data: updateData,
      include: {
        verifiedByNodalOfficer: {
          select: { email: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: isVerified ? "MILESTONE_VERIFIED" : "MILESTONE_VERIFICATION_ATTEMPTED",
        entityType: "ProjectDeliverableMilestone",
        entityId: id,
        details: {
          isVerified,
          remarks,
          verificationNotes,
          projectId: milestone.convergenceProjectId,
        },
      },
    });

    return successResponse(
      res,
      { milestone: updatedMilestone },
      "Milestone verified successfully"
    );
  } catch (error) {
    console.error("Error in verifyMilestone:", error);
    return errorResponse(res, "Failed to verify milestone", 500);
  }
};

/**
 * @desc Verify Utilization Certificate
 * @route PATCH /api/nodal-officer/utilization-certificates/:id/verify
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const verifyUC = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { verificationStatus, remarks } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    if (!verificationStatus || !["VERIFIED", "REJECTED"].includes(verificationStatus)) {
      return validationErrorResponse(res, "Valid verificationStatus (VERIFIED or REJECTED) is required");
    }

    // Check if UC exists and belongs to nodal officer's project
    const uc = await prisma.utilizationCertificate.findFirst({
      where: {
        id,
        convergenceProject: {
          nodalOfficerUserId: userId,
        },
        verificationStatus: "PENDING",
      },
      include: {
        convergenceProject: true,
        milestone: true,
      },
    });

    if (!uc) {
      return notFoundResponse(res, "Utilization Certificate not found, already verified, or not accessible");
    }

    // Update UC verification
    const updatedUC = await prisma.utilizationCertificate.update({
      where: { id },
      data: {
        verificationStatus,
        verifiedByNodalOfficer: { connect: { id: userId } },
        verifiedAt: new Date(),
        remarks: remarks || uc.remarks,
      },
      include: {
        convergenceProject: {
          select: {
            projectId: true,
            title: true,
          },
        },
        uploadedByUser: {
          select: {
            email: true,
          },
        },
        verifiedByNodalOfficer: {
          select: {
            email: true,
          },
        },
      },
    });

    // If UC is for a milestone, update milestone verification
    if (uc.milestoneId && verificationStatus === "VERIFIED") {
      await prisma.projectDeliverableMilestone.update({
        where: { id: uc.milestoneId },
        data: {
          fundsUtilized: {
            increment: uc.amountUtilized,
          },
        },
      });
    }

    // Update project financial progress
    if (verificationStatus === "VERIFIED" && uc.convergenceProjectId) {
      await updateProjectFinancialProgress(uc.convergenceProjectId);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: verificationStatus === "VERIFIED" ? "UC_VERIFIED" : "UC_REJECTED",
        entityType: "UtilizationCertificate",
        entityId: id,
        details: {
          verificationStatus,
          amountUtilized: uc.amountUtilized,
          remarks,
          projectId: uc.convergenceProjectId,
          milestoneId: uc.milestoneId,
        },
      },
    });

    return successResponse(
      res,
      { utilizationCertificate: updatedUC },
      `Utilization Certificate ${verificationStatus.toLowerCase()} successfully`
    );
  } catch (error) {
    console.error("Error in verifyUC:", error);
    return errorResponse(res, "Failed to verify utilization certificate", 500);
  }
};

/**
 * @desc Respond to Grievance (Level 1)
 * @route PATCH /api/nodal-officer/grievances/:id/respond
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const respondToGrievance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { responseText, resolutionText, actionTaken } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    if (!responseText || responseText.trim().length < 10) {
      return validationErrorResponse(res, "Response text must be at least 10 characters");
    }

    // Check if grievance exists and is assigned to nodal officer
    const grievance = await prisma.grievance.findFirst({
      where: {
        id,
        convergenceProject: {
          nodalOfficerUserId: userId,
        },
        status: {
          in: [GrievanceStatus.RAISED, GrievanceStatus.LEVEL_1_REVIEW],
        },
      },
      include: {
        convergenceProject: true,
        raisedByUser: true,
      },
    });

    if (!grievance) {
      return notFoundResponse(res, "Grievance not found, not assigned, or already resolved");
    }

    // Check if within SLA
    const now = new Date();
    const isWithinSLA = !grievance.level1DueAt || now <= grievance.level1DueAt;

    // Update grievance status
    const updatedGrievance = await prisma.grievance.update({
      where: { id },
      data: {
        status: GrievanceStatus.LEVEL_1_RESOLVED,
        resolutionText: resolutionText || responseText,
        assignedNodalOfficer: { connect: { id: userId } },
        updatedAt: now,
      },
    });

    // Create action log
    await prisma.grievanceActionLog.create({
      data: {
        grievance: { connect: { id } },
        actorUser: { connect: { id: userId } },
        action: "LEVEL_1_RESPONSE",
        note: responseText,
      },
    });

    // Resolve SLA escalation if any
    await prisma.sLAEscalation.updateMany({
      where: {
        entityType: "GRIEVANCE",
        entityId: id,
        stage: "GRIEVANCE_LEVEL_1",
        isResolved: false,
      },
      data: {
        isResolved: true,
        resolvedAt: now,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "GRIEVANCE_LEVEL_1_RESOLVED",
        entityType: "Grievance",
        entityId: id,
        details: {
          responseText,
          resolutionText,
          actionTaken,
          isWithinSLA,
          projectId: grievance.convergenceProjectId,
        },
      },
    });

    return successResponse(
      res,
      { grievance: updatedGrievance, isWithinSLA },
      "Grievance response submitted successfully"
    );
  } catch (error) {
    console.error("Error in respondToGrievance:", error);
    return errorResponse(res, "Failed to respond to grievance", 500);
  }
};

/**
 * @desc Generate Project Progress Report
 * @route GET /api/nodal-officer/projects/:id/progress-report
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const generateProgressReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { format = "json" } = req.query;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Get project with all related data
    const project = await prisma.convergenceProject.findFirst({
      where: {
        id,
        nodalOfficerUserId: userId,
      },
      include: {
        milestones: {
          orderBy: { createdAt: "asc" },
          include: {
            utilizationCertificates: true,
            verifiedByNodalOfficer: {
              select: { email: true },
            },
          },
        },
        utilizationCertificates: {
          orderBy: { uploadedAt: "desc" },
          include: {
            uploadedByUser: { select: { email: true } },
            verifiedByNodalOfficer: { select: { email: true } },
          },
        },
        grievances: {
          orderBy: { createdAt: "desc" },
          include: {
            raisedByUser: { select: { email: true, role: true } },
            actionLogs: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        nodalOfficerUser: {
          select: { email: true },
        },
        implementingAgencyUser: {
          select: { email: true },
        },
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found or not accessible");
    }

    // Calculate statistics
    const totalMilestones = project.milestones.length;
    const completedMilestones = project.milestones.filter(
      (m: any) => m.status === SimpleMilestoneStatus.COMPLETED
    ).length;
    const verifiedMilestones = project.milestones.filter(
      (m: any) => m.verifiedByNodalOfficerId !== null
    ).length;

    const totalUCs = project.utilizationCertificates.length;
    const verifiedUCs = project.utilizationCertificates.filter(
      (uc: any) => uc.verificationStatus === "VERIFIED"
    ).length;

    const totalGrievances = project.grievances.length;
    const resolvedGrievances = project.grievances.filter(
      (g: any) => g.status === GrievanceStatus.LEVEL_1_RESOLVED || g.status === GrievanceStatus.LEVEL_2_RESOLVED
    ).length;

    const report = {
      projectInfo: {
        projectId: project.projectId,
        title: project.title,
        district: project.district,
        taluka: project.taluka,
        location: project.location,
        sector: project.sector,
        corporateName: project.corporateName,
        status: project.status,
        approvedBudget: project.approvedBudget,
        utilizedAmount: project.utilizedAmount,
        physicalProgressPercent: project.physicalProgressPercent,
        financialProgressPercent: project.financialProgressPercent,
      },
      personnel: {
        nodalOfficer: project.nodalOfficerUser?.email,
        implementingAgency: project.implementingAgencyUser?.email,
      },
      milestones: {
        total: totalMilestones,
        completed: completedMilestones,
        verified: verifiedMilestones,
        pending: totalMilestones - completedMilestones,
        items: project.milestones.map((m: any) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          fundsUtilized: m.fundsUtilized,
          verifiedAt: m.verifiedAt,
          photoCount: m.geoTaggedPhotoUrls?.length || 0,
        })),
      },
      utilizationCertificates: {
        total: totalUCs,
        verified: verifiedUCs,
        pending: totalUCs - verifiedUCs,
        totalAmount: project.utilizationCertificates.reduce(
          (sum: any, uc: any) => sum + Number(uc.amountUtilized),
          0
        ),
        items: project.utilizationCertificates.map((uc: any) => ({
          id: uc.id,
          amount: uc.amountUtilized,
          status: uc.verificationStatus,
          uploadedAt: uc.uploadedAt,
          verifiedAt: uc.verifiedAt,
        })),
      },
      grievances: {
        total: totalGrievances,
        resolved: resolvedGrievances,
        pending: totalGrievances - resolvedGrievances,
        items: project.grievances.map((g: any) => ({
          id: g.grievanceId,
          title: g.issueTitle,
          status: g.status,
          raisedAt: g.createdAt,
          resolutionText: g.resolutionText,
        })),
      },
      generatedAt: new Date(),
      generatedBy: req.user?.email,
    };

    // Create report record in database
    await prisma.report.create({
      data: {
        title: `Progress Report - ${project.title}`,
        type: "IMPACT",
        content: report as any,
        createdById: userId,
      },
    });

    return successResponse(res, report, "Progress report generated successfully");
  } catch (error) {
    console.error("Error in generateProgressReport:", error);
    return errorResponse(res, "Failed to generate progress report", 500);
  }
};

// Helper function to update project progress
async function updateProjectProgress(projectId: string): Promise<void> {
  try {
    const milestones = await prisma.projectDeliverableMilestone.findMany({
      where: { convergenceProjectId: projectId },
    });

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(
      (m: any) => m.status === SimpleMilestoneStatus.COMPLETED
    ).length;

    const physicalProgressPercent = totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

    await prisma.convergenceProject.update({
      where: { id: projectId },
      data: { physicalProgressPercent },
    });
  } catch (error) {
    console.error("Error updating project progress:", error);
  }
}

// Helper function to update project financial progress
async function updateProjectFinancialProgress(projectId: string): Promise<void> {
  try {
    const verifiedUCs = await prisma.utilizationCertificate.findMany({
      where: {
        convergenceProjectId: projectId,
        verificationStatus: "VERIFIED",
      },
    });

    const totalUtilized = verifiedUCs.reduce((sum: any, uc: any) => sum + Number(uc.amountUtilized), 0);

    const project = await prisma.convergenceProject.findUnique({
      where: { id: projectId },
      select: { approvedBudget: true },
    });

    const approvedBudget = Number(project?.approvedBudget) || 0;
    const financialProgressPercent = approvedBudget > 0
      ? Math.round((totalUtilized / approvedBudget) * 100)
      : 0;

    await prisma.convergenceProject.update({
      where: { id: projectId },
      data: {
        utilizedAmount: totalUtilized,
        financialProgressPercent,
      },
    });
  } catch (error) {
    console.error("Error updating project financial progress:", error);
  }
}

/**
 * @desc Get all inspections for nodal projects
 * @route GET /api/nodal/inspections
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const getInspections = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");

    const inspections = await prisma.convergenceProjectInspection.findMany({
      where: {
        districtOfficerId: userId,
      },
      include: {
        convergenceProject: {
          select: {
            id: true,
            projectId: true,
            title: true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    return successResponse(res, inspections, "Inspections retrieved successfully");
  } catch (error) {
    console.error("Error in getInspections:", error);
    return errorResponse(res, "Failed to retrieve inspections", 500);
  }
};

/**
 * @desc Create new inspection record
 * @route POST /api/nodal/inspections
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const createInspection = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");

    const {
      convergenceProjectId,
      visitDate,
      latitude,
      longitude,
      geoTaggedImages,
      remarks,
      issuesFound,
      actionRequired,
      nextVisitDate,
    } = req.body;

    if (!convergenceProjectId) {
      return validationErrorResponse(res, "convergenceProjectId is required");
    }

    const project = await prisma.convergenceProject.findFirst({
      where: {
        id: convergenceProjectId,
        nodalOfficerUserId: userId,
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found or not assigned to you");
    }

    const inspection = await prisma.convergenceProjectInspection.create({
      data: {
        convergenceProjectId,
        districtOfficerId: userId,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        geoTaggedImages: geoTaggedImages || [],
        remarks,
        issuesFound,
        actionRequired,
        nextVisitDate: nextVisitDate ? new Date(nextVisitDate) : null,
      },
    });

    return successResponse(res, inspection, "Inspection record created successfully", 201);
  } catch (error) {
    console.error("Error in createInspection:", error);
    return errorResponse(res, "Failed to create inspection record", 500);
  }
};

/**
 * @desc Confirm project completion and handover logs
 * @route POST /api/nodal/projects/:id/handover
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const confirmHandover = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");
    const { id } = req.params;
    const {
      ownershipAfterCompletion,
      maintenanceResponsibility,
      signedDocumentUrl,
      finalRemarks,
    } = req.body;

    const project = await prisma.convergenceProject.findFirst({
      where: {
        id,
        nodalOfficerUserId: userId,
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found or not assigned to you");
    }

    // Update project with handover details
    const updatedProject = await prisma.convergenceProject.update({
      where: { id },
      data: {
        status: "COMPLETED",
        physicalProgressPercent: 100,
        updatedAt: new Date(),
      },
    });

    // Update MoU if exists
    if (project.governmentPitchId || project.corporateEnquiryId) {
      const mou = await prisma.standardMou.findFirst({
        where: {
          OR: [
            { corporateEnquiryId: project.corporateEnquiryId },
            { governmentPitchId: project.governmentPitchId },
          ],
        },
      });

      if (mou) {
        await prisma.standardMou.update({
          where: { id: mou.id },
          data: {
            ownershipAfterCompletion: ownershipAfterCompletion || mou.ownershipAfterCompletion,
            maintenanceResponsibility: maintenanceResponsibility || mou.maintenanceResponsibility,
            signedDocumentUrl: signedDocumentUrl || mou.signedDocumentUrl,
            status: "SIGNED",
          },
        });
      }
    }

    if (project.corporateEnquiryId) {
      await prisma.corporateEnquiry.update({
        where: { id: project.corporateEnquiryId },
        data: { status: CorporateEnquiryStatus.COMPLETED },
      });
    }

    if (project.governmentPitchId) {
      await prisma.governmentPitch.update({
        where: { id: project.governmentPitchId },
        data: { status: GovernmentPitchStatus.COMPLETED },
      });
    }

    return successResponse(res, updatedProject, "Project handover confirmed successfully");
  } catch (error) {
    console.error("Error in confirmHandover:", error);
    return errorResponse(res, "Failed to confirm handover", 500);
  }
};

/**
 * @desc Create or update standard tripartite MoU
 * @route PATCH /api/nodal/projects/:id/mou
 * @access Private (DISTRICT_NODAL_OFFICER)
 */
export const updateMouStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");
    const { id } = req.params;
    const {
      districtDepartmentName,
      nodalOfficerName,
      corporateName,
      cin,
      projectTitle,
      projectDescription,
      scheduleVIIClause,
      projectLocation,
      deliverables,
      timelineMonths,
      financialContribution,
      governmentContribution,
      implementationMode,
      implementingAgencyName,
      ownershipAfterCompletion,
      maintenanceResponsibility,
      signedDocumentUrl,
      status,
    } = req.body;
    const resolvedStatus = status || (signedDocumentUrl ? "SIGNED" : undefined);

    const project = await prisma.convergenceProject.findFirst({
      where: {
        id,
        nodalOfficerUserId: userId,
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found or not assigned to you");
    }

    // Try to find existing MoU
    let mou = await prisma.standardMou.findFirst({
      where: {
        OR: [
          { corporateEnquiryId: project.corporateEnquiryId },
          { governmentPitchId: project.governmentPitchId },
        ],
      },
    });

    if (mou) {
      mou = await prisma.standardMou.update({
        where: { id: mou.id },
        data: {
          districtDepartmentName: districtDepartmentName || undefined,
          nodalOfficerName: nodalOfficerName || undefined,
          corporateName: corporateName || undefined,
          cin: cin || undefined,
          projectTitle: projectTitle || undefined,
          projectDescription: projectDescription || undefined,
          scheduleVIIClause: scheduleVIIClause || undefined,
          projectLocation: projectLocation || undefined,
          deliverables: deliverables || undefined,
          timelineMonths: timelineMonths ? parseInt(timelineMonths) : undefined,
          financialContribution: financialContribution ? new Prisma.Decimal(financialContribution) : undefined,
          governmentContribution: governmentContribution ? new Prisma.Decimal(governmentContribution) : undefined,
          implementationMode: implementationMode || undefined,
          implementingAgencyName: implementingAgencyName || undefined,
          ownershipAfterCompletion: ownershipAfterCompletion || undefined,
          maintenanceResponsibility: maintenanceResponsibility || undefined,
          signedDocumentUrl: signedDocumentUrl || undefined,
          status: resolvedStatus,
          updatedAt: new Date(),
        },
      });
    } else {
      const year = new Date().getFullYear();
      const count = await prisma.standardMou.count();
      const mouReferenceId = `MOU-MH-${year}-${String(count + 1).padStart(6, "0")}`;

      mou = await prisma.standardMou.create({
        data: {
          mouReferenceId,
          corporateEnquiryId: project.corporateEnquiryId,
          governmentPitchId: project.governmentPitchId,
          districtDepartmentName: districtDepartmentName || "District Administration",
          nodalOfficerName: nodalOfficerName || req.user?.email || "Nodal Officer",
          corporateName: corporateName || project.corporateName || "Corporate Partner",
          cin: cin || "N/A",
          projectTitle: projectTitle || project.title,
          projectDescription: projectDescription || project.title,
          scheduleVIIClause: scheduleVIIClause || "Clause 1",
          projectLocation: projectLocation || project.district,
          deliverables: deliverables || {},
          timelineMonths: timelineMonths ? parseInt(timelineMonths) : 12,
          financialContribution: financialContribution ? new Prisma.Decimal(financialContribution) : project.approvedBudget,
          governmentContribution: governmentContribution ? new Prisma.Decimal(governmentContribution) : null,
          implementationMode: implementationMode || "NGO_PARTNER",
          implementingAgencyName: implementingAgencyName || "Implementing Agency",
          ownershipAfterCompletion: ownershipAfterCompletion || "Government",
          maintenanceResponsibility: maintenanceResponsibility || "Local Body",
          signedDocumentUrl,
          status: resolvedStatus || "DRAFT",
        },
      });
    }

    if (resolvedStatus === "SIGNED") {
      // MoU signed → project formally onboarded; tracking begins (Step 8).
      await prisma.convergenceProject.update({
        where: { id: project.id },
        data: { status: project.status === "MOU_PENDING" ? "ONBOARDED" : "EXECUTION_STARTED" },
      });

      if (project.corporateEnquiryId) {
        await prisma.corporateEnquiry.update({
          where: { id: project.corporateEnquiryId },
          data: { status: CorporateEnquiryStatus.PROJECT_ONBOARDED },
        });
      }

      if (project.governmentPitchId) {
        await prisma.governmentPitch.update({
          where: { id: project.governmentPitchId },
          data: { status: GovernmentPitchStatus.PROJECT_ONBOARDED },
        });
      }
    } else if (resolvedStatus && resolvedStatus !== "SIGNED") {
      if (project.corporateEnquiryId) {
        await prisma.corporateEnquiry.update({
          where: { id: project.corporateEnquiryId },
          data: { status: CorporateEnquiryStatus.MOU_PENDING },
        });
      }

      if (project.governmentPitchId) {
        await prisma.governmentPitch.update({
          where: { id: project.governmentPitchId },
          data: { status: GovernmentPitchStatus.MOU_PENDING },
        });
      }
    }

    return successResponse(res, mou, "tripartite MoU updated successfully");
  } catch (error) {
    console.error("Error in updateMouStatus:", error);
    return errorResponse(res, "Failed to update tripartite MoU", 500);
  }
};

/**
 * @desc Get NGOs pending final empanelment review
 * @route GET /api/nodal/ngos/verification-queue
 * @access Private (DISTRICT_NODAL_OFFICER, PORTAL_ADMIN)
 */
export const listNgoVerificationQueue = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const district = req.user?.assignedDistrict || "Pune";

    const ngos = await prisma.nGO.findMany({
      where: {
        district,
        preliminaryApproved: true,
        status: VerificationStatus.PENDING
      },
      include: {
        users: {
          select: {
            id: true,
            email: true
          }
        },
        onboardingApplication: true
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, ngos, "NGO verification queue retrieved successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Submit final government verification for NGO
 * @route POST /api/nodal/ngos/:ngoId/final-verification
 * @access Private (DISTRICT_NODAL_OFFICER, PORTAL_ADMIN)
 */
export const submitFinalNgoVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { ngoId } = req.params;
    const { approved, remarks } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    if (typeof approved !== "boolean") {
      return validationErrorResponse(res, "Field 'approved' (boolean) is required");
    }

    const ngo = await prisma.nGO.findUnique({
      where: { id: ngoId }
    });

    if (!ngo) {
      return notFoundResponse(res, "NGO partner not found");
    }

    const status = approved ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const updatedNgo = await prisma.nGO.update({
      where: { id: ngoId },
      data: {
        status,
        finalApproved: approved,
        finalApprovedAt: new Date(),
        finalApprovedById: userId,
        empanelmentStatus: approved ? "EMPANELLED" : "EMPANELMENT_REJECTED"
      }
    });

    const application = await prisma.onboardingApplication.findFirst({
      where: { ngoId }
    });
    if (application) {
      await prisma.onboardingApplication.update({
        where: { id: application.id },
        data: {
          status: approved ? "APPROVED" : "REJECTED",
          reviewedAt: new Date(),
          approvedAt: approved ? new Date() : null,
          rejectedAt: approved ? null : new Date()
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "NGO_FINAL_VERIFICATION_SUBMITTED",
        details: { ngoId, approved, remarks }
      }
    });

    return successResponse(res, updatedNgo, `NGO final verification completed. Status set to: ${status}`);
  } catch (error) {
    next(error);
  }
};
