import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { CompanyInterestStatus, CSRRequirementStatus, Role } from "@prisma/client";
import { notify, notifyDistrictAdmins, auditLog } from "../services/notificationService";

// ─── Create CSR Requirement ────────────────────────────────────────
export const createCSRRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    // Government departments are the requirement owners. The existing
    // BeneficiaryProfile table stores the department registration details.
    let profile = await prisma.beneficiaryProfile.findUnique({ where: { userId } });
    if (!profile) {
      return res.status(400).json({ error: "Please complete your government department profile first" });
    }

    const {
      title, category, description, district, taluka, village, city, address,
      geoLatitude, geoLongitude, estimatedCost, beneficiaryCount, expectedImpact,
      priorityLevel, completionTimeline, contactPersonName, contactPersonPhone,
      contactPersonEmail, agencyType, sdgGoals, declarationAccepted, submitForVerification
    } = req.body;

    const status = submitForVerification
      ? CSRRequirementStatus.PENDING_VERIFICATION
      : CSRRequirementStatus.DRAFT;

    const requirement = await prisma.cSRRequirement.create({
      data: {
        tenantId,
        beneficiaryProfileId: profile.id,
        title,
        category,
        description,
        district: district || profile.district,
        taluka: taluka || profile.taluka,
        village,
        city,
        address,
        geoLatitude: geoLatitude ? parseFloat(geoLatitude) : null,
        geoLongitude: geoLongitude ? parseFloat(geoLongitude) : null,
        estimatedCost: parseFloat(estimatedCost),
        beneficiaryCount: parseInt(beneficiaryCount),
        expectedImpact,
        priorityLevel: priorityLevel || "MEDIUM",
        completionTimeline,
        contactPersonName: contactPersonName || profile.contactPerson,
        contactPersonPhone: contactPersonPhone || profile.contactPhone,
        contactPersonEmail: contactPersonEmail || profile.contactEmail,
        agencyType: agencyType || profile.agencyType,
        sdgGoals: sdgGoals || [],
        declarationAccepted: declarationAccepted === true,
        status
      }
    });

    await auditLog(userId, "CSR_REQUIREMENT_CREATED", { requirementId: requirement.id, title, status });

    if (status === CSRRequirementStatus.PENDING_VERIFICATION) {
      await notifyDistrictAdmins(
        district || profile.district,
        "New CSR Requirement Submitted",
        `A new CSR requirement '${title}' has been submitted for verification in ${district || profile.district}.`
      );
    }

    return res.status(201).json(requirement);
  } catch (error) {
    next(error);
  }
};

