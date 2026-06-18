import { Router } from "express";
import { getMatches, recalculateMatches } from "../controllers/matchingController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateToken, getMatches);
router.post("/recalculate/:companyId", authenticateToken, recalculateMatches);

export default router;
