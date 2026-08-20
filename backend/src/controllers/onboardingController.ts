import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { notifyHierarchy } from "../services/hierarchyNotificationService";

export const getOrCreateDraftApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId || req.user?.ngoId;
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { ngoProfile: true, documents: true }
    });

    return res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

export const updateBasicInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId || req.user?.ngoId;
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { name: req.body.name || undefined }
    });

    return res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

export const updateRegistrationDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId || req.user?.ngoId;
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const profile = await prisma.nGOProfile.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, darpanNumber: req.body.darpanNumber || req.body.darpanRegNo },
      update: { darpanNumber: req.body.darpanNumber || req.body.darpanRegNo || undefined }
    });

    return res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateFinancialDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId || req.user?.ngoId;
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const profile = await prisma.nGOProfile.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId },
      update: {}
    });

    return res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateKeyPersons = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, message: "Key persons updated" });
  } catch (error) {
    next(error);
  }
};

export const uploadDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId || req.user?.ngoId;
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const doc = await prisma.document.create({
      data: {
        organizationId: orgId,
        title: req.body.documentType || "NGO Document",
        fileUrl: req.body.fileUrl || "",
        documentType: req.body.documentType || "NGO_DOCUMENT",
        fileName: req.body.fileName || "document.pdf",
        fileSize: Number(req.body.fileSize || 0),
        fileType: "pdf"
      }
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    next(error);
  }
};

export const submitApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId || req.user?.ngoId;
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    let wasClarificationRequired = false;
    if (existing) {
      const currentStatus = ((existing as any).onboardingStatus || "").toUpperCase();
      wasClarificationRequired = currentStatus === "CLARIFICATION_REQUIRED";

      const LOCKED_STATUSES = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "APPROVED", "SUSPENDED"];
      if (currentStatus && LOCKED_STATUSES.includes(currentStatus) && !wasClarificationRequired) {
        return res.status(400).json({ error: "Your organization onboarding application has already been submitted and is under verification." });
      }
    }

    const responseNotes = typeof req.body.responseNotes === "string" ? req.body.responseNotes.trim() : "";

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        status: "UNDER_VERIFICATION",
        ...(responseNotes ? { clarificationRemarks: `User Response: ${responseNotes}` } : {})
      }
    });

    notifyHierarchy({
      title: wasClarificationRequired ? "Organization Clarification Resubmitted" : "New Organization Onboarding Submitted",
      message: wasClarificationRequired
        ? `Organization "${org.name}" responded to the clarification request and resubmitted profile for review.${responseNotes ? ` Response Notes: ${responseNotes}` : ""}`
        : `Organization "${org.name}" submitted profile for verification.`,
      organizationId: org.id,
      includeOrgUsers: false,
      includePortalAdmins: true,
      includeRms: true,
      includeStateOfficers: true,
      actionButtonUrl: `/admin/onboarding-approvals?orgId=${org.id}&highlight=${encodeURIComponent(org.name)}`,
      variables: {
        currentStatus: "UNDER_VERIFICATION",
        workflowStatus: responseNotes || "Resubmitted for verification"
      }
    }).catch(err => console.error("Notification dispatch failed:", err));

    return res.json({ success: true, message: wasClarificationRequired ? "Clarification response submitted successfully. Profile is under review." : "Onboarding application submitted for verification.", data: org });
  } catch (error) {
    next(error);
  }
};

