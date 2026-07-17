import { NextFunction, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import {
  DocumentVerificationStatus,
  OnboardingReviewAction,
  OrganizationOnboardingStatus,
  OrganizationStatus,
  OrganizationKind,
  RoleScope
} from "@prisma/client";
import { Role } from "../types/role";
import { TenantAwareRequest } from "../middlewares/tenantMiddleware";
import { ensureOrganizationAdminRole } from "../utils/orgRoles";
import crypto from "crypto";
import { createInvitation, InvitationError } from "../services/invitationService";
import { dispatchNotification } from "../services/notificationOrchestrator";

const audit = async (req: TenantAwareRequest, action: string, entityType: string, entityId: string | null, details: Record<string, unknown>) => {
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action,
      entityType,
      entityId,
      details: details as any,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null
    }
  });
};

const MAX_ONBOARDING_DOCUMENT_SIZE = Number(process.env.MAX_ONBOARDING_DOCUMENT_SIZE || 10 * 1024 * 1024);
const ALLOWED_ONBOARDING_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_ONBOARDING_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
};

const asDecimalValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
};

const asDateValue = (value: unknown) => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getOwnedOrganization = async (req: TenantAwareRequest, expectedType?: OrganizationKind) => {
  const organizationId = req.tenantContext?.organizationId || req.user?.organizationId;
  if (!organizationId) {
    throw Object.assign(new Error("Organization is not assigned to this account"), { statusCode: 400 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      csrCompanyProfile: true,
      governmentDepartmentProfile: true,
      onboardingReviews: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });
  if (!organization) {
    throw Object.assign(new Error("Organization not found"), { statusCode: 404 });
  }
  if (expectedType && organization.organizationType !== expectedType) {
    throw Object.assign(new Error(`This onboarding flow is only for ${expectedType.replace(/_/g, " ")}`), { statusCode: 403 });
  }
  return organization;
};

// Onboarding details are locked once submitted; editing is only allowed again
// when the reviewer returns the application (CLARIFICATION_REQUIRED / REJECTED).
const EDITABLE_ONBOARDING_STATUSES = new Set<OrganizationOnboardingStatus>([
  OrganizationOnboardingStatus.REGISTERED,
  OrganizationOnboardingStatus.PROFILE_INCOMPLETE,
  OrganizationOnboardingStatus.DOCUMENTS_PENDING,
  OrganizationOnboardingStatus.CLARIFICATION_REQUIRED,
  OrganizationOnboardingStatus.REJECTED
]);

const assertOnboardingEditable = (organization: { onboardingStatus: OrganizationOnboardingStatus }) => {
  if (!EDITABLE_ONBOARDING_STATUSES.has(organization.onboardingStatus)) {
    throw Object.assign(
      new Error("Onboarding details are locked after submission and cannot be edited."),
      { statusCode: 409 }
    );
  }
};

const handleScopedError = (error: any, res: Response, next: NextFunction) => {
  if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
};

const hasAnyDocument = (documents: Array<{ documentType: string }>, requiredTypes: string[]) => {
  const uploaded = new Set(documents.map((doc) => doc.documentType));
  return requiredTypes.some((docType) => uploaded.has(docType));
};

const recordOnboardingReview = async (
  req: TenantAwareRequest,
  organizationId: string,
  reviewAction: OnboardingReviewAction,
  remarks?: string
) => {
  await prisma.onboardingReview.create({
    data: {
      organizationId,
      reviewedBy: req.user?.id,
      reviewAction,
      remarks
    }
  });
};

const buildCompanyValidationErrors = (organization: any, profile: any, documents: Array<{ documentType: string }>) => {
  const errors: string[] = [];
  if (!organization.legalName && !organization.name) errors.push("Legal company name is required");
  if (!profile?.companyType) errors.push("Company type is required");
  if (profile?.companyType === "LLP" && !organization.llpin) errors.push("LLPIN is required for LLP companies");
  if (profile?.companyType !== "LLP" && !organization.cin) errors.push("CIN is required");
  if (!organization.pan) errors.push("PAN is required");
  if (!organization.officialEmail && !organization.email) errors.push("Official email is required");
  if (!profile?.registeredOfficeAddress && !organization.address) errors.push("Registered office address is required");
  if (!profile?.csrHeadName || !profile?.csrHeadEmail) errors.push("CSR contact details are required");
  if (!profile?.authorizedSignatoryName || !profile?.authorizedSignatoryEmail) errors.push("Authorized signatory details are required");
  if (!profile?.financialYear || !profile?.currentYearCsrBudget) errors.push("CSR budget and financial year are required");
  if (profile?.preferredSectors?.length < 1) errors.push("At least one preferred sector is required");
  if (profile?.preferredDistricts?.length < 1) errors.push("At least one preferred district is required");
  if (!hasAnyDocument(documents, ["CSR_POLICY", "CSR_DECLARATION"])) errors.push("CSR policy document or CSR declaration is required");
  if (!hasAnyDocument(documents, ["BOARD_RESOLUTION", "AUTHORIZATION_LETTER"])) errors.push("Board resolution or authorization letter is required");
  return errors;
};

const buildDepartmentValidationErrors = (organization: any, profile: any, documents: Array<{ documentType: string }>) => {
  const errors: string[] = [];
  if (!organization.legalName && !organization.name) errors.push("Department name is required");
  if (!profile?.departmentType) errors.push("Department type is required");
  if (!profile?.parentDepartment && !organization.parentDepartment) errors.push("Parent department is required");
  if (!organization.officialEmail && !organization.email) errors.push("Official email is required");
  if (!organization.address) errors.push("Office address is required");
  if (!profile?.nodalOfficerName || !profile?.nodalOfficerEmail || !profile?.nodalOfficerMobile) errors.push("Nodal officer details are required");
  if (!profile?.authorizationLetterNumber || !profile?.authorizationLetterDate) errors.push("Authorization letter details are required");
  if (profile?.allowedDistrictIds?.length < 1 && !profile?.canCreateStateLevelRequirement) errors.push("Jurisdiction mapping is required");
  if (profile?.allowedSectors?.length < 1 && profile?.requirementPermissionSectors?.length < 1) errors.push("At least one allowed sector is required");
  if (!hasAnyDocument(documents, ["DEPARTMENT_AUTHORIZATION", "DEPARTMENT_PROOF", "OFFICE_ORDER", "GOVERNMENT_ORDER"])) errors.push("Department proof or authorization document is required");
  return errors;
};

export const listPendingOrganizations = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {
      onboardingStatus: {
        in: [
          OrganizationOnboardingStatus.SUBMITTED_FOR_REVIEW,
          OrganizationOnboardingStatus.UNDER_VERIFICATION,
          OrganizationOnboardingStatus.CLARIFICATION_REQUIRED
        ]
      },
      status: { not: OrganizationStatus.DELETED }
    };
    // Organization model has no tenantId — tenant scoping not applicable
    const organizations = await prisma.organization.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 250
    });
    return res.json(organizations);
  } catch (error) {
    return next(error);
  }
};

