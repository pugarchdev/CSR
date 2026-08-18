import { Router } from "express";
import { httpCache } from "../middlewares/cacheMiddleware";
import {
  getCompletedProjectsGallery,
  getCompletedProjectDetail,
  getSuccessStories,
  getPublicDirectory,
  getPublicPortalStats,
  getPublicRequirements,
} from "../controllers/publicPortalController";
import { getRequirementById } from "../controllers/csrRequirementController";

const router = Router();

router.get("/completed-projects", httpCache({ ttlSeconds: 300, keyPrefix: "public_projects" }), getCompletedProjectsGallery);
router.get("/completed-projects/:id", httpCache({ ttlSeconds: 300, keyPrefix: "public_project_detail" }), getCompletedProjectDetail);
router.get("/success-stories", httpCache({ ttlSeconds: 300, keyPrefix: "success_stories" }), getSuccessStories);
router.get("/directory", httpCache({ ttlSeconds: 300, keyPrefix: "public_directory" }), getPublicDirectory);
router.get("/portal-stats", httpCache({ ttlSeconds: 300, keyPrefix: "portal_stats" }), getPublicPortalStats);
router.get("/requirements", httpCache({ ttlSeconds: 300, keyPrefix: "public_reqs" }), getPublicRequirements);
router.get("/requirements/:id", httpCache({ ttlSeconds: 60, keyPrefix: "public_req_detail" }), getRequirementById);

export default router;
