import { VerificationEntityType, VerificationModuleType, VerificationRecordStatus } from "@prisma/client";
import prisma from "../../../config/db";
import { getApiSetuConfig } from "../../../config/env";
import { callApiSetu, getUpstreamStatus, getUpstreamErrorBody } from "../clients/apiSetuClient";
import { VerificationError, isVerificationError } from "../utils/errors";
import { encryptPayload, isEncryptionConfigured } from "../utils/crypto";
import {
  AadhaarVerifiedData,
  aadhaarLast4Matches,
  isValidAadhaarChecksum,
  maskAadhaar,
  redactEkycResponse
} from "../utils/masking";
import { logger } from "../utils/logger";
import * as recordService from "./verificationRecordService";
import { mirrorToOnboardingCheck } from "./gstVerificationService";

/**
 * Aadhaar OTP eKYC via API Setu / UIDAI.
 *
 * PRIVACY INVARIANTS (UIDAI compliance):
 * - The 12-digit Aadhaar number is NEVER persisted, logged, or audited.
 *   It exists only in request scope for the upstream call.
 * - The OTP is NEVER persisted or logged.
 * - Only the masked form (XXXX-XXXX-1234) is stored.
 * - The eKYC photograph is discarded; only redacted demographics are stored
 *   in plain JSON. The full response (minus nothing — but encrypted) goes to
 *   encryptedPayload under AES-256-GCM.
 */

const OTP_VALIDITY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 3;

export interface GenerateOtpInput {
  aadhaarNumber: string;
  entityType: VerificationEntityType;
  entityId: string;
  source?: string;
  initiatedById: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GenerateOtpResult {
  recordId: string;
  transactionId: string;
  maskedAadhaar: string;
  expiresAt: Date;
}

export const generateOtp = async (input: GenerateOtpInput): Promise<GenerateOtpResult> => {
  const aadhaarNumber = input.aadhaarNumber.trim();

  if (!isValidAadhaarChecksum(aadhaarNumber)) {
    throw new VerificationError("INVALID_AADHAAR", 400);
  }

  if (!isEncryptionConfigured()) {
    throw new VerificationError("ENCRYPTION_NOT_CONFIGURED", 503);
  }

  await recordService.assertNoInFlight(input.entityType, input.entityId, VerificationModuleType.AADHAAR);

  const record = await recordService.createRecord({
    entityType: input.entityType,
    entityId: input.entityId,
    verificationType: VerificationModuleType.AADHAAR,
    maskedIdentifier: maskAadhaar(aadhaarNumber),
    requestId: input.correlationId,
    source: input.source,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    initiatedById: input.initiatedById
  });

  const config = getApiSetuConfig();

  try {
    const response = await callApiSetu({
      method: "POST",
      path: config.aadhaarGenerateOtpEndpoint,
      data: {
        uid: aadhaarNumber,
        txnId: input.correlationId,
        consentArtifact: {
          consent: "Y",
          purpose: "CSR Portal KYC via Aadhaar OTP eKYC",
          timestamp: new Date().toISOString()
        }
      },
      correlationId: input.correlationId
    });

    const transactionId: string = response.data?.txnId ?? response.data?.transactionId ?? input.correlationId;
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS);

    await recordService.markOtpSent(record.id, transactionId, expiresAt, response.responseTimeMs);

    return {
      recordId: record.id,
      transactionId,
      maskedAadhaar: maskAadhaar(aadhaarNumber),
      expiresAt
    };
  } catch (err) {
    const mapped = mapAadhaarError(err);
    await recordService.completeRecord({
      recordId: record.id,
      status: VerificationRecordStatus.FAILED,
      errorCode: mapped.errorCode,
      errorMessage: mapped.message
    }).catch(() => {});
    throw mapped;
  }
};

export interface VerifyOtpInput {
  recordId: string;
  otp: string;
  aadhaarNumber: string;
  shareCode?: string;
  userId: string;
  isAdmin: boolean;
  correlationId: string;
}

export interface VerifyOtpResult {
  recordId: string;
  status: "SUCCESS";
  maskedAadhaar: string;
  transactionId: string | null;
  verifiedAt: Date;
  responseTimeMs: number;
  data: AadhaarVerifiedData;
}

