import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { Role } from "../types/role";
import {
  nominateDno,
  listDnoNominations,
  listPendingDnoNominations,
  verifyDnoNomination,
  replaceDnoNomination,
  updateDnoAuthority
} from "../controllers/dnoController";

const router = Router();

router.use(authenticateToken);

// Org Admin endpoints
router.post("/nominate", asyncHandler(nominateDno));
router.get("/nominations", asyncHandler(listDnoNominations));
router.post("/nominations/:id/replace", asyncHandler(replaceDnoNomination));
router.put("/authority", asyncHandler(updateDnoAuthority));

// Super Admin verification endpoints
router.get("/pending-verifications", authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN]), asyncHandler(listPendingDnoNominations));
router.post("/nominations/:id/verify", authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN]), asyncHandler(verifyDnoNomination));

export default router;
