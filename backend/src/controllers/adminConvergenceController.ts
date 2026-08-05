import { Response, NextFunction } from "express";
import { GrievanceStatus, OrganizationOnboardingStatus } from "@prisma/client";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

const PENDING_ONBOARDING_STATUSES = [
  (OrganizationOnboardingStatus?.SUBMITTED_FOR_REVIEW || "SUBMITTED_FOR_REVIEW") as OrganizationOnboardingStatus,
  (OrganizationOnboardingStatus?.UNDER_VERIFICATION || "UNDER_VERIFICATION") as OrganizationOnboardingStatus,
  (OrganizationOnboardingStatus?.CLARIFICATION_REQUIRED || "CLARIFICATION_REQUIRED") as OrganizationOnboardingStatus
];
const OPEN_GRIEVANCE_STATUSES = [
  (GrievanceStatus?.RAISED || "RAISED") as GrievanceStatus,
  (GrievanceStatus?.ACKNOWLEDGED || "ACKNOWLEDGED") as GrievanceStatus,
  (GrievanceStatus?.LEVEL_1_REVIEW || "LEVEL_1_REVIEW") as GrievanceStatus,
  (GrievanceStatus?.ESCALATED_TO_STATE_CELL || "ESCALATED_TO_STATE_CELL") as GrievanceStatus,
  (GrievanceStatus?.ESCALATED_TO_JS_SECRETARY || "ESCALATED_TO_JS_SECRETARY") as GrievanceStatus
];

// Admin-wide list of corporate interests expressed against government pitches
export const listPitchInterests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;

    const interests = await prisma.corporatePitchInterest.findMany({
      where: {
        ...(status ? { status } : {})
      },
      include: {
        governmentPitch: {
          select: {
            id: true,
            pitchReferenceId: true,
            department: true,
            district: true,
            csrRequirement: true,
            estimatedCost: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 250
    });

    return res.json({ success: true, data: interests });
  } catch (error) {
    next(error);
  }
};

// Budget vs utilization across convergence projects + UC verification pipeline
export const getFundMonitoringSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [projects, ucByStatus] = await Promise.all([
      prisma.convergenceProject.findMany({
        select: {
          id: true,
          projectId: true,
          title: true,
          district: true,
          sector: true,
          corporateName: true,
          approvedBudget: true,
          utilizedAmount: true,
          physicalProgressPercent: true,
          financialProgressPercent: true,
          status: true,
          _count: { select: { utilizationCertificates: true, milestones: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 500
      }),
      prisma.utilizationCertificate.groupBy({
        by: ["verificationStatus"],
        _count: { id: true },
        _sum: { amountUtilized: true }
      })
    ]);

    const totalBudget = projects.reduce((sum, project) => sum + Number(project.approvedBudget), 0);
    const totalUtilized = projects.reduce((sum, project) => sum + Number(project.utilizedAmount), 0);
    const ucCount = (verificationStatus: string) =>
      ucByStatus.find((entry) => entry.verificationStatus === verificationStatus)?._count.id ?? 0;

    return res.json({
      success: true,
      data: {
        kpis: {
          totalBudget,
          totalUtilized,
          utilizationPercent: totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0,
          projects: projects.length,
          ucPending: ucCount("PENDING"),
          ucVerified: ucCount("VERIFIED"),
          ucRejected: ucCount("REJECTED")
        },
        ucByStatus: ucByStatus.map((entry) => ({
          verificationStatus: entry.verificationStatus,
          count: entry._count.id,
          amountUtilized: Number(entry._sum.amountUtilized ?? 0)
        })),
        projects
      }
    });
  } catch (error) {
    next(error);
  }
};

// One-shot pipeline overview for the executive dashboard
export const getConvergenceOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [
      enquiriesByStatus,
      pitchesByStatus,
      interestCount,
      projectsByStatus,
      budgetAgg,
      ucPending,
      grievancesOpen,
      orgsPendingOnboarding,
      recentEnquiries
    ] = await Promise.all([
      prisma.corporateEnquiry.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.governmentPitch.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.corporatePitchInterest.count(),
      prisma.convergenceProject.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.convergenceProject.aggregate({ _sum: { approvedBudget: true, utilizedAmount: true } }),
      prisma.utilizationCertificate.count({ where: { verificationStatus: "PENDING" } }),
      prisma.grievance.count({ where: { status: { in: OPEN_GRIEVANCE_STATUSES } } }),
      prisma.organization.count({ where: { onboardingStatus: { in: PENDING_ONBOARDING_STATUSES } } }),
      prisma.corporateEnquiry.findMany({
        select: {
          id: true,
          trackingId: true,
          companyName: true,
          sector: true,
          status: true,
          indicativeBudget: true,
          submittedAt: true,
          assignedRelationshipManager: { select: { email: true } }
        },
        orderBy: { submittedAt: "desc" },
        take: 8
      })
    ]);

    const sumCounts = (groups: Array<{ _count: { id: number } }>) =>
      groups.reduce((sum, group) => sum + group._count.id, 0);

    return res.json({
      success: true,
      data: {
        enquiries: {
          total: sumCounts(enquiriesByStatus),
          byStatus: enquiriesByStatus.map((entry) => ({ status: entry.status, count: entry._count.id }))
        },
        pitches: {
          total: sumCounts(pitchesByStatus),
          byStatus: pitchesByStatus.map((entry) => ({ status: entry.status, count: entry._count.id }))
        },
        interests: { total: interestCount },
        projects: {
          total: sumCounts(projectsByStatus),
          byStatus: projectsByStatus.map((entry) => ({ status: entry.status, count: entry._count.id }))
        },
        funds: {
          totalBudget: Number(budgetAgg._sum.approvedBudget ?? 0),
          totalUtilized: Number(budgetAgg._sum.utilizedAmount ?? 0)
        },
        pendingActions: {
          ucPending,
          grievancesOpen,
          orgsPendingOnboarding
        },
        recentEnquiries
      }
    });
  } catch (error) {
    next(error);
  }
};