// ─── Update Draft Requirement ──────────────────────────────────────
export const updateCSRRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id },
      include: { beneficiaryProfile: true }
    });

    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    // Only owner can edit, and only if in editable status
    if (requirement.beneficiaryProfile.userId !== userId) {
      return res.status(403).json({ error: "You can only edit your own requirements" });
    }

    const editableStatuses: CSRRequirementStatus[] = [
      CSRRequirementStatus.DRAFT,
      CSRRequirementStatus.CLARIFICATION_REQUIRED
    ];
    if (!editableStatuses.includes(requirement.status)) {
      return res.status(400).json({ error: "Requirement cannot be edited in current status" });
    }

    const {
      title, category, description, district, taluka, village, city, address,
      geoLatitude, geoLongitude, estimatedCost, beneficiaryCount, expectedImpact,
      priorityLevel, completionTimeline, contactPersonName, contactPersonPhone,
      contactPersonEmail, agencyType, sdgGoals, declarationAccepted, submitForVerification
    } = req.body;

    const newStatus = submitForVerification
      ? CSRRequirementStatus.PENDING_VERIFICATION
      : requirement.status;

    const updated = await prisma.cSRRequirement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category }),
        ...(description && { description }),
        ...(district && { district }),
        ...(taluka && { taluka }),
        ...(village !== undefined && { village }),
        ...(city !== undefined && { city }),
        ...(address !== undefined && { address }),
        ...(geoLatitude !== undefined && { geoLatitude: geoLatitude ? parseFloat(geoLatitude) : null }),
        ...(geoLongitude !== undefined && { geoLongitude: geoLongitude ? parseFloat(geoLongitude) : null }),
        ...(estimatedCost && { estimatedCost: parseFloat(estimatedCost) }),
        ...(beneficiaryCount && { beneficiaryCount: parseInt(beneficiaryCount) }),
        ...(expectedImpact && { expectedImpact }),
        ...(priorityLevel && { priorityLevel }),
        ...(completionTimeline !== undefined && { completionTimeline }),
        ...(contactPersonName && { contactPersonName }),
        ...(contactPersonPhone && { contactPersonPhone }),
        ...(contactPersonEmail && { contactPersonEmail }),
        ...(agencyType && { agencyType }),
        ...(sdgGoals && { sdgGoals }),
        ...(declarationAccepted !== undefined && { declarationAccepted }),
        status: newStatus
      }
    });

    await auditLog(userId, "CSR_REQUIREMENT_UPDATED", { requirementId: id });

    if (newStatus === CSRRequirementStatus.PENDING_VERIFICATION) {
      await notifyDistrictAdmins(
        updated.district,
        "CSR Requirement Submitted for Verification",
        `Requirement '${updated.title}' has been submitted/resubmitted for verification.`
      );
    }

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ─── Get My Requirements ───────────────────────────────────────────
export const getMyRequirements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.beneficiaryProfile.findUnique({ where: { userId } });
    if (!profile) return res.json([]);

    const { status } = req.query;
    const filter: any = { beneficiaryProfileId: profile.id };
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      filter.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }
    if (status) filter.status = status as CSRRequirementStatus;

    const requirements = await prisma.cSRRequirement.findMany({
      where: filter,
      include: {
        _count: {
          select: {
            ngoApplications: true,
            companyInterests: true,
            progressReports: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(requirements);
  } catch (error) {
    next(error);
  }
};

// ─── Get Requirement By ID ─────────────────────────────────────────
export const getCSRRequirementById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id },
      include: {
        beneficiaryProfile: true,
        documents: true,
        ngoApplications: {
          include: {
            ngo: { select: { id: true, name: true, district: true, empanelmentStatus: true, csrSectors: true, impactStatistics: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        companyInterests: {
          include: {
            company: { select: { id: true, name: true, focusAreas: true, csrBudget: true, companyLogoUrl: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        agreements: { orderBy: { createdAt: "desc" } },
        fundMilestones: { orderBy: { createdAt: "asc" } },
        progressReports: { orderBy: { createdAt: "desc" } },
        completionReport: true,
        impactReport: true
      }
    });

    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    // Access control: Draft/Rejected/Pending etc. only visible to owner and admins;
    // normal users and guest/public can only view verified/listed/published/completed requirements.
    const role = req.user?.role;
    const isOwner = req.user ? requirement.beneficiaryProfile.userId === req.user.id : false;
    const isAdmin = role === Role.SUPER_ADMIN || role === Role.DISTRICT_ADMIN || role === Role.PORTAL_ADMIN;

    if (!isOwner && !isAdmin) {
      const visibleStatuses: CSRRequirementStatus[] = [
        CSRRequirementStatus.VERIFIED,
        CSRRequirementStatus.MARKETPLACE_LISTED,
        CSRRequirementStatus.NGO_APPLICATIONS_OPEN,
        CSRRequirementStatus.COMPANY_INTEREST_RECEIVED,
        CSRRequirementStatus.NGO_SELECTED,
        CSRRequirementStatus.AGREEMENT_PENDING,
        CSRRequirementStatus.AGREEMENT_SIGNED,
        CSRRequirementStatus.EXECUTION_STARTED,
        CSRRequirementStatus.IN_PROGRESS,
        CSRRequirementStatus.COMPLETION_SUBMITTED,
        CSRRequirementStatus.COMPLETED,
        CSRRequirementStatus.IMPACT_REPORT_GENERATED
      ];
      if (!visibleStatuses.includes(requirement.status)) {
        return res.status(404).json({ error: "Requirement not found" });
      }
    }

    return res.json(requirement);
  } catch (error) {
    next(error);
  }
};

export const submitRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id },
      include: { beneficiaryProfile: true }
    });

    if (!requirement) return res.status(404).json({ error: "Requirement not found" });
    if (requirement.beneficiaryProfile.userId !== req.user!.id && req.user!.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "You can submit only your department requirements" });
    }
    const submittableStatuses: CSRRequirementStatus[] = [
      CSRRequirementStatus.DRAFT,
      CSRRequirementStatus.CLARIFICATION_REQUIRED
    ];
    if (!submittableStatuses.includes(requirement.status)) {
      return res.status(400).json({ error: "Requirement cannot be submitted in current status" });
    }

    const updated = await prisma.cSRRequirement.update({
      where: { id },
      data: { status: CSRRequirementStatus.PENDING_VERIFICATION }
    });

    await notifyDistrictAdmins(
      updated.district,
      "Department CSR Requirement Submitted",
      `Department requirement '${updated.title}' has been submitted for verification.`
    );
    await auditLog(req.user!.id, "CSR_REQUIREMENT_SUBMITTED", { requirementId: id });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

const applyRequirementAction = async (
  req: AuthenticatedRequest,
  res: Response,
  action: "APPROVE" | "REJECT" | "CLARIFICATION" | "PUBLISH"
) => {
  const { id } = req.params;
  const { remarks, rejectionReason, priorityLevel } = req.body;

  const requirement = await prisma.cSRRequirement.findUnique({
    where: { id },
    include: { beneficiaryProfile: true }
  });
  if (!requirement) return res.status(404).json({ error: "Requirement not found" });

  if (req.user!.role === Role.DISTRICT_ADMIN && req.user!.assignedDistrict && requirement.district !== req.user!.assignedDistrict) {
    return res.status(403).json({ error: "You can act only on requirements in your assigned district" });
  }

  const statusMap = {
    APPROVE: CSRRequirementStatus.VERIFIED,
    REJECT: CSRRequirementStatus.REJECTED,
    CLARIFICATION: CSRRequirementStatus.CLARIFICATION_REQUIRED,
    PUBLISH: CSRRequirementStatus.MARKETPLACE_LISTED
  } as const;

  const publishableStatuses: CSRRequirementStatus[] = [
    CSRRequirementStatus.VERIFIED,
    CSRRequirementStatus.MARKETPLACE_LISTED,
    CSRRequirementStatus.COMPANY_INTEREST_RECEIVED,
    CSRRequirementStatus.NGO_APPLICATIONS_OPEN
  ];
  if (action === "PUBLISH" && !publishableStatuses.includes(requirement.status)) {
    return res.status(400).json({ error: "Only approved department requirements can be published" });
  }

  const newStatus = statusMap[action];
  const updated = await prisma.cSRRequirement.update({
    where: { id },
    data: {
      status: newStatus,
      verificationRemarks: remarks || null,
      rejectionReason: action === "REJECT" ? rejectionReason || remarks || "Rejected by State CSR Cell" : null,
      verifiedById: req.user!.id,
      verifiedAt: action === "APPROVE" || action === "PUBLISH" ? new Date() : null,
      ...(priorityLevel && { priorityLevel })
    }
  });

  await notify(
    requirement.beneficiaryProfile.userId,
    `Department CSR Requirement ${action === "PUBLISH" ? "Published" : newStatus.replace(/_/g, " ")}`,
    `Your requirement '${requirement.title}' is now ${newStatus.replace(/_/g, " ")}.${remarks ? ` Remarks: ${remarks}` : ""}`
  );
  await auditLog(req.user!.id, `CSR_REQUIREMENT_${action}`, {
    requirementId: id,
    fromStatus: requirement.status,
    toStatus: newStatus
  });

  return res.json(updated);
};

export const approveRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return await applyRequirementAction(req, res, "APPROVE");
  } catch (error) {
    next(error);
  }
};