export const getApplicationStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let orgId = req.user?.organizationId || req.user?.ngoId || req.user?.companyId;
    if (!orgId && req.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { organizationId: true }
      });
      orgId = user?.organizationId || null;
    }
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        csrCompanyProfile: true,
        ngoProfile: true,
        govDeptProfile: true,
        documents: true,
        subDepartments: true,
        parentOrganization: { select: { id: true, name: true } },
        onboardingApplications: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    if (!org) return res.status(404).json({ error: "Organization not found" });

    const [headUser, nodalUser] = await Promise.all([
      org.departmentHeadUserId ? prisma.user.findUnique({ where: { id: org.departmentHeadUserId } }) : null,
      org.operationalNodalUserId ? prisma.user.findUnique({ where: { id: org.operationalNodalUserId } }) : null
    ]);

    const latestApp = org.onboardingApplications?.[0];
    const formData = (latestApp?.formData as Record<string, any>) || {};

    const govDept = (org.govDeptProfile || {}) as Record<string, any>;
    const mergedGovProfile = {
      ...formData,
      ...govDept,
      headOfDepartmentName: govDept.headOfDepartmentName || formData.headOfDepartmentName || formData.head?.name || (headUser ? `${headUser.firstName} ${headUser.lastName || ""}`.trim() : ""),
      headDesignation: govDept.headDesignation || formData.headDesignation || formData.head?.designation || headUser?.designation || "",
      headEmail: govDept.headEmail || formData.headEmail || formData.head?.email || headUser?.email || "",
      nodalOfficerName: govDept.nodalOfficerName || formData.nodalOfficerName || formData.nodal?.name || (nodalUser ? `${nodalUser.firstName} ${nodalUser.lastName || ""}`.trim() : ""),
      nodalOfficerDesignation: govDept.nodalOfficerDesignation || formData.nodalOfficerDesignation || formData.nodal?.designation || nodalUser?.designation || "",
      nodalOfficerEmail: govDept.nodalOfficerEmail || formData.nodalOfficerEmail || formData.nodal?.email || nodalUser?.email || "",
      nodalOfficerMobile: govDept.nodalOfficerMobile || formData.nodalOfficerMobile || formData.nodal?.mobile || nodalUser?.mobile || "",
      nodalOfficerGovtIdType: govDept.nodalOfficerGovtIdType || formData.nodalOfficerGovtIdType || "",
      nodalOfficerGovtIdNumber: govDept.nodalOfficerGovtIdNumber || formData.nodalOfficerGovtIdNumber || "",
      jurisdiction: govDept.jurisdiction || formData.jurisdiction || "",
      departmentSectors: govDept.departmentSectors || formData.departmentSectors || [],
      preferredBeneficiaryGroups: govDept.preferredBeneficiaryGroups || formData.preferredBeneficiaryGroups || [],
      sdgFocusAreas: govDept.sdgFocusAreas || formData.sdgFocusAreas || []
    };

    const payload = {
      ...org,
      parentDepartment: (org as any).parentDepartment || org.parentOrganization?.name || formData.parentDepartment || "",
      officeDescription: (org as any).officeDescription || formData.officeDescription || (org.govDeptProfile as any)?.description || "",
      govDeptProfile: mergedGovProfile,
      governmentDepartmentProfile: mergedGovProfile,
      organizationType: org.kind,
      onboardingStatus: org.status
    };

    return res.json(payload);
  } catch (error) {
    next(error);
  }
};

export const respondToQuery = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user?.organizationId || req.user?.ngoId;
    if (!orgId) return res.status(400).json({ error: "Organization context is required" });

    const { responseNotes } = req.body;
    const notesText = typeof responseNotes === "string" ? responseNotes.trim() : "Clarification response provided.";

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: {
        status: "UNDER_VERIFICATION",
        clarificationRemarks: `User Response: ${notesText}`
      }
    });

    notifyHierarchy({
      title: "Organization Clarification Resubmitted",
      message: `Organization "${org.name}" responded to clarification request: ${notesText}`,
      organizationId: org.id,
      includeOrgUsers: false,
      includePortalAdmins: true,
      includeRms: true,
      actionButtonUrl: `/admin/onboarding-approvals?orgId=${org.id}&highlight=${encodeURIComponent(org.name)}`,
      variables: {
        currentStatus: "UNDER_VERIFICATION",
        workflowStatus: notesText
      }
    }).catch(err => console.error("Notification dispatch failed:", err));

    return res.json({ success: true, message: "Response recorded and application resubmitted for admin approval.", data: org });
  } catch (error) {
    next(error);
  }
};
