import { Router } from "express";
import { optionalAuthenticateToken } from "../middlewares/authMiddleware";
import { globalSearchHandler } from "../controllers/globalSearchController";

const router = Router();

// GET /api/search/global?q=searchTerm&limit=10
router.get("/global", optionalAuthenticateToken, globalSearchHandler);

export default router;
