/**
 * @deprecated LEGACY - NOT MOUNTED. Part of the disabled NGO-marketplace flow
 * (see app.ts: ENABLE_LEGACY_NGO_MARKETPLACE). This controller's route is not
 * registered; editing it has NO runtime effect in the MahaCSR Convergence Framework.
 * Active replacement: convergenceOnboardingService.ts / organizationAdminController.ts
 */
import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { NGOApplicationStatus, NGOEmpanelmentStatus, CSRRequirementStatus } from "@prisma/client";
import { Role } from "../types/role";
import { notify, notifyCompanyUsers, notifyDistrictAdmins, auditLog } from "../services/notificationService";

// ─── Submit NGO Application ────────────────────────────────────────
export const submitNGOApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ngoId = req.user!.ngoId;
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;
    if (!ngoId) return res.status(403).json({ error: "Only NGO users can apply" });

    // Check NGO is empanelled
    const ngo = await prisma.nGO.findUnique({ where: { id: ngoId } });
    if (!ngo || ngo.empanelmentStatus !== NGOEmpanelmentStatus.EMPANELLED) {
      return res.status(403).json({ error: "Only empanelled NGOs can apply to CSR projects" });
    }

    const { csrRequirementId, proposedPlan, proposedTimeline, estimatedCost, teamDetails, pastExperience, proposalDocumentUrl, remarks } = req.body;

    // Check requirement exists and is in a state that accepts applications
    const requirement = await prisma.cSRRequirement.findUnique({ where: { id: csrRequirementId } });
    if (!requirement) return res.status(404).json({ error: "CSR Requirement not found" });

    const applicableStatuses: CSRRequirementStatus[] = [
      CSRRequirementStatus.VERIFIED,
      CSRRequirementStatus.MARKETPLACE_LISTED,
      CSRRequirementStatus.NGO_APPLICATIONS_OPEN,
      CSRRequirementStatus.COMPANY_INTEREST_RECEIVED
    ];
    if (!applicableStatuses.includes(requirement.status)) {
      return res.status(400).json({ error: "This requirement is not currently accepting applications" });
    }

    // Check not already applied
    const existing = await prisma.nGOApplication.findUnique({
      where: { csrRequirementId_ngoId: { csrRequirementId, ngoId } }
    });
    if (existing) return res.status(400).json({ error: "You have already applied for this requirement" });

    const application = await prisma.nGOApplication.create({
      data: {
        csrRequirementId,
        ngoId,
        proposedPlan,
        proposedTimeline,
        estimatedCost: parseFloat(estimatedCost),
        teamDetails,
        pastExperience,
        proposalDocumentUrl,
        remarks,
        status: NGOApplicationStatus.NGO_APPLIED
      }
    });

    // Update requirement status if first application
    if (requirement.status === CSRRequirementStatus.VERIFIED || requirement.status === CSRRequirementStatus.MARKETPLACE_LISTED) {
      await prisma.cSRRequirement.update({
        where: { id: csrRequirementId },
        data: { status: CSRRequirementStatus.NGO_APPLICATIONS_OPEN }
      });
    }

    // Notify beneficiary and admins
    const beneficiaryProfile = await prisma.beneficiaryProfile.findUnique({
      where: { id: requirement.beneficiaryProfileId }
    });
    if (beneficiaryProfile) {
      await notify(
        beneficiaryProfile.userId,
        "NGO Applied to Your Requirement",
        `${ngo.name} has applied as implementation partner for '${requirement.title}'.`
      );
    }
    await notifyDistrictAdmins(
      requirement.district,
      "NGO Application Received",
      `${ngo.name} applied for requirement '${requirement.title}'.`
    );

    // Notify interested companies
    const interests = await prisma.companyInterest.findMany({
      where: { csrRequirementId },
      select: { companyId: true }
    });
    for (const interest of interests) {
      await notifyCompanyUsers(interest.companyId, "New NGO Application", `${ngo.name} has applied for '${requirement.title}'.`);
    }

    await auditLog(req.user!.id, "NGO_APPLICATION_SUBMITTED", { applicationId: application.id, csrRequirementId, ngoId });

    return res.status(201).json(application);
  } catch (error) {
    next(error);
  }
};

// ─── Get Applications for a Requirement ────────────────────────────
export const getApplicationsForRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;

    const where: any = { csrRequirementId: requirementId };
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      where.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }

    const applications = await prisma.nGOApplication.findMany({
      where,
      include: {
        ngo: {
          select: {
            id: true, name: true, district: true, empanelmentStatus: true,
            csrSectors: true, impactStatistics: true, areasOfOperation: true,
            registrationNumber: true, yearEstablished: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(applications);
  } catch (error) {
    next(error);
  }
};

// ─── Get My NGO Applications ───────────────────────────────────────
export const getMyApplications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ngoId = req.user!.ngoId;
    if (!ngoId) return res.json([]);

    const where: any = { ngoId };
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      where.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }

    const applications = await prisma.nGOApplication.findMany({
      where,
      include: {
        csrRequirement: {
          select: {
            id: true, title: true, category: true, district: true,
            estimatedCost: true, status: true, beneficiaryCount: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(applications);
  } catch (error) {
    next(error);
  }
};

// ─── Update Application Status ─────────────────────────────────────
export const updateApplicationStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const application = await prisma.nGOApplication.findUnique({
      where: { id },
      include: { csrRequirement: true }
    });
    if (!application) return res.status(404).json({ error: "Application not found" });

    const updated = await prisma.nGOApplication.update({
      where: { id },
      data: {
        status,
        ...(rejectionReason && { rejectionReason })
      }
    });

    // Notify NGO
    const ngo = await prisma.nGO.findUnique({ where: { id: application.ngoId } });
    if (ngo) {
      const ngoUsers = await prisma.user.findMany({ where: { ngoId: ngo.id }, select: { id: true } });
      for (const u of ngoUsers) {
        await notify(u.id, "Application Status Update", `Your application for '${application.csrRequirement.title}' is now: ${status.replace(/_/g, " ")}.`);
      }
    }

    await auditLog(req.user!.id, "NGO_APPLICATION_STATUS_UPDATE", { applicationId: id, status });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};
