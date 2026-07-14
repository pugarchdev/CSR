/**
 * @deprecated LEGACY - NOT MOUNTED. Part of the disabled NGO-marketplace flow
 * (see app.ts: ENABLE_LEGACY_NGO_MARKETPLACE). This controller's route is not
 * registered; editing it has NO runtime effect in the MahaCSR Convergence Framework.
 * Active replacement: role-specific dashboards (jsDashboardController, csrDashboardController is legacy)
 */
import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { Role, CSRRequirementStatus, NGOApplicationStatus, CompanyInterestStatus, NGOEmpanelmentStatus } from "@prisma/client";

export const getCSRDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { role, id: userId, ngoId, companyId, assignedDistrict } = req.user!;

    // ────────────────────────────────────────────────────────────────
    // 1. ADMIN DASHBOARD (Super Admin / District Admin)
    // ────────────────────────────────────────────────────────────────
    if (role === Role.SUPER_ADMIN || role === Role.DISTRICT_ADMIN || role === Role.PORTAL_ADMIN) {
      const districtFilter = role === Role.DISTRICT_ADMIN && assignedDistrict ? { district: assignedDistrict } : {};

      const [
        totalRequirements,
        pendingVerification,
        verifiedRequirements,
        activeAgreements,
        totalBeneficiariesCount,
        totalNGOs,
        totalCompanies
      ] = await Promise.all([
        prisma.cSRRequirement.count({ where: districtFilter }),
        prisma.cSRRequirement.count({
          where: {
            ...districtFilter,
            status: { in: [CSRRequirementStatus.PENDING_VERIFICATION, CSRRequirementStatus.FIELD_VERIFICATION_REQUIRED] }
          }
        }),
        prisma.cSRRequirement.count({
          where: { ...districtFilter, status: CSRRequirementStatus.VERIFIED }
        }),
        prisma.agreement.count({
          where: {
            csrRequirement: districtFilter
          }
        }),
        prisma.beneficiaryProfile.count({ where: districtFilter }),
        prisma.nGO.count({ where: districtFilter }),
        prisma.company.count() // Companies are state-wide
      ]);

      // Sum of estimated cost and funded amount
      const reqStats = await prisma.cSRRequirement.aggregate({
        where: districtFilter,
        _sum: {
          estimatedCost: true
        }
      });

      const agreementSum = await prisma.agreement.aggregate({
        where: {
          csrRequirement: districtFilter
        },
        _sum: {
          fundingAmount: true
        }
      });

      // Group requirements by status
      const requirementsByStatus = await prisma.cSRRequirement.groupBy({
        by: ["status"],
        where: districtFilter,
        _count: { id: true }
      });

      // Group requirements by category
      const requirementsByCategory = await prisma.cSRRequirement.groupBy({
        by: ["category"],
        where: districtFilter,
        _count: { id: true }
      });

      return res.json({
        totalRequirements,
        pendingVerification,
        verifiedRequirements,
        activeAgreements,
        totalBeneficiariesCount,
        totalNGOs,
        totalCompanies,
        totalEstimatedCost: reqStats._sum.estimatedCost || 0,
        totalCommittedFunds: agreementSum._sum.fundingAmount || 0,
        requirementsByStatus: requirementsByStatus.map(r => ({ status: r.status, count: r._count.id })),
        requirementsByCategory: requirementsByCategory.map(r => ({ category: r.category, count: r._count.id }))
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 2. BENEFICIARY AGENCY DASHBOARD
    // ────────────────────────────────────────────────────────────────
    if (role === Role.BENEFICIARY_AGENCY) {
      const profile = await prisma.beneficiaryProfile.findUnique({ where: { userId } });
      if (!profile) {
        return res.json({
          hasProfile: false,
          totalRequirements: 0,
          pendingVerification: 0,
          verified: 0,
          active: 0,
          completed: 0,
          totalEstimatedCost: 0,
          totalReceivedFunds: 0
        });
      }

      const [
        totalRequirements,
        pendingVerification,
        verified,
        active,
        completed,
        ngoApplicationsReceived,
        companyInterestsReceived
      ] = await Promise.all([
        prisma.cSRRequirement.count({ where: { beneficiaryProfileId: profile.id } }),
        prisma.cSRRequirement.count({
          where: {
            beneficiaryProfileId: profile.id,
            status: { in: [CSRRequirementStatus.PENDING_VERIFICATION, CSRRequirementStatus.FIELD_VERIFICATION_REQUIRED] }
          }
        }),
        prisma.cSRRequirement.count({
          where: { beneficiaryProfileId: profile.id, status: CSRRequirementStatus.VERIFIED }
        }),
        prisma.cSRRequirement.count({
          where: {
            beneficiaryProfileId: profile.id,
            status: { in: [CSRRequirementStatus.EXECUTION_STARTED, CSRRequirementStatus.IN_PROGRESS] }
          }
        }),
        prisma.cSRRequirement.count({
          where: { beneficiaryProfileId: profile.id, status: CSRRequirementStatus.COMPLETED }
        }),
        prisma.nGOApplication.count({
          where: { csrRequirement: { beneficiaryProfileId: profile.id } }
        }),
        prisma.companyInterest.count({
          where: { csrRequirement: { beneficiaryProfileId: profile.id } }
        })
      ]);

      const costSum = await prisma.cSRRequirement.aggregate({
        where: { beneficiaryProfileId: profile.id },
        _sum: { estimatedCost: true }
      });

      const fundsSum = await prisma.agreement.aggregate({
        where: {
          csrRequirement: { beneficiaryProfileId: profile.id },
          status: "SIGNED"
        },
        _sum: { fundingAmount: true }
      });

      return res.json({
        hasProfile: true,
        profile,
        totalRequirements,
        pendingVerification,
        verified,
        active,
        completed,
        ngoApplicationsReceived,
        companyInterestsReceived,
        totalEstimatedCost: costSum._sum.estimatedCost || 0,
        totalReceivedFunds: fundsSum._sum.fundingAmount || 0
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 3. NGO DASHBOARD
    // ────────────────────────────────────────────────────────────────
    if (role === Role.NGO_ADMIN || role === Role.NGO_MEMBER) {
      if (!ngoId) {
        return res.status(400).json({ error: "NGO association not found" });
      }

      const ngo = await prisma.nGO.findUnique({
        where: { id: ngoId },
        select: { empanelmentStatus: true, name: true, district: true }
      });

      const [
        totalApplications,
        shortlistedApplications,
        selectedApplications,
        activeProjects,
        completedProjects
      ] = await Promise.all([
        prisma.nGOApplication.count({ where: { ngoId } }),
        prisma.nGOApplication.count({ where: { ngoId, status: NGOApplicationStatus.SHORTLISTED } }),
        prisma.nGOApplication.count({
          where: { ngoId, status: { in: [NGOApplicationStatus.SELECTED_BY_COMPANY, NGOApplicationStatus.AGREEMENT_PENDING, NGOApplicationStatus.AGREEMENT_SIGNED] } }
        }),
        prisma.nGOApplication.count({ where: { ngoId, status: NGOApplicationStatus.EXECUTION_STARTED } }),
        prisma.nGOApplication.count({ where: { ngoId, status: NGOApplicationStatus.COMPLETED } })
      ]);

      // Calculate total funds managed (agreements signed by this NGO)
      const agreementFunds = await prisma.agreement.aggregate({
        where: { ngoId, status: "SIGNED" },
        _sum: { fundingAmount: true }
      });

      // Milestones pending release
      const pendingMilestonesCount = await prisma.cSRFundMilestone.count({
        where: {
          csrRequirement: {
            agreements: {
              some: { ngoId, status: "SIGNED" }
            }
          },
          status: "RELEASE_REQUESTED"
        }
      });

      return res.json({
        empanelmentStatus: ngo?.empanelmentStatus || NGOEmpanelmentStatus.PROFILE_INCOMPLETE,
        ngoName: ngo?.name,
        totalApplications,
        shortlistedApplications,
        selectedApplications,
        activeProjects,
        completedProjects,
        totalFundsManaged: agreementFunds._sum.fundingAmount || 0,
        pendingMilestonesCount
      });
    }

    // ────────────────────────────────────────────────────────────────
    // 4. COMPANY DASHBOARD
    // ────────────────────────────────────────────────────────────────
    if (role === Role.COMPANY_ADMIN || role === Role.COMPANY_MEMBER) {
      if (!companyId) {
        return res.status(400).json({ error: "Company association not found" });
      }

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, csrBudget: true }
      });

      const [
        interestsExpressed,
        ngoSelectedCount,
        agreementsSigned,
        activeMonitorings,
        completedMonitorings
      ] = await Promise.all([
        prisma.companyInterest.count({ where: { companyId } }),
        prisma.companyInterest.count({
          where: { companyId, status: CompanyInterestStatus.NGO_SELECTED }
        }),
        prisma.agreement.count({ where: { companyId, status: "SIGNED" } }),
        prisma.companyInterest.count({
          where: { companyId, status: CompanyInterestStatus.CI_PROJECT_IN_PROGRESS }
        }),
        prisma.companyInterest.count({
          where: { companyId, status: CompanyInterestStatus.CI_COMPLETED }
        })
      ]);

      const fundCommittedSum = await prisma.agreement.aggregate({
        where: { companyId, status: "SIGNED" },
        _sum: { fundingAmount: true }
      });

      const fundReleasedSum = await prisma.cSRFundMilestone.aggregate({
        where: {
          csrRequirement: {
            agreements: {
              some: { companyId, status: "SIGNED" }
            }
          },
          status: "FM_RELEASED"
        },
        _sum: { amount: true }
      });

      return res.json({
        companyName: company?.name,
        totalBudget: company?.csrBudget || 0,
        interestsExpressed,
        ngoSelectedCount,
        agreementsSigned,
        activeMonitorings,
        completedMonitorings,
        totalCommittedFunds: fundCommittedSum._sum.fundingAmount || 0,
        totalReleasedFunds: fundReleasedSum._sum.amount || 0
      });
    }

    return res.status(400).json({ error: "Invalid role for CSR Dashboard Stats" });
  } catch (error) {
    next(error);
  }
};
