import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { CompanyInterestStatus, CSRRequirementStatus, ReportType, Role } from "@prisma/client";

const getRequestTenantId = (req: AuthenticatedRequest) =>
  (req as any).tenantContext?.tenantId || req.user?.tenantId || null;

const tenantScopedWhere = (req: AuthenticatedRequest) => {
  const tenantId = getRequestTenantId(req);
  if (!tenantId) return {};
  return { tenantId };
};

export const listReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = tenantScopedWhere(req);

    if (req.user?.role !== Role.SUPER_ADMIN) {
      if (req.user?.ngoId) where.ngoId = req.user.ngoId;
      if (req.user?.companyId) where.companyId = req.user.companyId;
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return res.json(reports);
  } catch (error) {
    next(error);
  }
};

export const createReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, type, content, fileUrl } = req.body;
    const tenantId = getRequestTenantId(req);

    if (!Object.values(ReportType).includes(type)) {
      return res.status(400).json({ error: "Invalid report type" });
    }

    const report = await prisma.report.create({
      data: {
        tenantId,
        title,
        type,
        content,
        fileUrl: fileUrl || null,
        createdById: req.user!.id,
        ngoId: req.user?.ngoId || null,
        companyId: req.user?.companyId || null
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user?.id,
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "REPORT_CREATE",
        entityType: "REPORT",
        entityId: report.id,
        details: { reportId: report.id, type }
      }
    });

    return res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

export const generateAnnualSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = getRequestTenantId(req);
    const projects = await prisma.project.findMany({
      where: {
        ...tenantScopedWhere(req),
        ...(req.user?.ngoId ? { ngoId: req.user.ngoId } : {}),
        status: { in: ["APPROVED", "FUNDED", "COMPLETED"] }
      },
      include: { milestones: true, ngo: { select: { name: true } } }
    });

    const totalBudgetRequested = projects.reduce((sum, project) => sum + Number(project.budgetRequested), 0);
    const totalBudgetFunded = projects.reduce((sum, project) => sum + Number(project.budgetFunded), 0);
    const totalBeneficiaries = projects.reduce((sum, project) => sum + project.beneficiaryCount, 0);

    const report = await prisma.report.create({
      data: {
        tenantId,
        title: `Annual CSR Summary ${new Date().getFullYear()}`,
        type: ReportType.ANNUAL,
        createdById: req.user!.id,
        ngoId: req.user?.ngoId || null,
        companyId: req.user?.companyId || null,
        content: {
          totalProjects: projects.length,
          totalBudgetRequested,
          totalBudgetFunded,
          totalBeneficiaries,
          projects: projects.map((project) => ({
            id: project.id,
            title: project.title,
            ngo: project.ngo.name,
            status: project.status,
            district: project.district,
            focusArea: project.focusArea,
            beneficiaryCount: project.beneficiaryCount,
            budgetRequested: Number(project.budgetRequested),
            budgetFunded: Number(project.budgetFunded),
            milestones: project.milestones.length
          }))
        }
      }
    });

    return res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

const asNumber = (value: unknown) => Number(value || 0);

const auditReportAccess = async (req: AuthenticatedRequest, reportName: string, filters: Record<string, unknown>) => {
  await prisma.auditLog.create({
    data: {
      tenantId: getRequestTenantId(req),
      userId: req.user?.id,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: "REPORT_ACCESS",
      entityType: "REPORT",
      details: { reportName, filters: JSON.parse(JSON.stringify(filters)) }
    }
  }).catch(() => undefined);
};

const requirementScope = async (req: AuthenticatedRequest) => {
  const scope: any = tenantScopedWhere(req);
  if (req.user?.role === Role.BENEFICIARY_AGENCY) {
    const profile = await prisma.beneficiaryProfile.findUnique({ where: { userId: req.user.id } });
    return profile ? { ...scope, beneficiaryProfileId: profile.id } : { ...scope, id: "__none__" };
  }
  if (req.user?.role === Role.DISTRICT_ADMIN && req.user.assignedDistrict) {
    return { ...scope, district: req.user.assignedDistrict };
  }
  return scope;
};

