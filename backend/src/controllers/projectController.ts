import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ProjectStatus, MilestoneStatus, Role, VerificationStatus } from "@prisma/client";

// Get all projects with filters
export const getProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { focusArea, district, status, minBudget, maxBudget } = req.query;

    let filter: any = {};

    // Standard filter by query
    if (focusArea) filter.focusArea = focusArea as string;
    if (district) filter.district = district as string;
    
    if (status) {
      filter.status = status as ProjectStatus;
    } else {
      // NGO can see drafts; others see only submitted or beyond
      if (req.user?.role === Role.NGO_ADMIN || req.user?.role === Role.NGO_MEMBER) {
        filter.ngoId = req.user.ngoId;
      } else {
        filter.status = { notIn: ["DRAFT", "REJECTED"] };
      }
    }

    if (minBudget || maxBudget) {
      filter.budgetRequested = {};
      if (minBudget) filter.budgetRequested.gte = parseFloat(minBudget as string);
      if (maxBudget) filter.budgetRequested.lte = parseFloat(maxBudget as string);
    }

    const projects = await prisma.project.findMany({
      where: filter,
      include: {
        ngo: {
          select: { name: true, district: true, status: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(projects);
  } catch (error) {
    next(error);
  }
};

// Get project by ID
export const getProjectById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        ngo: true,
        milestones: {
          orderBy: { dueDate: "asc" }
        },
        documents: true
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

// Create a new Project
export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, focusArea, sdgGoal, beneficiaryCount, budgetRequested, district, taluka, village, startDate, endDate } = req.body;

    if (!req.user?.ngoId) {
      return res.status(403).json({ error: "Only users linked to an NGO can create project proposals" });
    }

    // Verify NGO is verified before proposing projects
    const ngo = await prisma.nGO.findUnique({ where: { id: req.user.ngoId } });
    if (!ngo || ngo.status !== VerificationStatus.VERIFIED) {
      return res.status(403).json({ error: "NGO verification pending or rejected. Cannot create projects." });
    }

    const project = await prisma.project.create({
      data: {
        ngoId: req.user.ngoId,
        title,
        description,
        focusArea,
        sdgGoal,
        beneficiaryCount: parseInt(beneficiaryCount),
        budgetRequested: parseFloat(budgetRequested),
        district,
        taluka,
        village: village || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: ProjectStatus.DRAFT
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "PROJECT_CREATE",
        details: { projectId: project.id, title }
      }
    });

    return res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

// Update project status (workflow engine)
export const updateProjectStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Auth validation
    if (status === ProjectStatus.SUBMITTED) {
      if (req.user?.role !== Role.NGO_ADMIN && req.user?.ngoId !== project.ngoId) {
        return res.status(403).json({ error: "Unauthorized operation" });
      }
    } else if (status === ProjectStatus.APPROVED || status === ProjectStatus.REJECTED || status === ProjectStatus.UNDER_REVIEW) {
      if (req.user?.role !== Role.SUPER_ADMIN) {
        return res.status(403).json({ error: "Only Super Admins can review projects" });
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { status }
    });

    // Notify NGO admins of change
    const ngoAdmins = await prisma.user.findMany({ where: { ngoId: project.ngoId } });
    for (const u of ngoAdmins) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "Project Status Changed",
          message: `Your project proposal '${project.title}' is now '${status}'.`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "PROJECT_STATUS_UPDATE",
        details: { projectId: id, oldStatus: project.status, newStatus: status }
      }
    });

    return res.json(updatedProject);
  } catch (error) {
    next(error);
  }
};

// Add Milestones to a project
export const addProjectMilestones = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { milestones } = req.body; // Array of { name, description, amount, dueDate }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (req.user?.ngoId !== project.ngoId) {
      return res.status(403).json({ error: "Unauthorized project access" });
    }

    // Verify project isn't locked/funded yet
    if (project.status === ProjectStatus.FUNDED || project.status === ProjectStatus.COMPLETED) {
      return res.status(400).json({ error: "Cannot modify milestones of funded/completed projects" });
    }

    // Bulk create milestones
    await prisma.milestone.deleteMany({ where: { projectId: id } }); // reset
    
    const createdMilestones = await prisma.$transaction(
      milestones.map((m: any) =>
        prisma.milestone.create({
          data: {
            projectId: id,
            name: m.name,
            description: m.description,
            amount: parseFloat(m.amount),
            dueDate: new Date(m.dueDate),
            status: MilestoneStatus.PENDING
          }
        })
      )
    );

    return res.json({ message: "Milestones saved successfully", createdMilestones });
  } catch (error) {
    next(error);
  }
};

// Submit milestone evidence (NGO)
export const submitMilestoneEvidence = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { milestoneId } = req.params;
    const { completionEvidence } = req.body; // URL of the uploaded S3 PDF file

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true }
    });

    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    if (req.user?.ngoId !== milestone.project.ngoId) {
      return res.status(403).json({ error: "Unauthorized access to milestone project" });
    }

    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        completionEvidence,
        status: MilestoneStatus.APPROVED_BY_NGO
      }
    });

    // Notify matching companies or funding company (if funded)
    // For now, write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "MILESTONE_SUBMIT_PROOF",
        details: { milestoneId, completionEvidence }
      }
    });

    return res.json(updatedMilestone);
  } catch (error) {
    next(error);
  }
};

// Release milestone funding (Company)
export const releaseMilestoneFunding = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { milestoneId } = req.params;

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true }
    });

    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    if (req.user?.role !== Role.COMPANY_ADMIN && req.user?.role !== Role.COMPANY_MEMBER) {
      return res.status(403).json({ error: "Only companies can release milestone funds" });
    }

    if (milestone.status !== MilestoneStatus.APPROVED_BY_NGO) {
      return res.status(400).json({ error: "Milestone proof has not been submitted by the NGO yet" });
    }

    // Process payment release
    await prisma.$transaction([
      prisma.milestone.update({
        where: { id: milestoneId },
        data: { status: MilestoneStatus.RELEASED }
      }),
      prisma.project.update({
        where: { id: milestone.projectId },
        data: {
          budgetFunded: { increment: milestone.amount },
          status: ProjectStatus.FUNDED // Mark as funded if funds are rolling
        }
      })
    ]);

    // Notify NGO admins
    const ngoAdmins = await prisma.user.findMany({ where: { ngoId: milestone.project.ngoId } });
    for (const u of ngoAdmins) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "Milestone Funding Released!",
          message: `Funding of INR ${milestone.amount} has been released for milestone '${milestone.name}'.`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "MILESTONE_PAYMENT_RELEASED",
        details: { milestoneId, amount: milestone.amount }
      }
    });

    return res.json({ message: "Milestone funding released successfully" });
  } catch (error) {
    next(error);
  }
};
