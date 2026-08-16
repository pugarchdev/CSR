import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { cacheOrFetch } from "../config/redis";

/**
 * State CSR Portfolio Analytics
 */
export const getStatePortfolio = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await cacheOrFetch("strategy:portfolio:summary", async () => {
      const [projects, totalCommitment, distinctDistricts, sectors] = await Promise.all([
        prisma.project.findMany({
          where: { deletedAt: null },
          include: {
            organization: { select: { id: true, name: true, governmentType: true, district: true } },
            milestones: { select: { id: true, name: true, status: true, targetAmount: true, utilizedAmount: true } },
          },
          take: 100,
          orderBy: { createdAt: "desc" }
        }),
        prisma.project.aggregate({
          where: { deletedAt: null },
          _sum: { approvedBudget: true, committedAmount: true, utilizedAmount: true, beneficiaryCount: true }
        }),
        prisma.project.groupBy({
          by: ["district"],
          where: { deletedAt: null },
          _count: { id: true },
          _sum: { committedAmount: true }
        }),
        prisma.project.groupBy({
          by: ["sector"],
          where: { deletedAt: null },
          _count: { id: true },
          _sum: { committedAmount: true, approvedBudget: true }
        })
      ]);

      return {
        summary: {
          totalProjects: projects.length,
          activeProjects: projects.filter(p => ["APPROVED", "AGREEMENT_SIGNED", "EXECUTION_STARTED", "IN_PROGRESS", "FUNDED"].includes(p.status)).length,
          totalApprovedBudget: totalCommitment._sum.approvedBudget || 0,
          totalCommittedAmount: totalCommitment._sum.committedAmount || 0,
          totalUtilizedAmount: totalCommitment._sum.utilizedAmount || 0,
          totalBeneficiaries: totalCommitment._sum.beneficiaryCount || 0,
          districtCoverageCount: distinctDistricts.length,
          totalDistricts: 36,
          coveragePercentage: Math.round((distinctDistricts.length / 36) * 100),
        },
        districtBreakdown: distinctDistricts.map(d => ({
          district: d.district,
          projectCount: d._count.id,
          committedAmount: d._sum.committedAmount || 0
        })),
        sectorBreakdown: sectors.map(s => ({
          sector: s.sector,
          projectCount: s._count.id,
          committedAmount: s._sum.committedAmount || 0,
          approvedBudget: s._sum.approvedBudget || 0
        })),
        projects: projects.map(p => ({
          id: p.id,
          projectCode: p.projectCode,
          title: p.title,
          sector: p.sector,
          district: p.district,
          taluka: p.taluka,
          approvedBudget: p.approvedBudget,
          committedAmount: p.committedAmount,
          utilizedAmount: p.utilizedAmount,
          status: p.status,
          organizationName: p.organization.name,
          milestonesCount: p.milestones.length,
          completedMilestonesCount: p.milestones.filter(m => m.status === "COMPLETED" || m.status === "VERIFIED").length,
          createdAt: p.createdAt.toISOString()
        }))
      };
    }, 60);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sector Analytics & CSR Priority Allocations
 */
export const getSectorAnalytics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await cacheOrFetch("strategy:sector-allocations", async () => {
      const sectors = await prisma.project.groupBy({
        by: ["sector"],
        where: { deletedAt: null },
        _count: { id: true },
        _sum: { committedAmount: true, approvedBudget: true, utilizedAmount: true, beneficiaryCount: true }
      });

      const prioritySectors = [
        { name: "Healthcare & Nutrition", targetPct: 30, color: "#10B981" },
        { name: "Education & Digital Literacy", targetPct: 25, color: "#3B82F6" },
        { name: "Rural Water & Sanitation", targetPct: 20, color: "#06B6D4" },
        { name: "Skill Development & Livelihood", targetPct: 15, color: "#F59E0B" },
        { name: "Environmental Sustainability", targetPct: 10, color: "#8B5CF6" },
      ];

      const totalCommitted = sectors.reduce((acc, s) => acc + Number(s._sum.committedAmount || 0), 0);

      const enriched = prioritySectors.map(p => {
        const match = sectors.find(s => s.sector.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]));
        const committed = match ? Number(match._sum.committedAmount || 0) : 0;
        const actualPct = totalCommitted > 0 ? Math.round((committed / totalCommitted) * 100) : 0;
        return {
          ...p,
          projectCount: match ? match._count.id : 0,
          committedAmount: committed,
          actualPct,
          variancePct: actualPct - p.targetPct,
          beneficiaries: match ? Number(match._sum.beneficiaryCount || 0) : 0
        };
      });

      return {
        totalCommitted,
        sectors: enriched
      };
    }, 120);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * State Impact Indicators
 */
export const getImpactIndicators = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await cacheOrFetch("strategy:impact-indicators", async () => {
      const indicators = [
        { id: "IND-1", title: "Malnutrition Reduction in Tribal Belts", category: "Health", baseline: "34%", target: "18%", current: "22%", status: "ON_TRACK", projectsCount: 12 },
        { id: "IND-2", title: "Smart Digital Classrooms in ZP Schools", category: "Education", baseline: "1,200", target: "5,000", current: "3,840", status: "ON_TRACK", projectsCount: 24 },
        { id: "IND-3", title: "Solar Micro-Grids in Remote Villages", category: "Energy", baseline: "45 Villages", target: "250 Villages", current: "180 Villages", status: "ACHIEVED", projectsCount: 8 },
        { id: "IND-4", title: "Check Dams & Water Conservation Structures", category: "Water", baseline: "320", target: "1,000", current: "740", status: "ON_TRACK", projectsCount: 16 },
        { id: "IND-5", title: "Women SHG Skill Livelihood Centres", category: "Livelihood", baseline: "80 Centres", target: "300 Centres", current: "245 Centres", status: "ON_TRACK", projectsCount: 14 }
      ];

      return {
        overallIndex: "84.2%",
        indicators
      };
    }, 300);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cross-Department & Multi-District Convergence Projects
 */
export const getConvergenceProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        organization: true,
        departmentOrganization: true,
        inspections: true,
        milestones: true,
      },
      take: 20,
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      success: true,
      data: {
        projects: projects.map(p => ({
          id: p.id,
          projectCode: p.projectCode,
          title: p.title,
          sector: p.sector,
          district: p.district,
          mainOrg: p.organization.name,
          departmentOrg: p.departmentOrganization?.name || "Collectorate Focal SPOC",
          approvedBudget: p.approvedBudget,
          committedAmount: p.committedAmount,
          status: p.status,
          inspectionsCount: p.inspections.length,
          milestonesCount: p.milestones.length,
          startDate: p.startDate?.toISOString() || null,
          expectedEndDate: p.expectedEndDate?.toISOString() || null
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
