import prisma from "../../../config/db";
import { logger } from "../utils/logger";
import { CorrelatedRequest } from "../utils/correlationId";
import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";
/**
 * Immutable audit trail for every verification API call (success and failure).
 * Writes to the shared AuditLog table so entries surface in the existing
 * /api/audit-logs viewer. Fire-and-forget: an audit write failure must never
 * fail the verification request, but it is logged.
 *
 * NEVER include Aadhaar numbers, OTPs, or raw API payloads in `extra`.
 */

export interface VerificationAuditInput {
  req: CorrelatedRequest & AuthenticatedRequest;
  action: string; // e.g. VERIFICATION_GST_VERIFY, VERIFICATION_AADHAAR_OTP_GENERATED
  recordId?: string;
  verificationType: "GST" | "AADHAAR";
  entityType?: string;
  entityId?: string;
  success: boolean;
  errorCode?: string | null;
  transactionId?: string | null;
  responseTimeMs?: number | null;
  source?: string | null;
  extra?: Record<string, unknown>;
}

const deviceFromUserAgent = (userAgent: string | undefined): string => {
  if (!userAgent) return "unknown";
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return "mobile";
  if (/postman|curl|axios|node/i.test(userAgent)) return "api-client";
  return "desktop";
};

export const logVerificationEvent = (input: VerificationAuditInput): void => {
  const { req } = input;
  const userAgent = req.get("user-agent") || undefined;

  prisma.auditLog
    .create({
      data: {
        userId: req.user?.id,
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: input.action,
        entityType: "VerificationRecord",
        entityId: input.recordId,
        details: {
          module: "verification",
          verificationType: input.verificationType,
          api: req.originalUrl,
          correlationId: req.correlationId,
          success: input.success,
          errorCode: input.errorCode ?? null,
          transactionId: input.transactionId ?? null,
          responseTimeMs: input.responseTimeMs ?? null,
          source: input.source ?? null,
          targetEntityType: input.entityType ?? null,
          targetEntityId: input.entityId ?? null,
          device: deviceFromUserAgent(userAgent),
          companyId: req.user?.companyId ?? null,
          organizationId: req.user?.organizationId ?? null,
          roleId: req.user?.roleId ?? null,
          ...input.extra
        },
        ipAddress: req.ip || (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || null,
        userAgent: userAgent || null
      }
    })
    .catch((err) => {
      logger.error("audit_write_failed", {
        correlationId: req.correlationId,
        action: input.action,
        error: err instanceof Error ? err.message : String(err)
      });
    });
};
