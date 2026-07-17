import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler";
import { validateRequest } from "../../../middlewares/validationMiddleware";
import { checkPermission } from "../../../middlewares/tenantMiddleware";
import { createCustomRateLimiter } from "../../../middlewares/rateLimitMiddleware";
import { aadhaarGenerateOtpSchema, aadhaarStatusSchema, aadhaarVerifyOtpSchema } from "../dto/aadhaarSchemas";
import { generateAadhaarOtp, getAadhaarStatus, verifyAadhaarOtp } from "../controllers/aadhaarController";

const router = Router();

const generateOtpLimiter = createCustomRateLimiter(60 * 1000, 3, "Too many OTP requests. Please wait a minute and try again.");
const verifyOtpLimiter = createCustomRateLimiter(60 * 1000, 5, "Too many OTP verification attempts. Please wait a minute and try again.");

router.post(
  "/generate-otp",
  checkPermission("verification:execute"),
  generateOtpLimiter,
  validateRequest(aadhaarGenerateOtpSchema),
  asyncHandler(generateAadhaarOtp)
);

router.post(
  "/verify-otp",
  checkPermission("verification:execute"),
  verifyOtpLimiter,
  validateRequest(aadhaarVerifyOtpSchema),
  asyncHandler(verifyAadhaarOtp)
);

router.get(
  "/status/:id",
  validateRequest(aadhaarStatusSchema),
  asyncHandler(getAadhaarStatus)
);

export default router;
