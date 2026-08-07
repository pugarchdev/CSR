import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { successResponse, notFoundResponse, unauthorizedResponse } from "../utils/apiResponse";
import { Role } from "../types/role";

export const getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return unauthorizedResponse(res, "Not authenticated");

    const [totalProjects, totalGrievances] = await Promise.all([
      prisma.project.count({
        where: { nodalOfficerUserId: userId }
      }),
      prisma.grievance.count({
        where: { project: { nodalOfficerUserId: userId } }
      })
    ]);

    return successResponse(res, { totalProjects, totalGrievances }, "Dashboard loaded");
  } catch (error) {
    next(error);
  }
};

export const getAssignedProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { nodalOfficerUserId: req.user?.id },
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, projects, "Projects retrieved");
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { milestones: true, grievances: true, documents: true, utilizationCertificates: true }
    });
    if (!project) return notFoundResponse(res, "Project not found");

    const isSuper = req.user?.role === 1 || req.user?.role === "SUPER_ADMIN" || req.user?.roleId === "1" || Number(req.user?.roleId) === 1;
    if (!isSuper && project.nodalOfficerUserId !== req.user?.id) {
      const explicitAssignment = await prisma.projectAssignment.findFirst({
        where: {
          entityType: "PROJECT",
          entityId: project.id,
          assignedToId: req.user?.id,
          status: "ACTIVE"
        }
      });
      if (!explicitAssignment) {
        return res.status(403).json({ error: "Forbidden: You do not have assignment access to this project" });
      }
    }

    return successResponse(res, project, "Project retrieved");
  } catch (error) {
    next(error);
  }
};

export const updateProjectStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    return successResponse(res, project, "Status updated");
  } catch (error) {
    next(error);
  }
};

export const verifyMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.id } });
    if (!milestone) return notFoundResponse(res, "Milestone not found");
    const assignment = await prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: milestone.projectId, assignmentType: "DISTRICT_NODAL_OFFICER", assignedToId: req.user!.id, status: "ACTIVE" } });
    if (!assignment) return res.status(403).json({ error: "Only an assigned DNO can verify this milestone." });
    if (milestone.status !== "SUBMITTED_FOR_VERIFICATION") return res.status(409).json({ error: "The milestone must first be submitted for verification." });
    const updated = await prisma.projectMilestone.update({ where: { id: milestone.id }, data: { status: "APPROVED", verifiedAt: new Date(), verifiedByUserId: req.user!.id } });
    return res.json({ success: true, message: "Milestone verified and marked complete.", data: updated });
  } catch (error) { next(error); }
};

export const verifyUC = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const uc = await prisma.utilizationCertificate.findUnique({ where: { id: req.params.id } });
    if (!uc) return notFoundResponse(res, "Utilisation Certificate not found");
    const assignment = await prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: uc.projectId, assignmentType: "DISTRICT_NODAL_OFFICER", assignedToId: req.user!.id, status: "ACTIVE" } });
    if (!assignment) return res.status(403).json({ error: "Only an assigned DNO can verify this Utilisation Certificate." });
    const updated = await prisma.utilizationCertificate.update({ where: { id: uc.id }, data: { verificationStatus: "VERIFIED", verifiedByUserId: req.user!.id, verifiedAt: new Date() } });
    return res.json({ success: true, message: "Utilisation Certificate verified.", data: updated });
  } catch (error) { next(error); }
};

export const resolveGrievance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const grievance = await prisma.grievance.update({
      where: { id: req.params.id },
      data: {
        resolutionText: req.body.resolutionText,
        status: "LEVEL_1_RESOLVED"
      }
    });
    return successResponse(res, grievance, "Grievance resolved");
  } catch (error) {
    next(error);
  }
};

export const getProjectGrievances = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const grievances = await prisma.grievance.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, grievances, "Grievances retrieved");
  } catch (error) {
    next(error);
  }
};

export const getCorporateEnquiries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = Number(req.user?.role || req.user?.roleId);
    const where: any = {};
    if (userRole === Role.DISTRICT_NODAL_OFFICER && req.user?.organizationId) {
      where.organizationId = req.user.organizationId;
    }
    const enquiries = await prisma.corporateEnquiry.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, enquiries, "Enquiries retrieved");
  } catch (error) {
    next(error);
  }
};

export const getGovernmentPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = Number(req.user?.role || req.user?.roleId);
    const where: any = {};
    if (userRole === Role.DISTRICT_NODAL_OFFICER && req.user?.organizationId) {
      where.departmentId = req.user.organizationId;
    }
    const pitches = await prisma.governmentPitch.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, pitches, "Pitches retrieved");
  } catch (error) {
    next(error);
  }
};

export const getInspections = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = Number(req.user?.role || req.user?.roleId);
    const where: any = {};
    if (userRole === Role.DISTRICT_NODAL_OFFICER && req.user?.id) {
      where.project = {
        OR: [
          { nodalOfficerUserId: req.user.id },
          {
            projectAssignments: {
              some: {
                assignedToId: req.user.id,
                status: "ACTIVE"
              }
            }
          }
        ]
      };
    }
    const inspections = await prisma.projectInspection.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, inspections, "Inspections retrieved");
  } catch (error) {
    next(error);
  }
};

export const createInspection = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const inspection = await prisma.projectInspection.create({
      data: {
        projectId: req.body.projectId,
        inspectorUserId: req.user!.id,
        remarks: req.body.remarks,
        issuesFound: req.body.issuesFound,
        actionRequired: req.body.actionRequired
      }
    });
    return successResponse(res, inspection, "Inspection created");
  } catch (error) {
    next(error);
  }
};
