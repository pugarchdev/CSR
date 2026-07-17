/**
 * Typed error for the verification module. Carries a stable machine
 * errorCode for the frontend plus an HTTP status; the raw upstream
 * error is only ever logged, never returned to the client.
 */
export type VerificationErrorCode =
  | "INVALID_GSTIN"
  | "GSTIN_NOT_FOUND"
  | "INVALID_AADHAAR"
  | "INVALID_OTP"
  | "OTP_EXPIRED"
  | "OTP_ATTEMPTS_EXCEEDED"
  | "ALREADY_VERIFIED"
  | "VERIFICATION_IN_PROGRESS"
  | "RECORD_NOT_FOUND"
  | "RECORD_NOT_OWNED"
  | "APISETU_TIMEOUT"
  | "APISETU_UNAVAILABLE"
  | "APISETU_UNAUTHORIZED"
  | "APISETU_RATE_LIMITED"
  | "ENCRYPTION_NOT_CONFIGURED"
  | "VERIFICATION_FAILED";

const USER_MESSAGES: Record<VerificationErrorCode, string> = {
  INVALID_GSTIN: "The GSTIN entered is invalid. Please check and try again.",
  GSTIN_NOT_FOUND: "No GST registration was found for this GSTIN.",
  INVALID_AADHAAR: "The Aadhaar number entered is invalid. Please check and try again.",
  INVALID_OTP: "The OTP entered is incorrect. Please try again.",
  OTP_EXPIRED: "The OTP has expired. Please generate a new OTP.",
  OTP_ATTEMPTS_EXCEEDED: "Maximum OTP attempts exceeded. Please restart verification.",
  ALREADY_VERIFIED: "This record is already verified. Use re-verify if an update is required.",
  VERIFICATION_IN_PROGRESS: "A verification is already in progress for this record. Please wait and try again.",
  RECORD_NOT_FOUND: "Verification record not found.",
  RECORD_NOT_OWNED: "You are not authorized to act on this verification record.",
  APISETU_TIMEOUT: "The government verification service timed out. Please try again shortly.",
  APISETU_UNAVAILABLE: "The government verification service is temporarily unavailable. Please try again later.",
  APISETU_UNAUTHORIZED: "Verification service credentials are invalid. Please contact the administrator.",
  APISETU_RATE_LIMITED: "Verification service rate limit reached. Please try again in a few minutes.",
  ENCRYPTION_NOT_CONFIGURED: "Verification storage is not configured. Please contact the administrator.",
  VERIFICATION_FAILED: "Verification failed. Please try again."
};

export class VerificationError extends Error {
  public readonly errorCode: VerificationErrorCode;
  public readonly statusCode: number;
  public readonly meta?: Record<string, unknown>;

  constructor(errorCode: VerificationErrorCode, statusCode = 422, meta?: Record<string, unknown>) {
    super(USER_MESSAGES[errorCode]);
    this.name = "VerificationError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.meta = meta;
  }
}

export const isVerificationError = (err: unknown): err is VerificationError => err instanceof VerificationError;
