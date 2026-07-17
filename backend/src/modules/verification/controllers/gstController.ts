import { Response, NextFunction } from "express";
import { VerificationEntityType, VerificationModuleType } from "@prisma/client";
import { Role } from "../../../types/role";
import { successResponse } from "../../../utils/apiResponse";
import { CorrelatedRequest } from "../utils/correlationId";
import { isVerificationError } from "../utils/errors";
import * as gstService from "../services/gstVerificationService";
import * as recordService from "../services/verificationRecordService";
import { logVerificationEvent } from "../services/verificationAuditService";
import { GstReverifyBody, GstVerifyBody } from "../dto/gstSchemas";

export type VerificationRequest = CorrelatedRequest;

export const ADMIN_ROLES = [Role.SUPER_ADMIN, Role.GOVERNMENT_OFFICER];

/**
 * Respond with a stable machine errorCode (+ meta like attemptsLeft) for
 * VerificationErrors; delegate anything else to the central error handler.
 */
export const respondVerificationError = (res: Response, next: NextFunction, err: unknown) => {
  if (isVerificationError(err)) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      errorCode: err.errorCode,
      ...(err.meta ? { meta: err.meta } : {})
    });
  }
  return next(err);
};

const buildServiceInput = (req: VerificationRequest, body: GstVerifyBody | GstReverifyBody, isReverify: boolean) => ({
  gstin: body.gstin,
  entityType: body.entityType as VerificationEntityType,
  entityId: body.entityId,
  source: body.source,
  initiatedById: req.user!.id,
  correlationId: req.correlationId as string,
  ipAddress: req.ip,
  userAgent: req.get("user-agent") || undefined,
  isReverify
});

const runVerify = async (req: VerificationRequest, res: Response, next: NextFunction, isReverify: boolean) => {
  const body = req.body as GstReverifyBody;
  const action = isReverify ? "VERIFICATION_GST_REVERIFY" : "VERIFICATION_GST_VERIFY";

  try {
    const result = await gstService.verifyGstin(buildServiceInput(req, body, isReverify));

    logVerificationEvent({
      req,
      action,
      recordId: result.recordId,
      verificationType: "GST",
      entityType: body.entityType,
      entityId: body.entityId,
      success: true,
      transactionId: result.transactionId,
      responseTimeMs: result.responseTimeMs,
      source: body.source,
      extra: isReverify ? { reason: (body as GstReverifyBody).reason } : undefined
    });

    return successResponse(res, result, "GSTIN verified successfully");
  } catch (err) {
    logVerificationEvent({
      req,
      action,
      verificationType: "GST",
      entityType: body.entityType,
      entityId: body.entityId,
      success: false,
      errorCode: isVerificationError(err) ? err.errorCode : "INTERNAL_ERROR",
      source: body.source,
      extra: isReverify ? { reason: (body as GstReverifyBody).reason } : undefined
    });
    return respondVerificationError(res, next, err);
  }
};

export const verifyGst = (req: VerificationRequest, res: Response, next: NextFunction) =>
  runVerify(req, res, next, false);

export const reverifyGst = (req: VerificationRequest, res: Response, next: NextFunction) =>
  runVerify(req, res, next, true);

export const getGstHistory = async (req: VerificationRequest, res: Response, next: NextFunction) => {
  try {
    const entityId = req.params.id;
    const entityType = req.query.entityType as VerificationEntityType;

    // Ownership guard: non-admin roles may only view history of their own org entities.
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    if (!isAdmin) {
      const owned = [req.user?.companyId, req.user?.ngoId, req.user?.organizationId, req.user?.id].filter(Boolean);
      if (!owned.includes(entityId)) {
        return res.status(403).json({ success: false, error: "You can only view verification history of your own organization." });
      }
    }

    const history = await recordService.getHistory(entityType, entityId, VerificationModuleType.GST);
    return successResponse(res, history);
  } catch (err) {
    return respondVerificationError(res, next, err);
  }
};