export const listOrganizations = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {
      status: { not: OrganizationStatus.DELETED }
    };
    // Organization model has no tenantId — tenant scoping not applicable
    const organizations = await prisma.organization.findMany({
      where,
      orderBy: [{ onboardingStatus: "asc" }, { updatedAt: "desc" }],
      take: 500
    });
    return res.json(organizations);
  } catch (error) {
    return next(error);
  }
};

export const getOrganizationById = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        documents: true,
        roles: true,
        csrCompanyProfile: true,
        governmentDepartmentProfile: true,
        onboardingReviews: { orderBy: { createdAt: "desc" } },
      }
    });
    if (!organization) return res.status(404).json({ error: "Organization not found" });
    if (!req.tenantContext?.isMasterAdmin && false) {
      return res.status(403).json({ error: "Cannot access another portal instance organization" });
    }
    return res.json(organization);
  } catch (error) {
    return next(error);
  }
};

const updateOnboardingStatus = async (
  req: TenantAwareRequest,
  res: Response,
  status: OrganizationOnboardingStatus,
  action: string
) => {
  const organization = await prisma.organization.findUnique({ where: { id: req.params.id } });
  if (!organization) return res.status(404).json({ error: "Organization not found" });
  if (!req.tenantContext?.isMasterAdmin && false) {
    return res.status(403).json({ error: "Cannot modify another portal instance organization" });
  }

  const updated = await prisma.organization.update({
    where: { id: req.params.id },
    data: {
      onboardingStatus: status,
      status: status === OrganizationOnboardingStatus.SUSPENDED ? OrganizationStatus.SUSPENDED : organization.status,
      approvedBy: status === OrganizationOnboardingStatus.APPROVED ? req.user?.id : organization.approvedBy,
      approvedAt: status === OrganizationOnboardingStatus.APPROVED ? new Date() : organization.approvedAt,
      rejectedBy: status === OrganizationOnboardingStatus.REJECTED ? req.user?.id : organization.rejectedBy,
      rejectedAt: status === OrganizationOnboardingStatus.REJECTED ? new Date() : organization.rejectedAt,
      rejectionReason: req.body.rejectionReason || organization.rejectionReason,
      clarificationRemarks: req.body.remarks || organization.clarificationRemarks
    }
  });
  const reviewAction =
    status === OrganizationOnboardingStatus.APPROVED ? OnboardingReviewAction.APPROVED :
    status === OrganizationOnboardingStatus.REJECTED ? OnboardingReviewAction.REJECTED :
    status === OrganizationOnboardingStatus.SUSPENDED ? OnboardingReviewAction.SUSPENDED :
    OnboardingReviewAction.CLARIFICATION_REQUIRED;
  await recordOnboardingReview(req, updated.id, reviewAction, req.body.remarks || req.body.rejectionReason);
  if (status === OrganizationOnboardingStatus.APPROVED) {
    await ensureOrganizationAdminRole(updated.id);
  }
  await audit(req, action, "Organization", updated.id, { status, remarks: req.body.remarks });
  return res.json(updated);
};

export const approveOrganization = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    return updateOnboardingStatus(req, res, OrganizationOnboardingStatus.APPROVED, "ORGANIZATION_ONBOARDING_APPROVED");
  } catch (error) {
    return next(error);
  }
};

export const rejectOrganization = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    return updateOnboardingStatus(req, res, OrganizationOnboardingStatus.REJECTED, "ORGANIZATION_ONBOARDING_REJECTED");
  } catch (error) {
    return next(error);
  }
};

export const requestClarification = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    return updateOnboardingStatus(req, res, OrganizationOnboardingStatus.CLARIFICATION_REQUIRED, "ORGANIZATION_ONBOARDING_CLARIFICATION_REQUESTED");
  } catch (error) {
    return next(error);
  }
};