const buildRequirementReport = async (req: AuthenticatedRequest, reportName: string) => {
  const where = await requirementScope(req);
  const requirements = await prisma.cSRRequirement.findMany({
    where,
    include: {
      beneficiaryProfile: { select: { agencyName: true, agencyType: true, district: true, taluka: true } },
      companyInterests: { include: { company: { select: { name: true } } } },
      ngoApplications: { include: { ngo: { select: { name: true } } } },
      agreements: true,
      csrProjects: true,
      csrFundReleases: true,
      utilizationCertificates: true,
      fundMilestones: true,
      completionReport: true,
      impactReport: true,
      _count: { select: { companyInterests: true, ngoApplications: true, progressReports: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const totalEstimated = requirements.reduce((sum, item) => sum + asNumber(item.estimatedCost), 0);
  const committed = requirements.reduce(
    (sum, item) => sum
      + item.agreements.reduce((inner, agreement) => inner + asNumber(agreement.fundingAmount), 0)
      + item.csrProjects.reduce((inner, project) => inner + asNumber(project.committedAmount), 0),
    0
  );
  const released = requirements.reduce(
    (sum, item) => sum
      + item.fundMilestones
        .filter((milestone) => milestone.status === "FM_RELEASED" || milestone.status === "FM_VERIFIED")
        .reduce((inner, milestone) => inner + asNumber(milestone.amount), 0)
      + item.csrFundReleases
        .filter((release) => release.status === "FM_RELEASED" || release.status === "FM_VERIFIED" || release.status === "UTILIZATION_SUBMITTED")
        .reduce((inner, release) => inner + asNumber(release.releasedAmount), 0),
    0
  );
  const utilized = requirements.reduce(
    (sum, item) => sum + item.utilizationCertificates
      .filter((certificate) => certificate.verificationStatus === "FM_VERIFIED" || certificate.verificationStatus === "UTILIZATION_SUBMITTED")
      .reduce((inner, certificate) => inner + asNumber(certificate.amountUtilized), 0),
    0
  );
  const beneficiaries = requirements.reduce((sum, item) => sum + item.beneficiaryCount, 0);

  const statusCounts = requirements.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const sectorCounts = requirements.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const table = requirements.map((item) => {
    const committedAmount = item.agreements.reduce((sum, agreement) => sum + asNumber(agreement.fundingAmount), 0)
      + item.csrProjects.reduce((sum, project) => sum + asNumber(project.committedAmount), 0);
    const releasedAmount = item.fundMilestones
      .filter((milestone) => milestone.status === "FM_RELEASED" || milestone.status === "FM_VERIFIED")
      .reduce((sum, milestone) => sum + asNumber(milestone.amount), 0)
      + item.csrFundReleases
        .filter((release) => release.status === "FM_RELEASED" || release.status === "FM_VERIFIED" || release.status === "UTILIZATION_SUBMITTED")
        .reduce((sum, release) => sum + asNumber(release.releasedAmount), 0);
    const utilizedAmount = item.utilizationCertificates.reduce((sum, certificate) => sum + asNumber(certificate.amountUtilized), 0);
    return {
      id: item.id,
      requirementTitle: item.title,
      department: item.beneficiaryProfile.agencyName,
      departmentType: item.beneficiaryProfile.agencyType,
      district: item.district,
      taluka: item.taluka,
      sector: item.category,
      status: item.status,
      budgetRequested: asNumber(item.estimatedCost),
      companiesInterested: item._count.companyInterests,
      fundingCommitted: committedAmount,
      fundingReleased: releasedAmount,
      fundingUtilized: utilizedAmount,
      fundingGap: Math.max(asNumber(item.estimatedCost) - committedAmount, 0),
      ngoApplications: item._count.ngoApplications,
      selectedNgo: item.ngoApplications.find((app) => app.status === "SELECTED_BY_COMPANY" || app.status === "AGREEMENT_SIGNED")?.ngo.name || null,
      beneficiaries: item.beneficiaryCount,
      projectConversionStatus: item.agreements.length > 0 || item.csrProjects.length > 0 ? "CONVERTED" : "PENDING"
    };
  });

  return {
    reportName,
    filters: req.query,
    kpis: {
      totalRequirements: requirements.length,
      publishedRequirements: requirements.filter((item) => item.status === CSRRequirementStatus.MARKETPLACE_LISTED).length,
      fundedRequirements: requirements.filter((item) => item.agreements.length > 0 || item.csrProjects.length > 0).length,
      activeProjects: requirements.filter((item) => ([
        CSRRequirementStatus.EXECUTION_STARTED,
        CSRRequirementStatus.IN_PROGRESS,
        CSRRequirementStatus.COMPLETION_SUBMITTED
      ] as CSRRequirementStatus[]).includes(item.status)).length,
      completedProjects: requirements.filter((item) => ([
        CSRRequirementStatus.COMPLETED,
        CSRRequirementStatus.IMPACT_REPORT_GENERATED
      ] as CSRRequirementStatus[]).includes(item.status)).length,
      totalEstimated,
      committed,
      released,
      utilized,
      fundingGap: Math.max(totalEstimated - committed, 0),
      beneficiaries
    },
    charts: {
      byStatus: Object.entries(statusCounts).map(([label, value]) => ({ label, value })),
      bySector: Object.entries(sectorCounts).map(([label, value]) => ({ label, value }))
    },
    table,
    exportFormats: ["PDF", "Excel", "CSV", "Print"]
  };
};

export const getDepartmentReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const report = await buildRequirementReport(req, `department-${req.params.reportType || "dashboard"}`);
    await auditReportAccess(req, report.reportName, req.query as Record<string, unknown>);
    return res.json(report);
  } catch (error) {
    next(error);
  }
};

export const getGovernmentReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const report = await buildRequirementReport(req, `government-${req.params.reportType || "state-dashboard"}`);
    await auditReportAccess(req, report.reportName, req.query as Record<string, unknown>);
    return res.json(report);
  } catch (error) {
    next(error);
  }
};

export const getCompanyReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = tenantScopedWhere(req);
    if (req.user?.companyId) where.companyId = req.user.companyId;
    const interests = await prisma.companyInterest.findMany({
      where,
      include: {
        company: { select: { name: true, csrBudget: true, focusAreas: true } },
        csrRequirement: {
          include: {
            beneficiaryProfile: { select: { agencyName: true } },
            fundMilestones: true,
            csrProjects: true,
            csrFundReleases: true,
            utilizationCertificates: true,
            agreements: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const committed = interests.reduce((sum, item) => sum + asNumber(item.fundingAmount), 0);
    const released = interests.reduce(
      (sum, item) => sum
        + item.csrRequirement.fundMilestones
          .filter((milestone) => milestone.status === "FM_RELEASED" || milestone.status === "FM_VERIFIED")
          .reduce((inner, milestone) => inner + asNumber(milestone.amount), 0)
        + item.csrRequirement.csrFundReleases
          .filter((release) => release.status === "FM_RELEASED" || release.status === "FM_VERIFIED" || release.status === "UTILIZATION_SUBMITTED")
          .reduce((inner, release) => inner + asNumber(release.releasedAmount), 0),
      0
    );
    const utilized = interests.reduce(
      (sum, item) => sum + item.csrRequirement.utilizationCertificates
        .reduce((inner, certificate) => inner + asNumber(certificate.amountUtilized), 0),
      0
    );

    await auditReportAccess(req, `company-${req.params.reportType || "portfolio"}`, req.query as Record<string, unknown>);
    return res.json({
      reportName: `company-${req.params.reportType || "portfolio"}`,
      filters: req.query,
      kpis: {
        interestsSubmitted: interests.length,
        fundingApproved: interests.filter((item) => item.status === CompanyInterestStatus.FUNDING_APPROVED).length,
        projectsSupported: interests.filter((item) => item.csrRequirement.agreements.length > 0 || item.csrRequirement.csrProjects.length > 0).length,
        committed,
        released,
        utilized
      },
      charts: {
        byStatus: Object.entries(interests.reduce<Record<string, number>>((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {})).map(([label, value]) => ({ label, value }))
      },
      table: interests.map((item) => ({
        requirement: item.csrRequirement.title,
        department: item.csrRequirement.beneficiaryProfile.agencyName,
        district: item.csrRequirement.district,
        sector: item.csrRequirement.category,
        proposedAmount: asNumber(item.fundingAmount),
        status: item.status
      })),
      exportFormats: ["PDF", "Excel", "CSV", "Print"]
    });
  } catch (error) {
    next(error);
  }
};

export const getNgoReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = tenantScopedWhere(req);
    if (req.user?.ngoId) where.ngoId = req.user.ngoId;
    const applications = await prisma.nGOApplication.findMany({
      where,
      include: {
        ngo: { select: { name: true } },
        csrRequirement: {
          include: {
            beneficiaryProfile: { select: { agencyName: true } },
            fundMilestones: true,
            csrFundReleases: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    await auditReportAccess(req, `ngo-${req.params.reportType || "assigned-projects"}`, req.query as Record<string, unknown>);
    return res.json({
      reportName: `ngo-${req.params.reportType || "assigned-projects"}`,
      filters: req.query,
      kpis: {
        proposals: applications.length,
        assignedProjects: applications.filter((item) => item.status === "SELECTED_BY_COMPANY" || item.status === "AGREEMENT_SIGNED").length,
        completedProjects: applications.filter((item) => item.status === "COMPLETED").length,
        fundsReceived: applications.reduce((sum, item) => sum
          + item.csrRequirement.fundMilestones
            .filter((milestone) => milestone.status === "FM_RELEASED" || milestone.status === "FM_VERIFIED")
            .reduce((inner, milestone) => inner + asNumber(milestone.amount), 0)
          + item.csrRequirement.csrFundReleases
            .filter((release) => release.status === "FM_RELEASED" || release.status === "FM_VERIFIED" || release.status === "UTILIZATION_SUBMITTED")
            .reduce((inner, release) => inner + asNumber(release.releasedAmount), 0), 0)
      },
      charts: {
        byStatus: Object.entries(applications.reduce<Record<string, number>>((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {})).map(([label, value]) => ({ label, value }))
      },
      table: applications.map((item) => ({
        requirement: item.csrRequirement.title,
        department: item.csrRequirement.beneficiaryProfile.agencyName,
        ngo: item.ngo.name,
        district: item.csrRequirement.district,
        proposedBudget: asNumber(item.estimatedCost),
        status: item.status
      })),
      exportFormats: ["PDF", "Excel", "CSV", "Print"]
    });
  } catch (error) {
    next(error);
  }
};
