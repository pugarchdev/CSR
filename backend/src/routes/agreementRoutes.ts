/**
 * @deprecated LEGACY - NOT MOUNTED in app.ts (ENABLE_LEGACY_NGO_MARKETPLACE guard).
 * This router is not registered; changes here have no runtime effect.
 */
import { Router } from "express";
import {
  generateAgreement,
  updateAgreementStatus,
  getAgreementsByRequirement
} from "../controllers/agreementController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/", authenticateToken, generateAgreement);
router.patch("/:id/status", authenticateToken, updateAgreementStatus);
router.get("/requirement/:requirementId", authenticateToken, getAgreementsByRequirement);

export default router;