export const rejectRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return await applyRequirementAction(req, res, "REJECT");
  } catch (error) {
    next(error);
  }
};

export const requestRequirementClarification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return await applyRequirementAction(req, res, "CLARIFICATION");
  } catch (error) {
    next(error);
  }
};

export const publishRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return await applyRequirementAction(req, res, "PUBLISH");
  } catch (error) {
    next(error);
  }
};

// ─── Marketplace: Get Verified Requirements ────────────────────────
export const getMarketplaceRequirements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { district, category, minBudget, maxBudget, priority, sdgGoal, search, page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    // Only show requirements that are VERIFIED or beyond (visible in marketplace)
    const visibleStatuses: CSRRequirementStatus[] = [
      CSRRequirementStatus.VERIFIED,
      CSRRequirementStatus.MARKETPLACE_LISTED,
      CSRRequirementStatus.NGO_APPLICATIONS_OPEN,
      CSRRequirementStatus.COMPANY_INTEREST_RECEIVED,
      CSRRequirementStatus.NGO_SELECTED,
      CSRRequirementStatus.AGREEMENT_PENDING,
      CSRRequirementStatus.AGREEMENT_SIGNED,
      CSRRequirementStatus.EXECUTION_STARTED,
      CSRRequirementStatus.IN_PROGRESS,
      CSRRequirementStatus.COMPLETION_SUBMITTED,
      CSRRequirementStatus.COMPLETED,
      CSRRequirementStatus.IMPACT_REPORT_GENERATED
    ];

    const where: any = { status: { in: visibleStatuses } };
    const tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId || null;
    if (tenantId && req.user?.role !== Role.MASTER_ADMIN) where.tenantId = tenantId;

    if (district) where.district = district as string;
    if (category) where.category = category as string;
    if (priority) where.priorityLevel = priority as string;
    if (sdgGoal) where.sdgGoals = { has: sdgGoal as string };

    if (minBudget || maxBudget) {
      where.estimatedCost = {};
      if (minBudget) where.estimatedCost.gte = parseFloat(minBudget as string);
      if (maxBudget) where.estimatedCost.lte = parseFloat(maxBudget as string);
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { district: { contains: search as string, mode: "insensitive" } },
        { village: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [requirements, total] = await Promise.all([
      prisma.cSRRequirement.findMany({
        where,
        include: {
          beneficiaryProfile: { select: { agencyName: true, agencyType: true } },
          _count: { select: { ngoApplications: true, companyInterests: true } }
        },
        orderBy: [{ priorityLevel: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize
      }),
      prisma.cSRRequirement.count({ where })
    ]);

    return res.json({
      data: requirements,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicRequirements = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  req.query = {
    ...req.query,
    limit: req.query.limit || "50"
  };
  return getMarketplaceRequirements(req, res, next);
};

// ─── Verification Queue (District Admin / Super Admin) ─────────────
export const getVerificationQueue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user!.role;
    const filter: any = {
      status: {
        in: [
          CSRRequirementStatus.PENDING_VERIFICATION,
          CSRRequirementStatus.FIELD_VERIFICATION_REQUIRED
        ]
      }
    };
    if ((req as any).tenantContext?.tenantId || req.user?.tenantId) {
      filter.tenantId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
    }

    // District admin can only see their district
    if (role === Role.DISTRICT_ADMIN && req.user!.assignedDistrict) {
      filter.district = req.user!.assignedDistrict;
    }

    const requirements = await prisma.cSRRequirement.findMany({
      where: filter,
      include: {
        beneficiaryProfile: { select: { agencyName: true, agencyType: true, contactPerson: true, contactPhone: true } },
        documents: true
      },
      orderBy: [{ priorityLevel: "desc" }, { createdAt: "asc" }]
    });

    return res.json(requirements);
  } catch (error) {
    next(error);
  }
};

// ─── Verify / Reject Requirement ───────────────────────────────────
export const verifyRequirement = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action, remarks, rejectionReason, priorityLevel } = req.body;
    // action: 'APPROVE' | 'REJECT' | 'CLARIFICATION' | 'FIELD_VERIFICATION'

    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id },
      include: { beneficiaryProfile: true }
    });
    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    // District admin can only verify their district
    if (req.user!.role === Role.DISTRICT_ADMIN && req.user!.assignedDistrict) {
      if (requirement.district !== req.user!.assignedDistrict) {
        return res.status(403).json({ error: "You can only verify requirements in your assigned district" });
      }
    }

    let newStatus: CSRRequirementStatus;
    switch (action) {
      case "APPROVE":
        newStatus = CSRRequirementStatus.VERIFIED;
        break;
      case "REJECT":
        newStatus = CSRRequirementStatus.REJECTED;
        break;
      case "CLARIFICATION":
        newStatus = CSRRequirementStatus.CLARIFICATION_REQUIRED;
        break;
      case "FIELD_VERIFICATION":
        newStatus = CSRRequirementStatus.FIELD_VERIFICATION_REQUIRED;
        break;
      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    const updated = await prisma.cSRRequirement.update({
      where: { id },
      data: {
        status: newStatus,
        verificationRemarks: remarks || null,
        rejectionReason: action === "REJECT" ? rejectionReason : null,
        fieldVerificationNotes: action === "FIELD_VERIFICATION" ? remarks : requirement.fieldVerificationNotes,
        verifiedById: req.user!.id,
        verifiedAt: action === "APPROVE" ? new Date() : null,
        ...(priorityLevel && { priorityLevel })
      }
    });

    // Notify beneficiary
    await notify(
      requirement.beneficiaryProfile.userId,
      `CSR Requirement ${action === "APPROVE" ? "Verified" : action === "REJECT" ? "Rejected" : "Update"}`,
      `Your requirement '${requirement.title}' status: ${newStatus.replace(/_/g, " ")}.${remarks ? ` Remarks: ${remarks}` : ""}`
    );

    await auditLog(req.user!.id, "CSR_REQUIREMENT_VERIFICATION", {
      requirementId: id,
      action,
      fromStatus: requirement.status,
      toStatus: newStatus
    });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ─── Beneficiary Profile CRUD ──────────────────────────────────────
export const upsertBeneficiaryProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;
    const organizationId = (req as any).tenantContext?.organizationId || req.user!.organizationId || null;
    const {
      agencyName, agencyType, district, taluka, village, city,
      address, pincode, contactPerson, contactEmail, contactPhone,
      designation, website
    } = req.body;

    const profile = await prisma.beneficiaryProfile.upsert({
      where: { userId },
      update: {
        tenantId,
        organizationId,
        agencyName, agencyType, district, taluka, village, city,
        address, pincode, contactPerson, contactEmail, contactPhone,
        designation, website
      },
      create: {
        tenantId,
        organizationId,
        userId, agencyName, agencyType, district, taluka, village, city,
        address, pincode, contactPerson, contactEmail, contactPhone,
        designation, website
      }
    });

    await auditLog(userId, "GOVERNMENT_DEPARTMENT_PROFILE_UPSERT", { profileId: profile.id });
    return res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const getMyBeneficiaryProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.beneficiaryProfile.findUnique({
      where: { userId: req.user!.id }
    });
    return res.json(profile);
  } catch (error) {
    next(error);
  }
};

