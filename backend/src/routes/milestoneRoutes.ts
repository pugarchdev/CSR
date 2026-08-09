import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/accessControlMiddleware";
import {
  proposeMilestones,
  approveMilestonePlan,
  submitProgress,
  verifyMilestone,
  getProjectMilestones
} from "../controllers/milestoneController";

const router = Router();

router.use(authenticateToken);

// Propose milestone plan for a project
router.post(
  "/propose",
  authorize("milestone:create"),
  proposeMilestones
);

// Approve proposed milestone plan
router.post(
  "/project/:projectId/approve-plan",
  authorize("milestone:verify"),
  approveMilestonePlan
);

// Submit milestone progress & evidence
router.post(
  "/:id/progress",
  authorize("milestone:update"),
  submitProgress
);

// Verify milestone completion (DNO / Department Head)
router.post(
  "/:id/verify",
  authorize("milestone:verify"),
  verifyMilestone
);

// Get milestones for a project
router.get(
  "/project/:projectId",
  authorize("milestone:view"),
  getProjectMilestones
);

export default router;