export const suspendOrganization = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    return updateOnboardingStatus(req, res, OrganizationOnboardingStatus.SUSPENDED, "ORGANIZATION_SUSPENDED");
  } catch (error) {
    return next(error);
  }
};

export const getOnboardingStatus = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.tenantContext?.organizationId || req.user?.organizationId;
    if (!organizationId) {
      return res.json({
        onboardingStatus: OrganizationOnboardingStatus.REGISTERED,
        message: "Create or complete your organization profile to begin onboarding."
      });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        documents: { orderBy: { createdAt: "desc" } },
        csrCompanyProfile: true,
        governmentDepartmentProfile: true,
        onboardingReviews: { orderBy: { createdAt: "desc" }, take: 20 },
      }
    });
    return res.json(organization);
  } catch (error) {
    return next(error);
  }
};

export const updateOnboardingProfile = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.tenantContext?.organizationId || req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: "Organization is not assigned to this account" });

    const existing = await prisma.organization.findUnique({ where: { id: organizationId }, select: { onboardingStatus: true } });
    if (!existing) return res.status(404).json({ error: "Organization not found" });
    assertOnboardingEditable(existing);

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: req.body.name,
        legalName: req.body.legalName || req.body.name,
        displayName: req.body.displayName,
        registrationNumber: req.body.registrationNumber,
        cin: req.body.cin,
        llpin: req.body.llpin,
        pan: req.body.pan,
        gst: req.body.gst,
        gstin: req.body.gstin || req.body.gst,
        departmentCode: req.body.departmentCode,
        parentDepartment: req.body.parentDepartment,
        email: req.body.email,
        officialEmail: req.body.officialEmail || req.body.email,
        phone: req.body.phone,
        officialPhone: req.body.officialPhone || req.body.phone,
        website: req.body.website,
        address: req.body.address,
        stateId: req.body.stateId,
        districtId: req.body.districtId,
        talukaId: req.body.talukaId,
        villageId: req.body.villageId,
        district: req.body.district,
        taluka: req.body.taluka,
        onboardingStatus: OrganizationOnboardingStatus.PROFILE_INCOMPLETE
      }
    });
    await audit(req, "ORGANIZATION_ONBOARDING_PROFILE_UPDATED", "Organization", organization.id, {});
    return res.json(organization);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const uploadOnboardingDocument = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.tenantContext?.organizationId || req.user?.organizationId;
    const tenantId = req.tenantContext?.tenantId || req.user?.tenantId;
    if (!organizationId || !tenantId) return res.status(400).json({ error: "Organization is not assigned to this account" });
    const orgState = await prisma.organization.findUnique({ where: { id: organizationId }, select: { onboardingStatus: true } });
    if (!orgState) return res.status(404).json({ error: "Organization not found" });
    assertOnboardingEditable(orgState);
    const mimeType = req.body.mimeType || req.body.fileType;
    const fileName = req.body.fileName || String(req.body.fileUrl || "").split("/").pop() || req.body.documentType;
    const fileSize = req.body.fileSize ? Number(req.body.fileSize) : undefined;
    const extensionAllowed = ALLOWED_ONBOARDING_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
    if (mimeType && !ALLOWED_ONBOARDING_MIME_TYPES.has(mimeType)) {
      return res.status(400).json({ error: "Only PDF, JPG and PNG onboarding documents are allowed" });
    }
    if (!mimeType && !extensionAllowed) {
      return res.status(400).json({ error: "Only PDF, JPG and PNG onboarding documents are allowed" });
    }
    if (fileSize && fileSize > MAX_ONBOARDING_DOCUMENT_SIZE) {
      return res.status(400).json({ error: "Onboarding document exceeds the maximum allowed file size" });
    }

    const document = await prisma.organizationDocument.create({
      data: {
        organizationId,
        documentType: req.body.documentType,
        fileUrl: req.body.fileUrl,
        fileName,
        mimeType,
        fileSize,
        remarks: req.body.remarks,
        uploadedBy: req.user?.id
      }
    });
    await prisma.organization.update({
      where: { id: organizationId },
      data: { onboardingStatus: OrganizationOnboardingStatus.DOCUMENTS_PENDING }
    });
    await audit(req, "ORGANIZATION_DOCUMENT_UPLOADED", "OrganizationDocument", document.id, {
      documentType: document.documentType,
      fileName,
      virusScanStatus: "HOOK_PENDING"
    });
    return res.status(201).json(document);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const listOnboardingDocuments = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.tenantContext?.organizationId || req.user?.organizationId;
    const tenantId = req.tenantContext?.tenantId || req.user?.tenantId;
    if (!organizationId || !tenantId) return res.status(400).json({ error: "Organization is not assigned to this account" });
    const documents = await prisma.organizationDocument.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    });
    return res.json(documents);
  } catch (error) {
    return next(error);
  }
};

