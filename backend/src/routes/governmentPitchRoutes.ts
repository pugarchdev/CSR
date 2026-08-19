import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { ROLE_ID } from "../types/role";
import { requireApprovedOrganization, requireVerifiedActiveUser, requirePermission } from "../middlewares/accessControlMiddleware";
import {
  submitPitch,
  listGovernmentPitches,
  getPublicPitches,
  getPitchById,
  submitInterest,
  getMyPitches,
  verifyPitch,
  approvePitch,
  assignPitchRelationshipManager,
  recordPitchRmContact,
  convertPitchToProject,
  respondToPitchClarification
} from "../controllers/governmentPitchController";
import {
  listRMPitchInteractions,
  logPitchInteraction
} from "../controllers/relationshipManagerController";

const router = Router();

router.post("/", authenticateToken, requireVerifiedActiveUser, requireApprovedOrganization("GOVERNMENT_DEPARTMENT"), requirePermission("pitch:create"), submitPitch);
router.get("/", authenticateToken, requirePermission("pitch:view"), listGovernmentPitches);
router.get("/public", getPublicPitches);
router.post("/public/:id/interests", authenticateToken, requirePermission("pitch:view"), submitInterest);
router.get("/my", authenticateToken, requirePermission("pitch:view"), getMyPitches);
router.get("/:id", authenticateToken, requirePermission("pitch:view"), getPitchById);
router.get("/:id/interactions", authenticateToken, requirePermission("pitch:view"), listRMPitchInteractions);
router.post("/:id/interactions", authenticateToken, requirePermission("pitch:view"), logPitchInteraction);
router.post("/:id/clarify-response", authenticateToken, requirePermission("pitch:view"), respondToPitchClarification);
router.post("/:id/interest", authenticateToken, requirePermission("pitch:view"), submitInterest);
router.post("/:id/verify", authenticateToken, requirePermission("pitch:verify"), verifyPitch);
router.post("/:id/approve", authenticateToken, requirePermission("pitch:approve"), approvePitch);
router.post("/:id/assign-rm", authenticateToken, requirePermission("pitch:assign"), assignPitchRelationshipManager);
router.post("/:id/record-contact", authenticateToken, requirePermission("pitch:view"), recordPitchRmContact);
router.post("/:id/convert", authenticateToken, requirePermission("pitch:convert"), convertPitchToProject);

export default router;
