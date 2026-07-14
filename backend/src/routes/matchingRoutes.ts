/**
 * @deprecated LEGACY - NOT MOUNTED in app.ts (ENABLE_LEGACY_NGO_MARKETPLACE guard).
 * This router is not registered; changes here have no runtime effect.
 */
import { Router } from "express";
import {
  getMatches,
  recalculateMatches,
  getCompanyRecommendedRequirements,
  getNGORecommendedRequirements
} from "../controllers/matchingController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getMatches);
router.post("/recalculate/:companyId", authenticateToken, recalculateMatches);
router.get("/company-requirements", authenticateToken, getCompanyRecommendedRequirements);
router.get("/ngo-requirements", authenticateToken, getNGORecommendedRequirements);

export default router;
