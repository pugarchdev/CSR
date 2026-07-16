import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkFeatureEnabled, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import { listCsrProjects } from "../controllers/csrLifecycleController";

const router = Router();

router.use(authenticateToken, authorizeRoles([Role.NGO_ADMIN, Role.NGO_MEMBER, Role.SUPER_ADMIN]), resolveTenantContext, checkTenantActive);
router.get("/proposal-requests", checkFeatureEnabled("enableCSRMarketplace"), listCsrProjects);
router.get("/assigned-projects", checkFeatureEnabled("enableCSRMarketplace"), listCsrProjects);

export default router;