export const deleteOnboardingDocument = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.organizationDocument.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "Document not found" });
    if (!req.tenantContext?.isMasterAdmin && document.organizationId !== req.tenantContext?.organizationId) {
      return res.status(403).json({ error: "Cannot delete another organization document" });
    }
    const owner = await prisma.organization.findUnique({ where: { id: document.organizationId }, select: { onboardingStatus: true } });
    if (owner && !req.tenantContext?.isMasterAdmin) assertOnboardingEditable(owner);
    await prisma.organizationDocument.delete({ where: { id: req.params.id } });
    await audit(req, "ORGANIZATION_DOCUMENT_DELETED", "OrganizationDocument", req.params.id, {});
    return res.json({ message: "Document deleted" });
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const getOnboardingProfile = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req);
    return res.json(organization);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const getCompanyOnboardingProfile = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.CSR_COMPANY);
    return res.json({ organization, profile: organization.csrCompanyProfile });
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateCompanyOnboardingProfile = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.CSR_COMPANY);
    assertOnboardingEditable(organization);
    const updatedOrganization = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: req.body.legalName || req.body.name || organization.name,
        legalName: req.body.legalName || req.body.name,
        displayName: req.body.displayName,
        cin: req.body.cin,
        llpin: req.body.llpin,
        pan: req.body.pan,
        gst: req.body.gstin || req.body.gst,
        gstin: req.body.gstin || req.body.gst,
        email: req.body.officialEmail,
        officialEmail: req.body.officialEmail,
        phone: req.body.officialPhone,
        officialPhone: req.body.officialPhone,
        website: req.body.website,
        address: req.body.registeredOfficeAddress || req.body.address,
        stateId: req.body.state,
        district: req.body.district,
        districtId: req.body.districtId || req.body.district,
        onboardingStatus: OrganizationOnboardingStatus.PROFILE_INCOMPLETE
      }
    });
    const profile = await prisma.cSRCompanyProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        companyType: req.body.companyType,
        yearOfIncorporation: req.body.yearOfIncorporation ? Number(req.body.yearOfIncorporation) : undefined,
        mcaVerificationStatus: req.body.mcaVerificationStatus,
        companyStatus: req.body.companyStatus,
        registeredOfficeAddress: req.body.registeredOfficeAddress,
        corporateOfficeAddress: req.body.corporateOfficeAddress,
        officialEmailDomain: req.body.officialEmailDomain,
        preferredDistricts: [],
        preferredTalukas: [],
        preferredSectors: [],
        preferredBeneficiaryGroups: [],
        scheduleVIIFocusAreas: [],
        sdgFocusAreas: [],
        esgFocusAreas: []
      },
      update: {
        companyType: req.body.companyType,
        yearOfIncorporation: req.body.yearOfIncorporation ? Number(req.body.yearOfIncorporation) : undefined,
        mcaVerificationStatus: req.body.mcaVerificationStatus,
        companyStatus: req.body.companyStatus,
        registeredOfficeAddress: req.body.registeredOfficeAddress,
        corporateOfficeAddress: req.body.corporateOfficeAddress,
        officialEmailDomain: req.body.officialEmailDomain
      }
    });
    await audit(req, "CSR_COMPANY_ONBOARDING_PROFILE_UPDATED", "Organization", organization.id, {});
    return res.json({ organization: updatedOrganization, profile });
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateCompanyCompliance = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.CSR_COMPANY);
    assertOnboardingEditable(organization);
    const profile = await prisma.cSRCompanyProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        csrApplicable: Boolean(req.body.csrApplicable),
        financialYear: req.body.financialYear,
        netWorth: asDecimalValue(req.body.netWorth),
        turnover: asDecimalValue(req.body.turnover),
        netProfit: asDecimalValue(req.body.netProfit),
        averageNetProfit: asDecimalValue(req.body.averageNetProfit),
        csrObligationAmount: asDecimalValue(req.body.csrObligationAmount),
        twoPercentCsrObligation: asDecimalValue(req.body.twoPercentCsrObligation),
        currentYearCsrBudget: asDecimalValue(req.body.currentYearCsrBudget),
        unspentCsrAmount: asDecimalValue(req.body.unspentCsrAmount),
        ongoingProjectAmount: asDecimalValue(req.body.ongoingProjectAmount),
        csrCommitteeApplicable: Boolean(req.body.csrCommitteeApplicable),
        csrCommitteeDetails: req.body.csrCommitteeDetails || undefined,
        csrCommitteeConstitutionDate: asDateValue(req.body.csrCommitteeConstitutionDate),
        csrPolicyApprovalDate: asDateValue(req.body.csrPolicyApprovalDate),
        boardApprovalStatus: req.body.boardApprovalStatus,
        csrHeadName: req.body.csrHeadName,
        csrHeadDesignation: req.body.csrHeadDesignation,
        csrHeadEmail: req.body.csrHeadEmail,
        csrHeadMobile: req.body.csrHeadMobile,
        financeOfficerName: req.body.financeOfficerName,
        financeOfficerDesignation: req.body.financeOfficerDesignation,
        financeOfficerEmail: req.body.financeOfficerEmail,
        authorizedSignatoryName: req.body.authorizedSignatoryName,
        authorizedSignatoryDesignation: req.body.authorizedSignatoryDesignation,
        authorizedSignatoryEmail: req.body.authorizedSignatoryEmail,
        authorizedSignatoryMobile: req.body.authorizedSignatoryMobile,
        authorizationReferenceNumber: req.body.authorizationReferenceNumber,
        preferredDistricts: [],
        preferredTalukas: [],
        preferredSectors: [],
        preferredBeneficiaryGroups: [],
        scheduleVIIFocusAreas: asStringArray(req.body.scheduleVIIFocusAreas),
        sdgFocusAreas: [],
        esgFocusAreas: []
      },
      update: {
        csrApplicable: Boolean(req.body.csrApplicable),
        financialYear: req.body.financialYear,
        netWorth: asDecimalValue(req.body.netWorth),
        turnover: asDecimalValue(req.body.turnover),
        netProfit: asDecimalValue(req.body.netProfit),
        averageNetProfit: asDecimalValue(req.body.averageNetProfit),
        csrObligationAmount: asDecimalValue(req.body.csrObligationAmount),
        twoPercentCsrObligation: asDecimalValue(req.body.twoPercentCsrObligation),
        currentYearCsrBudget: asDecimalValue(req.body.currentYearCsrBudget),
        unspentCsrAmount: asDecimalValue(req.body.unspentCsrAmount),
        ongoingProjectAmount: asDecimalValue(req.body.ongoingProjectAmount),
        csrCommitteeApplicable: Boolean(req.body.csrCommitteeApplicable),
        csrCommitteeDetails: req.body.csrCommitteeDetails || undefined,
        csrCommitteeConstitutionDate: asDateValue(req.body.csrCommitteeConstitutionDate),
        csrPolicyApprovalDate: asDateValue(req.body.csrPolicyApprovalDate),
        boardApprovalStatus: req.body.boardApprovalStatus,
        csrHeadName: req.body.csrHeadName,
        csrHeadDesignation: req.body.csrHeadDesignation,
        csrHeadEmail: req.body.csrHeadEmail,
        csrHeadMobile: req.body.csrHeadMobile,
        financeOfficerName: req.body.financeOfficerName,
        financeOfficerDesignation: req.body.financeOfficerDesignation,
        financeOfficerEmail: req.body.financeOfficerEmail,
        authorizedSignatoryName: req.body.authorizedSignatoryName,
        authorizedSignatoryDesignation: req.body.authorizedSignatoryDesignation,
        authorizedSignatoryEmail: req.body.authorizedSignatoryEmail,
        authorizedSignatoryMobile: req.body.authorizedSignatoryMobile,
        authorizationReferenceNumber: req.body.authorizationReferenceNumber,
        scheduleVIIFocusAreas: asStringArray(req.body.scheduleVIIFocusAreas)
      }
    });
    await audit(req, "CSR_COMPANY_COMPLIANCE_UPDATED", "CSRCompanyProfile", profile.id, {});
    return res.json(profile);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateCompanyPreferences = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.CSR_COMPANY);
    assertOnboardingEditable(organization);
    const profile = await prisma.cSRCompanyProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        preferredDistricts: asStringArray(req.body.preferredDistricts),
        preferredTalukas: asStringArray(req.body.preferredTalukas),
        preferredSectors: asStringArray(req.body.preferredSectors),
        preferredProjectSize: req.body.preferredProjectSize,
        preferredBeneficiaryGroups: asStringArray(req.body.preferredBeneficiaryGroups),
        scheduleVIIFocusAreas: asStringArray(req.body.scheduleVIIFocusAreas),
        sdgFocusAreas: asStringArray(req.body.sdgFocusAreas),
        esgFocusAreas: asStringArray(req.body.esgFocusAreas),
        minFundingAmount: asDecimalValue(req.body.minFundingAmount),
        maxFundingAmount: asDecimalValue(req.body.maxFundingAmount),
        fundingPreference: req.body.fundingPreference,
        implementationPreference: req.body.implementationPreference
      },
      update: {
        preferredDistricts: asStringArray(req.body.preferredDistricts),
        preferredTalukas: asStringArray(req.body.preferredTalukas),
        preferredSectors: asStringArray(req.body.preferredSectors),
        preferredProjectSize: req.body.preferredProjectSize,
        preferredBeneficiaryGroups: asStringArray(req.body.preferredBeneficiaryGroups),
        scheduleVIIFocusAreas: asStringArray(req.body.scheduleVIIFocusAreas),
        sdgFocusAreas: asStringArray(req.body.sdgFocusAreas),
        esgFocusAreas: asStringArray(req.body.esgFocusAreas),
        minFundingAmount: asDecimalValue(req.body.minFundingAmount),
        maxFundingAmount: asDecimalValue(req.body.maxFundingAmount),
        fundingPreference: req.body.fundingPreference,
        implementationPreference: req.body.implementationPreference
      }
    });
    await audit(req, "CSR_COMPANY_PREFERENCES_UPDATED", "CSRCompanyProfile", profile.id, {});
    return res.json(profile);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const submitCompanyOnboarding = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.CSR_COMPANY);
    assertOnboardingEditable(organization);
    const profile = await prisma.cSRCompanyProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        preferredDistricts: [],
        preferredTalukas: [],
        preferredSectors: [],
        preferredBeneficiaryGroups: [],
        scheduleVIIFocusAreas: [],
        sdgFocusAreas: [],
        esgFocusAreas: [],
        declarationAccepted: Boolean(req.body.declarationAccepted),
        declarationAcceptedAt: req.body.declarationAccepted ? new Date() : undefined
      },
      update: {
        declarationAccepted: Boolean(req.body.declarationAccepted),
        declarationAcceptedAt: req.body.declarationAccepted ? new Date() : undefined
      }
    });
    const errors = buildCompanyValidationErrors(organization, profile, organization.documents);
    if (!profile.declarationAccepted) errors.push("Declaration must be accepted before submission");
    if (errors.length) return res.status(400).json({ error: "Company onboarding is incomplete", validationErrors: errors });
    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: { onboardingStatus: OrganizationOnboardingStatus.SUBMITTED_FOR_REVIEW }
    });
    await audit(req, "CSR_COMPANY_ONBOARDING_SUBMITTED", "Organization", organization.id, {});
    return res.json(updated);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const getDepartmentOnboardingProfile = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.GOVERNMENT_DEPARTMENT);
    return res.json({ organization, profile: organization.governmentDepartmentProfile });
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateDepartmentOnboardingProfile = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.GOVERNMENT_DEPARTMENT);
    assertOnboardingEditable(organization);
    const updatedOrganization = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: req.body.departmentName || req.body.legalName || req.body.name || organization.name,
        legalName: req.body.departmentName || req.body.legalName || req.body.name,
        parentDepartment: req.body.parentDepartment,
        departmentCode: req.body.departmentCode,
        officialEmail: req.body.officialEmail,
        email: req.body.officialEmail,
        officialPhone: req.body.officePhone || req.body.officialPhone,
        phone: req.body.officePhone || req.body.officialPhone,
        website: req.body.website,
        address: req.body.officeAddress || req.body.address,
        stateId: req.body.state,
        district: req.body.district,
        districtId: req.body.districtId || req.body.district,
        taluka: req.body.taluka,
        talukaId: req.body.talukaId || req.body.taluka,
        villageId: req.body.villageId || req.body.villageOrCity,
        onboardingStatus: OrganizationOnboardingStatus.PROFILE_INCOMPLETE
      }
    });
    const profile = await prisma.governmentDepartmentProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        departmentType: req.body.departmentType,
        parentDepartment: req.body.parentDepartment,
        departmentCode: req.body.departmentCode,
        villageOrCity: req.body.villageOrCity,
        officeWebsite: req.body.website,
        officialEmailDomain: req.body.officialEmailDomain,
        officePhone: req.body.officePhone,
        governmentOfficeIdentifier: req.body.governmentOfficeIdentifier,
        allowedDistrictIds: [],
        allowedTalukaIds: [],
        allowedVillageIds: [],
        allowedSectors: [],
        requirementPermissionSectors: []
      },
      update: {
        departmentType: req.body.departmentType,
        parentDepartment: req.body.parentDepartment,
        departmentCode: req.body.departmentCode,
        villageOrCity: req.body.villageOrCity,
        officeWebsite: req.body.website,
        officialEmailDomain: req.body.officialEmailDomain,
        officePhone: req.body.officePhone,
        governmentOfficeIdentifier: req.body.governmentOfficeIdentifier
      }
    });
    await audit(req, "DEPARTMENT_ONBOARDING_PROFILE_UPDATED", "Organization", organization.id, {});
    return res.json({ organization: updatedOrganization, profile });
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateDepartmentNodalOfficer = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.GOVERNMENT_DEPARTMENT);
    assertOnboardingEditable(organization);
    const profile = await prisma.governmentDepartmentProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        nodalOfficerName: req.body.nodalOfficerName,
        nodalOfficerDesignation: req.body.nodalOfficerDesignation,
        nodalOfficerDepartment: req.body.nodalOfficerDepartment,
        nodalOfficerEmail: req.body.nodalOfficerEmail,
        nodalOfficerMobile: req.body.nodalOfficerMobile,
        nodalOfficerOfficePhone: req.body.nodalOfficerOfficePhone,
        nodalOfficerEmployeeId: req.body.nodalOfficerEmployeeId,
        reportingOfficerName: req.body.reportingOfficerName,
        reportingOfficerDesignation: req.body.reportingOfficerDesignation,
        reportingOfficerEmail: req.body.reportingOfficerEmail,
        allowedDistrictIds: [],
        allowedTalukaIds: [],
        allowedVillageIds: [],
        allowedSectors: [],
        requirementPermissionSectors: []
      },
      update: {
        nodalOfficerName: req.body.nodalOfficerName,
        nodalOfficerDesignation: req.body.nodalOfficerDesignation,
        nodalOfficerDepartment: req.body.nodalOfficerDepartment,
        nodalOfficerEmail: req.body.nodalOfficerEmail,
        nodalOfficerMobile: req.body.nodalOfficerMobile,
        nodalOfficerOfficePhone: req.body.nodalOfficerOfficePhone,
        nodalOfficerEmployeeId: req.body.nodalOfficerEmployeeId,
        reportingOfficerName: req.body.reportingOfficerName,
        reportingOfficerDesignation: req.body.reportingOfficerDesignation,
        reportingOfficerEmail: req.body.reportingOfficerEmail
      }
    });
    await audit(req, "DEPARTMENT_NODAL_OFFICER_UPDATED", "GovernmentDepartmentProfile", profile.id, {});
    return res.json(profile);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateDepartmentAuthorization = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.GOVERNMENT_DEPARTMENT);
    assertOnboardingEditable(organization);
    const profile = await prisma.governmentDepartmentProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        authorizationLetterNumber: req.body.authorizationLetterNumber,
        authorizationLetterDate: asDateValue(req.body.authorizationLetterDate),
        issuingAuthorityName: req.body.issuingAuthorityName,
        issuingAuthorityDesignation: req.body.issuingAuthorityDesignation,
        canCreateRequirements: Boolean(req.body.canCreateRequirements),
        canConfirmHandover: Boolean(req.body.canConfirmHandover),
        canUploadOfficialDocuments: Boolean(req.body.canUploadOfficialDocuments),
        departmentApprovalRequired: Boolean(req.body.departmentApprovalRequired),
        internalApprovalReference: req.body.internalApprovalReference,
        allowedDistrictIds: [],
        allowedTalukaIds: [],
        allowedVillageIds: [],
        allowedSectors: [],
        requirementPermissionSectors: []
      },
      update: {
        authorizationLetterNumber: req.body.authorizationLetterNumber,
        authorizationLetterDate: asDateValue(req.body.authorizationLetterDate),
        issuingAuthorityName: req.body.issuingAuthorityName,
        issuingAuthorityDesignation: req.body.issuingAuthorityDesignation,
        canCreateRequirements: Boolean(req.body.canCreateRequirements),
        canConfirmHandover: Boolean(req.body.canConfirmHandover),
        canUploadOfficialDocuments: Boolean(req.body.canUploadOfficialDocuments),
        departmentApprovalRequired: Boolean(req.body.departmentApprovalRequired),
        internalApprovalReference: req.body.internalApprovalReference
      }
    });
    await audit(req, "DEPARTMENT_AUTHORIZATION_UPDATED", "GovernmentDepartmentProfile", profile.id, {});
    return res.json(profile);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateDepartmentJurisdiction = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.GOVERNMENT_DEPARTMENT);
    assertOnboardingEditable(organization);
    const profile = await prisma.governmentDepartmentProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        jurisdictionType: req.body.jurisdictionType,
        allowedDistrictIds: asStringArray(req.body.allowedDistrictIds),
        allowedTalukaIds: asStringArray(req.body.allowedTalukaIds),
        allowedVillageIds: asStringArray(req.body.allowedVillageIds),
        allowedSectors: asStringArray(req.body.allowedSectors),
        canCreateStateLevelRequirement: Boolean(req.body.canCreateStateLevelRequirement),
        canCreateDistrictLevelRequirement: Boolean(req.body.canCreateDistrictLevelRequirement),
        canCreateLocalBodyLevelRequirement: Boolean(req.body.canCreateLocalBodyLevelRequirement),
        requiresDistrictVerification: Boolean(req.body.requiresDistrictVerification),
        requirementPermissionSectors: []
      },
      update: {
        jurisdictionType: req.body.jurisdictionType,
        allowedDistrictIds: asStringArray(req.body.allowedDistrictIds),
        allowedTalukaIds: asStringArray(req.body.allowedTalukaIds),
        allowedVillageIds: asStringArray(req.body.allowedVillageIds),
        allowedSectors: asStringArray(req.body.allowedSectors),
        canCreateStateLevelRequirement: Boolean(req.body.canCreateStateLevelRequirement),
        canCreateDistrictLevelRequirement: Boolean(req.body.canCreateDistrictLevelRequirement),
        canCreateLocalBodyLevelRequirement: Boolean(req.body.canCreateLocalBodyLevelRequirement),
        requiresDistrictVerification: Boolean(req.body.requiresDistrictVerification)
      }
    });
    await audit(req, "DEPARTMENT_JURISDICTION_UPDATED", "GovernmentDepartmentProfile", profile.id, {});
    return res.json(profile);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const updateDepartmentPermissions = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.GOVERNMENT_DEPARTMENT);
    assertOnboardingEditable(organization);
    const profile = await prisma.governmentDepartmentProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        allowedDistrictIds: [],
        allowedTalukaIds: [],
        allowedVillageIds: [],
        allowedSectors: [],
        requirementPermissionSectors: asStringArray(req.body.requirementPermissionSectors)
      },
      update: {
        requirementPermissionSectors: asStringArray(req.body.requirementPermissionSectors)
      }
    });
    await audit(req, "DEPARTMENT_REQUIREMENT_PERMISSIONS_UPDATED", "GovernmentDepartmentProfile", profile.id, {});
    return res.json(profile);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const submitDepartmentOnboarding = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organization = await getOwnedOrganization(req, OrganizationKind.GOVERNMENT_DEPARTMENT);
    assertOnboardingEditable(organization);
    const profile = await prisma.governmentDepartmentProfile.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        allowedDistrictIds: [],
        allowedTalukaIds: [],
        allowedVillageIds: [],
        allowedSectors: [],
        requirementPermissionSectors: [],
        declarationAccepted: Boolean(req.body.declarationAccepted),
        declarationAcceptedAt: req.body.declarationAccepted ? new Date() : undefined
      },
      update: {
        declarationAccepted: Boolean(req.body.declarationAccepted),
        declarationAcceptedAt: req.body.declarationAccepted ? new Date() : undefined
      }
    });
    const errors = buildDepartmentValidationErrors(organization, profile, organization.documents);
    if (!profile.declarationAccepted) errors.push("Declaration must be accepted before submission");
    if (errors.length) return res.status(400).json({ error: "Government Department onboarding is incomplete", validationErrors: errors });
    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: { onboardingStatus: OrganizationOnboardingStatus.SUBMITTED_FOR_REVIEW }
    });
    await audit(req, "DEPARTMENT_ONBOARDING_SUBMITTED", "Organization", organization.id, {});
    return res.json(updated);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const submitOnboarding = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.tenantContext?.organizationId || req.user?.organizationId;
    if (!organizationId) return res.status(400).json({ error: "Organization is not assigned to this account" });
    const existing = await prisma.organization.findUnique({ where: { id: organizationId }, select: { onboardingStatus: true } });
    if (!existing) return res.status(404).json({ error: "Organization not found" });
    assertOnboardingEditable(existing);
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: { onboardingStatus: OrganizationOnboardingStatus.SUBMITTED_FOR_REVIEW }
    });
    await audit(req, "ORGANIZATION_ONBOARDING_SUBMITTED", "Organization", organization.id, {});
    return res.json(organization);
  } catch (error) {
    return handleScopedError(error, res, next);
  }
};

