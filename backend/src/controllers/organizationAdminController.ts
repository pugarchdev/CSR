import { Request, Response, NextFunction } from "express";
import { OrganizationStatus } from "@prisma/client";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { notifyHierarchy } from "../services/hierarchyNotificationService";

export const getOwnedOrganization = async (req: AuthenticatedRequest, kind?: string, allowLocked = false) => {
  let organizationId = req.user?.organizationId || req.user?.ngoId || req.user?.companyId;

  if (!organizationId && req.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { organizationId: true }
    });
    organizationId = user?.organizationId || null;
  }

  if (!organizationId) throw new Error("Organization is required");

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      csrCompanyProfile: true,
      ngoProfile: true,
      govDeptProfile: true,
      documents: true
    }
  });

  if (!organization) throw new Error("Organization not found");
  if (kind && organization.kind !== kind) throw new Error("Wrong organization kind");

  if (!allowLocked) {
    const LOCKED_STATUSES = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "APPROVED", "ACTIVE", "SUSPENDED"];
    const currentStatus = ((organization as any).onboardingStatus || organization.status || "").toUpperCase();
    if (LOCKED_STATUSES.includes(currentStatus)) {
      throw new Error("Your organization onboarding application has already been submitted and cannot be edited.");
    }
  }

  return organization;
};

