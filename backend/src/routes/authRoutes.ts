import { Router } from "express";
import { register, login, verifyOtp, refresh, logout } from "../controllers/authController";
import { validateRequest } from "../middlewares/validationMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { z } from "zod";
import { authRateLimiter, strictRateLimiter } from "../middlewares/rateLimitMiddleware";

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["NGO_ADMIN", "COMPANY_ADMIN", "PORTAL_ADMIN", "BENEFICIARY_AGENCY"]),
    profile: z.object({
      name: z.string().min(2, "Name is required"),
      // NGO Fields (conditional in logic)
      registrationNumber: z.string().optional(),
      darpanNumber: z.string().optional(),
      csr1Number: z.string().optional(),
      certificate12AUrl: z.string().optional(),
      certificate80GUrl: z.string().optional(),
      // Company Fields (conditional in logic)
      cin: z.string().optional(),
      gst: z.string().optional(),
      csrBudget: z.number().optional(),
      focusAreas: z.array(z.string()).optional(),
      contactInfo: z.record(z.any()).optional(),
      // Commmon fields
      pan: z.string().min(10).max(10),
      address: z.string().min(5),
      district: z.string().min(2),
      taluka: z.string().min(2),
      village: z.string().optional(),
      website: z.string().url().optional().or(z.literal(""))
    })
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
    otpCode: z.string().length(6, "OTP must be exactly 6 digits")
  })
});

const authRateLimit = authRateLimiter;
const otpRateLimit = strictRateLimiter;

router.post("/register", authRateLimit, validateRequest(registerSchema), asyncHandler(register));
router.post("/verify-otp", otpRateLimit, validateRequest(verifyOtpSchema), asyncHandler(verifyOtp));
router.post("/login", authRateLimit, validateRequest(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));

export default router;
