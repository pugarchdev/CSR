import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { getDashboardSummary, getDashboardWidgets } from "../controllers/dashboardController";
import { httpCache } from "../middlewares/cacheMiddleware";

const router = Router();
router.use(authenticateToken);

router.get("/", httpCache({ ttlSeconds: 5, userScoped: true, keyPrefix: "dashboard" }), getDashboardSummary);
router.get("/summary", httpCache({ ttlSeconds: 5, userScoped: true, keyPrefix: "dashboard_summary" }), getDashboardSummary);
router.get("/widgets", httpCache({ ttlSeconds: 5, userScoped: true, keyPrefix: "dashboard_widgets" }), getDashboardWidgets);

export default router;
