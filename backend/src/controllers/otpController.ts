import { Request, Response } from "express";
import { sendOtp, verifyOtp, OtpChannel, OtpPurpose, OtpSendLimitError } from "../services/otpService";

const purposes = ["CORPORATE_ENQUIRY", "GOVERNMENT_PITCH", "CORPORATE_INTEREST"];
const channels = ["EMAIL", "MOBILE"];

function validateCommon(body: any): { purpose: OtpPurpose; channel: OtpChannel; target: string } {
  if (!purposes.includes(body.purpose)) throw new Error("Invalid OTP purpose");
  if (!channels.includes(body.channel)) throw new Error("Invalid OTP channel");
  if (!body.target) throw new Error("OTP target is required");
  return body;
}

export async function sendOtpController(req: Request, res: Response) {
  try {
    const { purpose, channel, target } = validateCommon(req.body);
    const result = await sendOtp(purpose, channel, target);
    res.json({ success: true, message: "OTP sent", ...result });
  } catch (error: any) {
    res.status(error instanceof OtpSendLimitError ? 429 : 400).json({ success: false, error: error.message || "Failed to send OTP", retryAfterSeconds: error.retryAfterSeconds, sendsRemaining: error.sendsRemaining });
  }
}

export async function verifyOtpController(req: Request, res: Response) {
  try {
    const { purpose, channel, target } = validateCommon(req.body);
    if (!req.body.otp) throw new Error("OTP is required");
    const result = await verifyOtp(purpose, channel, target, req.body.otp);
    res.json({ success: true, message: "OTP verified", ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || "Failed to verify OTP" });
  }
}
