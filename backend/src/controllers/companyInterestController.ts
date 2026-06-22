import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { CompanyInterestStatus, CSRRequirementStatus, NGOApplicationStatus, Role } from "@prisma/client";
import { notify, notifyNGOUsers, notifyDistrictAdmins, notifyCompanyUsers, auditLog } from "../services/notificationService";

// ─── Express Interest ──────────────────────────────────────────────
export const expressInterest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId;
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;
    if (!companyId) return res.status(403).json({ error: "Only company users can express interest" });

    const { csrRequirementId, fundingAmount, fundingType, preferredNgoId, focusAlignmentNotes, discussionMessage, expectedTimeline, companyRemarks } = req.body;

    const requirement = await prisma.cSRRequirement.findUnique({ where: { id: csrRequirementId } });
    if (!requirement) return res.status(404).json({ error: "CSR Requirement not found" });

    const applicableStatuses: CSRRequirementStatus[] = [
      CSRRequirementStatus.VERIFIED,
      CSRRequirementStatus.MARKETPLACE_LISTED,
      CSRRequirementStatus.NGO_APPLICATIONS_OPEN,
      CSRRequirementStatus.COMPANY_INTEREST_RECEIVED
    ];
    if (!applicableStatuses.includes(requirement.status)) {
      return res.status(400).json({ error: "This requirement is not currently accepting interest" });
    }

    const existing = await prisma.companyInterest.findUnique({
      where: { csrRequirementId_companyId: { csrRequirementId, companyId } }
    });
    if (existing) return res.status(400).json({ error: "You have already expressed interest" });

    const interest = await prisma.companyInterest.create({
      data: {
        tenantId,
        csrRequirementId,
        companyId,
        fundingAmount: parseFloat(fundingAmount),
        fundingType: fundingType || "FULL_FUNDING",
        preferredNgoId,
        focusAlignmentNotes,
        discussionMessage,
        expectedTimeline,
        companyRemarks,
        status: CompanyInterestStatus.INTEREST_SUBMITTED
      }
    });

    // Update requirement status
    if (requirement.status !== CSRRequirementStatus.COMPANY_INTEREST_RECEIVED) {
      await prisma.cSRRequirement.update({
        where: { id: csrRequirementId },
        data: { status: CSRRequirementStatus.COMPANY_INTEREST_RECEIVED }
      });
    }

    // Notify beneficiary
    const beneficiaryProfile = await prisma.beneficiaryProfile.findUnique({
      where: { id: requirement.beneficiaryProfileId }
    });
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (beneficiaryProfile && company) {
      await notify(
        beneficiaryProfile.userId,
        "Company Interested in Your Requirement",
        `${company.name} has expressed interest in funding '${requirement.title}'.`
      );
    }

    await notifyDistrictAdmins(
      requirement.district,
      "Company Interest Received",
      `${company?.name || "A company"} expressed interest in requirement '${requirement.title}'.`
    );

    await auditLog(req.user!.id, "COMPANY_INTEREST_SUBMITTED", { interestId: interest.id, csrRequirementId, companyId });

    return res.status(201).json(interest);
  } catch (error) {
    next(error);
  }
};

// ─── Get My Company Interests ──────────────────────────────────────
export const getMyInterests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) return res.json([]);

    const where: any = { companyId };
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      where.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }

    const interests = await prisma.companyInterest.findMany({
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

    return res.json(interests);
  } catch (error) {
    next(error);
  }
};

// ─── Get Interests for a Requirement ───────────────────────────────
export const getInterestsForRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;

    const where: any = { csrRequirementId: requirementId };
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      where.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }

    const interests = await prisma.companyInterest.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, focusAreas: true, csrBudget: true, companyLogoUrl: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(interests);
  } catch (error) {
    next(error);
  }
};

