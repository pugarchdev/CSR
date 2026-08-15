import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getSecurityEvents,
  getMasterData,
  getSystemHealth,
  getFeatureFlags
} from "../controllers/platformAdminController";

const router = Router();

router.use(authenticateToken);

router.get("/security", getSecurityEvents);
router.get("/security-events", getSecurityEvents);
router.get("/master-data", getMasterData);
router.get("/system-health", getSystemHealth);
router.get("/feature-flags", getFeatureFlags);

export default router;
