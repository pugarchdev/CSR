import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { MouService } from "../services/mouService";
import { successResponse, errorResponse, validationErrorResponse } from "../utils/apiResponse";

export const initiateMou = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, templateType, signingType, corporateSignatoryId, govtSignatoryId, iaSignatoryId, effectiveFrom, effectiveTo, mouRequired } = req.body;
    if (!projectId) {
      return validationErrorResponse(res, "projectId is required");
    }

    const userId = req.user!.id;
    const mou = await MouService.initiateMou(userId, {
      projectId,
      templateType,
      signingType,
      corporateSignatoryId,
      govtSignatoryId,
      iaSignatoryId,
      effectiveFrom,
      effectiveTo,
      mouRequired
    });

    return successResponse(res, mou, "MoU initiated successfully", 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to initiate MoU", 400);
  }
};

export const updateMouDraft = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, templateType, signingType, pdfDocumentUrl, changesSummary, status } = req.body;

    const userId = req.user!.id;
    const updated = await MouService.updateMouDraft(userId, id, {
      title,
      templateType,
      signingType,
      pdfDocumentUrl,
      changesSummary,
      status
    });

    return successResponse(res, updated, "MoU updated successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to update MoU", 400);
  }
};

export const recordSignature = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { signedPdfUrl, signingType } = req.body;

    if (!signedPdfUrl) {
      return validationErrorResponse(res, "signedPdfUrl is required");
    }

    const userId = req.user!.id;
    const signed = await MouService.recordSignature(userId, id, signedPdfUrl, signingType || "DIGITAL");

    return successResponse(res, signed, "MoU signature recorded successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to record MoU signature", 400);
  }
};

export const getMouByProjectId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const mou = await MouService.getMouByProjectId(projectId);

    if (!mou) {
      return successResponse(res, null, "No MoU found for project");
    }

    return successResponse(res, mou, "MoU details fetched successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to fetch MoU", 400);
  }
};
