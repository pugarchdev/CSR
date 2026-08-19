import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { globalSearchHandler } from "../controllers/globalSearchController";

const router = Router();

// GET /api/search/global?q=searchTerm&limit=5
router.get("/global", authenticateToken, globalSearchHandler);

export default router;
