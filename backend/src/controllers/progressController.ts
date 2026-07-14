/**
 * @deprecated LEGACY - NOT MOUNTED. Part of the disabled NGO-marketplace flow
 * (see app.ts: ENABLE_LEGACY_NGO_MARKETPLACE). This controller's route is not
 * registered; editing it has NO runtime effect in the MahaCSR Convergence Framework.
 * Active replacement: convergenceProjectController.ts (ProjectDeliverableMilestone)
 */
import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ProgressReportStatus, CSRRequirementStatus } from "@prisma/client";
import { notifyDistrictAdmins, auditLog } from "../services/notificationService";

// ─── Submit Progress Report ────────────────────────────────────────
export const submitProgressReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ngoId = req.user!.ngoId;
    if (!ngoId) return res.status(403).json({ error: "Only NGO users can submit progress reports" });

    const {
      csrRequirementId, progressTitle, progressDescription,
      physicalProgressPercent, financialUtilPercent,
      photoUrls, videoUrls, geoLatitude, geoLongitude,
      challenges, nextSteps
    } = req.body;

    const requirement = await prisma.cSRRequirement.findUnique({ where: { id: csrRequirementId } });
    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    const report = await prisma.progressReport.create({
      data: {
        csrRequirementId,
        submittedByNgoId: ngoId,
        progressTitle,
        progressDescription,
        physicalProgressPercent: parseInt(physicalProgressPercent) || 0,
        financialUtilPercent: parseInt(financialUtilPercent) || 0,
        photoUrls: photoUrls || [],
        videoUrls: videoUrls || [],
        geoLatitude: geoLatitude ? parseFloat(geoLatitude) : null,
        geoLongitude: geoLongitude ? parseFloat(geoLongitude) : null,
        challenges,
        nextSteps,
        status: ProgressReportStatus.PR_SUBMITTED
      }
    });

    // Update requirement status to IN_PROGRESS if not already
    if (requirement.status === CSRRequirementStatus.EXECUTION_STARTED) {
      await prisma.cSRRequirement.update({
        where: { id: csrRequirementId },
        data: { status: CSRRequirementStatus.IN_PROGRESS }
      });
    }

    await notifyDistrictAdmins(
      requirement.district,
      "Progress Report Submitted",
      `Progress report submitted for '${requirement.title}': ${physicalProgressPercent}% physical, ${financialUtilPercent}% financial.`
    );

    await auditLog(req.user!.id, "PROGRESS_REPORT_SUBMITTED", { reportId: report.id, csrRequirementId });

    return res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

// ─── Verify Progress Report ────────────────────────────────────────
export const verifyProgressReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, verificationRemarks } = req.body;

    const report = await prisma.progressReport.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ error: "Progress report not found" });

    const updated = await prisma.progressReport.update({
      where: { id },
      data: {
        status,
        verificationRemarks,
        verifiedById: req.user!.id,
        verifiedAt: new Date()
      }
    });

    await auditLog(req.user!.id, "PROGRESS_REPORT_VERIFIED", { reportId: id, status });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ─── Get Progress Reports ──────────────────────────────────────────
export const getProgressReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const reports = await prisma.progressReport.findMany({
      where: { csrRequirementId: requirementId },
      orderBy: { createdAt: "desc" }
    });
    return res.json(reports);
  } catch (error) {
    next(error);
  }
};
