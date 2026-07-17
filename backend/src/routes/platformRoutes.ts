import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import { getMyTenantFeatures, getHeroSlides, updateHeroSlides } from "../controllers/platformController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { Role } from "../types/role";

const router = Router();

router.get("/features", authenticateToken, resolveTenantContext, checkTenantActive, getMyTenantFeatures);

// Hero carousel — public GET, admin PUT
router.get("/hero-slides", asyncHandler(getHeroSlides));
router.put(
  "/hero-slides",
  authenticateToken,
  authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  resolveTenantContext,
  checkTenantActive,
  asyncHandler(updateHeroSlides)
);

export default router;