export const listPermissions = async (_req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
    return res.json(permissions);
  } catch (error) {
    return next(error);
  }
};

export const listOrgRoles = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.organizationRole.findMany({
      where: {
        organizationId: req.tenantContext?.organizationId || undefined
      },
      include: { rolePermissions: { include: { permission: true } }, _count: { select: { userRoles: true } } },
      orderBy: { name: "asc" }
    });
    return res.json(roles);
  } catch (error) {
    return next(error);
  }
};

export const createOrgRole = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const permissionKeys: string[] = req.body.permissionKeys || [];
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
    const role = await prisma.organizationRole.create({
      data: {
        organizationId: req.tenantContext?.organizationId || null,
        name: req.body.name,
        description: req.body.description,
        scope: RoleScope.ORGANIZATION,
        createdBy: req.user?.id,
        rolePermissions: {
          create: permissions.map((permission) => ({ permissionId: permission.id }))
        }
      },
      include: { rolePermissions: { include: { permission: true } } }
    });
    await audit(req, "ORGANIZATION_ROLE_CREATED", "OrganizationRole", role.id, { name: role.name });
    return res.status(201).json(role);
  } catch (error) {
    return next(error);
  }
};

export const updateOrgRole = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const permissionKeys: string[] | undefined = req.body.permissionKeys;
    const role = await prisma.organizationRole.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description
      }
    });
    if (permissionKeys) {
      const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
      await prisma.organizationRolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.organizationRolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
        skipDuplicates: true
      });
    }
    await audit(req, "ORGANIZATION_ROLE_UPDATED", "OrganizationRole", role.id, { name: role.name });
    return listOrgRoles(req, res, next);
  } catch (error) {
    return next(error);
  }
};

