import { Router } from "express";
import { getMarketplaceRequirements } from "../controllers/csrRequirementController";
import { getGovernmentReport } from "../controllers/reportController";
import { checkPublicFeatureEnabled } from "../middlewares/tenantMiddleware";
import {
  getCompletedProjectsGallery,
  getCompletedProjectDetail,
  getSuccessStories,
  getPublicDirectory,
  getPublicPortalStats,
} from "../controllers/publicPortalController";

const router = Router();

// ── Static Part (client-mandated public sections, always available) ──
router.get("/completed-projects", getCompletedProjectsGallery);
router.get("/completed-projects/:id", getCompletedProjectDetail);
router.get("/success-stories", getSuccessStories);
router.get("/directory", getPublicDirectory);
router.get("/portal-stats", getPublicPortalStats);

router.get("/requirements", checkPublicFeatureEnabled("enablePublicTransparency"), checkPublicFeatureEnabled("enableCSRMarketplace"), getMarketplaceRequirements);
router.get("/projects", checkPublicFeatureEnabled("enablePublicTransparency"), checkPublicFeatureEnabled("enableCSRMarketplace"), getMarketplaceRequirements);
router.get("/reports/transparency-dashboard", checkPublicFeatureEnabled("enablePublicTransparency"), getGovernmentReport);
router.get("/reports/district-ranking", checkPublicFeatureEnabled("enablePublicTransparency"), getGovernmentReport);
router.get("/reports/top-contributors", checkPublicFeatureEnabled("enablePublicTransparency"), getGovernmentReport);
router.get("/reports/success-stories", checkPublicFeatureEnabled("enablePublicTransparency"), getGovernmentReport);

export default router;
