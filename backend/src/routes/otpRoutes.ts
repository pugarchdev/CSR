import { Router } from "express";
import { createCustomRateLimiter } from "../middlewares/rateLimitMiddleware";
import { sendOtpController, verifyOtpController } from "../controllers/otpController";

const router = Router();

const otpSendLimit = createCustomRateLimiter(60 * 60 * 1000, 20, "Too many OTP requests. Please try again later.");

router.post("/send", otpSendLimit, sendOtpController);
router.post("/verify", verifyOtpController);

export default router;
