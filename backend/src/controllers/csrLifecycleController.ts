import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { CompanyInterestStatus, CSRFundMilestoneStatus, CSRRequirementStatus, Role } from "@prisma/client";
import { auditLog, notify, notifyCompanyUsers, notifyDistrictAdmins, notifyNGOUsers } from "../services/notificationService";

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isStateCell = (role?: Role) =>
  role === Role.SUPER_ADMIN || role === Role.PORTAL_ADMIN || role === Role.CSR_ADMIN || role === Role.DISTRICT_ADMIN;

export const convertRequirementToProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      requirementId,
      companyId,
      ngoId,
      approvedBudget,
      committedAmount,
      startDate,
      expectedEndDate,
      agreementDocument,
      fundReleases = []
    } = req.body;

    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id: requirementId },
      include: {
        beneficiaryProfile: true,
        companyInterests: true,
        ngoApplications: true
      }
    });
    if (!requirement) return res.status(404).json({ error: "Requirement not found" });
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || requirement.tenantId || null;

    if (req.user?.role === Role.DISTRICT_ADMIN && req.user.assignedDistrict && requirement.district !== req.user.assignedDistrict) {
      return res.status(403).json({ error: "You can convert only assigned district requirements" });
    }

    const projectReadyInterestStatuses: CompanyInterestStatus[] = [
      CompanyInterestStatus.FUNDING_APPROVED,
      CompanyInterestStatus.NGO_SELECTED,
      CompanyInterestStatus.CI_AGREEMENT_SIGNED
    ];
    const resolvedCompanyId = companyId || requirement.companyInterests.find((interest) =>
      projectReadyInterestStatuses.includes(interest.status)
    )?.companyId;
    const resolvedNgoId = ngoId || requirement.ngoApplications.find((application) =>
      ["SELECTED_BY_COMPANY", "AGREEMENT_SIGNED"].includes(application.status)
    )?.ngoId;

    if (!resolvedCompanyId) return res.status(400).json({ error: "A CSR company must be selected before project conversion" });

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.cSRProject.upsert({
        where: {
          csrRequirementId_companyId: {
            csrRequirementId: requirement.id,
            companyId: resolvedCompanyId
          }
        },
        update: {
          ngoId: resolvedNgoId || null,
          approvedBudget: toNumber(approvedBudget, Number(requirement.estimatedCost)),
          committedAmount: toNumber(committedAmount, toNumber(approvedBudget, Number(requirement.estimatedCost))),
          startDate: startDate ? new Date(startDate) : null,
          expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
          agreementDocument: agreementDocument || null,
          projectStatus: CSRRequirementStatus.EXECUTION_STARTED
        },
        create: {
          tenantId,
          csrRequirementId: requirement.id,
          beneficiaryProfileId: requirement.beneficiaryProfileId,
          companyId: resolvedCompanyId,
          ngoId: resolvedNgoId || null,
          title: requirement.title,
          approvedBudget: toNumber(approvedBudget, Number(requirement.estimatedCost)),
          committedAmount: toNumber(committedAmount, toNumber(approvedBudget, Number(requirement.estimatedCost))),
          startDate: startDate ? new Date(startDate) : null,
          expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
          agreementDocument: agreementDocument || null,
          projectStatus: CSRRequirementStatus.EXECUTION_STARTED
        }
      });

      if (Array.isArray(fundReleases) && fundReleases.length > 0) {
        await tx.cSRFundRelease.createMany({
          data: fundReleases.map((release: any, index: number) => ({
            tenantId,
            csrProjectId: createdProject.id,
            csrRequirementId: requirement.id,
            companyId: resolvedCompanyId,
            ngoId: resolvedNgoId || null,
            trancheNumber: Number(release.trancheNumber || index + 1),
            trancheName: release.trancheName || `Tranche ${index + 1}`,
            approvedAmount: toNumber(release.approvedAmount || release.amount),
            releasedAmount: toNumber(release.releasedAmount),
            releaseDate: release.releaseDate ? new Date(release.releaseDate) : null,
            paymentReference: release.paymentReference || null,
            status: release.status || CSRFundMilestoneStatus.FM_PENDING,
            remarks: release.remarks || null
          }))
        });
      }

      await tx.cSRRequirement.update({
        where: { id: requirement.id },
        data: { status: CSRRequirementStatus.EXECUTION_STARTED }
      });

      await tx.companyInterest.updateMany({
        where: { csrRequirementId: requirement.id, companyId: resolvedCompanyId },
        data: { status: CompanyInterestStatus.CI_PROJECT_IN_PROGRESS }
      });

      return createdProject;
    });

    await notify(
      requirement.beneficiaryProfile.userId,
      "CSR Project Activated",
      `Your department requirement '${requirement.title}' has been converted into an active CSR project.`
    );
    await notifyCompanyUsers(resolvedCompanyId, "CSR Project Activated", `Project activated for '${requirement.title}'.`);
    if (resolvedNgoId) await notifyNGOUsers(resolvedNgoId, "Implementation Project Assigned", `You are assigned to '${requirement.title}'.`);
    await notifyDistrictAdmins(requirement.district, "CSR Project Activated", `Project activated for '${requirement.title}'.`);
    await auditLog(req.user!.id, "CSR_PROJECT_CONVERTED", { requirementId: requirement.id, projectId: project.id });

    return res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const listCsrProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      where.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }
    if (req.user?.role === Role.COMPANY_ADMIN || req.user?.role === Role.COMPANY_MEMBER) {
      where.companyId = req.user.companyId || "__none__";
    } else if (req.user?.role === Role.NGO_ADMIN || req.user?.role === Role.NGO_MEMBER) {
      where.ngoId = req.user.ngoId || "__none__";
    } else if (req.user?.role === Role.BENEFICIARY_AGENCY) {
      const profile = await prisma.beneficiaryProfile.findUnique({ where: { userId: req.user.id } });
      where.beneficiaryProfileId = profile?.id || "__none__";
    } else if (req.user?.role === Role.DISTRICT_ADMIN && req.user.assignedDistrict) {
      where.csrRequirement = { district: req.user.assignedDistrict };
    }

    const projects = await prisma.cSRProject.findMany({
      where,
      include: {
        csrRequirement: { select: { id: true, title: true, district: true, taluka: true, category: true, status: true } },
        beneficiaryProfile: { select: { agencyName: true, agencyType: true } },
        company: { select: { name: true } },
        ngo: { select: { name: true } },
        fundReleases: true,
        assetHandovers: true,
        projectInspections: true
      },
      orderBy: { createdAt: "desc" },
      take: 250
    });

    return res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const createFundRelease = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.cSRProject.findUnique({ where: { id: projectId }, include: { csrRequirement: true } });
    if (!project) return res.status(404).json({ error: "CSR project not found" });
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || project.tenantId || null;

    const release = await prisma.cSRFundRelease.create({
      data: {
        tenantId,
        csrProjectId: project.id,
        csrRequirementId: project.csrRequirementId,
        companyId: project.companyId,
        ngoId: project.ngoId,
        trancheNumber: Number(req.body.trancheNumber),
        trancheName: req.body.trancheName,
        approvedAmount: toNumber(req.body.approvedAmount),
        releasedAmount: toNumber(req.body.releasedAmount),
        releaseDate: req.body.releaseDate ? new Date(req.body.releaseDate) : null,
        paymentReference: req.body.paymentReference || null,
        status: req.body.status || CSRFundMilestoneStatus.FM_PENDING,
        remarks: req.body.remarks || null
      }
    });

    await auditLog(req.user!.id, "CSR_FUND_RELEASE_CREATED", { projectId, releaseId: release.id });
    return res.status(201).json(release);
  } catch (error) {
    next(error);
  }
};

