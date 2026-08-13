import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { MilestoneService } from "../services/milestoneService";
import { successResponse, errorResponse, validationErrorResponse } from "../utils/apiResponse";
import prisma from "../config/db";
import { assertProjectAccess } from "../services/projectAccessService";

export const proposeMilestones = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, items } = req.body;
    if (!projectId || !Array.isArray(items) || items.length === 0) {
      return validationErrorResponse(res, "projectId and milestone items array are required");
    }

    const userId = req.user!.id;
    await assertProjectAccess(req, projectId, "NGO_UPDATE");
    const records = await MilestoneService.proposeMilestones(
      userId,
      projectId,
      "IMPLEMENTING_AGENCY",
      items
    );

    return successResponse(res, records, "Milestone proposal submitted successfully", 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to propose milestones", 400);
  }
};

export const approveMilestonePlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    await assertProjectAccess(req, projectId, "CORPORATE_APPROVE");

    await MilestoneService.approveMilestonePlan(userId, projectId);

    return successResponse(res, null, "Milestone plan approved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to approve milestone plan", 400);
  }
};

export const submitProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { progressRemarks, utilizedAmount, evidenceFiles } = req.body;

    const userId = req.user!.id;
    const milestoneRecord = await prisma.projectMilestone.findUnique({ where: { id }, select: { projectId: true } });
    if (!milestoneRecord) return validationErrorResponse(res, "Milestone not found");
    await assertProjectAccess(req, milestoneRecord.projectId, "NGO_UPDATE");
    const milestone = await MilestoneService.submitProgress(userId, id, {
      progressRemarks,
      utilizedAmount,
      evidenceFiles
    });

    return successResponse(res, milestone, "Milestone progress & evidence submitted successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to submit milestone progress", 400);
  }
};

export const verifyMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { decision, remarks } = req.body;

    if (!decision || (decision !== "VERIFIED" && decision !== "REJECTED")) {
      return validationErrorResponse(res, "decision must be VERIFIED or REJECTED");
    }

    const userId = req.user!.id;
    const milestoneRecord = await prisma.projectMilestone.findUnique({ where: { id }, select: { projectId: true } });
    if (!milestoneRecord) return validationErrorResponse(res, "Milestone not found");
    await assertProjectAccess(req, milestoneRecord.projectId, "CORPORATE_APPROVE");
    const verified = await MilestoneService.verifyMilestone(userId, id, decision, remarks);

    return successResponse(res, verified, `Milestone verification marked as ${decision}`);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to verify milestone", 400);
  }
};

export const getProjectMilestones = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    await assertProjectAccess(req, projectId, "VIEW");
    const milestones = await MilestoneService.getProjectMilestones(projectId);

    return successResponse(res, milestones, "Project milestones fetched successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to fetch milestones", 400);
  }
};
