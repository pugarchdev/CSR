import { Router } from "express";
import { getDashboardStats, getGisData } from "../controllers/analyticsController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/stats", authenticateToken, getDashboardStats);
router.get("/gis", authenticateToken, getGisData);

export default router;
