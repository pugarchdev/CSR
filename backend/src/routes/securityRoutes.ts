import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getActiveSessions,
  getLoginHistory,
  revokeSessionEndpoint,
  revokeAllSessionsEndpoint
} from "../controllers/securityController";

const router = Router();

router.get("/sessions", authenticateToken, asyncHandler(getActiveSessions));
router.get("/history", authenticateToken, asyncHandler(getLoginHistory));
router.post("/sessions/revoke-all", authenticateToken, asyncHandler(revokeAllSessionsEndpoint));
router.delete("/sessions/:id", authenticateToken, asyncHandler(revokeSessionEndpoint));

export default router;