export const listOrganizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, kind, status, search, sector, district, page = 1, limit = 10 } = req.query;
    const targetKind = (type || kind) as string | undefined;

    const whereClause: any = {};

    if (targetKind && targetKind !== "ALL") {
      if (targetKind === "CSR_COMPANY" || targetKind === "CORPORATE") {
        whereClause.OR = [
          { kind: "CSR_COMPANY" },
          { kind: "CORPORATE" },
          { csrCompanyProfile: { isNot: null } }
        ];
      } else if (targetKind === "NGO" || targetKind === "IMPLEMENTING_AGENCY") {
        whereClause.OR = [
          { kind: "NGO" },
          { kind: "IMPLEMENTING_AGENCY" },
          { ngoProfile: { isNot: null } }
        ];
      } else if (targetKind === "GOVERNMENT_DEPARTMENT" || targetKind === "GOVT_DEPT") {
        whereClause.OR = [
          { kind: "GOVERNMENT_DEPARTMENT" },
          { kind: "GOVT_DEPT" },
          { govDeptProfile: { isNot: null } }
        ];
      } else {
        whereClause.kind = targetKind;
      }
    }

    if (status && typeof status === "string" && status !== "all" && status !== "ALL") {
      if (status === "ACTIVE" || status === "APPROVED") {
        whereClause.status = OrganizationStatus.ACTIVE;
      } else if (status === "PENDING" || status === "UNDER_REVIEW") {
        whereClause.status = {
          in: [
            OrganizationStatus.UNDER_VERIFICATION,
            OrganizationStatus.REGISTERED,
            OrganizationStatus.DOCUMENTS_PENDING,
            OrganizationStatus.CLARIFICATION_REQUIRED,
            OrganizationStatus.PROFILE_INCOMPLETE
          ]
        };
      } else {
        whereClause.status = status as OrganizationStatus;
      }
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const q = search.trim();
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { cin: { contains: q, mode: "insensitive" } },
            { registrationNumber: { contains: q, mode: "insensitive" } }
          ]
        }
      ];
    }

    if (sector && typeof sector === "string" && sector.trim() !== "" && sector !== "all") {
      whereClause.csrCompanyProfile = {
        sector: { contains: sector.trim(), mode: "insensitive" }
      };
    }

    if (district && typeof district === "string" && district.trim() !== "" && district !== "all") {
      whereClause.district = { contains: district.trim(), mode: "insensitive" };
    }

    const totalCount = await prisma.organization.count({ where: whereClause });
    const activeCount = await prisma.organization.count({
      where: { ...whereClause, status: OrganizationStatus.ACTIVE }
    });
    const pendingCount = await prisma.organization.count({
      where: {
        ...whereClause,
        status: {
          in: [
            OrganizationStatus.UNDER_VERIFICATION,
            OrganizationStatus.REGISTERED,
            OrganizationStatus.DOCUMENTS_PENDING,
            OrganizationStatus.CLARIFICATION_REQUIRED,
            OrganizationStatus.PROFILE_INCOMPLETE
          ]
        }
      }
    });
    const suspendedCount = await prisma.organization.count({
      where: { ...whereClause, status: OrganizationStatus.SUSPENDED }
    });

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const orgs = await prisma.organization.findMany({
      where: whereClause,
      include: {
        csrCompanyProfile: true,
        ngoProfile: true,
        govDeptProfile: true,
        _count: { select: { projects: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum
    });

    return res.json({
      success: true,
      data: orgs,
      pagination: {
        total: totalCount,
        active: activeCount,
        pending: pendingCount,
        suspended: suspendedCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listPendingOrganizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, kind } = req.query;
    const whereClause: any = {};

    if (status === "APPROVED" || status === "ACTIVE") {
      whereClause.status = OrganizationStatus.ACTIVE;
    } else if (status === "PENDING") {
      whereClause.status = {
        in: [
          OrganizationStatus.UNDER_VERIFICATION,
          OrganizationStatus.REGISTERED,
          OrganizationStatus.DOCUMENTS_PENDING,
          OrganizationStatus.CLARIFICATION_REQUIRED,
          OrganizationStatus.PROFILE_INCOMPLETE
        ]
      };
    } else if (status && typeof status === "string" && status !== "ALL") {
      whereClause.status = status;
    } else if (status === "ALL") {
      // Return all organizations regardless of status
    }

    if (kind && typeof kind === "string" && kind !== "ALL") {
      if (kind === "CSR_COMPANY") {
        whereClause.OR = [
          { kind: "CSR_COMPANY" },
          { kind: "CORPORATE" },
          { csrCompanyProfile: { isNot: null } }
        ];
      } else if (kind === "NGO") {
        whereClause.OR = [
          { kind: "NGO" },
          { kind: "IMPLEMENTING_AGENCY" },
          { ngoProfile: { isNot: null } }
        ];
      } else if (kind === "GOVERNMENT_DEPARTMENT") {
        whereClause.OR = [
          { kind: "GOVERNMENT_DEPARTMENT" },
          { kind: "GOVT_DEPT" },
          { govDeptProfile: { isNot: null } }
        ];
      } else {
        whereClause.kind = kind;
      }
    }

    const orgs = await prisma.organization.findMany({
      where: whereClause,
      include: { csrCompanyProfile: true, ngoProfile: true, govDeptProfile: true, documents: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json(orgs);
  } catch (error) {
    next(error);
  }
};

export const getOrganizationById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: { csrCompanyProfile: true, ngoProfile: true, govDeptProfile: true, documents: true }
    });
    if (!organization) return res.status(404).json({ error: "Organization not found" });
    return res.json(organization);
  } catch (error) {
    next(error);
  }
};

export const approveOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE" }
    });
    notifyHierarchy({
      title: "Organization Onboarding Approved",
      message: `Organization "${updated.name}" has been approved and activated.`,
      organizationId: updated.id,
      includeOrgUsers: true,
      includePortalAdmins: false,
      includeRms: false,
      includeStateOfficers: false,
      actionButtonUrl: `/organization/onboarding/status`
    }).catch((err) => console.error("[NotifyHierarchy] Error sending approval notification:", err));
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const rejectOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reason = req.body.rejectionReason || req.body.remarks || "No reason specified";
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: { status: "REJECTED", rejectionReason: reason } as any
    });
    notifyHierarchy({
      title: "Organization Onboarding Rejected",
      message: `Organization "${updated.name}" onboarding request has been rejected. Reason: ${reason}`,
      organizationId: updated.id,
      includeOrgUsers: true,
      includePortalAdmins: false,
      includeRms: false,
      actionButtonUrl: `/organization/onboarding/status`
    }).catch((err) => console.error("[NotifyHierarchy] Error sending rejection notification:", err));
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const suspendOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reason = req.body.remarks || req.body.rejectionReason || "No reason specified";
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: { status: "SUSPENDED", rejectionReason: reason } as any
    });
    notifyHierarchy({
      title: "Organization Account Suspended",
      message: `Organization "${updated.name}" status has been updated to suspended. Reason: ${reason}`,
      organizationId: updated.id,
      includeOrgUsers: true,
      includePortalAdmins: false,
      includeRms: false,
      actionButtonUrl: `/organization/onboarding/status`
    }).catch((err) => console.error("[NotifyHierarchy] Error sending suspension notification:", err));
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const requestClarification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const remarks = req.body.remarks || req.body.rejectionReason || "Please update requested profile documents";
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: { status: "CLARIFICATION_REQUIRED", clarificationRemarks: remarks } as any
    });
    notifyHierarchy({
      title: "Clarification Required for Onboarding",
      message: `Clarification requested for organization "${updated.name}". Remarks: ${remarks}`,
      organizationId: updated.id,
      includeOrgUsers: true,
      includePortalAdmins: false,
      includeRms: false,
      actionButtonUrl: `/organization/onboarding/status`,
      variables: {
        currentStatus: "CLARIFICATION_REQUIRED",
        workflowStatus: remarks
      }
    }).catch((err) => console.error("[NotifyHierarchy] Error sending clarification notification:", err));
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const getOnboardingProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, undefined, true);
    return res.json(org);
  } catch (error: any) {
    return res.json({
      id: null,
      name: req.user?.email ? req.user.email.split("@")[0] : "New Organization",
      onboardingStatus: "DRAFT",
      status: "REGISTERED",
      documents: []
    });
  }
};

