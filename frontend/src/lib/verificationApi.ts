import { apiFetch } from "./api";

/**
 * Typed client for the backend API Setu verification module.
 * The frontend never sees API Setu credentials — only verified, redacted data.
 */

export type VerificationEntityType = "COMPANY" | "NGO" | "ORGANIZATION" | "ONBOARDING_APPLICATION" | "USER";

export interface GstVerifiedData {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  gstinStatus: string | null;
  registrationDate: string | null;
  constitutionOfBusiness: string | null;
  taxpayerType: string | null;
  state: string | null;
  district: string | null;
  address: string | null;
  pincode: string | null;
}

export interface GstVerifyResult {
  recordId: string;
  status: "SUCCESS";
  attempt: number;
  transactionId: string | null;
  verifiedAt: string;
  responseTimeMs: number;
  data: GstVerifiedData;
}

export interface AadhaarGenerateOtpResult {
  recordId: string;
  transactionId: string;
  maskedAadhaar: string;
  expiresAt: string;
}

export interface AadhaarVerifiedData {
  name: string | null;
  gender: string | null;
  yearOfBirth: string | null;
  state: string | null;
  district: string | null;
  pincode: string | null;
}

export interface AadhaarVerifyOtpResult {
  recordId: string;
  status: "SUCCESS";
  maskedAadhaar: string;
  transactionId: string | null;
  verifiedAt: string;
  data: AadhaarVerifiedData;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  errorCode?: string;
  meta?: Record<string, unknown>;
}

export interface VerificationApiError extends Error {
  status?: number;
  errorCode?: string;
  attemptsLeft?: number;
}

const post = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
  try {
    const res = await apiFetch<Envelope<T>>(path, { method: "POST", body: JSON.stringify(body) });
    return res.data;
  } catch (err) {
    throw err as VerificationApiError;
  }
};

export const verifyGstin = (input: {
  gstin: string;
  entityType: VerificationEntityType;
  entityId: string;
  source?: string;
}): Promise<GstVerifyResult> => post("/verification/gst/verify", input);

export const reverifyGstin = (input: {
  gstin: string;
  entityType: VerificationEntityType;
  entityId: string;
  source?: string;
  reason: string;
}): Promise<GstVerifyResult> => post("/verification/gst/reverify", input);

export const generateAadhaarOtp = (input: {
  aadhaarNumber: string;
  entityType: VerificationEntityType;
  entityId: string;
  source?: string;
}): Promise<AadhaarGenerateOtpResult> =>
  post("/verification/aadhaar/generate-otp", { ...input, consent: true });

export const verifyAadhaarOtp = (input: {
  recordId: string;
  otp: string;
  aadhaarNumber: string;
}): Promise<AadhaarVerifyOtpResult> => post("/verification/aadhaar/verify-otp", input);

export const getAadhaarStatus = (recordId: string) =>
  apiFetch<Envelope<{ recordId: string; status: string; maskedAadhaar: string | null; expiresAt: string | null; verifiedAt: string | null }>>(
    `/verification/aadhaar/status/${recordId}`
  ).then((res) => res.data);
