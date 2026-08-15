import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

/**
 * List Project Issues & Grievances
 */
export const getIssues = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, severity, status, search } = req.query;

    let whereClause: any = {};

    if (projectId) {
      whereClause.projectId = String(projectId);
    }
    if (severity) {
      whereClause.severity = String(severity).toUpperCase();
    }
    if (status) {
      whereClause.status = String(status).toUpperCase();
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } }
      ];
    }

    const issues = await prisma.projectIssue.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            title: true,
            district: true,
            sector: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      success: true,
      data: issues.map(i => ({
        id: i.id,
        projectId: i.projectId,
        projectCode: i.project.projectCode,
        projectTitle: i.project.title,
        district: i.project.district,
        sector: i.project.sector,
        title: i.title,
        description: i.description,
        severity: i.severity,
        status: i.status,
        responsibleParty: i.responsibleParty,
        dueDate: i.dueDate?.toISOString() || null,
        resolvedAt: i.resolvedAt?.toISOString() || null,
        verificationRemarks: i.verificationRemarks,
        createdAt: i.createdAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Issue by ID
 */
export const getIssueById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const issue = await prisma.projectIssue.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!issue) {
      return res.status(404).json({ success: false, error: { message: "Project issue not found." } });
    }

    return res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Raise Project Issue
 */
export const createIssue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const {
      projectId,
      title,
      description,
      severity,
      responsibleParty,
      dueDate
    } = req.body;

    if (!projectId || !title || !description) {
      return res.status(400).json({ success: false, error: { message: "Project ID, title, and description are required." } });
    }

    const issue = await prisma.projectIssue.create({
      data: {
        projectId,
        title,
        description,
        severity: severity || "MEDIUM",
        responsibleParty: responsibleParty || "GOVERNMENT_DEPARTMENT",
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "OPEN"
      }
    });

    // Also record audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "PROJECT_ISSUE_RAISED",
        entityType: "ProjectIssue",
        entityId: issue.id,
        details: { projectId, title, severity }
      }
    });

    return res.status(201).json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update / Resolve Issue
 */
export const updateIssue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, verificationRemarks, assignedToUserId } = req.body;

    let updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED" || status === "CLOSED" || status === "VERIFIED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = userId;
      }
    }
    if (verificationRemarks) updateData.verificationRemarks = verificationRemarks;
    if (assignedToUserId) updateData.assignedToUserId = assignedToUserId;

    const issue = await prisma.projectIssue.update({
      where: { id },
      data: updateData
    });

    return res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};
