import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { MatchingService } from "../services/matchingService";
import { Role } from "@prisma/client";

export const getMatches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({ error: "User is not linked to any company" });
    }

    const matches = await MatchingService.calculateMatches(companyId);
    return res.json(matches);
  } catch (error) {
    next(error);
  }
};

export const recalculateMatches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params;

    if (req.user?.role !== Role.SUPER_ADMIN && req.user?.companyId !== companyId) {
      return res.status(403).json({ error: "Forbidden: Unauthorized budget calculations" });
    }

    await MatchingService.invalidateCache(companyId);
    const matches = await MatchingService.calculateMatches(companyId);
    return res.json({ message: "Matches recalculated", matches });
  } catch (error) {
    next(error);
  }
};
