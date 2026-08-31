import { Request, Response, NextFunction } from "express";
import { OrganizationStatus, OrganizationKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/db";
import { getPrimaryFrontendUrl } from "../config/env";
import { ROLE_ID } from "../types/role";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { notifyHierarchy } from "../services/hierarchyNotificationService";
import { sendUserInvitationEmail } from "../services/emailService";
import { clearCachePattern } from "../config/redis";

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
    const LOCKED_STATUSES = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "APPROVED", "SUSPENDED"];
    const currentStatus = ((organization as any).onboardingStatus || "").toUpperCase();
    if (currentStatus && LOCKED_STATUSES.includes(currentStatus)) {
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

    // ── Role-based organization scoping ──────────────────────────────────
    const roleId = Number(req.user?.roleId);
    const PLATFORM_ROLES = [1, 2, 3, 4, 5, 6]; // SUPER_ADMIN through RELATIONSHIP_MANAGER
    if (roleId === 7 && req.user?.organizationId) {
      // Government Officer — scope based on org hierarchy level
      const userOrg = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { id: true, district: true, parentOrganizationId: true, governmentLevel: true }
      });

      if (userOrg) {
        const isSubDept = Boolean(userOrg.parentOrganizationId) || userOrg.governmentLevel === "SUB_DEPARTMENT";
        if (isSubDept) {
          // Sub-department admin: can only see their own organization
          whereClause.id = userOrg.id;
        } else {
          // Main department admin: can only see organizations in their district
          const userDistrict = userOrg.district || req.user.assignedDistrict;
          if (userDistrict) {
            whereClause.district = { equals: userDistrict, mode: "insensitive" };
          } else {
            // No district set — strict enforcement: show nothing
            whereClause.id = "__no_district_configured__";
          }
        }
      }
    } else if (!PLATFORM_ROLES.includes(roleId)) {
      // Non-platform, non-gov roles: can only see their own org
      if (req.user?.organizationId) {
        whereClause.id = req.user.organizationId;
      }
    }
    // Platform roles (1-6) bypass scoping — see everything

    if (targetKind && targetKind !== "ALL") {
      if (targetKind === "CSR_COMPANY" || targetKind === "CORPORATE") {
        whereClause.OR = [
          { kind: OrganizationKind.CSR_COMPANY },
          { csrCompanyProfile: { isNot: null } }
        ];
      } else if (targetKind === "NGO" || targetKind === "IMPLEMENTING_AGENCY") {
        whereClause.OR = [
          { kind: OrganizationKind.NGO },
          { kind: OrganizationKind.IMPLEMENTING_AGENCY },
          { ngoProfile: { isNot: null } }
        ];
      } else if (targetKind === "GOVERNMENT_DEPARTMENT" || targetKind === "GOVT_DEPT") {
        whereClause.OR = [
          { kind: OrganizationKind.GOVERNMENT_DEPARTMENT },
          { govDeptProfile: { isNot: null } }
        ];
      } else if (Object.values(OrganizationKind).includes(targetKind as OrganizationKind)) {
        whereClause.kind = targetKind as OrganizationKind;
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
            { legalName: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { cin: { contains: q, mode: "insensitive" } },
            { registrationNumber: { contains: q, mode: "insensitive" } },
            { ngoProfile: { darpanNumber: { contains: q, mode: "insensitive" } } },
            { ngoProfile: { csr1Number: { contains: q, mode: "insensitive" } } },
            { csrCompanyProfile: { cin: { contains: q, mode: "insensitive" } } },
            { csrCompanyProfile: { csrRegistrationNumber: { contains: q, mode: "insensitive" } } }
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
      if (kind === "CSR_COMPANY" || kind === "CORPORATE") {
        whereClause.OR = [
          { kind: OrganizationKind.CSR_COMPANY },
          { csrCompanyProfile: { isNot: null } }
        ];
      } else if (kind === "NGO" || kind === "IMPLEMENTING_AGENCY") {
        whereClause.OR = [
          { kind: OrganizationKind.NGO },
          { kind: OrganizationKind.IMPLEMENTING_AGENCY },
          { ngoProfile: { isNot: null } }
        ];
      } else if (kind === "GOVERNMENT_DEPARTMENT" || kind === "GOVT_DEPT") {
        whereClause.OR = [
          { kind: OrganizationKind.GOVERNMENT_DEPARTMENT },
          { govDeptProfile: { isNot: null } }
        ];
      } else if (Object.values(OrganizationKind).includes(kind as OrganizationKind)) {
        whereClause.kind = kind as OrganizationKind;
      }
    }

    const orgs = await prisma.organization.findMany({
      where: whereClause,
      include: {
        csrCompanyProfile: true,
        ngoProfile: true,
        govDeptProfile: true,
        documents: true,
        users: {
          select: { id: true, email: true, firstName: true, lastName: true, designation: true, mobile: true, roleId: true }
        }
      },
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
      include: {
        csrCompanyProfile: true,
        ngoProfile: true,
        govDeptProfile: true,
        documents: true,
        users: {
          select: { id: true, email: true, firstName: true, lastName: true, designation: true, mobile: true, roleId: true }
        }
      }
    });
    if (!organization) return res.status(404).json({ error: "Organization not found" });

    // ── Role-based view guard ──────────────────────────────────────────
    const roleId = Number(req.user?.roleId);
    const PLATFORM_ROLES = [1, 2, 3, 4, 5, 6];
    if (roleId === 7 && req.user?.organizationId) {
      const userOrg = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { id: true, district: true, parentOrganizationId: true, governmentLevel: true }
      });
      if (userOrg) {
        const isSubDept = Boolean(userOrg.parentOrganizationId) || userOrg.governmentLevel === "SUB_DEPARTMENT";
        if (isSubDept) {
          if (organization.id !== userOrg.id) {
            return res.status(403).json({ error: "Forbidden: You can only view your own organization." });
          }
        } else {
          const isOwnOrChild = organization.id === userOrg.id || organization.parentOrganizationId === userOrg.id;
          if (!isOwnOrChild) {
            const userDistrict = userOrg.district || req.user.assignedDistrict;
            if (userDistrict && organization.district?.toLowerCase() !== userDistrict.toLowerCase()) {
              return res.status(403).json({ error: "Forbidden: You can only view organizations in your assigned district." });
            }
          }
        }
      }
    } else if (!PLATFORM_ROLES.includes(roleId) && req.user?.organizationId) {
      if (organization.id !== req.user.organizationId) {
        return res.status(403).json({ error: "Forbidden: You can only view your own organization." });
      }
    }

    return res.json(organization);
  } catch (error) {
    next(error);
  }
};

