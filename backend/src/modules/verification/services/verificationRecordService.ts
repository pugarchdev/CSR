import { Prisma, VerificationEntityType, VerificationModuleType, VerificationRecordStatus } from "@prisma/client";
import prisma from "../../../config/db";
import { VerificationError } from "../utils/errors";

/**
 * Append-only verification record store.
 * Rows are never deleted; completed rows are never mutated again.
 * Exactly one row per (entityType, entityId, verificationType) has isLatest=true.
 */

const IN_FLIGHT_WINDOW_MS = 2 * 60 * 1000;

export interface CreateRecordInput {
  entityType: VerificationEntityType;
  entityId: string;
  verificationType: VerificationModuleType;
  maskedIdentifier: string;
  requestId: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
  initiatedById: string;
}

/**
 * Rejects when another verification for the same entity+type is currently
 * in flight (IN_PROGRESS within the window, or an unexpired OTP_SENT).
 * DB-based so it works on serverless (no shared process memory).
 */
export const assertNoInFlight = async (
  entityType: VerificationEntityType,
  entityId: string,
  verificationType: VerificationModuleType
): Promise<void> => {
  const now = new Date();
  const existing = await prisma.verificationRecord.findFirst({
    where: {
      entityType,
      entityId,
      verificationType,
      OR: [
        { status: VerificationRecordStatus.IN_PROGRESS, createdAt: { gte: new Date(now.getTime() - IN_FLIGHT_WINDOW_MS) } },
        { status: VerificationRecordStatus.OTP_SENT, expiresAt: { gt: now } }
      ]
    },
    select: { id: true }
  });

  if (existing) {
    throw new VerificationError("VERIFICATION_IN_PROGRESS", 409);
  }
};

export const getLatestRecord = async (
  entityType: VerificationEntityType,
  entityId: string,
  verificationType: VerificationModuleType
) => {
  return prisma.verificationRecord.findFirst({
    where: { entityType, entityId, verificationType, isLatest: true }
  });
};

export const createRecord = async (input: CreateRecordInput) => {
  const previous = await prisma.verificationRecord.findFirst({
    where: {
      entityType: input.entityType,
      entityId: input.entityId,
      verificationType: input.verificationType
    },
    orderBy: { attempt: "desc" },
    select: { attempt: true }
  });

  return prisma.verificationRecord.create({
    data: {
      ...input,
      attempt: (previous?.attempt ?? 0) + 1,
      isLatest: false, // becomes latest only on completion (SUCCESS) or explicit flip
      status: VerificationRecordStatus.IN_PROGRESS
    }
  });
};

export interface CompleteRecordInput {
  recordId: string;
  status: VerificationRecordStatus;
  transactionId?: string | null;
  responseData?: Prisma.InputJsonValue;
  encryptedPayload?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  responseTimeMs?: number | null;
  verifiedAt?: Date | null;
  expiresAt?: Date | null;
}

/**
 * Finalize a record. On SUCCESS, atomically flips isLatest off all other
 * rows of the same entity+type and marks this one latest.
 */
export const completeRecord = async (input: CompleteRecordInput) => {
  return prisma.$transaction(async (tx) => {
    const record = await tx.verificationRecord.findUnique({ where: { id: input.recordId } });
    if (!record) {
      throw new VerificationError("RECORD_NOT_FOUND", 404);
    }

    if (input.status === VerificationRecordStatus.SUCCESS) {
      await tx.verificationRecord.updateMany({
        where: {
          entityType: record.entityType,
          entityId: record.entityId,
          verificationType: record.verificationType,
          isLatest: true
        },
        data: { isLatest: false }
      });
    }

    return tx.verificationRecord.update({
      where: { id: input.recordId },
      data: {
        status: input.status,
        transactionId: input.transactionId ?? record.transactionId,
        responseData: input.responseData,
        encryptedPayload: input.encryptedPayload ?? record.encryptedPayload,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        responseTimeMs: input.responseTimeMs,
        verifiedAt: input.verifiedAt,
        expiresAt: input.expiresAt !== undefined ? input.expiresAt : record.expiresAt,
        isLatest: input.status === VerificationRecordStatus.SUCCESS
      }
    });
  });
};

/** Transition an IN_PROGRESS Aadhaar record to OTP_SENT. */
export const markOtpSent = async (recordId: string, transactionId: string, expiresAt: Date, responseTimeMs: number) => {
  return prisma.verificationRecord.update({
    where: { id: recordId },
    data: {
      status: VerificationRecordStatus.OTP_SENT,
      transactionId,
      expiresAt,
      responseTimeMs
    }
  });
};

export const getRecordById = async (recordId: string) => {
  return prisma.verificationRecord.findUnique({ where: { id: recordId } });
};

export const getHistory = async (
  entityType: VerificationEntityType,
  entityId: string,
  verificationType?: VerificationModuleType
) => {
  return prisma.verificationRecord.findMany({
    where: { entityType, entityId, ...(verificationType ? { verificationType } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      verificationType: true,
      status: true,
      attempt: true,
      isLatest: true,
      maskedIdentifier: true,
      requestId: true,
      transactionId: true,
      responseData: true,
      errorCode: true,
      responseTimeMs: true,
      source: true,
      verifiedAt: true,
      createdAt: true,
      initiatedBy: { select: { id: true, email: true, role: true } }
      // encryptedPayload intentionally excluded
    }
  });
};
