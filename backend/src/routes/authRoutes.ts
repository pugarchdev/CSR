import { Router } from "express";
import { register, login, verifyOtp, resendOtp, refreshToken, logout, me, searchParentOrganizations } from "../controllers/authController";
import { getInvitation, acceptInvitation } from "../controllers/invitationController";
import { getCurrentUserPermissions, getModulePermissions, checkUserPermission } from "../controllers/permissionController";
import { validateRequest } from "../middlewares/validationMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { authenticateToken } from "../middlewares/authMiddleware";
import { z } from "zod";
import { authRateLimiter, strictRateLimiter } from "../middlewares/rateLimitMiddleware";

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    accountType: z.enum(["CSR_COMPANY", "GOVERNMENT_DEPARTMENT"]),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    designation: z.string().optional(),
    profile: z.object({
      name: z.string().min(2, "Name is required"),
      cin: z.string().optional(),
      pan: z.string().optional(),
      address: z.string().optional(),
      district: z.string().optional()
    }).passthrough()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required")
  })
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: z.string().length(6, "OTP must be exactly 6 digits").optional(),
    otpCode: z.string().length(6, "OTP must be exactly 6 digits").optional()
  }).refine(data => data.otp || data.otpCode, {
    message: "OTP code is required",
    path: ["otpCode"]
  })
});

const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format")
  })
});

const authRateLimit = authRateLimiter;
const otpRateLimit = strictRateLimiter;

router.get("/parent-organizations", asyncHandler(searchParentOrganizations));
router.post("/register", authRateLimit, validateRequest(registerSchema), asyncHandler(register));
router.post("/verify-otp", otpRateLimit, validateRequest(verifyOtpSchema), asyncHandler(verifyOtp));
router.post("/resend-otp", otpRateLimit, validateRequest(resendOtpSchema), asyncHandler(resendOtp));
router.post("/login", authRateLimit, validateRequest(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refreshToken));
router.post("/logout", asyncHandler(logout));

// Authenticated user profile and permissions route
router.get("/me", authenticateToken, asyncHandler(me));

// Officer activation via secure single-use invitation token
router.get("/invitations/:token", strictRateLimiter, asyncHandler(getInvitation));
router.post("/invitations/:token/activate", strictRateLimiter, asyncHandler(acceptInvitation));

import { httpCache } from "../middlewares/cacheMiddleware";

// Dynamic permission routes
router.get("/permissions", authenticateToken, httpCache({ ttlSeconds: 300, userScoped: true, keyPrefix: "user_permissions" }), asyncHandler(getCurrentUserPermissions));
router.get("/permissions/:module", authenticateToken, asyncHandler(getModulePermissions));
router.post("/check-permission", authenticateToken, asyncHandler(checkUserPermission));

export default router;
