import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { generateNumericOtp } from "../utils/security";
import { sendOtpEmail } from "../utils/mailer";

export type OtpPurpose = "CORPORATE_ENQUIRY" | "GOVERNMENT_PITCH" | "CORPORATE_INTEREST" | "GOVERNMENT_ONBOARDING";
export type OtpChannel = "EMAIL" | "MOBILE";

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_SENDS_PER_HOUR = 5;

export class OtpSendLimitError extends Error {
  statusCode = 429;
  constructor(message: string, public retryAfterSeconds: number, public sendsRemaining: number) {
    super(message);
    this.name = "OtpSendLimitError";
  }
}

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
      identifier: `${purpose}:${channel}:${normalizedTarget}`,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  if (recentCount >= OTP_MAX_SENDS_PER_HOUR) {
    throw new OtpSendLimitError("OTP hourly limit reached. Please try again after one hour.", 3600, 0);
  }

  const latest = await prisma.otpVerification.findFirst({
    where: { identifier: `${purpose}:${channel}:${normalizedTarget}` },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (latest) {
    const elapsedSeconds = Math.floor((Date.now() - latest.createdAt.getTime()) / 1000);
    if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new OtpSendLimitError(
        `Please wait ${OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds} seconds before requesting another OTP.`,
        OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
        OTP_MAX_SENDS_PER_HOUR - recentCount,
      );
    }
  }

  const otp = generateNumericOtp(6);
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      identifier: `${purpose}:${channel}:${normalizedTarget}`,
      otpHash,
      expiresAt,
    },
  });

  if (channel === "EMAIL") {
    await sendOtpEmail(normalizedTarget, otp);
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[DEV OTP] ${purpose} ${channel} ${normalizedTarget}: ${otp}`);
  }

  return {
    expiresInMinutes: OTP_TTL_MINUTES,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    sendsRemaining: Math.max(0, OTP_MAX_SENDS_PER_HOUR - recentCount - 1),
    maxSendsPerHour: OTP_MAX_SENDS_PER_HOUR,
  };
}

export async function verifyOtp(
  purpose: OtpPurpose,
  channel: OtpChannel,
  target: string,
  otp: string,
  options: { allowVerifiedReplay?: boolean } = {},
) {
  const normalizedTarget = normalizeTarget(channel, target);
  const identifier = `${purpose}:${channel}:${normalizedTarget}`;

  const record = await prisma.otpVerification.findFirst({
    where: {
      identifier,
      ...(options.allowVerifiedReplay ? {} : { verified: false }),
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

  // A registration transaction can fail after OTP verification (for example, a
  // temporary database timeout). Allow that same code to retry only when the
  // caller explicitly opts in and the latest verified record is still valid.
  if (record.verified && options.allowVerifiedReplay) {
    return { verificationToken: crypto.randomBytes(32).toString("hex"), expiresInMinutes: OTP_TTL_MINUTES, replayed: true };
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verified: true, verificationTokenHash, verifiedAt: new Date() },
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
  const identifier = `${purpose}:${channel}:${normalizedTarget}`;
  const verificationTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

  const record = await prisma.otpVerification.findFirst({
    where: {
      identifier,
      verified: true,
      verificationTokenHash,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("OTP verification record expired or missing.");
  }
}
