import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles, optionalAuthenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  submitPitch,
  getPublicPitches,
  getPitchById,
  submitInterest,
  getMyPitches,
  verifyPitch,
  approvePitch
} from "../controllers/governmentPitchController";

const router = Router();

// Government Officer - Submit pitch
router.post(
  "/",
  optionalAuthenticateToken,
  asyncHandler(submitPitch)
);

// Public routes - no authentication required
router.get("/public", asyncHandler(getPublicPitches));
router.get("/public/:id", asyncHandler(getPitchById));

// Corporate - Submit interest on a public pitch
router.post(
  "/public/:id/interests",
  optionalAuthenticateToken,
  asyncHandler(submitInterest)
);

// Government Officer - Get my pitches
router.get(
  "/my",
  authenticateToken,
  authorizeRoles([Role.GOVERNMENT_OFFICER, Role.BENEFICIARY_AGENCY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getMyPitches)
);

// Authenticated pitch detail for RM / JS / admins before public listing
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.JOINT_SECRETARY, Role.STATE_CSR_CELL, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getPitchById)
);

// Relationship Manager (RM) - Verify pitch
router.post(
  "/:id/verify",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(verifyPitch)
);

// Joint Secretary (JS) - Approve pitch
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(approvePitch)
);

export default router;