// ─── Add Document to Requirement ───────────────────────────────────
export const addRequirementDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { requirementId } = req.params;
    const { title, fileUrl, fileName, fileType, fileSize, documentCategory } = req.body;

    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id: requirementId },
      include: { beneficiaryProfile: true }
    });

    if (!requirement) return res.status(404).json({ error: "Requirement not found" });
    if (requirement.beneficiaryProfile.userId !== req.user!.id && req.user!.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const doc = await prisma.cSRRequirementDocument.create({
      data: {
        tenantId: (req as any).tenantContext?.tenantId || req.user?.tenantId || requirement.tenantId,
        csrRequirementId: requirementId,
        title,
        fileUrl,
        fileName,
        fileType,
        fileSize: fileSize ? parseInt(fileSize) : null,
        documentCategory: documentCategory || "supporting_document",
        uploadedById: req.user!.id
      }
    });

    return res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
};

export const confirmProjectHandover = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id },
      include: { beneficiaryProfile: true }
    });
    if (!requirement) return res.status(404).json({ error: "Project requirement not found" });
    if (requirement.beneficiaryProfile.userId !== req.user!.id && req.user!.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only the owning government department can confirm handover" });
    }

    const updated = await prisma.cSRRequirement.update({
      where: { id },
      data: {
        status: CSRRequirementStatus.COMPLETED,
        verificationRemarks: remarks || requirement.verificationRemarks
      }
    });

    await auditLog(req.user!.id, "DEPARTMENT_HANDOVER_CONFIRMED", { requirementId: id, remarks });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const getDepartmentCompanyInterests = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const requirement = await prisma.cSRRequirement.findUnique({
      where: { id },
      include: { beneficiaryProfile: true }
    });
    if (!requirement) return res.status(404).json({ error: "Requirement not found" });

    const isOwner = requirement.beneficiaryProfile.userId === req.user!.id;
    const interestViewerRoles: Role[] = [Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.DISTRICT_ADMIN];
    const isAdmin = interestViewerRoles.includes(req.user!.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to view company interest for this department requirement" });
    }

    if (req.user!.role === Role.DISTRICT_ADMIN && req.user!.assignedDistrict && requirement.district !== req.user!.assignedDistrict) {
      return res.status(403).json({ error: "You can access only assigned district data" });
    }

    const interests = await prisma.companyInterest.findMany({
      where: {
        csrRequirementId: id,
        status: { not: CompanyInterestStatus.WITHDRAWN }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            focusAreas: true,
            csrBudget: true,
            companyLogoUrl: true
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