export const getOnboardingStatus = getOnboardingProfile;

export const updateOnboardingProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: org.id },
        data: {
          name: req.body.name || org.name,
          legalName: req.body.legalName || req.body.name || org.legalName,
          officialEmail: req.body.officialEmail || req.body.email || org.officialEmail,
          officialPhone: req.body.officialPhone || req.body.phone || org.officialPhone,
          address: req.body.address || org.address,
          district: req.body.district || org.district,
          taluka: req.body.taluka || org.taluka,
          registrationNumber: req.body.registrationNumber || org.registrationNumber,
          pan: req.body.pan || org.pan,
          gstin: req.body.gstin || req.body.gst || org.gstin
        }
      });
      if (org.kind === "NGO") {
        await tx.nGOProfile.upsert({
          where: { organizationId: org.id },
          create: {
            organizationId: org.id,
            darpanNumber: req.body.darpanNumber || req.body.registrationNumber || null,
            csr1Number: req.body.csr1Number || null,
            areasOfOperation: [],
            csrSectors: []
          },
          update: {
            darpanNumber: req.body.darpanNumber || req.body.registrationNumber || undefined,
            csr1Number: req.body.csr1Number || undefined
          }
        });
      }
      return tx.organization.findUnique({
        where: { id: org.id },
        include: { csrCompanyProfile: true, ngoProfile: true, govDeptProfile: true, documents: true }
      });
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const uploadOnboardingDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req);
    const doc = await prisma.document.create({
      data: {
        organizationId: org.id,
        title: req.body.fileName || "Onboarding Document",
        fileUrl: req.body.fileUrl || "",
        documentType: req.body.documentType || "ONBOARDING",
        fileName: req.body.fileName || "document.pdf",
        fileSize: Number(req.body.fileSize || 0),
        fileType: "pdf"
      }
    });
    return res.status(201).json(doc);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const listOnboardingDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, undefined, true);
    const docs = await prisma.document.findMany({ where: { organizationId: org.id } });
    return res.json(docs);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const deleteOnboardingDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req);
    await prisma.document.deleteMany({ where: { id: req.params.id, organizationId: org.id } });
    return res.json({ message: "Document deleted" });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const submitOnboarding = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req);
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { status: "UNDER_VERIFICATION" }
    });
    notifyHierarchy({
      title: "New Organization Onboarding Submitted",
      message: `Organization "${updated.name}" submitted profile for verification.`,
      organizationId: updated.id,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      actionButtonUrl: `/admin/onboarding-approvals`
    }).catch(err => console.error("Notification dispatch failed:", err));
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const reapplyOnboarding = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, undefined, true);
    const status = ((org as any).onboardingStatus || org.status || "").toUpperCase();
    if (!["REJECTED", "CLARIFICATION_REQUIRED", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ error: "Re-application is only permitted for rejected, clarification required, or suspended applications." });
    }
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { status: "REGISTERED" as any }
    });
    return res.json({ message: "Application status reset for modifications.", organization: updated });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getCompanyOnboardingProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "CSR_COMPANY", true);
    return res.json({ organization: org, profile: org.csrCompanyProfile });
  } catch (error: any) {
    return res.json({
      organization: {
        id: null,
        name: req.user?.email ? req.user.email.split("@")[0] : "New Company",
        kind: "CSR_COMPANY",
        onboardingStatus: "DRAFT",
        status: "REGISTERED"
      },
      profile: null
    });
  }
};

