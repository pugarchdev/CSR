import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db";

export type OtpPurpose = "CORPORATE_ENQUIRY" | "GOVERNMENT_PITCH" | "CORPORATE_INTEREST";
export type OtpChannel = "EMAIL" | "MOBILE";

const OTP_TTL_MINUTES = 10;

function normalizeTarget(channel: OtpChannel, target: string): string {
  return channel === "EMAIL" ? target.trim().toLowerCase() : target.replace(/\D/g, "");
}

function isValidTarget(channel: OtpChannel, target: string): boolean {
  if (channel === "EMAIL") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  return /^[6-9]\d{9}$/.test(target);
}

export async function sendOtp(purpose: OtpPurpose, channel: OtpChannel, target: string) {
  const normalizedTarget = normalizeTarget(channel, target);
  if (!isValidTarget(channel, normalizedTarget)) {
    throw new Error(channel === "EMAIL" ? "Valid email is required" : "Valid 10-digit mobile number is required");
  }

  const recentCount = await prisma.otpVerification.count({
    where: {
      purpose,
      channel,
      target: normalizedTarget,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (recentCount >= 500) {
    throw new Error("OTP send limit reached. Please try again later.");
  }

  const otp = "123456";

  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      purpose,
      channel,
      target: normalizedTarget,
      otpHash,
      expiresAt,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(`[DEV OTP] ${purpose} ${channel} ${normalizedTarget}: ${otp}`);
  }

  return { expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifyOtp(purpose: OtpPurpose, channel: OtpChannel, target: string, otp: string) {
  const normalizedTarget = normalizeTarget(channel, target);
  const record = await prisma.otpVerification.findFirst({
    where: {
      purpose,
      channel,
      target: normalizedTarget,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("OTP expired or not found. Please request a new OTP.");
  }

  if (record.attempts >= 5) {
    throw new Error("Too many invalid OTP attempts. Please request a new OTP.");
  }

  const isMatch = await bcrypt.compare(otp, record.otpHash);
  if (!isMatch) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error("Invalid OTP.");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verifiedAt: new Date(), verificationToken },
  });

  return { verificationToken, expiresInMinutes: OTP_TTL_MINUTES };
}

export async function assertOtpVerified(
  purpose: OtpPurpose,
  channel: OtpChannel,
  target: string,
  verificationToken?: string
) {
  if (!verificationToken) {
    throw new Error(`${channel} OTP verification is required`);
  }

  const normalizedTarget = normalizeTarget(channel, target);
  const record = await prisma.otpVerification.findFirst({
    where: {
      purpose,
      channel,
      target: normalizedTarget,
      verificationToken,
      verifiedAt: { not: null },
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    throw new Error(`${channel} OTP verification is invalid or expired`);
  }
}
