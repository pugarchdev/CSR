import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getStatePortfolio,
  getSectorAnalytics,
  getImpactIndicators,
  getConvergenceProjects
} from "../controllers/strategyController";

const router = Router();

router.use(authenticateToken);

router.get("/portfolio", getStatePortfolio);
router.get("/state-portfolio", getStatePortfolio);
router.get("/sectors", getSectorAnalytics);
router.get("/sector-allocations", getSectorAnalytics);
router.get("/impact", getImpactIndicators);
router.get("/impact-indicators", getImpactIndicators);
router.get("/convergence", getConvergenceProjects);
router.get("/convergence-framework", getConvergenceProjects);

export default router;
