import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getSecretaryEscalations,
  resolveSecretaryEscalation,
} from "../controllers/secretaryController";

const router = Router();

router.get(
  "/escalations",
  authenticateToken,
  authorizeRoles([Role.PLANNING_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getSecretaryEscalations)
);

router.post(
  "/escalations/:id/resolve",
  authenticateToken,
  authorizeRoles([Role.PLANNING_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(resolveSecretaryEscalation)
);

export default router;
