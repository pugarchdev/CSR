import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getConvergenceProjects,
  getConvergenceProjectById,
  defineMilestones,
  addSingleMilestone,
  updateMilestoneProgress,
  verifyMilestone,
  uploadUC,
  verifyUC
} from "../controllers/convergenceProjectController";

const router = Router();

router.use(authenticateToken);

router.get("/", asyncHandler(getConvergenceProjects));
router.get("/:id", asyncHandler(getConvergenceProjectById));
router.post("/:id/milestones", asyncHandler(defineMilestones));
router.post("/:id/milestones/add", asyncHandler(addSingleMilestone));
router.patch("/:id/milestones/:milestoneId/progress", asyncHandler(updateMilestoneProgress));
router.post("/:id/milestones/:milestoneId/verify", asyncHandler(verifyMilestone));
router.post("/:id/utilization-certificates", asyncHandler(uploadUC));
router.patch("/:id/utilization-certificates/:ucId/verify", asyncHandler(verifyUC));

export default router;