export const deleteOrgRole = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const assigned = await prisma.userOrganizationRole.count({ where: { roleId: req.params.id } });
    if (assigned > 0) return res.status(400).json({ error: "Cannot delete a role assigned to users" });
    await prisma.organizationRole.delete({ where: { id: req.params.id } });
    await audit(req, "ORGANIZATION_ROLE_DELETED", "OrganizationRole", req.params.id, {});
    return res.json({ message: "Role deleted" });
  } catch (error) {
    return next(error);
  }
};

export const listOrgUsers = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        organizationId: req.tenantContext?.organizationId || undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        isVerified: true,
        organizationId: true,
        organizationRoles: { include: { role: true } },
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

export const inviteOrgUser = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantContext?.tenantId;
    const organizationId = req.tenantContext?.organizationId;
    if (!tenantId || !organizationId) return res.status(400).json({ error: "Organization context is required" });
    if (!req.body.email) return res.status(422).json({ error: "email is required" });

    const email = String(req.body.email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "A user with this email already exists" });

    // SECURITY: never accept or default a password here. The account is
    // created unusable (random hash, PENDING_ACTIVATION) and the invitee
    // sets their own password via a single-use expiring activation link.
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: placeholderHash,
        role: req.body.role || Role.NGO_MEMBER,
        organizationId,
        isVerified: false,
        accountStatus: "PENDING_ACTIVATION"
      }
    });
    if (req.body.roleId) {
      await prisma.userOrganizationRole.create({
        data: { userId: user.id, roleId: req.body.roleId, organizationId }
      });
    }

    const { activationUrl } = await createInvitation({
      userId: user.id,
      email,
      createdById: req.user!.id,
      purpose: "ORG_USER_ACTIVATION"
    });

    dispatchNotification({
      recipientId: user.id,
      templateName: "ORG_USER_INVITED",
      variables: { email },
      actionButtonUrl: activationUrl,
      notificationType: "ORG_USER_INVITED"
    }).catch((error) => console.error("Invitation notification failed:", error));

    await audit(req, "ORGANIZATION_USER_INVITED", "User", user.id, { email: user.email });
    return res.status(201).json({ id: user.id, email: user.email, role: user.role, accountStatus: user.accountStatus });
  } catch (error) {
    if (error instanceof InvitationError) {
      return res.status((error as any).status || 400).json({ error: error.message });
    }
    return next(error);
  }
};

export const updateOrgUserRole = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.body.roleId) return res.status(400).json({ error: "roleId is required" });
    await prisma.userOrganizationRole.deleteMany({
      where: { userId: req.params.id, organizationId: req.tenantContext?.organizationId || undefined }
    });
    const assignment = await prisma.userOrganizationRole.create({
      data: {
        userId: req.params.id,
        roleId: req.body.roleId,
        organizationId: req.tenantContext?.organizationId || null
      }
    });
    await audit(req, "ORGANIZATION_USER_ROLE_UPDATED", "User", req.params.id, { roleId: req.body.roleId });
    return res.json(assignment);
  } catch (error) {
    return next(error);
  }
};

export const updateOrgUserStatus = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { accountStatus: req.body.accountStatus }
    });
    await audit(req, "ORGANIZATION_USER_STATUS_UPDATED", "User", user.id, { accountStatus: user.accountStatus });
    return res.json({ id: user.id, email: user.email, role: user.role, accountStatus: user.accountStatus });
  } catch (error) {
    return next(error);
  }
};
