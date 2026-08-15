import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

/**
 * List Geotagged Evidence & Project Files
 */
export const getEvidenceList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, milestoneId, isGeoTagged } = req.query;

    let whereClause: any = {};
    if (projectId) whereClause.projectId = String(projectId);
    if (milestoneId) whereClause.milestoneId = String(milestoneId);
    if (isGeoTagged !== undefined) whereClause.isGeoTagged = isGeoTagged === "true";

    const evidences = await prisma.milestoneEvidence.findMany({
      where: whereClause,
      include: {
        milestone: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            status: true
          }
        },
        project: {
          select: {
            id: true,
            projectCode: true,
            title: true,
            district: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      success: true,
      data: evidences.map(e => ({
        id: e.id,
        milestoneId: e.milestoneId,
        milestoneName: e.milestone.name,
        projectId: e.projectId,
        projectCode: e.project?.projectCode || "",
        projectTitle: e.project?.title || "",
        district: e.project?.district || "",
        fileUrl: e.fileUrl,
        title: e.title,
        description: e.description,
        isGeoTagged: e.isGeoTagged,
        latitude: e.latitude,
        longitude: e.longitude,
        verificationStatus: e.milestone.verificationStatus,
        createdAt: e.createdAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add / Record Evidence
 */
export const createEvidence = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const {
      milestoneId,
      projectId,
      fileUrl,
      title,
      description,
      isGeoTagged,
      latitude,
      longitude
    } = req.body;

    if (!milestoneId || !fileUrl || !title) {
      return res.status(400).json({ success: false, error: { message: "Milestone ID, file URL, and title are required." } });
    }

    const evidence = await prisma.milestoneEvidence.create({
      data: {
        milestoneId,
        projectId: projectId || null,
        fileUrl,
        title,
        description: description || null,
        isGeoTagged: Boolean(isGeoTagged),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        uploadedById: userId
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "MILESTONE_EVIDENCE_UPLOADED",
        entityType: "MilestoneEvidence",
        entityId: evidence.id,
        details: { milestoneId, title, isGeoTagged }
      }
    });

    return res.status(201).json({
      success: true,
      data: evidence
    });
  } catch (error) {
    next(error);
  }
};
