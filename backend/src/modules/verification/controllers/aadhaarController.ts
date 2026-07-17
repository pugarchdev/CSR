import { Response, NextFunction } from "express";
import { VerificationEntityType } from "@prisma/client";
import { successResponse } from "../../../utils/apiResponse";
import { isVerificationError } from "../utils/errors";
import * as aadhaarService from "../services/aadhaarVerificationService";
import { logVerificationEvent } from "../services/verificationAuditService";
import { AadhaarGenerateOtpBody, AadhaarVerifyOtpBody } from "../dto/aadhaarSchemas";
import { ADMIN_ROLES, VerificationRequest, respondVerificationError } from "./gstController";

export const generateAadhaarOtp = async (req: VerificationRequest, res: Response, next: NextFunction) => {
  const body = req.body as AadhaarGenerateOtpBody;

  try {
    const result = await aadhaarService.generateOtp({
      aadhaarNumber: body.aadhaarNumber,
      entityType: body.entityType as VerificationEntityType,
      entityId: body.entityId,
      source: body.source,
      initiatedById: req.user!.id,
      correlationId: req.correlationId as string,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || undefined
    });

    logVerificationEvent({
      req,
      action: "VERIFICATION_AADHAAR_OTP_GENERATED",
      recordId: result.recordId,
      verificationType: "AADHAAR",
      entityType: body.entityType,
      entityId: body.entityId,
      success: true,
      transactionId: result.transactionId,
      source: body.source
    });

    return successResponse(res, result, "OTP sent to the Aadhaar-registered mobile number");
  } catch (err) {
    logVerificationEvent({
      req,
      action: "VERIFICATION_AADHAAR_OTP_GENERATED",
      verificationType: "AADHAAR",
      entityType: body.entityType,
      entityId: body.entityId,
      success: false,
      errorCode: isVerificationError(err) ? err.errorCode : "INTERNAL_ERROR",
      source: body.source
    });
    return respondVerificationError(res, next, err);
  }
};

export const verifyAadhaarOtp = async (req: VerificationRequest, res: Response, next: NextFunction) => {
  const body = req.body as AadhaarVerifyOtpBody;
  const isAdmin = ADMIN_ROLES.includes(req.user?.role);

  try {
    const result = await aadhaarService.verifyOtp({
      recordId: body.recordId,
      otp: body.otp,
      aadhaarNumber: body.aadhaarNumber,
      shareCode: body.shareCode,
      userId: req.user!.id,
      isAdmin,
      correlationId: req.correlationId as string
    });

    logVerificationEvent({
      req,
      action: "VERIFICATION_AADHAAR_OTP_VERIFIED",
      recordId: result.recordId,
      verificationType: "AADHAAR",
      success: true,
      transactionId: result.transactionId,
      responseTimeMs: result.responseTimeMs
    });

    return successResponse(res, result, "Aadhaar e-KYC completed successfully");
  } catch (err) {
    logVerificationEvent({
      req,
      action: "VERIFICATION_AADHAAR_OTP_VERIFIED",
      recordId: body.recordId,
      verificationType: "AADHAAR",
      success: false,
      errorCode: isVerificationError(err) ? err.errorCode : "INTERNAL_ERROR"
    });
    return respondVerificationError(res, next, err);
  }
};

export const getAadhaarStatus = async (req: VerificationRequest, res: Response, next: NextFunction) => {
  try {
    const canViewAll = ADMIN_ROLES.includes(req.user?.role);
    const result = await aadhaarService.getStatus(req.params.id, req.user!.id, canViewAll);
    return successResponse(res, result);
  } catch (err) {
    return respondVerificationError(res, next, err);
  }
};