export const submitUtilizationCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const release = await prisma.cSRFundRelease.findUnique({ where: { id }, include: { csrProject: true, csrRequirement: true } });
    if (!release) return res.status(404).json({ error: "Fund release not found" });
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || release.tenantId || null;
    if (!req.user?.ngoId || req.user.ngoId !== release.ngoId) {
      return res.status(403).json({ error: "Only the assigned NGO can submit utilization certificate" });
    }

    const certificate = await prisma.$transaction(async (tx) => {
      const created = await tx.utilizationCertificate.create({
        data: {
          tenantId,
          csrFundReleaseId: release.id,
          csrProjectId: release.csrProjectId,
          csrRequirementId: release.csrRequirementId,
          ngoId: req.user!.ngoId!,
          uploadedByUserId: req.user!.id,
          amountUtilized: toNumber(req.body.utilizedAmount),
          certificateDocumentUrl: req.body.certificateDocument || req.body.certificateDocumentUrl || "",
          invoiceDocuments: req.body.invoiceDocuments || [],
          remarks: req.body.remarks || null,
          verificationStatus: CSRFundMilestoneStatus.UTILIZATION_SUBMITTED
        }
      });

      await tx.cSRFundRelease.update({
        where: { id: release.id },
        data: {
          utilizationCertificateId: created.id,
          status: CSRFundMilestoneStatus.UTILIZATION_SUBMITTED
        }
      });

      return created;
    });

    await notifyDistrictAdmins(release.csrRequirement.district, "Utilization Certificate Submitted", `UC submitted for '${release.csrRequirement.title}'.`);
    await auditLog(req.user!.id, "UTILIZATION_CERTIFICATE_SUBMITTED", { releaseId: id, certificateId: certificate.id });

    return res.status(201).json(certificate);
  } catch (error) {
    next(error);
  }
};

