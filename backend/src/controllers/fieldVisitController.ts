import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

/**
 * List Field Visits / Inspections
 */
export const getFieldVisits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const roleId = Number(req.user?.roleId);
    const { projectId, status, search } = req.query;

    let whereClause: any = {};

    if (projectId) {
      whereClause.projectId = String(projectId);
    }

    if (roleId === 5) {
      // DNC sees their own inspections
      whereClause.inspectorUserId = userId;
    } else if (roleId === 4) {
      // DNO sees inspections on projects assigned to them
      whereClause.project = { nodalOfficerUserId: userId };
    }

    if (search) {
      whereClause.OR = [
        { remarks: { contains: String(search), mode: "insensitive" } },
        { issuesFound: { contains: String(search), mode: "insensitive" } },
        { project: { title: { contains: String(search), mode: "insensitive" } } },
      ];
    }

    const inspections = await prisma.projectInspection.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            title: true,
            district: true,
            taluka: true,
            sector: true,
            status: true
          }
        },
        inspectorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            mobile: true
          }
        }
      },
      orderBy: { visitDate: "desc" }
    });

    return res.json({
      success: true,
      data: inspections.map(i => ({
        id: i.id,
        projectId: i.projectId,
        projectCode: i.project.projectCode,
        projectTitle: i.project.title,
        district: i.project.district,
        taluka: i.project.taluka,
        visitDate: i.visitDate.toISOString(),
        inspectorName: `${i.inspectorUser.firstName || ''} ${i.inspectorUser.lastName || ''}`.trim() || i.inspectorUser.designation,
        inspectorRole: i.inspectorUser.designation || "Field Inspector",
        latitude: i.latitude,
        longitude: i.longitude,
        geoTaggedImagesCount: (i.geoTaggedImages || []).length,
        remarks: i.remarks,
        issuesFound: i.issuesFound,
        actionRequired: i.actionRequired,
        createdAt: i.createdAt.toISOString()
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Inspection / Field Visit by ID
 */
export const getFieldVisitById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const inspection = await prisma.projectInspection.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            organization: true,
            milestones: true
          }
        },
        inspectorUser: true
      }
    });

    if (!inspection) {
      return res.status(404).json({ success: false, error: { message: "Field visit record not found." } });
    }

    return res.json({
      success: true,
      data: {
        id: inspection.id,
        projectId: inspection.projectId,
        project: {
          id: inspection.project.id,
          projectCode: inspection.project.projectCode,
          title: inspection.project.title,
          sector: inspection.project.sector,
          district: inspection.project.district,
          taluka: inspection.project.taluka,
          organizationName: inspection.project.organization.name,
          milestones: inspection.project.milestones.map(m => ({
            id: m.id,
            name: m.name,
            status: m.status,
            verificationStatus: m.verificationStatus,
            targetAmount: m.targetAmount
          }))
        },
        visitDate: inspection.visitDate.toISOString(),
        latitude: inspection.latitude,
        longitude: inspection.longitude,
        geoTaggedImages: inspection.geoTaggedImages || [],
        remarks: inspection.remarks,
        issuesFound: inspection.issuesFound,
        actionRequired: inspection.actionRequired,
        inspector: {
          id: inspection.inspectorUser.id,
          name: `${inspection.inspectorUser.firstName || ''} ${inspection.inspectorUser.lastName || ''}`.trim(),
          designation: inspection.inspectorUser.designation,
          mobile: inspection.inspectorUser.mobile,
          email: inspection.inspectorUser.email
        },
        createdAt: inspection.createdAt.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Field Inspection / Visit Log
 */
export const createFieldVisit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const {
      projectId,
      visitDate,
      latitude,
      longitude,
      geoTaggedImages,
      remarks,
      issuesFound,
      actionRequired
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: { message: "Project ID is required." } });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return res.status(404).json({ success: false, error: { message: "Project not found." } });
    }

    const inspection = await prisma.projectInspection.create({
      data: {
        projectId,
        inspectorUserId: userId,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        geoTaggedImages: geoTaggedImages || [],
        remarks: remarks || "",
        issuesFound: issuesFound || null,
        actionRequired: actionRequired || null
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: "FIELD_VISIT_LOGGED",
        entityType: "ProjectInspection",
        entityId: inspection.id,
        details: {
          projectId,
          latitude,
          longitude,
          imagesCount: (geoTaggedImages || []).length
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: inspection
    });
  } catch (error) {
    next(error);
  }
};