export const listCompanyInterestsForAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, district } = req.query;
    const where: any = {};
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      where.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }

    if (status) where.status = status;
    
    let csrRequirementFilter: any = {};
    if (district || (req.user?.role === Role.DISTRICT_ADMIN && req.user.assignedDistrict)) {
      csrRequirementFilter.district = (district as string) || req.user?.assignedDistrict;
    }
    if (req.user?.role === Role.BENEFICIARY_AGENCY) {
      const profile = await prisma.beneficiaryProfile.findUnique({ where: { userId: req.user.id } });
      csrRequirementFilter.beneficiaryProfileId = profile?.id || "__none__";
    }

    if (Object.keys(csrRequirementFilter).length > 0) {
      where.csrRequirement = csrRequirementFilter;
    }

    const interests = await prisma.companyInterest.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, focusAreas: true, csrBudget: true, companyLogoUrl: true } },
        csrRequirement: {
          select: {
            id: true,
            title: true,
            district: true,
            taluka: true,
            category: true,
            estimatedCost: true,
            status: true,
            beneficiaryProfile: { select: { agencyName: true, agencyType: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 250
    });

    return res.json(interests);
  } catch (error) {
    next(error);
  }
};

// ─── Company Selects NGO ───────────────────────────────────────────
export const selectNGO = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // interest ID
    const { ngoApplicationId } = req.body;

    const interest = await prisma.companyInterest.findUnique({
      where: { id },
      include: { csrRequirement: true }
    });
    if (!interest) return res.status(404).json({ error: "Interest not found" });
    if (interest.companyId !== req.user!.companyId && req.user!.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const application = await prisma.nGOApplication.findUnique({
      where: { id: ngoApplicationId },
      include: { ngo: true }
    });
    if (!application) return res.status(404).json({ error: "NGO Application not found" });
    if (application.csrRequirementId !== interest.csrRequirementId) {
      return res.status(400).json({ error: "Application does not belong to this requirement" });
    }

    // Transaction: update interest, application, and requirement status
    await prisma.$transaction([
      // Mark selected application
      prisma.nGOApplication.update({
        where: { id: ngoApplicationId },
        data: { status: NGOApplicationStatus.SELECTED_BY_COMPANY }
      }),
      // Mark other applications as NOT_SELECTED
      prisma.nGOApplication.updateMany({
        where: {
          csrRequirementId: interest.csrRequirementId,
          id: { not: ngoApplicationId },
          status: { in: [NGOApplicationStatus.NGO_APPLIED, NGOApplicationStatus.SHORTLISTED] }
        },
        data: { status: NGOApplicationStatus.NOT_SELECTED }
      }),
      // Update interest
      prisma.companyInterest.update({
        where: { id },
        data: {
          status: CompanyInterestStatus.NGO_SELECTED,
          selectedNgoId: application.ngoId,
          selectedAt: new Date()
        }
      }),
      // Update requirement status
      prisma.cSRRequirement.update({
        where: { id: interest.csrRequirementId },
        data: { status: CSRRequirementStatus.NGO_SELECTED }
      })
    ]);

    // Notify selected NGO
    await notifyNGOUsers(
      application.ngoId,
      "Selected as Implementation Partner!",
      `Your NGO has been selected for '${interest.csrRequirement.title}'. Agreement process will begin.`
    );

    // Notify beneficiary
    const beneficiaryProfile = await prisma.beneficiaryProfile.findUnique({
      where: { id: interest.csrRequirement.beneficiaryProfileId }
    });
    if (beneficiaryProfile) {
      await notify(
        beneficiaryProfile.userId,
        "NGO Selected for Your Requirement",
        `${application.ngo.name} has been selected as implementation partner for '${interest.csrRequirement.title}'.`
      );
    }

    await notifyDistrictAdmins(
      interest.csrRequirement.district,
      "NGO Selected by Company",
      `${application.ngo.name} selected for '${interest.csrRequirement.title}'. Agreement workflow to begin.`
    );

    await auditLog(req.user!.id, "COMPANY_SELECTED_NGO", {
      interestId: id,
      ngoApplicationId,
      ngoId: application.ngoId,
      csrRequirementId: interest.csrRequirementId
    });

    return res.json({ message: "NGO selected successfully" });
  } catch (error) {
    next(error);
  }
};

// ─── Update Interest Status ────────────────────────────────────────
export const updateInterestStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.companyInterest.update({
      where: { id },
      data: { status }
    });

    await auditLog(req.user!.id, "COMPANY_INTEREST_STATUS_UPDATE", { interestId: id, status });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const approveCompanyInterest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  req.body = {
    ...req.body,
    status: CompanyInterestStatus.FUNDING_APPROVED
  };
  return updateInterestStatus(req, res, next);
};
