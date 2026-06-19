import { Router } from "express";
import {
  getOrCreateDraftApplication,
  saveDraft,
  submitApplication,
  getApplicationStatus,
  respondToQuery
} from "../controllers/onboardingController";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

/**
 * NGO Onboarding Routes
 * All routes require authentication
 * NGO users can manage their own applications
 */

// Get or create draft application
router.get(
  "/application",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY, Role.NGO_MEMBER]),
  getOrCreateDraftApplication
);

// Save draft (any step)
router.post(
  "/application/draft",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY]),
  saveDraft
);

// Submit application for review
router.post(
  "/application/submit",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY]),
  submitApplication
);

// Get application status and timeline
router.get(
  "/application/status",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY, Role.NGO_MEMBER]),
  getApplicationStatus
);

// Respond to query
router.post(
  "/queries/:queryId/respond",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY]),
  respondToQuery
);

export default router;

// Made with Bob
