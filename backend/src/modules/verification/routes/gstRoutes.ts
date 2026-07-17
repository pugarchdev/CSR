import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { validateRequest } from "../../../middlewares/validationMiddleware";
import { checkPermission } from "../../../middlewares/tenantMiddleware";
import { createCustomRateLimiter } from "../../../middlewares/rateLimitMiddleware";
import { gstHistorySchema, gstReverifySchema, gstVerifySchema } from "../dto/gstSchemas";
import { getGstHistory, reverifyGst, verifyGst } from "../controllers/gstController";

const router = Router();

const gstVerifyLimiter = createCustomRateLimiter(60 * 1000, 5, "Too many GST verification requests. Please wait a minute and try again.");

router.post(
  "/verify",
  checkPermission("verification:execute"),
  gstVerifyLimiter,
  validateRequest(gstVerifySchema),
  asyncHandler(verifyGst)
);

router.post(
  "/reverify",
  checkPermission("verification:reverify"),
  gstVerifyLimiter,
  validateRequest(gstReverifySchema),
  asyncHandler(reverifyGst)
);

router.get(
  "/history/:id",
  checkPermission("verification:view-history"),
  validateRequest(gstHistorySchema),
  asyncHandler(getGstHistory)
);

export default router;