export const verifyOtp = async (input: VerifyOtpInput): Promise<VerifyOtpResult> => {
  const record = await recordService.getRecordById(input.recordId);
  if (!record || record.verificationType !== VerificationModuleType.AADHAAR) {
    throw new VerificationError("RECORD_NOT_FOUND", 404);
  }
  if (record.initiatedById !== input.userId && !input.isAdmin) {
    throw new VerificationError("RECORD_NOT_OWNED", 403);
  }
  if (record.status !== VerificationRecordStatus.OTP_SENT) {
    throw new VerificationError(
      record.status === VerificationRecordStatus.SUCCESS ? "ALREADY_VERIFIED" : "OTP_EXPIRED",
      record.status === VerificationRecordStatus.SUCCESS ? 409 : 400
    );
  }
  if (record.expiresAt && record.expiresAt < new Date()) {
    await recordService.completeRecord({
      recordId: record.id,
      status: VerificationRecordStatus.EXPIRED,
      errorCode: "OTP_EXPIRED",
      errorMessage: "OTP validity window elapsed"
    }).catch(() => {});
    throw new VerificationError("OTP_EXPIRED", 400);
  }
  // The user must re-supply the same Aadhaar number; we only hold the mask.
  if (!aadhaarLast4Matches(input.aadhaarNumber, record.maskedIdentifier)) {
    throw new VerificationError("INVALID_AADHAAR", 400);
  }

  const attemptsUsed = ((record.responseData as any)?.otpAttemptsUsed as number | undefined) ?? 0;

  const config = getApiSetuConfig();
  const startTime = Date.now();

  try {
    const response = await callApiSetu({
      method: "POST",
      path: config.aadhaarVerifyOtpEndpoint,
      data: {
        uid: input.aadhaarNumber,
        otp: input.otp,
        txnId: record.transactionId,
        ...(input.shareCode ? { shareCode: input.shareCode } : {}),
        consentArtifact: {
          consent: "Y",
          purpose: "CSR Portal KYC via Aadhaar OTP eKYC",
          timestamp: new Date().toISOString()
        }
      },
      correlationId: input.correlationId
    });

    const data = redactEkycResponse(response.data);

    const completed = await recordService.completeRecord({
      recordId: record.id,
      status: VerificationRecordStatus.SUCCESS,
      responseData: data as any,
      encryptedPayload: encryptPayload(JSON.stringify(response.data)),
      responseTimeMs: response.responseTimeMs,
      verifiedAt: new Date(),
      expiresAt: null
    });

    await mirrorToOnboardingCheck(
      record.entityType,
      record.entityId,
      "AADHAAR_EKYC_APISETU",
      "VERIFIED",
      { maskedAadhaar: record.maskedIdentifier, name: data.name, recordId: record.id },
      input.userId
    );

    return {
      recordId: completed.id,
      status: "SUCCESS",
      maskedAadhaar: record.maskedIdentifier as string,
      transactionId: completed.transactionId,
      verifiedAt: completed.verifiedAt as Date,
      responseTimeMs: response.responseTimeMs,
      data
    };
  } catch (err) {
    const upstreamStatus = getUpstreamStatus(err);
    const upstreamBody = getUpstreamErrorBody(err);
    const looksLikeWrongOtp =
      upstreamStatus === 400 || upstreamStatus === 401 || /otp/i.test(String(upstreamBody?.error ?? upstreamBody?.errorCode ?? ""));

    if (!isVerificationError(err) && looksLikeWrongOtp) {
      const nextAttempts = attemptsUsed + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        await recordService.completeRecord({
          recordId: record.id,
          status: VerificationRecordStatus.FAILED,
          errorCode: "OTP_ATTEMPTS_EXCEEDED",
          errorMessage: "Maximum OTP attempts exceeded",
          responseTimeMs: Date.now() - startTime
        }).catch(() => {});
        throw new VerificationError("OTP_ATTEMPTS_EXCEEDED", 400, { attemptsLeft: 0 });
      }
      // Persist the attempt counter without finalizing the record.
      await prisma.verificationRecord
        .update({ where: { id: record.id }, data: { responseData: { otpAttemptsUsed: nextAttempts } } })
        .catch(() => {});
      throw new VerificationError("INVALID_OTP", 400, { attemptsLeft: MAX_OTP_ATTEMPTS - nextAttempts });
    }

    const mapped = isVerificationError(err) ? err : mapAadhaarError(err);
    if (!isVerificationError(err) || (err as VerificationError).errorCode !== "OTP_EXPIRED") {
      await recordService.completeRecord({
        recordId: record.id,
        status: VerificationRecordStatus.FAILED,
        errorCode: mapped.errorCode,
        errorMessage: mapped.message,
        responseTimeMs: Date.now() - startTime
      }).catch(() => {});
    }
    throw mapped;
  }
};

export const getStatus = async (recordId: string, userId: string, canViewAll: boolean) => {
  const record = await recordService.getRecordById(recordId);
  if (!record || record.verificationType !== VerificationModuleType.AADHAAR) {
    throw new VerificationError("RECORD_NOT_FOUND", 404);
  }
  if (record.initiatedById !== userId && !canViewAll) {
    throw new VerificationError("RECORD_NOT_OWNED", 403);
  }
  return {
    recordId: record.id,
    status: record.status,
    maskedAadhaar: record.maskedIdentifier,
    transactionId: record.transactionId,
    expiresAt: record.expiresAt,
    verifiedAt: record.verifiedAt,
    attempt: record.attempt
  };
};

const mapAadhaarError = (err: unknown): VerificationError => {
  if (isVerificationError(err)) return err;
  const status = getUpstreamStatus(err);
  if (status === 400 || status === 404) {
    return new VerificationError("INVALID_AADHAAR", 422);
  }
  logger.error("aadhaar_unmapped_error", { error: err instanceof Error ? err.message : String(err) });
  return new VerificationError("VERIFICATION_FAILED", 502);
};