export const updateCompanyOnboardingProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "CSR_COMPANY");
    const body = req.body || {};
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
    const text = (key: string) => {
      if (!has(key)) return undefined;
      const value = body[key];
      return value === null || value === "" ? null : String(value).trim();
    };
    const year = has("yearOfIncorporation") && body.yearOfIncorporation !== ""
      ? Number(body.yearOfIncorporation)
      : has("yearOfIncorporation") ? null : undefined;

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: {
        ...(text("name") !== undefined ? { name: text("name") || org.name } : {}),
        ...(text("legalName") !== undefined ? { legalName: text("legalName") } : {}),
        ...(text("displayName") !== undefined ? { displayName: text("displayName") } : {}),
        ...(text("cin") !== undefined ? { cin: text("cin") } : {}),
        ...(text("pan") !== undefined ? { pan: text("pan") } : {}),
        ...(text("gstin") !== undefined ? { gstin: text("gstin") } : {}),
        ...(text("officialEmail") !== undefined ? { officialEmail: text("officialEmail") } : {}),
        ...(text("officialPhone") !== undefined ? { officialPhone: text("officialPhone") } : {}),
        ...(text("website") !== undefined ? { website: text("website") } : {}),
        ...(text("address") !== undefined ? { address: text("address") } : {}),
        ...(text("registeredOfficeAddress") !== undefined ? { registeredOfficeAddress: text("registeredOfficeAddress") } : {}),
        ...(text("corporateOfficeAddress") !== undefined ? { corporateOfficeAddress: text("corporateOfficeAddress") } : {}),
        ...(text("officialEmailDomain") !== undefined ? { officialEmailDomain: text("officialEmailDomain") } : {}),
        ...(text("companyType") !== undefined ? { companyType: text("companyType") } : {}),
        ...(text("mcaVerificationStatus") !== undefined ? { mcaVerificationStatus: text("mcaVerificationStatus") } : {}),
        ...(text("companyStatus") !== undefined ? { companyStatus: text("companyStatus") } : {}),
        ...(text("district") !== undefined ? { district: text("district") } : {}),
        ...(text("state") ? { state: String(text("state")) } : {}),
        ...(text("pincode") !== undefined ? { pincode: text("pincode") } : {}),
        ...(year === null || (typeof year === "number" && Number.isInteger(year) && year >= 1800 && year <= 2200)
          ? { yearOfIncorporation: year }
          : {})
      }
    });
    const saved = await prisma.organization.findUnique({
      where: { id: updated.id },
      include: { csrCompanyProfile: true, documents: true }
    });
    return res.json(saved || updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateCompanyCompliance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "CSR_COMPANY");
    const body = req.body || {};
    const numberValue = (key: string) => body[key] === "" || body[key] === undefined || body[key] === null ? null : Number(body[key]);
    const profile = await prisma.cSRCompanyProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        preferredDistricts: Array.isArray(body.preferredDistricts) ? body.preferredDistricts : [],
        preferredSectors: Array.isArray(body.preferredSectors) ? body.preferredSectors : [],
        currentYearCsrBudget: numberValue("currentYearCsrBudget"),
        annualCsrBudget: numberValue("annualCsrBudget"),
        netWorth: numberValue("netWorth"),
        turnover: numberValue("turnover"),
        netProfit: numberValue("netProfit"),
        averageNetProfit: numberValue("averageNetProfit"),
        csrObligationAmount: numberValue("csrObligationAmount"),
        unspentCsrAmount: numberValue("unspentCsrAmount"),
        twoPercentCsrObligation: numberValue("twoPercentCsrObligation"),
        financialYear: body.financialYear || null,
        csrApplicable: typeof body.csrApplicable === "boolean" ? body.csrApplicable : null,
        preferredDivisions: Array.isArray(body.preferredDivisions) ? body.preferredDivisions : [],
        preferredCities: Array.isArray(body.preferredCities) ? body.preferredCities : [],
        preferredTalukas: Array.isArray(body.preferredTalukas) ? body.preferredTalukas : []
      },
      update: {
        currentYearCsrBudget: numberValue("currentYearCsrBudget"),
        annualCsrBudget: numberValue("annualCsrBudget"),
        netWorth: numberValue("netWorth"),
        turnover: numberValue("turnover"),
        netProfit: numberValue("netProfit"),
        averageNetProfit: numberValue("averageNetProfit"),
        csrObligationAmount: numberValue("csrObligationAmount"),
        unspentCsrAmount: numberValue("unspentCsrAmount"),
        twoPercentCsrObligation: numberValue("twoPercentCsrObligation"),
        financialYear: body.financialYear || null,
        csrApplicable: typeof body.csrApplicable === "boolean" ? body.csrApplicable : null
      }
    });
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateCompanyPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "CSR_COMPANY");
    const body = req.body || {};
    const formatStr = (val: any) => {
      if (!val) return null;
      if (Array.isArray(val)) return val.join(", ");
      return String(val);
    };

    const profile = await prisma.cSRCompanyProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        preferredDistricts: Array.isArray(body.preferredDistricts) ? body.preferredDistricts : [],
        preferredSectors: Array.isArray(body.preferredSectors) ? body.preferredSectors : [],
        preferredDivisions: Array.isArray(body.preferredDivisions) ? body.preferredDivisions : [],
        preferredCities: Array.isArray(body.preferredCities) ? body.preferredCities : [],
        preferredTalukas: Array.isArray(body.preferredTalukas) ? body.preferredTalukas : [],
        preferredProjectSize: body.preferredProjectSize || null,
        minFundingAmount: body.minFundingAmount ? parseFloat(body.minFundingAmount) : null,
        maxFundingAmount: body.maxFundingAmount ? parseFloat(body.maxFundingAmount) : null,
        fundingPreference: body.fundingPreference || null,
        implementationPreference: body.implementationPreference || null,
        preferredBeneficiaryGroups: formatStr(body.preferredBeneficiaryGroups),
        sdgFocusAreas: formatStr(body.sdgFocusAreas)
      },
      update: {
        preferredDistricts: Array.isArray(body.preferredDistricts) ? body.preferredDistricts : [],
        preferredSectors: Array.isArray(body.preferredSectors) ? body.preferredSectors : [],
        preferredDivisions: Array.isArray(body.preferredDivisions) ? body.preferredDivisions : [],
        preferredCities: Array.isArray(body.preferredCities) ? body.preferredCities : [],
        preferredTalukas: Array.isArray(body.preferredTalukas) ? body.preferredTalukas : [],
        preferredProjectSize: body.preferredProjectSize || null,
        minFundingAmount: body.minFundingAmount ? parseFloat(body.minFundingAmount) : null,
        maxFundingAmount: body.maxFundingAmount ? parseFloat(body.maxFundingAmount) : null,
        fundingPreference: body.fundingPreference || null,
        implementationPreference: body.implementationPreference || null,
        preferredBeneficiaryGroups: formatStr(body.preferredBeneficiaryGroups),
        sdgFocusAreas: formatStr(body.sdgFocusAreas)
      }
    });
    return res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const listOrgRoles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({ where: { organizationId: req.user?.organizationId || undefined } });
    return res.json(roles);
  } catch (error) {
    next(error);
  }
};

