/**
 * @deprecated LEGACY - NOT MOUNTED in app.ts (ENABLE_LEGACY_NGO_MARKETPLACE guard).
 * This router is not registered; changes here have no runtime effect.
 */
import { Router } from "express";
import { getNgos, getNgoById, updateNgo, verifyNgo, verifyNgoEmpanelment } from "../controllers/ngoController";
import { authenticateToken, authorizeRoles, optionalAuthenticateToken } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";
import { checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";

const router = Router();

router.get("/", optionalAuthenticateToken, getNgos);
router.get("/:id", optionalAuthenticateToken, getNgoById);
router.patch("/:id", authenticateToken, updateNgo);
router.patch("/:id/verify", authenticateToken, authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]), resolveTenantContext, checkTenantActive, verifyNgo);
router.patch("/:id/empanelment", authenticateToken, authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.DISTRICT_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]), resolveTenantContext, checkTenantActive, verifyNgoEmpanelment);

export default router;
