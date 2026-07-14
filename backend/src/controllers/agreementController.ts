/**
 * @deprecated LEGACY - NOT MOUNTED. Part of the disabled NGO-marketplace flow
 * (see app.ts: ENABLE_LEGACY_NGO_MARKETPLACE). This controller's route is not
 * registered; editing it has NO runtime effect in the MahaCSR Convergence Framework.
 * Active replacement: mouTemplateService.ts / agreementController is replaced by StandardMou
 */
import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { AgreementStatus, CSRRequirementStatus } from "@prisma/client";
import { notify, notifyNGOUsers, notifyCompanyUsers, notifyDistrictAdmins, auditLog } from "../services/notificationService";

// ─── Generate Agreement ────────────────────────────────────────────
export const generateAgreement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      csrRequirementId, companyId, ngoId, beneficiaryProfileId,
      fundingAmount, milestonePlan, expectedStartDate, expectedCompletionDate,
      termsAndConditions
    } = req.body;

    const requirement = await prisma.cSRRequirement.findUnique({ where: { id: csrRequirementId } });
    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    const agreement = await prisma.agreement.create({
      data: {
        csrRequirementId,
        companyId,
        ngoId,
        beneficiaryProfileId,
        fundingAmount: parseFloat(fundingAmount),
        milestonePlan,
        expectedStartDate: expectedStartDate ? new Date(expectedStartDate) : null,
        expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : null,
        termsAndConditions,
        status: AgreementStatus.DRAFT_GENERATED
      }
    });

    await prisma.cSRRequirement.update({
      where: { id: csrRequirementId },
      data: { status: CSRRequirementStatus.AGREEMENT_PENDING }
    });

    await notifyNGOUsers(ngoId, "Agreement Draft Generated", `Agreement draft for '${requirement.title}' is ready for review.`);
    await notifyCompanyUsers(companyId, "Agreement Draft Generated", `Agreement draft for '${requirement.title}' is ready for review.`);

    await auditLog(req.user!.id, "AGREEMENT_GENERATED", { agreementId: agreement.id, csrRequirementId });

    return res.status(201).json(agreement);
  } catch (error) {
    next(error);
  }
};

// ─── Update Agreement Status ───────────────────────────────────────
export const updateAgreementStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, revisionNotes, signedDocumentUrl } = req.body;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: { csrRequirement: true }
    });
    if (!agreement) return res.status(404).json({ error: "Agreement not found" });

    const updated = await prisma.agreement.update({
      where: { id },
      data: {
        status,
        ...(rejectionReason && { rejectionReason }),
        ...(revisionNotes && { revisionNotes }),
        ...(signedDocumentUrl && { signedDocumentUrl })
      }
    });

    // If signed, update requirement status
    if (status === AgreementStatus.SIGNED) {
      await prisma.cSRRequirement.update({
        where: { id: agreement.csrRequirementId },
        data: { status: CSRRequirementStatus.AGREEMENT_SIGNED }
      });
    }

    await notifyNGOUsers(agreement.ngoId, "Agreement Status Update", `Agreement for '${agreement.csrRequirement.title}': ${status.replace(/_/g, " ")}.`);
    await notifyCompanyUsers(agreement.companyId, "Agreement Status Update", `Agreement for '${agreement.csrRequirement.title}': ${status.replace(/_/g, " ")}.`);

    await auditLog(req.user!.id, "AGREEMENT_STATUS_UPDATE", { agreementId: id, status });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ─── Get Agreements for Requirement ────────────────────────────────
export const getAgreementsByRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const agreements = await prisma.agreement.findMany({
      where: { csrRequirementId: requirementId },
      orderBy: { createdAt: "desc" }
    });
    return res.json(agreements);
  } catch (error) {
    next(error);
  }
};
