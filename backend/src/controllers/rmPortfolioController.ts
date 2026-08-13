import { NextFunction, Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  RmAssignmentService,
  RmPortfolioTransferError,
} from "../services/rmAssignmentService";
import { ROLE_ID } from "../types/role";

export const listAvailableRelationshipManagers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const excludeId = typeof req.query.excludeId === "string" ? req.query.excludeId : undefined;
    const relationshipManagers = await prisma.user.findMany({
      where: {
        roleId: ROLE_ID.RELATIONSHIP_MANAGER,
        accountStatus: "ACTIVE",
        deletedAt: null,
        isVerified: true,
        OR: [
          { rmProfile: null },
          { rmProfile: { isAvailable: true, isOutOfOffice: false, OR: [{ leaveStartsAt: null }, { leaveStartsAt: { gt: new Date() } }, { leaveEndsAt: { lt: new Date() } }] } },
        ],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        designation: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { email: "asc" }],
    });

    return res.json({ success: true, data: relationshipManagers });
  } catch (error) {
    next(error);
  }
};

export const allocateUnassignedCases = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const cases = await prisma.portalCase.findMany({ where: { status: "UNASSIGNED", assignedRmId: null }, select: { id: true }, orderBy: { createdAt: "asc" }, take: 200 });
    let assigned = 0;
    for (const item of cases) if (await RmAssignmentService.autoAssignRm({ caseId: item.id })) assigned += 1;
    await prisma.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: "UNASSIGNED_RM_QUEUE_PROCESSED", entityType: "PortalCase", details: { queued: cases.length, assigned, remaining: cases.length - assigned } } });
    return res.json({ success: true, data: { queued: cases.length, assigned, remaining: cases.length - assigned } });
  } catch (error) { next(error); }
};

export const transferRmPortfolio = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const isSuperAdmin = Number(req.user?.roleId || req.user?.role) === ROLE_ID.SUPER_ADMIN;
    const sourceRmId = isSuperAdmin ? req.body?.sourceRmId : req.user?.id;
    const { targetRmId, reason } = req.body || {};

    if (!sourceRmId || !targetRmId || typeof reason !== "string") {
      return res.status(400).json({ error: "Source RM, target RM, and transfer reason are required" });
    }

    const result = await RmAssignmentService.transferPortfolio(
      String(sourceRmId),
      String(targetRmId),
      req.user!.id,
      reason
    );

    return res.json({
      success: true,
      message: `Portfolio transferred successfully: ${result.enquiryCount} enquiries and ${result.pitchCount} pitches reassigned.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof RmPortfolioTransferError) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};
