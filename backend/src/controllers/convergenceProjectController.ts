import { Response, NextFunction } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  Role,
  SimpleMilestoneStatus,
  GrievanceStatus,
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
import { SLAEscalationService, calculateDueDate } from "../services/slaEscalationService";

// ─── Types ─────────────────────────────────────────────────────────
interface MilestoneInput {
  name: string;
  description?: string;
  workType: "CONSTRUCTION" | "RENOVATION" | "EQUIPMENT_PURCHASE" | "SOFT_COMPONENT";
}

interface UpdateMilestoneProgressBody {
  status: "IN_PROGRESS" | "COMPLETED";
  fundsUtilized?: number;
  geoTaggedPhotoUrls?: string[];
  remarks?: string;
}

interface UploadUCBody {
  milestoneId?: string;
  certificateDocumentUrl: string;
  amountUtilized: number;
  remarks?: string;
}

interface ProjectFilters {
  status?: string;
  district?: string;
  taluka?: string;
  sector?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Helper: Generate Project ID ────────────────────────────────────
const generateProjectId = async (tenantId?: string | null): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PRJ-MH-${year}-`;

  const lastProject = await prisma.convergenceProject.findFirst({
    where: {
      projectId: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;
  if (lastProject && lastProject.projectId) {
    const parts = lastProject.projectId.split("-");
    const lastNum = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
};

// ─── Helper: Update Project Progress ───────────────────────────────
const updateProjectProgress = async (projectId: string): Promise<void> => {
  const milestones = await prisma.projectDeliverableMilestone.findMany({
    where: { convergenceProjectId: projectId },
  });

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m) => m.status === SimpleMilestoneStatus.COMPLETED
  ).length;

  const physicalProgressPercent = totalMilestones > 0
    ? Math.round((completedMilestones / totalMilestones) * 100)
    : 0;

  await prisma.convergenceProject.update({
    where: { id: projectId },
    data: { physicalProgressPercent },
  });
};

// ─── Helper: Update Project Financial Progress ──────────────────────
const updateProjectFinancialProgress = async (projectId: string): Promise<void> => {
  const verifiedUCs = await prisma.utilizationCertificate.findMany({
    where: {
      convergenceProjectId: projectId,
      verificationStatus: "VERIFIED",
    },
  });

  const totalUtilized = verifiedUCs.reduce(
    (sum, uc) => sum + Number(uc.amountUtilized),
    0
  );

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
};

// ─── Get Projects (with filters) ────────────────────────────────────
export const getProjects = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const {
      status,
      district,
      taluka,
      sector,
      search,
      page = 1,
      limit = 20,
    } = req.query as unknown as ProjectFilters;

    const pageNum = parseInt(page as unknown as string) || 1;
    const pageSize = parseInt(limit as unknown as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    // Build filter based on user role
    const where: Prisma.ConvergenceProjectWhereInput = {
      tenantId: tenantId || undefined,
    };

    // Role-based access control
    if (userRole === Role.DISTRICT_NODAL_OFFICER) {
      where.nodalOfficerUserId = userId;
    } else if (userRole === Role.IMPLEMENTING_AGENCY_USER) {
      where.implementingAgencyUserId = userId;
    } else if (userRole === Role.CORPORATE_USER) {
      // Corporate users see projects that originated from their own enquiries
      // (matched by verified enquiry email) or their pitch interests.
      where.OR = [
        { corporateEnquiry: { email: { equals: req.user?.email, mode: "insensitive" } } },
        { corporateUserId: userId },
      ];
    } else if (
      !(
        [
          Role.SUPER_ADMIN,
          Role.PORTAL_ADMIN,
          Role.STATE_CSR_CELL,
          Role.JOINT_SECRETARY,
        ] as Role[]
      ).includes(userRole!)
    ) {
      return forbiddenResponse(
        res,
        "You don't have permission to view these projects"
      );
    }

    // Apply filters
    if (status && status !== "all") {
      where.status = status;
    }

    if (district) {
      where.district = district;
    }

    if (taluka) {
      where.taluka = taluka;
    }

    if (sector) {
      where.sector = sector;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { projectId: { contains: search, mode: "insensitive" } },
        { corporateName: { contains: search, mode: "insensitive" } },
      ];
    }

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
          nodalOfficerUser: {
            select: { id: true, email: true },
          },
          implementingAgencyUser: {
            select: { id: true, email: true },
          },
          _count: {
            select: {
              milestones: true,
              utilizationCertificates: true,
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
        take: pageSize,
      }),
      prisma.convergenceProject.count({ where }),
    ]);

    const response = {
      projects,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount,
        hasNextPage: skip + projects.length < totalCount,
        hasPrevPage: pageNum > 1,
      },
    };

    return successResponse(res, response, "Projects retrieved successfully");
  } catch (error) {
    console.error("Error in getProjects:", error);
    return errorResponse(res, "Failed to retrieve projects", 500);
  }
};

// ─── Get Project By ID ────────────────────────────────────────────
export const getProjectById = async (
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

    const project = await prisma.convergenceProject.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
      include: {
        milestones: {
          orderBy: { createdAt: "asc" },
          include: {
            utilizationCertificates: {
              select: {
                id: true,
                amountUtilized: true,
                verificationStatus: true,
                uploadedAt: true,
              },
            },
            verifiedByNodalOfficer: {
              select: { id: true, email: true },
            },
          },
        },
        utilizationCertificates: {
          orderBy: { uploadedAt: "desc" },
          include: {
            uploadedByUser: { select: { id: true, email: true } },
            verifiedByNodalOfficer: { select: { id: true, email: true } },
            milestone: { select: { id: true, name: true } },
          },
        },
        grievances: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            grievanceId: true,
            issueTitle: true,
            status: true,
            createdAt: true,
            level1DueAt: true,
            level2DueAt: true,
          },
        },
        nodalOfficerUser: {
          select: { id: true, email: true },
        },
        implementingAgencyUser: {
          select: { id: true, email: true },
        },
        corporateEnquiry: {
          select: {
            id: true,
            trackingId: true,
            companyName: true,
            email: true,
          },
        },
        governmentPitch: {
          select: {
            id: true,
            pitchReferenceId: true,
            officialName: true,
            department: true,
          },
        },
        mou: {
          select: {
            id: true,
            mouReferenceId: true,
            projectTitle: true,
            deliverables: true,
            timelineMonths: true,
            signedDocumentUrl: true,
          },
        },
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found");
    }

    // Role-based access verification
    const isOwningCorporate =
      userRole === Role.CORPORATE_USER &&
      (project.corporateUserId === userId ||
        (project.corporateEnquiry?.email &&
          req.user?.email &&
          project.corporateEnquiry.email.toLowerCase() === req.user.email.toLowerCase()));

    const isAuthorized =
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.PORTAL_ADMIN ||
      userRole === Role.STATE_CSR_CELL ||
      userRole === Role.JOINT_SECRETARY ||
      project.nodalOfficerUserId === userId ||
      project.implementingAgencyUserId === userId ||
      isOwningCorporate;

    if (!isAuthorized) {
      return forbiddenResponse(res, "You don't have access to this project");
    }

    return successResponse(res, project, "Project retrieved successfully");
  } catch (error) {
    console.error("Error in getProjectById:", error);
    return errorResponse(res, "Failed to retrieve project", 500);
  }
};

// ─── Update Milestone Progress ─────────────────────────────────────
export const updateMilestoneProgress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const body = req.body as UpdateMilestoneProgressBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validation
    if (!body.status || !["IN_PROGRESS", "COMPLETED"].includes(body.status)) {
      return validationErrorResponse(
        res,
        "Valid status (IN_PROGRESS or COMPLETED) is required"
      );
    }

    // Find milestone with project access check
    const milestone = await prisma.projectDeliverableMilestone.findFirst({
      where: {
        id,
        convergenceProject: {
          tenantId: tenantId || undefined,
          OR: [
            { nodalOfficerUserId: userId },
            { implementingAgencyUserId: userId },
          ],
        },
      },
      include: {
        convergenceProject: true,
      },
    });

    if (!milestone) {
      return notFoundResponse(
        res,
        "Milestone not found or you don't have access"
      );
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      NOT_STARTED: ["IN_PROGRESS"],
      IN_PROGRESS: ["COMPLETED"],
      COMPLETED: [],
    };

    const currentStatus = milestone.status;
    if (!validTransitions[currentStatus]?.includes(body.status)) {
      return validationErrorResponse(
        res,
        `Cannot transition from ${currentStatus} to ${body.status}`
      );
    }

    // Build update data
    const updateData: Prisma.ProjectDeliverableMilestoneUpdateInput = {
      status: body.status as SimpleMilestoneStatus,
      updatedAt: new Date(),
    };

    if (body.fundsUtilized !== undefined && body.fundsUtilized >= 0) {
      updateData.fundsUtilized = new Decimal(body.fundsUtilized);
    }

    if (body.geoTaggedPhotoUrls && Array.isArray(body.geoTaggedPhotoUrls)) {
      // Validate photo URLs
      const validUrls = body.geoTaggedPhotoUrls.filter(
        (url) => typeof url === "string" && url.trim().length > 0
      );
      if (validUrls.length > 0) {
        const existingPhotos = milestone.geoTaggedPhotoUrls || [];
        updateData.geoTaggedPhotoUrls = [...existingPhotos, ...validUrls];
      }
    }

    // Update milestone
    const updatedMilestone = await prisma.projectDeliverableMilestone.update({
      where: { id },
      data: updateData,
      include: {
        convergenceProject: {
          select: {
            id: true,
            projectId: true,
            title: true,
          },
        },
      },
    });

    // Update project progress if milestone is completed
    if (body.status === "COMPLETED") {
      await updateProjectProgress(milestone.convergenceProjectId);

      // Create SLA escalation for nodal officer verification
      await SLAEscalationService.create({
        entityType: "PROJECT_MILESTONE",
        entityId: id,
        stage: "GOVERNMENT_PITCH_VERIFICATION",
        responsibleUserId: milestone.convergenceProject.nodalOfficerUserId,
        dueAt: calculateDueDate("GOVERNMENT_PITCH_VERIFICATION"),
        tenantId: tenantId || undefined,
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "MILESTONE_PROGRESS_UPDATED",
        entityType: "ProjectDeliverableMilestone",
        entityId: id,
        details: {
          oldStatus: currentStatus,
          newStatus: body.status,
          fundsUtilized: body.fundsUtilized,
          remarks: body.remarks,
          projectId: milestone.convergenceProjectId,
        },
      },
    });

    return successResponse(
      res,
      { milestone: updatedMilestone },
      `Milestone progress updated to ${body.status} successfully`
    );
  } catch (error) {
    console.error("Error in updateMilestoneProgress:", error);
    return errorResponse(res, "Failed to update milestone progress", 500);
  }
};

// ─── Upload Utilization Certificate ─────────────────────────────────
export const uploadUC = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const body = req.body as UploadUCBody;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Validation
    if (!body.certificateDocumentUrl || !body.certificateDocumentUrl.trim()) {
      return validationErrorResponse(
        res,
        "Certificate document URL is required"
      );
    }

    if (body.amountUtilized === undefined || body.amountUtilized <= 0) {
      return validationErrorResponse(
        res,
        "Valid amount utilized is required"
      );
    }

    // Find project with access check
    const project = await prisma.convergenceProject.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
        OR: [
          { nodalOfficerUserId: userId },
          { implementingAgencyUserId: userId },
        ],
      },
      include: {
        milestones: true,
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found or you don't have access");
    }

    // Validate milestone if provided
    let milestoneId: string | undefined;
    if (body.milestoneId) {
      const milestone = project.milestones.find((m) => m.id === body.milestoneId);
      if (!milestone) {
        return validationErrorResponse(
          res,
          "Milestone not found in this project"
        );
      }
      if (milestone.status !== SimpleMilestoneStatus.COMPLETED) {
        return validationErrorResponse(
          res,
          "Milestone must be completed before uploading UC"
        );
      }
      milestoneId = milestone.id;
    }

    // Create utilization certificate
    const uc = await prisma.utilizationCertificate.create({
      data: {
        tenantId,
        convergenceProjectId: id,
        milestoneId,
        uploadedByUserId: userId,
        certificateDocumentUrl: body.certificateDocumentUrl,
        amountUtilized: new Decimal(body.amountUtilized),
        remarks: body.remarks,
        verificationStatus: "PENDING",
      },
      include: {
        convergenceProject: {
          select: {
            id: true,
            projectId: true,
            title: true,
            nodalOfficerUserId: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create SLA escalation for nodal officer verification
    await SLAEscalationService.create({
      entityType: "UTILIZATION_CERTIFICATE",
      entityId: uc.id,
      stage: "GOVERNMENT_PITCH_VERIFICATION",
      responsibleUserId: project.nodalOfficerUserId,
      dueAt: calculateDueDate("GOVERNMENT_PITCH_VERIFICATION"),
      tenantId: tenantId || undefined,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "UC_UPLOADED",
        entityType: "UtilizationCertificate",
        entityId: uc.id,
        details: {
          projectId: id,
          milestoneId,
          amountUtilized: body.amountUtilized,
        },
      },
    });

    return successResponse(
      res,
      { utilizationCertificate: uc },
      "Utilization Certificate uploaded successfully and pending verification"
    );
  } catch (error) {
    console.error("Error in uploadUC:", error);
    return errorResponse(res, "Failed to upload utilization certificate", 500);
  }
};

// ─── Complete Project ─────────────────────────────────────────────
export const completeProject = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { completionNotes, beneficiariesSummary, impactSummary } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    // Only authorized roles can mark project as completed
    const allowedRoles: Role[] = [
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
      Role.STATE_CSR_CELL,
      Role.JOINT_SECRETARY,
      Role.DISTRICT_NODAL_OFFICER,
    ];

    if (!allowedRoles.includes(userRole!)) {
      return forbiddenResponse(
        res,
        "You don't have permission to complete projects"
      );
    }

    // Find project
    const project = await prisma.convergenceProject.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
      include: {
        milestones: true,
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found");
    }

    // Check if all milestones are completed
    const incompleteMilestones = project.milestones.filter(
      (m) => m.status !== SimpleMilestoneStatus.COMPLETED
    );

    if (incompleteMilestones.length > 0) {
      return validationErrorResponse(
        res,
        `Cannot complete project: ${incompleteMilestones.length} milestone(s) not completed`
      );
    }

    // Check for pending UCs
    const pendingUCs = await prisma.utilizationCertificate.count({
      where: {
        convergenceProjectId: id,
        verificationStatus: "PENDING",
      },
    });

    if (pendingUCs > 0) {
      return validationErrorResponse(
        res,
        `Cannot complete project: ${pendingUCs} utilization certificate(s) pending verification`
      );
    }

    // Update project status
    const updatedProject = await prisma.convergenceProject.update({
      where: { id },
      data: {
        status: "COMPLETED",
        physicalProgressPercent: 100,
        completedAt: new Date(),
        beneficiariesSummary: beneficiariesSummary || undefined,
        impactSummary: impactSummary || completionNotes || undefined,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "PROJECT_COMPLETED",
        entityType: "ConvergenceProject",
        entityId: id,
        details: {
          completionNotes,
          finalPhysicalProgress: 100,
          finalFinancialProgress: project.financialProgressPercent,
        },
      },
    });

    return successResponse(
      res,
      { project: updatedProject },
      "Project marked as completed successfully"
    );
  } catch (error) {
    console.error("Error in completeProject:", error);
    return errorResponse(res, "Failed to complete project", 500);
  }
};

// ─── Generate Completion Report ───────────────────────────────────
export const generateCompletionReport = async (
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

    // Find project with all related data
    const project = await prisma.convergenceProject.findFirst({
      where: {
        id,
        tenantId: tenantId || undefined,
      },
      include: {
        milestones: {
          orderBy: { createdAt: "asc" },
          include: {
            utilizationCertificates: {
              where: { verificationStatus: "VERIFIED" },
            },
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
            },
          },
        },
        nodalOfficerUser: {
          select: { email: true },
        },
        implementingAgencyUser: {
          select: { email: true },
        },
        mou: {
          select: {
            projectTitle: true,
            projectDescription: true,
            deliverables: true,
            timelineMonths: true,
            financialContribution: true,
            governmentContribution: true,
            signedDocumentUrl: true,
          },
        },
        corporateEnquiry: {
          select: {
            companyName: true,
            contactPersonName: true,
            email: true,
            mobile: true,
          },
        },
        governmentPitch: {
          select: {
            officialName: true,
            designation: true,
            department: true,
            officeName: true,
          },
        },
      },
    });

    if (!project) {
      return notFoundResponse(res, "Project not found");
    }

    // Calculate statistics
    const totalMilestones = project.milestones.length;
    const completedMilestones = project.milestones.filter(
      (m) => m.status === SimpleMilestoneStatus.COMPLETED
    ).length;

    const totalUCs = project.utilizationCertificates.length;
    const verifiedUCs = project.utilizationCertificates.filter(
      (uc) => uc.verificationStatus === "VERIFIED"
    ).length;

    const totalGrievances = project.grievances.length;
    const resolvedGrievances = project.grievances.filter(
      (g) =>
        g.status === GrievanceStatus.LEVEL_1_RESOLVED ||
        g.status === GrievanceStatus.LEVEL_2_RESOLVED ||
        g.status === GrievanceStatus.CLOSED
    ).length;

    const totalUtilized = project.utilizationCertificates
      .filter((uc) => uc.verificationStatus === "VERIFIED")
      .reduce((sum, uc) => sum + Number(uc.amountUtilized), 0);

    const completionReport = {
      certificateInfo: {
        certificateNumber: `COMP-${project.projectId}`,
        issueDate: new Date(),
        issuedBy: req.user?.email,
      },
      projectDetails: {
        projectId: project.projectId,
        title: project.title,
        district: project.district,
        taluka: project.taluka,
        location: project.location,
        sector: project.sector,
        status: project.status,
      },
      parties: {
        corporate: project.corporateName,
        corporateContact: project.corporateEnquiry,
        government: project.governmentPitch,
        nodalOfficer: project.nodalOfficerUser?.email,
        implementingAgency: project.implementingAgencyUser?.email,
      },
      mouDetails: project.mou,
      financials: {
        approvedBudget: project.approvedBudget,
        totalUtilized: totalUtilized,
        utilizationPercent:
          Number(project.approvedBudget) > 0
            ? Math.round((totalUtilized / Number(project.approvedBudget)) * 100)
            : 0,
      },
      executionSummary: {
        totalMilestones,
        completedMilestones,
        completionPercent:
          totalMilestones > 0
            ? Math.round((completedMilestones / totalMilestones) * 100)
            : 0,
        physicalProgressPercent: project.physicalProgressPercent,
        financialProgressPercent: project.financialProgressPercent,
      },
      milestones: project.milestones.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        workType: m.workType,
        status: m.status,
        fundsUtilized: m.fundsUtilized,
        verifiedAt: m.verifiedAt,
        photoCount: m.geoTaggedPhotoUrls?.length || 0,
      })),
      utilizationCertificates: {
        total: totalUCs,
        verified: verifiedUCs,
        totalAmount: totalUtilized,
      },
      grievances: {
        total: totalGrievances,
        resolved: resolvedGrievances,
        pending: totalGrievances - resolvedGrievances,
      },
      completionStatus: {
        isComplete: project.status === "COMPLETED",
        completedAt: project.status === "COMPLETED" ? (project.completedAt ?? project.updatedAt) : null,
      },
      generatedAt: new Date(),
    };

    // Save report to database
    await prisma.report.create({
      data: {
        tenantId,
        title: `Project Completion Certificate - ${project.title}`,
        type: "CSR",
        content: completionReport as any,
        fileUrl: null,
        createdById: userId,
      },
    });

    return successResponse(
      res,
      completionReport,
      "Project completion report generated successfully"
    );
  } catch (error) {
    console.error("Error in generateCompletionReport:", error);
    return errorResponse(res, "Failed to generate completion report", 500);
  }
};