export const approveOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await prisma.organization.update({
      where: { id: req.params.id },
      data: {
        status: "ACTIVE",
        clarificationRemarks: null,
        rejectionReason: null
      }
    });

    // Activate all users linked to this organization
    await prisma.user.updateMany({
      where: { organizationId: updated.id },
      data: { accountStatus: "ACTIVE", isVerified: true }
    });

    // Update any pending onboarding applications for this org
    await prisma.governmentOnboardingApplication.updateMany({
      where: { organizationId: updated.id, status: "UNDER_VERIFICATION" },
      data: { status: "APPROVED", decision: "APPROVE", decidedAt: new Date() }
    });

    // Invalidate Redis and L1 RAM caches immediately
    await clearCachePattern(`*${updated.id}*`).catch(() => {});
    await clearCachePattern(`dashboard:summary:*`).catch(() => {});
    await clearCachePattern(`auth:permissions:*`).catch(() => {});

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "ORGANIZATION_ONBOARDING_APPROVED",
        entityType: "Organization",
        entityId: updated.id,
        actorUserId: req.user?.id || null,
        details: {
          orgName: updated.name,
          orgKind: updated.kind,
          approvedByUserId: req.user?.id
        }
      }
    }).catch(() => {});

    notifyHierarchy({
      title: "Organization Onboarding Approved",
      message: `Organization "${updated.name}" has been approved and activated on the MahaCSR Portal.`,
      organizationId: updated.id,
      district: updated.district,
      includeOrgUsers: true,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      includeDistrictOfficers: true,
      actionButtonUrl: `/organization/onboarding/status`,
      variables: {
        currentStatus: "APPROVED",
        workflowStatus: `Organization "${updated.name}" has been approved and activated.`
      }
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

    // Invalidate caches
    await clearCachePattern(`*${updated.id}*`).catch(() => {});
    await clearCachePattern(`dashboard:summary:*`).catch(() => {});
    await clearCachePattern(`auth:permissions:*`).catch(() => {});

    notifyHierarchy({
      title: "Organization Onboarding Rejected",
      message: `Organization "${updated.name}" onboarding request has been rejected. Reason: ${reason}`,
      organizationId: updated.id,
      district: updated.district,
      includeOrgUsers: true,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      includeDistrictOfficers: true,
      actionButtonUrl: `/organization/onboarding/status`,
      variables: {
        currentStatus: "REJECTED",
        workflowStatus: reason
      }
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

    // Invalidate caches
    await clearCachePattern(`*${updated.id}*`).catch(() => {});
    await clearCachePattern(`dashboard:summary:*`).catch(() => {});
    await clearCachePattern(`auth:permissions:*`).catch(() => {});

    notifyHierarchy({
      title: "Organization Account Suspended",
      message: `Organization "${updated.name}" status has been updated to suspended. Reason: ${reason}`,
      organizationId: updated.id,
      district: updated.district,
      includeOrgUsers: true,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      includeDistrictOfficers: true,
      actionButtonUrl: `/organization/onboarding/status`,
      variables: {
        currentStatus: "SUSPENDED",
        workflowStatus: reason
      }
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

    // Invalidate caches
    await clearCachePattern(`*${updated.id}*`).catch(() => {});
    await clearCachePattern(`dashboard:summary:*`).catch(() => {});
    await clearCachePattern(`auth:permissions:*`).catch(() => {});

    notifyHierarchy({
      title: "Clarification Required for Onboarding",
      message: `Clarification requested for organization "${updated.name}". Remarks: ${remarks}`,
      organizationId: updated.id,
      district: updated.district,
      includeOrgUsers: true,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      includeDistrictOfficers: true,
      actionButtonUrl: `/organization/onboarding/status?highlight=clarification`,
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
      actionButtonUrl: `/admin/onboarding-approvals?orgId=${updated.id}&highlight=${encodeURIComponent(updated.name)}`
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
    const org = await getOwnedOrganization(req, "CSR_COMPANY", true);
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
        ...(text("taluka") !== undefined ? { taluka: text("taluka") } : {}),
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
    const org = await getOwnedOrganization(req, "CSR_COMPANY", true);
    const body = req.body || {};
    const numberValue = (key: string) => body[key] === "" || body[key] === undefined || body[key] === null ? null : Number(body[key]);
    
    const budget = numberValue("annualCsrBudget") || numberValue("currentYearCsrBudget");
    const avgProfit = numberValue("averageNetProfit") || numberValue("netProfit");
    const twoPercent = numberValue("twoPercentCsrObligation") || (avgProfit ? avgProfit * 0.02 : null);
    const obligation = numberValue("csrObligationAmount") || twoPercent || budget;

    const profile = await prisma.cSRCompanyProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        preferredDistricts: Array.isArray(body.preferredDistricts) ? body.preferredDistricts : [],
        preferredSectors: Array.isArray(body.preferredSectors) ? body.preferredSectors : [],
        currentYearCsrBudget: budget,
        annualCsrBudget: budget,
        netWorth: numberValue("netWorth"),
        turnover: numberValue("turnover"),
        netProfit: numberValue("netProfit"),
        averageNetProfit: avgProfit,
        csrObligationAmount: obligation,
        unspentCsrAmount: numberValue("unspentCsrAmount"),
        twoPercentCsrObligation: twoPercent,
        csrRegistrationNo: body.csrRegistrationNo || body.csr1Number || null,
        financialYear: body.financialYear || "FY 2025-26",
        csrApplicable: typeof body.csrApplicable === "boolean" ? body.csrApplicable : true,
        csrHeadName: body.csrHeadName || null,
        csrHeadEmail: body.csrHeadEmail || null,
        csrHeadMobile: body.csrHeadMobile || null,
        preferredDivisions: Array.isArray(body.preferredDivisions) ? body.preferredDivisions : [],
        preferredCities: Array.isArray(body.preferredCities) ? body.preferredCities : [],
        preferredTalukas: Array.isArray(body.preferredTalukas) ? body.preferredTalukas : []
      },
      update: {
        currentYearCsrBudget: budget,
        annualCsrBudget: budget,
        netWorth: numberValue("netWorth"),
        turnover: numberValue("turnover"),
        netProfit: numberValue("netProfit"),
        averageNetProfit: avgProfit,
        csrObligationAmount: obligation,
        unspentCsrAmount: numberValue("unspentCsrAmount"),
        twoPercentCsrObligation: twoPercent,
        csrRegistrationNo: body.csrRegistrationNo || body.csr1Number || undefined,
        financialYear: body.financialYear || undefined,
        csrApplicable: typeof body.csrApplicable === "boolean" ? body.csrApplicable : undefined,
        csrHeadName: body.csrHeadName || undefined,
        csrHeadEmail: body.csrHeadEmail || undefined,
        csrHeadMobile: body.csrHeadMobile || undefined
      }
    });
    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const updateCompanyPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "CSR_COMPANY", true);
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
        preferredDistricts: Array.isArray(body.preferredDistricts) ? body.preferredDistricts : undefined,
        preferredSectors: Array.isArray(body.preferredSectors) ? body.preferredSectors : undefined,
        preferredDivisions: Array.isArray(body.preferredDivisions) ? body.preferredDivisions : undefined,
        preferredCities: Array.isArray(body.preferredCities) ? body.preferredCities : undefined,
        preferredTalukas: Array.isArray(body.preferredTalukas) ? body.preferredTalukas : undefined,
        preferredProjectSize: body.preferredProjectSize || undefined,
        minFundingAmount: body.minFundingAmount ? parseFloat(body.minFundingAmount) : undefined,
        maxFundingAmount: body.maxFundingAmount ? parseFloat(body.maxFundingAmount) : undefined,
        fundingPreference: body.fundingPreference || undefined,
        implementationPreference: body.implementationPreference || undefined,
        preferredBeneficiaryGroups: formatStr(body.preferredBeneficiaryGroups) || undefined,
        sdgFocusAreas: formatStr(body.sdgFocusAreas) || undefined
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
    const org = await getOwnedOrganization(req, "CSR_COMPANY", true);
    const body = req.body || {};

    const numberValue = (key: string) => body[key] === "" || body[key] === undefined || body[key] === null ? null : Number(body[key]);
    const budget = numberValue("annualCsrBudget") || numberValue("currentYearCsrBudget");
    const avgProfit = numberValue("averageNetProfit") || numberValue("netProfit");
    const twoPercent = numberValue("twoPercentCsrObligation") || (avgProfit ? avgProfit * 0.02 : null);
    const obligation = numberValue("csrObligationAmount") || twoPercent || budget;
    const formatStr = (val: any) => {
      if (!val) return null;
      if (Array.isArray(val)) return val.join(", ");
      return String(val);
    };

    // 1. Update Organization core details if provided
    const orgUpdateData: any = {
      status: "UNDER_VERIFICATION",
      clarificationRemarks: null,
    };
    if (body.legalName) orgUpdateData.legalName = String(body.legalName).trim();
    if (body.displayName) orgUpdateData.displayName = String(body.displayName).trim();
    if (body.cin) orgUpdateData.cin = String(body.cin).trim();
    if (body.pan) orgUpdateData.pan = String(body.pan).trim();
    if (body.gstin) orgUpdateData.gstin = String(body.gstin).trim();
    if (body.officialEmail) orgUpdateData.officialEmail = String(body.officialEmail).trim();
    if (body.officialPhone) orgUpdateData.officialPhone = String(body.officialPhone).trim();
    if (body.website) orgUpdateData.website = String(body.website).trim();
    if (body.address) orgUpdateData.address = String(body.address).trim();
    if (body.registeredOfficeAddress) orgUpdateData.registeredOfficeAddress = String(body.registeredOfficeAddress).trim();
    if (body.corporateOfficeAddress) orgUpdateData.corporateOfficeAddress = String(body.corporateOfficeAddress).trim();
    if (body.companyType) orgUpdateData.companyType = String(body.companyType).trim();
    if (body.district) orgUpdateData.district = String(body.district).trim();
    if (body.taluka) orgUpdateData.taluka = String(body.taluka).trim();
    if (body.state) orgUpdateData.state = String(body.state).trim();
    if (body.pincode) orgUpdateData.pincode = String(body.pincode).trim();
    if (body.yearOfIncorporation) orgUpdateData.yearOfIncorporation = Number(body.yearOfIncorporation);

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: orgUpdateData,
      include: { csrCompanyProfile: true, documents: true }
    });

    // 2. Upsert CSR Company Profile details
    if (
      budget !== null ||
      avgProfit !== null ||
      body.netWorth !== undefined ||
      body.turnover !== undefined ||
      body.netProfit !== undefined ||
      body.preferredSectors ||
      body.preferredDistricts
    ) {
      await prisma.cSRCompanyProfile.upsert({
        where: { organizationId: org.id },
        create: {
          organizationId: org.id,
          currentYearCsrBudget: budget,
          annualCsrBudget: budget,
          netWorth: numberValue("netWorth"),
          turnover: numberValue("turnover"),
          netProfit: numberValue("netProfit"),
          averageNetProfit: avgProfit,
          csrObligationAmount: obligation,
          unspentCsrAmount: numberValue("unspentCsrAmount"),
          twoPercentCsrObligation: twoPercent,
          csrRegistrationNo: body.csrRegistrationNo || body.csr1Number || null,
          financialYear: body.financialYear || "FY 2025-26",
          csrApplicable: typeof body.csrApplicable === "boolean" ? body.csrApplicable : true,
          csrHeadName: body.csrHeadName || null,
          csrHeadEmail: body.csrHeadEmail || null,
          csrHeadMobile: body.csrHeadMobile || null,
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
          currentYearCsrBudget: budget !== null ? budget : undefined,
          annualCsrBudget: budget !== null ? budget : undefined,
          netWorth: numberValue("netWorth") !== null ? numberValue("netWorth") : undefined,
          turnover: numberValue("turnover") !== null ? numberValue("turnover") : undefined,
          netProfit: numberValue("netProfit") !== null ? numberValue("netProfit") : undefined,
          averageNetProfit: avgProfit !== null ? avgProfit : undefined,
          csrObligationAmount: obligation !== null ? obligation : undefined,
          unspentCsrAmount: numberValue("unspentCsrAmount") !== null ? numberValue("unspentCsrAmount") : undefined,
          twoPercentCsrObligation: twoPercent !== null ? twoPercent : undefined,
          csrRegistrationNo: body.csrRegistrationNo || body.csr1Number || undefined,
          financialYear: body.financialYear || undefined,
          csrApplicable: typeof body.csrApplicable === "boolean" ? body.csrApplicable : undefined,
          csrHeadName: body.csrHeadName || undefined,
          csrHeadEmail: body.csrHeadEmail || undefined,
          csrHeadMobile: body.csrHeadMobile || undefined,
          preferredDistricts: Array.isArray(body.preferredDistricts) ? body.preferredDistricts : undefined,
          preferredSectors: Array.isArray(body.preferredSectors) ? body.preferredSectors : undefined,
          preferredDivisions: Array.isArray(body.preferredDivisions) ? body.preferredDivisions : undefined,
          preferredCities: Array.isArray(body.preferredCities) ? body.preferredCities : undefined,
          preferredTalukas: Array.isArray(body.preferredTalukas) ? body.preferredTalukas : undefined,
          preferredProjectSize: body.preferredProjectSize || undefined,
          minFundingAmount: body.minFundingAmount ? parseFloat(body.minFundingAmount) : undefined,
          maxFundingAmount: body.maxFundingAmount ? parseFloat(body.maxFundingAmount) : undefined,
          fundingPreference: body.fundingPreference || undefined,
          implementationPreference: body.implementationPreference || undefined,
          preferredBeneficiaryGroups: formatStr(body.preferredBeneficiaryGroups) || undefined,
          sdgFocusAreas: formatStr(body.sdgFocusAreas) || undefined
        }
      });
    }

    // Invalidate caches
    await clearCachePattern(`*${updated.id}*`).catch(() => {});
    await clearCachePattern(`dashboard:summary:*`).catch(() => {});

    notifyHierarchy({
      title: "New CSR Company Onboarding Submitted",
      message: `CSR Company "${updated.name}" submitted onboarding application for verification.`,
      organizationId: updated.id,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      actionButtonUrl: `/admin/onboarding-approvals?orgId=${updated.id}&highlight=${encodeURIComponent(updated.name)}`
    }).catch(err => console.error("Notification dispatch failed:", err));

    const finalSaved = await prisma.organization.findUnique({
      where: { id: updated.id },
      include: { csrCompanyProfile: true, documents: true, users: true }
    });

    return res.json(finalSaved || updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getDepartmentOnboardingProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT", true);
    
    // Fetch latest onboarding application to pull registration head and nodal details
    const app = await prisma.governmentOnboardingApplication.findFirst({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" }
    });

    const [headUser, nodalUser] = await Promise.all([
      org.departmentHeadUserId ? prisma.user.findUnique({ where: { id: org.departmentHeadUserId } }) : null,
      org.operationalNodalUserId ? prisma.user.findUnique({ where: { id: org.operationalNodalUserId } }) : null
    ]);

    const regData = (app?.formData as Record<string, any>) || {};

    const govDept = (org.govDeptProfile || {}) as Record<string, any>;
    const profileData = {
      ...govDept,
      headOfDepartmentName: govDept.headOfDepartmentName || regData.head?.name || (headUser ? `${headUser.firstName} ${headUser.lastName || ""}`.trim() : ""),
      headDesignation: govDept.headDesignation || regData.head?.designation || headUser?.designation || "",
      headEmail: govDept.headEmail || regData.head?.email || headUser?.email || "",
      headMobile: govDept.headMobile || regData.head?.mobile || headUser?.mobile || "",
      nodalOfficerName: govDept.nodalOfficerName || regData.nodal?.name || (nodalUser ? `${nodalUser.firstName} ${nodalUser.lastName || ""}`.trim() : ""),
      nodalOfficerDesignation: govDept.nodalOfficerDesignation || regData.nodal?.designation || nodalUser?.designation || "",
      nodalOfficerEmail: govDept.nodalOfficerEmail || regData.nodal?.email || nodalUser?.email || "",
      nodalOfficerMobile: govDept.nodalOfficerMobile || regData.nodal?.mobile || nodalUser?.mobile || ""
    };

    return res.json({ organization: org, profile: profileData });
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
    const body = req.body || {};

    // Update main organization fields if provided
    if (body.name || body.address || body.district || body.officialEmail || body.officialPhone || body.website) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          ...(body.name ? { name: String(body.name).trim() } : {}),
          ...(body.address ? { address: String(body.address).trim() } : {}),
          ...(body.district ? { district: String(body.district).trim() } : {}),
          ...(body.officialEmail ? { officialEmail: String(body.officialEmail).trim().toLowerCase() } : {}),
          ...(body.officialPhone ? { officialPhone: String(body.officialPhone).trim() } : {}),
          ...(body.website ? { website: String(body.website).trim() } : {}),
        }
      });
    }

    const profile = await prisma.govDepartmentProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        parentDepartment: body.parentDepartment || null,
        departmentCode: body.departmentCode || null,
        nodalOfficerName: body.nodalOfficerName || null,
        nodalOfficerDesignation: body.nodalOfficerDesignation || null,
        nodalOfficerEmail: body.nodalOfficerEmail || null,
        nodalOfficerMobile: body.nodalOfficerMobile || null,
      },
      update: {
        ...(body.parentDepartment !== undefined ? { parentDepartment: body.parentDepartment } : {}),
        ...(body.departmentCode !== undefined ? { departmentCode: body.departmentCode } : {}),
        ...(body.nodalOfficerName !== undefined ? { nodalOfficerName: body.nodalOfficerName } : {}),
        ...(body.nodalOfficerDesignation !== undefined ? { nodalOfficerDesignation: body.nodalOfficerDesignation } : {}),
        ...(body.nodalOfficerEmail !== undefined ? { nodalOfficerEmail: body.nodalOfficerEmail } : {}),
        ...(body.nodalOfficerMobile !== undefined ? { nodalOfficerMobile: body.nodalOfficerMobile } : {}),
      }
    });

    if (body.nodalOfficerEmail && String(body.nodalOfficerEmail).trim()) {
      await syncNodalOfficerUser(org, body, req.user?.id).catch((e) =>
        console.warn("[Onboarding] Error syncing nodal officer user:", e?.message)
      );
    }

    return res.json(profile);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

