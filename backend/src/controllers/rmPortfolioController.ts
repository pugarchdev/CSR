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
