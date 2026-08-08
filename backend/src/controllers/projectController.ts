import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ProjectStatus } from "@prisma/client";
import { notifyHierarchy } from "../services/hierarchyNotificationService";

export const getProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { sector, district, status } = req.query;
    const user = req.user;

    let filter: any = {};
    if (sector) filter.sector = String(sector);
    if (district) filter.district = String(district);
    if (status) filter.status = status as ProjectStatus;

    if (user) {
      const roleIdNum = Number(user.roleId || user.role);
      const isSuperAdmin = roleIdNum === 1 || String(user.role) === "SUPER_ADMIN";
      const isStateAdmin = [2, 3, 4, 5, 6].includes(roleIdNum) || ["PLANNING_SECRETARY", "JOINT_SECRETARY", "RELATIONSHIP_MANAGER", "DISTRICT_NODAL_OFFICER", "DISTRICT_NODAL_CONSULTANT"].includes(String(user.role).toUpperCase());

      if (!isSuperAdmin && !isStateAdmin && user.organizationId) {
        filter.OR = [
          { organizationId: user.organizationId },
          { implementingAgencyId: user.organizationId },
          { corporateId: user.organizationId },
          { departmentId: user.organizationId }
        ];
      }
    }

    const projects = await prisma.project.findMany({
      where: filter,
      include: {
        organization: {
          select: { id: true, name: true, kind: true }
        },
        milestones: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organization: true,
        milestones: true,
        documents: true,
        inspections: true
      }
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json(project);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectCode, title, description, sector, state = "Maharashtra", district, taluka, approvedBudget, type } = req.body;

    if (!req.user?.organizationId) {
      return res.status(400).json({ error: "User must belong to an organization to create projects" });
    }

    const project = await prisma.project.create({
      data: {
        projectCode: projectCode || `PRJ-MH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        title,
        description,
        sector,
        state,
        district,
        taluka,
        approvedBudget: Number(approvedBudget),
        type: type || "CONVERGENCE_FRAMEWORK",
        organizationId: req.user.organizationId
      }
    });

    return res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, sector, approvedBudget, status } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(sector ? { sector } : {}),
        ...(approvedBudget ? { approvedBudget: Number(approvedBudget) } : {}),
        ...(status ? { status: status as ProjectStatus } : {})
      }
    });

    if (status) {
      notifyHierarchy({
        title: `Project Status Updated: ${status}`,
        message: `Project "${project.title}" (${project.projectCode}) status has been updated to ${status}.`,
        organizationId: project.organizationId,
        district: project.district,
        includeOrgUsers: true,
        includePortalAdmins: true,
        includeRms: true,
        includeDistrictOfficers: true,
        actionButtonUrl: `/projects/${project.id}`,
        variables: {
          currentStatus: status,
          workflowStatus: `Project status updated to ${status}`
        }
      }).catch((err) => console.error("[ProjectController] Status update notification failed:", err));
    }

    return res.json(project);
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });

    return res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
};