export const createOrgRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const role = await prisma.role.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        organizationId: req.user?.organizationId || null,
        isSystemRole: false
      }
    });
    return res.status(201).json(role);
  } catch (error) {
    next(error);
  }
};

export const updateOrgRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const role = await prisma.role.update({
      where: { id: Number(req.params.id) },
      data: { name: req.body.name, description: req.body.description }
    });
    return res.json(role);
  } catch (error) {
    next(error);
  }
};

export const deleteOrgRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.role.delete({ where: { id: Number(req.params.id) } });
    return res.json({ message: "Role deleted" });
  } catch (error) {
    next(error);
  }
};

export const listOrgUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({ where: { organizationId: req.user?.organizationId || undefined } });
    return res.json(users);
  } catch (error) {
    next(error);
  }
};

export const inviteOrgUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        passwordHash: "placeholder",
        roleId: req.body.roleId ? Number(req.body.roleId) : 9,
        organizationId: req.user?.organizationId || null
      }
    });
    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateOrgUserRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { roleId: Number(req.body.roleId) }
    });
    return res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateOrgUserStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { accountStatus: req.body.accountStatus }
    });
    return res.json(user);
  } catch (error) {
    next(error);
  }
};

export const submitCompanyOnboarding = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "CSR_COMPANY");
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { status: "UNDER_VERIFICATION" }
    });
    notifyHierarchy({
      title: "New CSR Company Onboarding Submitted",
      message: `CSR Company "${updated.name}" submitted onboarding application for verification.`,
      organizationId: updated.id,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      actionButtonUrl: `/admin/onboarding-approvals`
    }).catch(err => console.error("Notification dispatch failed:", err));
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getDepartmentOnboardingProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT", true);
    return res.json({ organization: org, profile: org.govDeptProfile });
  } catch (error: any) {
    return res.json({
      organization: {
        id: null,
        name: req.user?.email ? req.user.email.split("@")[0] : "New Department",
        kind: "GOVERNMENT_DEPARTMENT",
        onboardingStatus: "DRAFT",
        status: "REGISTERED"
      },
      profile: null
    });
  }
};

export const updateDepartmentOnboardingProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT");
    const profile = await prisma.govDepartmentProfile.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id },
      update: {}
    });
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateDepartmentNodalOfficer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT");
    const profile = await prisma.govDepartmentProfile.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id },
      update: {}
    });
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateDepartmentAuthorization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT");
    const profile = await prisma.govDepartmentProfile.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id },
      update: {}
    });
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateDepartmentJurisdiction = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT");
    const profile = await prisma.govDepartmentProfile.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id },
      update: {}
    });
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateDepartmentPermissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT");
    const profile = await prisma.govDepartmentProfile.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id },
      update: {}
    });
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const submitDepartmentOnboarding = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT");
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { status: "UNDER_VERIFICATION" }
    });
    notifyHierarchy({
      title: "New Government Department Onboarding Submitted",
      message: `Government Department "${updated.name}" submitted onboarding application for verification.`,
      organizationId: updated.id,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      actionButtonUrl: `/admin/onboarding-approvals`
    }).catch(err => console.error("Notification dispatch failed:", err));
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const listPermissions = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const perms = await prisma.permission.findMany();
    return res.json(perms);
  } catch (error) {
    next(error);
  }
};

export const createAdminOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, kind = "GOVERNMENT_DEPARTMENT", district, email, phone, address } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Department / Organization name is required." });

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        kind: kind as any,
        district: district ? String(district).trim() : null,
        officialEmail: email ? String(email).trim().toLowerCase() : null,
        status: "ACTIVE",
        ...(kind === "GOVERNMENT_DEPARTMENT" || kind === "GOVT_DEPT" ? {
          govDeptProfile: {
            create: {
              departmentType: "STATE_GOVT",
              nodalOfficerName: "Department Nodal Officer"
            }
          }
        } : {})
      }
    });

    return res.status(201).json({ success: true, organization: org });
  } catch (error) {
    next(error);
  }
};

