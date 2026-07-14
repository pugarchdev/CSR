/**
 * @deprecated LEGACY - NOT MOUNTED in app.ts (ENABLE_LEGACY_NGO_MARKETPLACE guard).
 * This router is not registered; changes here have no runtime effect.
 */
import { Router } from "express";
import { getCSRDashboardStats } from "../controllers/csrDashboardController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/stats", authenticateToken, getCSRDashboardStats);

export default router;
