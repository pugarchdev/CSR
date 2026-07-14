/**
 * @deprecated LEGACY - NOT MOUNTED. Part of the disabled NGO-marketplace flow
 * (see app.ts: ENABLE_LEGACY_NGO_MARKETPLACE). This controller's route is not
 * registered; editing it has NO runtime effect in the MahaCSR Convergence Framework.
 * Active replacement: convergenceProjectController.ts (project financials)
 */
import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { CSRFundMilestoneStatus } from "@prisma/client";
import { auditLog } from "../services/notificationService";

// ─── Create Fund Milestones ────────────────────────────────────────
export const createFundMilestones = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const { milestones } = req.body; // Array of { milestoneName, milestonePercentage, amount, dueDate }

    const requirement = await prisma.cSRRequirement.findUnique({ where: { id: requirementId } });
    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    // Delete existing milestones and recreate
    await prisma.cSRFundMilestone.deleteMany({ where: { csrRequirementId: requirementId } });

    const created = await prisma.$transaction(
      milestones.map((m: any) =>
        prisma.cSRFundMilestone.create({
          data: {
            csrRequirementId: requirementId,
            milestoneName: m.milestoneName,
            milestonePercentage: parseFloat(m.milestonePercentage),
            amount: parseFloat(m.amount),
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            status: CSRFundMilestoneStatus.FM_PENDING
          }
        })
      )
    );

    await auditLog(req.user!.id, "FUND_MILESTONES_CREATED", { requirementId, count: milestones.length });

    return res.json({ message: "Fund milestones created", milestones: created });
  } catch (error) {
    next(error);
  }
};

// ─── Update Fund Milestone ─────────────────────────────────────────
export const updateFundMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, utilizationProofUrl, invoiceUrl, adminRemarks, releaseDate } = req.body;

    const milestone = await prisma.cSRFundMilestone.findUnique({ where: { id } });
    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    const updated = await prisma.cSRFundMilestone.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(utilizationProofUrl && { utilizationProofUrl }),
        ...(invoiceUrl && { invoiceUrl }),
        ...(adminRemarks && { adminRemarks }),
        ...(releaseDate && { releaseDate: new Date(releaseDate) })
      }
    });

    await auditLog(req.user!.id, "FUND_MILESTONE_UPDATED", { milestoneId: id, status });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ─── Get Fund Milestones ───────────────────────────────────────────
export const getFundMilestones = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const milestones = await prisma.cSRFundMilestone.findMany({
      where: { csrRequirementId: requirementId },
      orderBy: { createdAt: "asc" }
    });
    return res.json(milestones);
  } catch (error) {
    next(error);
  }
};