export const listSubDepartments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.params.organizationId || req.user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Organization ID required" });

    const departments = await prisma.subDepartment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" }
    });
    return res.json(departments);
  } catch (error) {
    next(error);
  }
};

export const createSubDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.params.organizationId || req.user?.organizationId;
    if (!orgId) return res.status(400).json({ error: "Organization ID required" });

    const { name, code, type, description, officeAddress, officialEmail, officialPhone, departmentHead, dnoName, status } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Department Name is required" });

    const dept = await prisma.subDepartment.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        code: code?.trim() || null,
        type: type?.trim() || null,
        description: description?.trim() || null,
        officeAddress: officeAddress?.trim() || null,
        officialEmail: officialEmail?.trim() || null,
        officialPhone: officialPhone?.trim() || null,
        departmentHead: departmentHead?.trim() || null,
        dnoName: dnoName?.trim() || null,
        status: status || "ACTIVE"
      }
    });

    return res.status(201).json(dept);
  } catch (error) {
    next(error);
  }
};

export const updateSubDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, code, type, description, officeAddress, officialEmail, officialPhone, departmentHead, dnoName, status } = req.body;

    const dept = await prisma.subDepartment.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code !== undefined ? { code: code?.trim() || null } : {}),
        ...(type !== undefined ? { type: type?.trim() || null } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(officeAddress !== undefined ? { officeAddress: officeAddress?.trim() || null } : {}),
        ...(officialEmail !== undefined ? { officialEmail: officialEmail?.trim() || null } : {}),
        ...(officialPhone !== undefined ? { officialPhone: officialPhone?.trim() || null } : {}),
        ...(departmentHead !== undefined ? { departmentHead: departmentHead?.trim() || null } : {}),
        ...(dnoName !== undefined ? { dnoName: dnoName?.trim() || null } : {}),
        ...(status ? { status } : {})
      }
    });

    return res.json(dept);
  } catch (error) {
    next(error);
  }
};

export const deleteSubDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.subDepartment.delete({ where: { id } });
    return res.json({ success: true, message: "Department deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const listChildOrganizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parentOrgId = req.user?.organizationId;
    if (!parentOrgId) {
      return res.status(403).json({ error: "Access denied. Parent organization context is required." });
    }

    const parentOrg = await prisma.organization.findUnique({
      where: { id: parentOrgId },
      select: { id: true, name: true, parentRegistrationCode: true }
    });

    const childOrgs = await prisma.organization.findMany({
      where: {
        parentOrganizationId: parentOrgId
      },
      include: {
        govDeptProfile: true,
        departmentDnoNominations: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officialDesignation: true,
            officialEmail: true,
            officialMobile: true,
            status: true
          }
        },
        requestedRelationships: {
          where: { parentOrganizationId: parentOrgId },
          select: { status: true, requestedAt: true, verifiedAt: true, rejectionReason: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      success: true,
      data: {
        parentOrganization: parentOrg,
        childOrganizations: childOrgs
      }
    });
  } catch (error) {
    next(error);
  }
};
