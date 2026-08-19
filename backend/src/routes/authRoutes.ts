import { Router } from "express";
import { register, login, verifyOtp, resendOtp, refreshToken, logout, me, searchParentOrganizations, completeFirstLoginReset, forgotPassword, verifyResetOtp, resetPasswordWithOtp } from "../controllers/authController";
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
    email: z.string().optional(),
    identifier: z.string().optional(),
    password: z.string().min(1, "Password is required")
  }).refine(data => data.email || data.identifier, { message: "Login identifier is required" })
});

const otpCodeField = z.union([z.string(), z.number()]).transform(v => String(v).trim()).refine(v => /^\d{6}$/.test(v), {
  message: "OTP must be exactly 6 digits"
});

const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: otpCodeField.optional(),
    otpCode: otpCodeField.optional()
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

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format")
  })
});

const verifyResetOtpSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: otpCodeField
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    verificationToken: z.string().optional(),
    otp: z.union([z.string(), z.number()]).transform(v => String(v).trim()).optional(),
    newPassword: z.string().min(6, "Password must be at least 6 characters")
  }).refine(data => data.verificationToken || data.otp, {
    message: "Either verificationToken or otp is required",
    path: ["verificationToken"]
  })
});

const authRateLimit = authRateLimiter;
const otpRateLimit = strictRateLimiter;

router.get("/parent-organizations", asyncHandler(searchParentOrganizations));
router.post("/register", authRateLimit, validateRequest(registerSchema), asyncHandler(register));
router.post("/verify-otp", otpRateLimit, validateRequest(verifyOtpSchema), asyncHandler(verifyOtp));
router.post("/resend-otp", otpRateLimit, validateRequest(resendOtpSchema), asyncHandler(resendOtp));
router.post("/login", authRateLimit, validateRequest(loginSchema), asyncHandler(login));
router.post("/forgot-password", otpRateLimit, validateRequest(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post("/verify-reset-otp", otpRateLimit, validateRequest(verifyResetOtpSchema), asyncHandler(verifyResetOtp));
router.post("/reset-password", strictRateLimiter, validateRequest(resetPasswordSchema), asyncHandler(resetPasswordWithOtp));
router.post("/first-login-reset", strictRateLimiter, validateRequest(z.object({ body: z.object({
  resetToken: z.string().min(20),
  newPassword: z.string().min(6, "Password must be at least 6 characters")
}) })), asyncHandler(completeFirstLoginReset));
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
