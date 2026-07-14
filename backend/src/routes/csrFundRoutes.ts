/**
 * @deprecated LEGACY - NOT MOUNTED in app.ts (ENABLE_LEGACY_NGO_MARKETPLACE guard).
 * This router is not registered; changes here have no runtime effect.
 */
import { Router } from "express";
import {
  createFundMilestones,
  updateFundMilestone,
  getFundMilestones
} from "../controllers/csrFundController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/requirement/:requirementId", authenticateToken, createFundMilestones);
router.patch("/:id", authenticateToken, updateFundMilestone);
router.get("/requirement/:requirementId", authenticateToken, getFundMilestones);

export default router;
