/**
 * @deprecated LEGACY - NOT MOUNTED. Part of the disabled NGO-marketplace flow
 * (see app.ts: ENABLE_LEGACY_NGO_MARKETPLACE). This controller's route is not
 * registered; editing it has NO runtime effect in the MahaCSR Convergence Framework.
 * Active replacement: convergenceProjectController.ts -> generateCompletionReport
 */
import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { CSRRequirementStatus } from "@prisma/client";
import { notifyDistrictAdmins, auditLog } from "../services/notificationService";

// ─── Submit Completion Report ──────────────────────────────────────
export const submitCompletionReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const ngoId = req.user!.ngoId;
    if (!ngoId) return res.status(403).json({ error: "Only NGO users can submit completion reports" });

    const {
      workCompletedSummary, finalCost, fundUtilizationSummary,
      beforePhotoUrls, afterPhotoUrls, beneficiaryCount,
      outcomeIndicators, certificateUrls, beneficiaryFeedback,
      inspectionReportUrl
    } = req.body;

    const requirement = await prisma.cSRRequirement.findUnique({ where: { id: requirementId } });
    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    const report = await prisma.completionReport.upsert({
      where: { csrRequirementId: requirementId },
      update: {
        workCompletedSummary,
        finalCost: parseFloat(finalCost),
        fundUtilizationSummary,
        beforePhotoUrls: beforePhotoUrls || [],
        afterPhotoUrls: afterPhotoUrls || [],
        beneficiaryCount: parseInt(beneficiaryCount),
        outcomeIndicators,
        certificateUrls: certificateUrls || [],
        beneficiaryFeedback,
        inspectionReportUrl
      },
      create: {
        csrRequirementId: requirementId,
        submittedByNgoId: ngoId,
        workCompletedSummary,
        finalCost: parseFloat(finalCost),
        fundUtilizationSummary,
        beforePhotoUrls: beforePhotoUrls || [],
        afterPhotoUrls: afterPhotoUrls || [],
        beneficiaryCount: parseInt(beneficiaryCount),
        outcomeIndicators,
        certificateUrls: certificateUrls || [],
        beneficiaryFeedback,
        inspectionReportUrl
      }
    });

    await prisma.cSRRequirement.update({
      where: { id: requirementId },
      data: { status: CSRRequirementStatus.COMPLETION_SUBMITTED }
    });

    await notifyDistrictAdmins(
      requirement.district,
      "Completion Report Submitted",
      `Completion report submitted for '${requirement.title}'. Please review and verify.`
    );

    await auditLog(req.user!.id, "COMPLETION_REPORT_SUBMITTED", { reportId: report.id, requirementId });

    return res.json(report);
  } catch (error) {
    next(error);
  }
};

// ─── Generate Impact Report ────────────────────────────────────────
export const generateImpactReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;

    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id: requirementId },
      include: {
        completionReport: true,
        progressReports: true,
        agreements: true,
        fundMilestones: true,
        beneficiaryProfile: true,
        companyInterests: { include: { company: true } },
        ngoApplications: {
          where: { status: "SELECTED_BY_COMPANY" },
          include: { ngo: true }
        }
      }
    });

    if (!requirement) return res.status(404).json({ error: "Requirement not found" });
    if (!requirement.completionReport) return res.status(400).json({ error: "Completion report must be submitted first" });

    const completion = requirement.completionReport;
    const selectedNGO = requirement.ngoApplications[0]?.ngo;
    const selectedCompany = requirement.companyInterests[0]?.company;

    // Calculate Impact Score components
    const timelyCompletionScore = 20; // Default; in production, compare dates
    const fundUtilAccuracyScore = Math.min(20,
      Math.round(20 * (1 - Math.abs(Number(completion.finalCost) - Number(requirement.estimatedCost)) / Number(requirement.estimatedCost)))
    );
    const beneficiaryFeedbackScore = completion.beneficiaryFeedback ? 15 : 8;
    const govVerificationScore = 15; // Default verified
    const socialImpactScore = Math.min(15, Math.round(15 * completion.beneficiaryCount / requirement.beneficiaryCount));
    const documentationScore = (completion.afterPhotoUrls.length > 0 ? 8 : 4) + (completion.certificateUrls.length > 0 ? 7 : 3);
    const impactScore = Math.min(100, timelyCompletionScore + fundUtilAccuracyScore + beneficiaryFeedbackScore + govVerificationScore + socialImpactScore + documentationScore);

    const impactReport = await prisma.impactReport.upsert({
      where: { csrRequirementId: requirementId },
      update: {
        projectSummary: `${requirement.title} - ${requirement.description}`,
        companyContribution: selectedCompany ? `${selectedCompany.name} contributed ₹${Number(requirement.estimatedCost).toLocaleString()}` : "N/A",
        ngoExecutionSummary: selectedNGO ? `Executed by ${selectedNGO.name}` : "N/A",
        beneficiaryReach: completion.beneficiaryCount,
        fundUtilization: { estimated: Number(requirement.estimatedCost), actual: Number(completion.finalCost) },
        impactScore,
        timelyCompletionScore,
        fundUtilAccuracyScore,
        beneficiaryFeedbackScore,
        govVerificationScore,
        socialImpactScore,
        documentationScore
      },
      create: {
        csrRequirementId: requirementId,
        projectSummary: `${requirement.title} - ${requirement.description}`,
        companyContribution: selectedCompany ? `${selectedCompany.name} contributed ₹${Number(requirement.estimatedCost).toLocaleString()}` : "N/A",
        ngoExecutionSummary: selectedNGO ? `Executed by ${selectedNGO.name}` : "N/A",
        beneficiaryReach: completion.beneficiaryCount,
        fundUtilization: { estimated: Number(requirement.estimatedCost), actual: Number(completion.finalCost) },
        impactScore,
        timelyCompletionScore,
        fundUtilAccuracyScore,
        beneficiaryFeedbackScore,
        govVerificationScore,
        socialImpactScore,
        documentationScore
      }
    });

    await prisma.cSRRequirement.update({
      where: { id: requirementId },
      data: { status: CSRRequirementStatus.IMPACT_REPORT_GENERATED }
    });

    await auditLog(req.user!.id, "IMPACT_REPORT_GENERATED", { reportId: impactReport.id, requirementId, impactScore });

    return res.json(impactReport);
  } catch (error) {
    next(error);
  }
};

// ─── Get Impact Report ─────────────────────────────────────────────
export const getImpactReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const report = await prisma.impactReport.findUnique({
      where: { csrRequirementId: requirementId }
    });
    return res.json(report);
  } catch (error) {
    next(error);
  }
};