const syncNodalOfficerUser = async (org: any, body: any, parentUserId?: string | null) => {
  const nodalEmail = String(body.nodalOfficerEmail || "").trim().toLowerCase();
  if (!nodalEmail || !/^\S+@\S+\.\S+$/.test(nodalEmail)) return null;

  const nameParts = String(body.nodalOfficerName || "Nodal Officer").trim().split(/\s+/);
  const firstName = nameParts[0] || "Nodal";
  const lastName = nameParts.slice(1).join(" ") || "Officer";
  const designation = body.nodalOfficerDesignation ? String(body.nodalOfficerDesignation).trim() : "Designated Nodal Officer";
  const mobile = body.nodalOfficerMobile ? String(body.nodalOfficerMobile).trim() : null;

  const existingUser = await prisma.user.findFirst({
    where: { email: nodalEmail, deletedAt: null }
  });

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        organizationId: existingUser.organizationId || org.id,
        designation: designation || existingUser.designation,
        mobile: mobile || existingUser.mobile,
      }
    });

    await prisma.userOfficerProfile.upsert({
      where: { userId: existingUser.id },
      create: {
        userId: existingUser.id,
        fullName: String(body.nodalOfficerName || `${firstName} ${lastName}`).trim(),
        designation,
        department: org.name,
        district: org.district || null,
        mobile
      },
      update: {
        fullName: String(body.nodalOfficerName || `${firstName} ${lastName}`).trim(),
        designation,
        department: org.name,
        district: org.district || null,
        ...(mobile ? { mobile } : {})
      }
    });

    await prisma.organization.update({
      where: { id: org.id },
      data: { operationalNodalUserId: existingUser.id }
    });

    return updated;
  }

  const tempPassword = `MahaCSR@${crypto.randomInt(100000, 999999)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      email: nodalEmail,
      loginIdentifier: nodalEmail,
      passwordHash,
      roleId: ROLE_ID.GOVERNMENT_OFFICER, // 7
      organizationId: org.id,
      parentUserId: parentUserId || null,
      firstName,
      lastName,
      mobile,
      designation,
      accountStatus: "PENDING_ACTIVATION",
      isVerified: false,
      mustResetPassword: true,
      officerProfile: {
        create: {
          fullName: String(body.nodalOfficerName || `${firstName} ${lastName}`).trim(),
          designation,
          department: org.name,
          district: org.district || null,
          mobile
        }
      }
    }
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: { operationalNodalUserId: newUser.id }
  });

  return newUser;
};

export const updateDepartmentNodalOfficer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const org = await getOwnedOrganization(req, "GOVERNMENT_DEPARTMENT");
    const body = req.body || {};
    const profile = await prisma.govDepartmentProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        nodalOfficerName: body.nodalOfficerName || null,
        nodalOfficerDesignation: body.nodalOfficerDesignation || null,
        nodalOfficerEmail: body.nodalOfficerEmail || null,
        nodalOfficerMobile: body.nodalOfficerMobile || null,
      },
      update: {
        ...(body.nodalOfficerName !== undefined ? { nodalOfficerName: body.nodalOfficerName } : {}),
        ...(body.nodalOfficerDesignation !== undefined ? { nodalOfficerDesignation: body.nodalOfficerDesignation } : {}),
        ...(body.nodalOfficerEmail !== undefined ? { nodalOfficerEmail: body.nodalOfficerEmail } : {}),
        ...(body.nodalOfficerMobile !== undefined ? { nodalOfficerMobile: body.nodalOfficerMobile } : {}),
        ...(body.headOfDepartmentName !== undefined ? { headOfDepartmentName: body.headOfDepartmentName } : {}),
        ...(body.headDesignation !== undefined ? { headDesignation: body.headDesignation } : {}),
        ...(body.headEmail !== undefined ? { headEmail: body.headEmail } : {}),
        ...(body.headMobile !== undefined ? { headMobile: body.headMobile } : {}),
      }
    });

    if (body.nodalOfficerEmail && String(body.nodalOfficerEmail).trim()) {
      await syncNodalOfficerUser(org, body, req.user?.id).catch((e) =>
        console.warn("[Onboarding] Error syncing nodal officer user:", e?.message)
      );
    }

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
      data: {
        status: "UNDER_VERIFICATION"
      }
    });

    const currentApp = await prisma.governmentOnboardingApplication.findFirst({
      where: { organizationId: org.id },
      orderBy: { version: "desc" }
    });

    if (currentApp) {
      await prisma.governmentOnboardingApplication.update({
        where: { id: currentApp.id },
        data: {
          status: "UNDER_VERIFICATION",
          submittedByUserId: req.user?.id || currentApp.submittedByUserId,
          submittedAt: new Date(),
          decision: null,
          decisionRemarks: null
        }
      });
    } else {
      await prisma.governmentOnboardingApplication.create({
        data: {
          organizationId: org.id,
          organizationLevel: org.governmentLevel === "SUB_DEPARTMENT" ? "SUB_DEPARTMENT" : "MAIN",
          reviewerRoleCode: org.governmentLevel === "SUB_DEPARTMENT" ? "PLANNING_SECRETARY" : "JOINT_SECRETARY",
          status: "UNDER_VERIFICATION",
          formData: (org.govDeptProfile as any) || {},
          submittedByUserId: req.user?.id || null,
          submittedAt: new Date()
        }
      });
    }

    notifyHierarchy({
      title: "New Government Department Onboarding Submitted",
      message: `Government Department "${updated.name}" submitted onboarding application for verification.`,
      organizationId: updated.id,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      actionButtonUrl: `/admin/onboarding-approvals?orgId=${updated.id}&highlight=${encodeURIComponent(updated.name)}`
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
    const {
      name,
      code,
      kind = "GOVERNMENT_DEPARTMENT",
      district,
      email,
      phone,
      address,
      officeAddress,
      admin,
      adminOfficer,
      parentOrganizationId
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Sub-Department / Office Name is required." });
    }

    // Sub-department admins and below hierarchy cannot create departments
    const roleId = Number(req.user?.roleId);
    if (roleId === 7 && req.user?.organizationId) {
      const userOrg = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { parentOrganizationId: true, governmentLevel: true }
      });
      if (userOrg && (Boolean(userOrg.parentOrganizationId) || userOrg.governmentLevel === "SUB_DEPARTMENT")) {
        return res.status(403).json({ error: "Forbidden: Sub-departments cannot create child departments." });
      }
    }

    const resolvedKind = kind === "GOVT_DEPT"
      ? OrganizationKind.GOVERNMENT_DEPARTMENT
      : kind === "CORPORATE"
      ? OrganizationKind.CSR_COMPANY
      : (kind as OrganizationKind);

    const targetDistrict = district ? String(district).trim() : null;
    const targetAddress = String(officeAddress || address || "").trim() || null;
    const targetCode = String(code || "").trim() || null;

    const officerData = admin || adminOfficer || {};
    const adminFullName = String(officerData.fullName || officerData.name || "").trim();
    const adminEmail = String(officerData.email || email || "").trim().toLowerCase();
    const adminDesignation = String(officerData.designation || "").trim() || "Designated Admin Officer";
    const adminPhone = String(officerData.phone || officerData.mobile || phone || "").trim() || null;

    const parentOrgId = parentOrganizationId || (req.user?.organizationId ? req.user.organizationId : null);

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        organizationCode: targetCode,
        kind: resolvedKind,
        district: targetDistrict,
        address: targetAddress,
        officialEmail: adminEmail || (email ? String(email).trim().toLowerCase() : null),
        officialPhone: adminPhone,
        status: "ACTIVE",
        parentOrganizationId: parentOrgId,
        parentRelationshipStatus: parentOrgId ? "VERIFIED" : "NONE",
        ...(resolvedKind === OrganizationKind.GOVERNMENT_DEPARTMENT ? {
          govDeptProfile: {
            create: {
              departmentType: "STATE_GOVT",
              departmentCode: targetCode,
              deptOfficeCode: targetCode,
              nodalOfficerName: adminFullName || "Department Nodal Officer",
              nodalOfficerDesignation: adminDesignation,
              nodalOfficerEmail: adminEmail || null,
              nodalOfficerMobile: adminPhone || null
            }
          }
        } : {})
      }
    });

    // Also create a subDepartment record under parent if parent exists or under new org
    const subDeptOrgId = parentOrgId || org.id;
    await prisma.subDepartment.create({
      data: {
        organizationId: subDeptOrgId,
        name: name.trim(),
        code: targetCode,
        type: "Government Department",
        officeAddress: targetAddress,
        officialEmail: adminEmail || null,
        officialPhone: adminPhone || null,
        departmentHead: adminFullName ? `${adminFullName} (${adminDesignation})` : null,
        departmentHeadEmail: adminEmail || null,
        departmentHeadMobile: adminPhone || null,
        dnoName: adminFullName || null,
        status: "ACTIVE"
      }
    }).catch(err => console.error("Error creating subDepartment sync:", err));

    let createdUser: any = null;
    let invitationSent = false;

    if (adminEmail && /^\S+@\S+\.\S+$/.test(adminEmail)) {
      const existingUser = await prisma.user.findFirst({
        where: { email: adminEmail, deletedAt: null }
      });

      const tempPassword = `MahaCSR@${crypto.randomInt(100000, 999999)}`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const nameParts = adminFullName ? adminFullName.split(/\s+/) : ["Admin", "Officer"];
      const firstName = nameParts[0] || "Admin";
      const lastName = nameParts.slice(1).join(" ") || "Officer";

      if (!existingUser) {
        createdUser = await prisma.user.create({
          data: {
            email: adminEmail,
            loginIdentifier: adminEmail,
            passwordHash,
            roleId: ROLE_ID.GOVERNMENT_OFFICER,
            organizationId: org.id,
            parentUserId: req.user?.id || null,
            firstName,
            lastName,
            mobile: adminPhone || "",
            designation: adminDesignation,
            accountStatus: "ACTIVE",
            isVerified: true,
            mustResetPassword: true,
            temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            officerProfile: {
              create: {
                fullName: adminFullName || `${firstName} ${lastName}`,
                designation: adminDesignation,
                department: name.trim(),
                district: targetDistrict,
                mobile: adminPhone || ""
              }
            }
          },
          select: {
            id: true,
            email: true,
            roleId: true,
            accountStatus: true,
            isVerified: true,
            firstName: true,
            lastName: true,
            designation: true
          }
        });
      } else {
        createdUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            mustResetPassword: true,
            temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            accountStatus: "ACTIVE",
            isVerified: true,
            organizationId: org.id
          },
          select: {
            id: true,
            email: true,
            roleId: true,
            accountStatus: true,
            isVerified: true,
            firstName: true,
            lastName: true,
            designation: true
          }
        });
      }

      // Send invitation email
      const frontendUrl = getPrimaryFrontendUrl();
      const loginUrl = `${frontendUrl}/login`;
      const dashboardUrl = `${frontendUrl}/dashboard`;

      try {
        await sendUserInvitationEmail({
          to: adminEmail,
          applicantName: adminFullName || `${firstName} ${lastName}`,
          roleName: "Government Department Administrator",
          password: tempPassword,
          loginUrl,
          dashboardUrl,
          isAutogenerated: true
        });
        invitationSent = true;
      } catch (mailErr) {
        console.error("Failed to send invitation email:", mailErr);
      }
    }

    return res.status(201).json({
      success: true,
      organization: org,
      user: createdUser,
      invitationSent
    });
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

    const {
      name,
      code,
      type,
      description,
      officeAddress,
      district,
      officialEmail,
      officialPhone,
      departmentHead,
      dnoName,
      admin,
      adminOfficer,
      status
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "Sub-Department / Office Name is required" });

    const officerData = admin || adminOfficer || {};
    const adminFullName = String(officerData.fullName || officerData.name || departmentHead || "").trim();
    const adminEmail = String(officerData.email || officialEmail || "").trim().toLowerCase();
    const adminDesignation = String(officerData.designation || "").trim() || "Designated Admin Officer";
    const adminPhone = String(officerData.phone || officerData.mobile || officialPhone || "").trim() || null;
    const targetDistrict = district ? String(district).trim() : null;
    const targetAddress = officeAddress?.trim() || null;

    const headName = adminFullName ? `${adminFullName}${adminDesignation ? ` (${adminDesignation})` : ""}` : null;

    const dept = await prisma.subDepartment.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        code: code?.trim() || null,
        type: type?.trim() || "Government Department",
        description: description?.trim() || null,
        officeAddress: targetAddress,
        officialEmail: adminEmail || null,
        officialPhone: adminPhone,
        departmentHead: headName,
        departmentHeadEmail: adminEmail || null,
        departmentHeadMobile: adminPhone,
        dnoName: dnoName?.trim() || adminFullName || null,
        status: status || "ACTIVE"
      }
    });

    let createdUser: any = null;
    let invitationSent = false;

    if (adminEmail && /^\S+@\S+\.\S+$/.test(adminEmail)) {
      const existingUser = await prisma.user.findFirst({
        where: { email: adminEmail, deletedAt: null }
      });

      const tempPassword = `MahaCSR@${crypto.randomInt(100000, 999999)}`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const nameParts = adminFullName ? adminFullName.split(/\s+/) : ["Admin", "Officer"];
      const firstName = nameParts[0] || "Admin";
      const lastName = nameParts.slice(1).join(" ") || "Officer";

      if (!existingUser) {
        createdUser = await prisma.user.create({
          data: {
            email: adminEmail,
            loginIdentifier: adminEmail,
            passwordHash,
            roleId: ROLE_ID.GOVERNMENT_OFFICER,
            organizationId: orgId,
            parentUserId: req.user?.id || null,
            firstName,
            lastName,
            mobile: adminPhone || "",
            designation: adminDesignation,
            accountStatus: "ACTIVE",
            isVerified: true,
            mustResetPassword: true,
            temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            officerProfile: {
              create: {
                fullName: adminFullName || `${firstName} ${lastName}`,
                designation: adminDesignation,
                department: name.trim(),
                district: targetDistrict,
                mobile: adminPhone || ""
              }
            }
          },
          select: {
            id: true,
            email: true,
            roleId: true,
            accountStatus: true,
            isVerified: true,
            firstName: true,
            lastName: true,
            designation: true
          }
        });
      } else {
        createdUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            mustResetPassword: true,
            temporaryPasswordExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            accountStatus: "ACTIVE",
            isVerified: true,
            organizationId: orgId
          },
          select: {
            id: true,
            email: true,
            roleId: true,
            accountStatus: true,
            isVerified: true,
            firstName: true,
            lastName: true,
            designation: true
          }
        });
      }

      // Send invitation email
      const frontendUrl = getPrimaryFrontendUrl();
      const loginUrl = `${frontendUrl}/login`;
      const dashboardUrl = `${frontendUrl}/dashboard`;

      try {
        await sendUserInvitationEmail({
          to: adminEmail,
          applicantName: adminFullName || `${firstName} ${lastName}`,
          roleName: "Government Department Administrator",
          password: tempPassword,
          loginUrl,
          dashboardUrl,
          isAutogenerated: true
        });
        invitationSent = true;
      } catch (mailErr) {
        console.error("Failed to send invitation email:", mailErr);
      }
    }

    return res.status(201).json({
      ...dept,
      user: createdUser,
      invitationSent
    });
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
