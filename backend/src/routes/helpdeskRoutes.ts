import { Router } from "express";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { strictRateLimiter } from "../middlewares/rateLimitMiddleware";
import {
  submitQuery,
  getQueryByTrackingId,
  listQueries,
  resolveQuery,
} from "../controllers/helpdeskController";

const router = Router();

// Public
router.post("/", strictRateLimiter, optionalAuthenticateToken, asyncHandler(submitQuery));
router.get("/track/:trackingId", asyncHandler(getQueryByTrackingId));

// Staff
router.get("/", authenticateToken, asyncHandler(listQueries));
router.patch("/:id", authenticateToken, asyncHandler(resolveQuery));
router.put("/:id", authenticateToken, asyncHandler(resolveQuery));
router.patch("/:id/resolve", authenticateToken, asyncHandler(resolveQuery));
router.put("/:id/resolve", authenticateToken, asyncHandler(resolveQuery));

export default router;
