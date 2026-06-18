import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Get totals
    const totalNgos = await prisma.nGO.count({ where: { status: "VERIFIED" } });
    const totalCompanies = await prisma.company.count({ where: { status: "VERIFIED" } });
    const totalProjects = await prisma.project.count({ where: { status: { in: ["APPROVED", "FUNDED", "COMPLETED"] } } });
    
    // Sum total funding
    const totalBudgetAggregate = await prisma.project.aggregate({
      where: { status: { in: ["FUNDED", "COMPLETED"] } },
      _sum: { budgetFunded: true }
    });
    const totalFunding = totalBudgetAggregate._sum.budgetFunded || 0;

    // 2. SDG Coverage Distribution
    const projectsBySdg = await prisma.project.groupBy({
      by: ["sdgGoal"],
      where: { status: { in: ["APPROVED", "FUNDED", "COMPLETED"] } },
      _count: { id: true }
    });

    const sdgCoverage = projectsBySdg.map((item) => ({
      sdgGoal: item.sdgGoal,
      count: item._count.id
    }));

    // 3. Focus Area Distribution
    const projectsByFocusArea = await prisma.project.groupBy({
      by: ["focusArea"],
      where: { status: { in: ["APPROVED", "FUNDED", "COMPLETED"] } },
      _count: { id: true }
    });

    const focusAreaCoverage = projectsByFocusArea.map((item) => ({
      focusArea: item.focusArea,
      count: item._count.id
    }));

    return res.json({
      totalNgos,
      totalCompanies,
      totalProjects,
      totalFunding,
      sdgCoverage,
      focusAreaCoverage
    });
  } catch (error) {
    next(error);
  }
};

export const getGisData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Group Projects and sum parameters by district in Maharashtra
    const projectStats = await prisma.project.groupBy({
      by: ["district"],
      where: { status: { in: ["FUNDED", "COMPLETED"] } },
      _sum: {
        budgetFunded: true,
        beneficiaryCount: true
      },
      _count: {
        id: true
      }
    });

    // Group NGOs by district
    const ngoStats = await prisma.nGO.groupBy({
      by: ["district"],
      where: { status: "VERIFIED" },
      _count: {
        id: true
      }
    });

    // Merge statistics by district name
    const districtStatsMap: Record<string, any> = {};

    projectStats.forEach((p) => {
      districtStatsMap[p.district] = {
        district: p.district,
        projectsCount: p._count.id,
        totalFunding: p._sum.budgetFunded || 0,
        totalBeneficiaries: p._sum.beneficiaryCount || 0,
        ngosCount: 0
      };
    });

    ngoStats.forEach((n) => {
      if (!districtStatsMap[n.district]) {
        districtStatsMap[n.district] = {
          district: n.district,
          projectsCount: 0,
          totalFunding: 0,
          totalBeneficiaries: 0,
          ngosCount: n._count.id
        };
      } else {
        districtStatsMap[n.district].ngosCount = n._count.id;
      }
    });

    const gisData = Object.values(districtStatsMap);

    return res.json(gisData);
  } catch (error) {
    next(error);
  }
};
