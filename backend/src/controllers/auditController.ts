import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";

export const listAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const take = Math.min(parseInt(req.query.limit as string) || 100, 250);
    const userId = req.query.userId as string | undefined;

    const canSeeAllLogs =
      req.user?.role === Role.SUPER_ADMIN ||
      req.user?.role === Role.PORTAL_ADMIN;

    const where = canSeeAllLogs
      ? { ...(userId ? { userId } : {}) }
      : { userId: req.user!.id };

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take
    });

    return res.json(logs);
  } catch (error) {
    next(error);
  }
};
