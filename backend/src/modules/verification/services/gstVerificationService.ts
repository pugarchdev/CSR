import { VerificationEntityType, VerificationModuleType, VerificationRecordStatus } from "@prisma/client";
import prisma from "../../../config/db";
import { getApiSetuConfig } from "../../../config/env";
import { callApiSetu, getUpstreamStatus } from "../clients/apiSetuClient";
import { VerificationError, isVerificationError } from "../utils/errors";
import { encryptPayload, isEncryptionConfigured } from "../utils/crypto";
import { GSTIN_REGEX, GstVerifiedData, redactGstResponse } from "../utils/masking";
import { logger } from "../utils/logger";
import * as recordService from "./verificationRecordService";

export interface GstVerifyInput {
  gstin: string;
  entityType: VerificationEntityType;
  entityId: string;
  source?: string;
  initiatedById: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
  isReverify?: boolean;
}

export interface GstVerifyResult {
  recordId: string;
  status: "SUCCESS";
  attempt: number;
  transactionId: string | null;
  verifiedAt: Date;
  responseTimeMs: number;
  data: GstVerifiedData;
}

/**
 * Mirror the result into the onboarding VerificationCheck table so the
 * existing nodal review UI sees API Setu results alongside manual checks.
 */
const mirrorToOnboardingCheck = async (
  entityType: VerificationEntityType,
  entityId: string,
  checkType: string,
  checkStatus: string,
  checkResult: Record<string, unknown>,
  verifiedById: string
) => {
  if (entityType !== VerificationEntityType.ONBOARDING_APPLICATION) return;
  try {
    const existing = await prisma.verificationCheck.findFirst({
      where: { applicationId: entityId, checkType }
    });
    if (existing) {
      await prisma.verificationCheck.update({
        where: { id: existing.id },
        data: { checkStatus, checkResult: checkResult as any, verifiedById, verifiedAt: new Date() }
      });
    } else {
      await prisma.verificationCheck.create({
        data: {
          applicationId: entityId,
          checkType,
          checkStatus,
          checkResult: checkResult as any,
          verifiedById,
          verifiedAt: new Date()
        }
      });
    }
  } catch (err) {
    // Mirroring is best-effort; the VerificationRecord row remains authoritative.
    logger.warn("onboarding_check_mirror_failed", {
      entityId,
      checkType,
      error: err instanceof Error ? err.message : String(err)
    });
  }
};

export { mirrorToOnboardingCheck };

export const verifyGstin = async (input: GstVerifyInput): Promise<GstVerifyResult> => {
  const gstin = input.gstin.trim().toUpperCase();

  if (!GSTIN_REGEX.test(gstin)) {
    // Reject before any API call — never spend an API Setu request on a bad format.
    throw new VerificationError("INVALID_GSTIN", 400);
  }

  if (!isEncryptionConfigured()) {
    throw new VerificationError("ENCRYPTION_NOT_CONFIGURED", 503);
  }

  await recordService.assertNoInFlight(input.entityType, input.entityId, VerificationModuleType.GST);

  if (!input.isReverify) {
    const latest = await recordService.getLatestRecord(input.entityType, input.entityId, VerificationModuleType.GST);
    if (latest && latest.status === VerificationRecordStatus.SUCCESS && latest.maskedIdentifier === gstin) {
      throw new VerificationError("ALREADY_VERIFIED", 409);
    }
  }

  const record = await recordService.createRecord({
    entityType: input.entityType,
    entityId: input.entityId,
    verificationType: VerificationModuleType.GST,
    maskedIdentifier: gstin, // GSTIN is a public identifier; stored in full
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
      path: config.gstVerifyEndpoint,
      data: {
        gstin,
        txnId: input.correlationId,
        consentArtifact: {
          consent: "Y",
          purpose: "CSR Portal organization GST verification",
          timestamp: new Date().toISOString()
        }
      },
      correlationId: input.correlationId
    });

    const data = redactGstResponse(response.data, gstin);
    const transactionId = response.data?.txnId ?? response.data?.transactionId ?? input.correlationId;

    const completed = await recordService.completeRecord({
      recordId: record.id,
      status: VerificationRecordStatus.SUCCESS,
      transactionId,
      responseData: data as any,
      encryptedPayload: encryptPayload(JSON.stringify(response.data)),
      responseTimeMs: response.responseTimeMs,
      verifiedAt: new Date()
    });

    await mirrorToOnboardingCheck(
      input.entityType,
      input.entityId,
      "GSTIN_APISETU",
      "VERIFIED",
      { gstin, legalName: data.legalName, gstinStatus: data.gstinStatus, recordId: record.id },
      input.initiatedById
    );

    return {
      recordId: completed.id,
      status: "SUCCESS",
      attempt: completed.attempt,
      transactionId: completed.transactionId,
      verifiedAt: completed.verifiedAt as Date,
      responseTimeMs: response.responseTimeMs,
      data
    };
  } catch (err) {
    const mapped = mapGstError(err);

    await recordService.completeRecord({
      recordId: record.id,
      status: VerificationRecordStatus.FAILED,
      errorCode: mapped.errorCode,
      errorMessage: mapped.message,
      responseTimeMs: null
    }).catch(() => {});

    throw mapped;
  }
};

const mapGstError = (err: unknown): VerificationError => {
  if (isVerificationError(err)) return err;
  const status = getUpstreamStatus(err);
  if (status === 404 || status === 400) {
    return new VerificationError("GSTIN_NOT_FOUND", 422);
  }
  logger.error("gst_unmapped_error", { error: err instanceof Error ? err.message : String(err) });
  return new VerificationError("VERIFICATION_FAILED", 502);
};