// Convergence-model report matching the LiveCSRReportPage response contract
export const getConvergenceReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const district = req.query.district as string | undefined;
    const sector = req.query.sector as string | undefined;
    const status = req.query.status as string | undefined;

    const projects = await prisma.convergenceProject.findMany({
      where: {
        ...(district ? { district: { contains: district, mode: "insensitive" } } : {}),
        ...(sector ? { sector: { contains: sector, mode: "insensitive" } } : {}),
        ...(status ? { status: { contains: status, mode: "insensitive" } } : {})
      },
      include: {
        utilizationCertificates: { select: { verificationStatus: true } },
        _count: { select: { milestones: true, grievances: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const totalBudget = projects.reduce((sum, project) => sum + Number(project.approvedBudget), 0);
    const totalUtilized = projects.reduce((sum, project) => sum + Number(project.utilizedAmount), 0);
    const ucVerified = projects.reduce(
      (sum, project) => sum + project.utilizationCertificates.filter((uc) => uc.verificationStatus === "VERIFIED").length,
      0
    );
    const grievances = projects.reduce((sum, project) => sum + project._count.grievances, 0);

    const groupCount = (getKey: (project: (typeof projects)[number]) => string) => {
      const counts = new Map<string, number>();
      projects.forEach((project) => {
        const key = getKey(project) || "UNKNOWN";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
      return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
    };

    const formatInr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

    // Log report access for the audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "REPORT_ACCESS",
        entityType: "ConvergenceReport",
        entityId: "convergence-report",
        details: { filters: { district: district ?? null, sector: sector ?? null, status: status ?? null } }
      }
    }).catch(() => undefined);

    return res.json({
      reportName: "Convergence CSR Projects Report",
      kpis: {
        "Total Projects": projects.length,
        "Active Projects": projects.filter((project) => !["COMPLETED", "CLOSED"].includes(project.status)).length,
        "Completed Projects": projects.filter((project) => ["COMPLETED", "CLOSED"].includes(project.status)).length,
        "Total Budget": formatInr(totalBudget),
        "Total Utilized": formatInr(totalUtilized),
        "Utilization %": totalBudget > 0 ? `${Math.round((totalUtilized / totalBudget) * 100)}%` : "0%",
        "UCs Verified": ucVerified,
        "Grievances": grievances
      },
      charts: {
        "Projects by Status": groupCount((project) => project.status),
        "Projects by District": groupCount((project) => project.district),
        "Projects by Sector": groupCount((project) => project.sector)
      },
      table: projects.map((project) => ({
        projectId: project.projectId,
        title: project.title,
        district: project.district,
        sector: project.sector,
        corporate: project.corporateName,
        budget: formatInr(Number(project.approvedBudget)),
        utilized: formatInr(Number(project.utilizedAmount)),
        status: project.status
      })),
      exportFormats: ["PDF", "Excel", "CSV", "Print"]
    });
  } catch (error) {
    next(error);
  }
};
