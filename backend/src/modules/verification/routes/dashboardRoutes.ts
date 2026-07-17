import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { checkPermission } from "../../../middlewares/tenantMiddleware";
import { getDashboardLogs, getDashboardStats } from "../controllers/dashboardController";

const router = Router();

router.get("/stats", checkPermission("verification:dashboard"), asyncHandler(getDashboardStats));
router.get("/logs", checkPermission("verification:dashboard"), asyncHandler(getDashboardLogs));

export default router;