export const verifyUtilizationCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status = CSRFundMilestoneStatus.FM_VERIFIED, remarks } = req.body;
    const certificate = await prisma.utilizationCertificate.update({
      where: { id },
      data: {
        verificationStatus: status,
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        remarks
      }
    });
    if (certificate.csrFundReleaseId) {
      await prisma.cSRFundRelease.update({
        where: { id: certificate.csrFundReleaseId },
        data: { status }
      });
    }
    await auditLog(req.user!.id, "UTILIZATION_CERTIFICATE_VERIFIED", { certificateId: id, status });
    return res.json(certificate);
  } catch (error) {
    next(error);
  }
};

export const confirmAssetHandover = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.cSRProject.findUnique({
      where: { id: projectId },
      include: { beneficiaryProfile: true, csrRequirement: true }
    });
    if (!project) return res.status(404).json({ error: "CSR project not found" });
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || project.tenantId || null;

    const ownsProject = req.user?.role === Role.BENEFICIARY_AGENCY && project.beneficiaryProfile.userId === req.user.id;
    if (!ownsProject && !isStateCell(req.user?.role)) {
      return res.status(403).json({ error: "Only the owning government department can confirm handover" });
    }

    const handover = await prisma.$transaction(async (tx) => {
      const created = await tx.assetHandover.create({
        data: {
          tenantId,
          csrProjectId: project.id,
          csrRequirementId: project.csrRequirementId,
          beneficiaryProfileId: project.beneficiaryProfileId,
          assetDescription: req.body.assetDescription,
          handoverDate: req.body.handoverDate ? new Date(req.body.handoverDate) : new Date(),
          confirmationStatus: req.body.confirmationStatus || "CONFIRMED",
          confirmedById: req.user!.id,
          handoverCertificate: req.body.handoverCertificate || null,
          remarks: req.body.remarks || null
        }
      });

      await tx.cSRProject.update({
        where: { id: project.id },
        data: { projectStatus: CSRRequirementStatus.COMPLETED, actualEndDate: new Date() }
      });
      await tx.cSRRequirement.update({
        where: { id: project.csrRequirementId },
        data: { status: CSRRequirementStatus.COMPLETED }
      });

      return created;
    });

    await auditLog(req.user!.id, "ASSET_HANDOVER_CONFIRMED", { projectId, handoverId: handover.id });
    return res.status(201).json(handover);
  } catch (error) {
    next(error);
  }
};

export const createProjectInspection = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await prisma.cSRProject.findUnique({ where: { id }, include: { csrRequirement: true } });
    if (!project) return res.status(404).json({ error: "CSR project not found" });
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || project.tenantId || null;
    if (req.user?.role === Role.DISTRICT_ADMIN && req.user.assignedDistrict && project.csrRequirement.district !== req.user.assignedDistrict) {
      return res.status(403).json({ error: "You can inspect only assigned district projects" });
    }

    const inspection = await prisma.projectInspection.create({
      data: {
        tenantId,
        csrProjectId: project.id,
        csrRequirementId: project.csrRequirementId,
        districtOfficerId: req.user!.id,
        visitDate: req.body.visitDate ? new Date(req.body.visitDate) : new Date(),
        latitude: req.body.latitude !== undefined ? toNumber(req.body.latitude) : null,
        longitude: req.body.longitude !== undefined ? toNumber(req.body.longitude) : null,
        geoTaggedImages: req.body.geoTaggedImages || [],
        remarks: req.body.remarks || null,
        issuesFound: req.body.issuesFound || null,
        actionRequired: req.body.actionRequired || null,
        nextVisitDate: req.body.nextVisitDate ? new Date(req.body.nextVisitDate) : null
      }
    });

    await auditLog(req.user!.id, "PROJECT_INSPECTION_CREATED", { projectId: id, inspectionId: inspection.id });
    return res.status(201).json(inspection);
  } catch (error) {
    next(error);
  }
};

export const upsertImpactMetric = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.cSRProject.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "CSR project not found" });
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || project.tenantId || null;

    const metric = await prisma.impactMetric.create({
      data: {
        tenantId,
        csrProjectId: project.id,
        csrRequirementId: project.csrRequirementId,
        studentsBenefited: Number(req.body.studentsBenefited || 0),
        patientsBenefited: Number(req.body.patientsBenefited || 0),
        villagesBenefited: Number(req.body.villagesBenefited || 0),
        householdsBenefited: Number(req.body.householdsBenefited || 0),
        womenBeneficiaries: Number(req.body.womenBeneficiaries || 0),
        farmersBenefited: Number(req.body.farmersBenefited || 0),
        otherMetrics: req.body.otherMetrics || undefined,
        sdgMapping: req.body.sdgMapping || []
      }
    });

    await auditLog(req.user!.id, "IMPACT_METRIC_UPSERT", { projectId, metricId: metric.id });
    return res.status(201).json(metric);
  } catch (error) {
    next(error);
  }
};
