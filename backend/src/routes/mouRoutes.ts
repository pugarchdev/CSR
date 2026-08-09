import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { authorize } from "../middlewares/accessControlMiddleware";
import {
  initiateMou,
  updateMouDraft,
  recordSignature,
  getMouByProjectId
} from "../controllers/mouController";

const router = Router();

router.use(authenticateToken);

// Initiate MoU workflow
router.post(
  "/initiate",
  authorize("mou:sign"),
  initiateMou
);

// Update MoU draft / version
router.patch(
  "/:id",
  authorize("mou:sign"),
  updateMouDraft
);

// Record signature (digital / physical upload)
router.post(
  "/:id/signature",
  authorize("mou:sign"),
  recordSignature
);

// Get MoU details by project ID
router.get(
  "/project/:projectId",
  authorize("project:view"),
  getMouByProjectId
);

export default router;
