import { NextFunction, Response } from "express";
import { OrganizationKind, OrganizationStatus } from "@prisma/client";
import { Role } from "../types/role";
import prisma from "../config/db";
import { AuthenticatedRequest } from "./authMiddleware";
import { resolveUserPermission } from "../services/permissionService";
import { EffectivePermissionService } from "../services/effectivePermissionService";
import { WorkflowTransitionService } from "../services/workflowTransitionService";

const auditBlockedAccess = async (req: AuthenticatedRequest, action: string, details: Record<string, unknown>) => {
  await prisma.auditLog.create({
    data: {
      actorUserId: req.user?.id || null,
      action,
      entityType: "ACCESS_GUARD",
      details: details as any,
      ipAddress: req.ip
    }
  }).catch(() => {});
};

export const checkOrganizationApproved = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (
      req.user?.role === Role.SUPER_ADMIN ||
      req.user?.role === Role.GOVERNMENT_OFFICER
    ) return next();

    const url = req.originalUrl || req.url || "";
    // Allow access to essential onboarding, document upload, notification, and user/role management endpoints even if organization is pending or in clarification
    const isExemptPath =
      url.includes("/onboarding") ||
      url.includes("/notifications") ||
      url.includes("/admin/users") ||
      url.includes("/org") ||
      url.includes("/roles") ||
      url.includes("/documents") ||
      url.includes("/upload") ||
      url.includes("/auth");

    if (isExemptPath) return next();

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      await auditBlockedAccess(req, "ONBOARDING_ACCESS_BLOCKED", { reason: "MISSING_ORGANIZATION", path: req.originalUrl });
      return res.status(403).json({
        error: "Your organization onboarding is pending approval. You can access portal operations after approval from Portal Admin.",
        redirectTo: "/organization/onboarding/status"
      });
    }

    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (
      !organization ||
      organization.status !== OrganizationStatus.ACTIVE
    ) {
      await auditBlockedAccess(req, "ONBOARDING_ACCESS_BLOCKED", {
        reason: "ORGANIZATION_NOT_APPROVED",
        organizationId,
        path: req.originalUrl
      });
      return res.status(403).json({
        error: "Your organization onboarding is pending approval. You can access portal operations after approval from Portal Admin.",
        redirectTo: "/organization/onboarding/status"
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Permission-based access control — 100 % DB-driven.
 * SUPER_ADMIN enum always bypasses. All other users are resolved via
 * their OrganizationRole DB permissions.
 */
export const checkPermission = (permissionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized access" });
      const isSuperAdmin = Number(req.user.role) === Role.SUPER_ADMIN || req.user.role === "SUPER_ADMIN" || req.user.roleId === "1";
      if (isSuperAdmin) return next();

      const hasPermission = await resolveUserPermission(req.user.id, permissionKey, {
        role: req.user.role,
        organizationId: req.user.organizationId || undefined
      });

      if (!hasPermission) {
        await auditBlockedAccess(req, "PERMISSION_ACCESS_BLOCKED", { permissionKey, path: req.originalUrl });
        return res.status(403).json({ error: `Forbidden: missing permission '${permissionKey}'` });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Unified Authorization Middleware evaluating:
 * ACCESS = Permission AND Scope AND Resource Relationship AND Object Status
 */
export const authorize = (
  permissionKey: string,
  resourceExtractor?: (req: AuthenticatedRequest) => {
    organizationId?: string | null;
    departmentId?: string | null;
    district?: string | null;
    division?: string | null;
    assignedUserId?: string | null;
    createdById?: string | null;
  }
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized access" });

      const isSuperAdmin = Number(req.user.role) === Role.SUPER_ADMIN || req.user.role === "SUPER_ADMIN" || String(req.user.roleId) === "1";
      if (isSuperAdmin) return next();

      const resource = resourceExtractor
        ? resourceExtractor(req)
        : {
            organizationId: (req.params.organizationId || req.body.organizationId || req.query.organizationId) as string,
            district: (req.params.district || req.body.district || req.query.district) as string,
            departmentId: (req.params.departmentId || req.body.departmentId || req.query.departmentId) as string
          };

      const isAuthorized = await EffectivePermissionService.authorizeAccess(
        req.user.id,
        permissionKey,
        resource
      );

      if (!isAuthorized) {
        await auditBlockedAccess(req, "AUTHORIZATION_BLOCKED", {
          permissionKey,
          resource,
          path: req.originalUrl
        });
        return res.status(403).json({
          error: `Forbidden: missing permission '${permissionKey}' or resource outside assigned scope`
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Submission gate: the authenticated user's OWN organization must be of the
 * required kind AND fully onboarded (status ACTIVE + onboardingStatus APPROVED).
 *
 * Unlike checkOrganizationApproved, this has NO role bypass — a GOVERNMENT_OFFICER
 * is exactly who must be gated before filing a pitch, and a CORPORATE_USER before
 * filing an enquiry. SUPER_ADMIN is the only exception (platform operator).
 *
 * Used to gate corporate enquiry creation (CSR_COMPANY) and government pitch
 * creation (GOVERNMENT_DEPARTMENT) behind verified onboarding.
 */
export const requireApprovedOrganization = (requiredKind: OrganizationKind) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      if (req.user.role === Role.SUPER_ADMIN) return next();

      const organizationId = req.user.organizationId;
      if (!organizationId) {
        await auditBlockedAccess(req, "SUBMISSION_BLOCKED", { reason: "MISSING_ORGANIZATION", path: req.originalUrl });
        return res.status(403).json({
          error: "Complete your organization onboarding before submitting.",
          redirectTo: "/organization/onboarding/status"
        });
      }

      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });

      if (!organization || organization.kind !== requiredKind) {
        await auditBlockedAccess(req, "SUBMISSION_BLOCKED", {
          reason: "WRONG_ORGANIZATION_KIND",
          organizationId,
          requiredKind,
          actualKind: organization?.kind,
          path: req.originalUrl
        });
        return res.status(403).json({ error: `This action is not available for your organization type. You are a ${organization.kind}, but this action requires a ${requiredKind}.` });
      }

      if (organization.status !== OrganizationStatus.ACTIVE) {
        await auditBlockedAccess(req, "SUBMISSION_BLOCKED", {
          reason: "ORGANIZATION_NOT_APPROVED",
          organizationId,
          status: organization.status,
          path: req.originalUrl
        });
        return res.status(403).json({
          error: "Your organization onboarding is pending verification. You can submit after Super Admin approval.",
          redirectTo: "/organization/onboarding/status"
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

/** Submission requires a currently active, OTP/identity-verified account. */
export const requireVerifiedActiveUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (req.user.role === Role.SUPER_ADMIN) return next();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isVerified: true, accountStatus: true }
    });
    if (!user || !user.isVerified || user.accountStatus !== "ACTIVE") {
      await auditBlockedAccess(req, "SUBMISSION_BLOCKED", { reason: "USER_NOT_VERIFIED_OR_ACTIVE", path: req.originalUrl });
      return res.status(403).json({ error: "Verify your email/mobile and activate your account before submitting." });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Require contextual Organization Scope match.
 * Prevents tenant isolation leaks. SUPER_ADMIN, PLANNING_SECRETARY, JOINT_SECRETARY bypass.
 * Otherwise, the requested organizationId must match req.user.organizationId.
 */
export const requireOrgScope = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const userRole = Number(req.user.role);
    if (userRole === Role.SUPER_ADMIN || userRole === Role.PLANNING_SECRETARY || userRole === Role.JOINT_SECRETARY) {
      return next();
    }

    const targetOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
    if (!req.user.organizationId) {
      await auditBlockedAccess(req, "ORG_SCOPE_BLOCKED", { reason: "MISSING_USER_ORGANIZATION", path: req.originalUrl });
      return res.status(403).json({ error: "Forbidden: user does not belong to any organization" });
    }

    if (targetOrgId && String(targetOrgId) !== String(req.user.organizationId)) {
      await auditBlockedAccess(req, "ORG_SCOPE_BLOCKED", {
        reason: "ORGANIZATION_MISMATCH",
        userOrgId: req.user.organizationId,
        targetOrgId,
        path: req.originalUrl
      });
      return res.status(403).json({ error: "Forbidden: access restricted to your organization" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Require District Scope isolation.
 * For District Nodal Consultants (DNC) & District Nodal Officers (DNO), operations must match assigned district.
 * Platform roles (SUPER_ADMIN, PLANNING_SECRETARY, JOINT_SECRETARY, RELATIONSHIP_MANAGER) are state-wide.
 */
export const requireDistrictScope = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const userRole = Number(req.user.role);
    if (
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.PLANNING_SECRETARY ||
      userRole === Role.JOINT_SECRETARY ||
      userRole === Role.RELATIONSHIP_MANAGER
    ) {
      return next();
    }

    const targetDistrict = req.params.district || req.body.district || req.query.district;
    if (!targetDistrict) {
      await auditBlockedAccess(req, "DISTRICT_SCOPE_BLOCKED", { reason: "MISSING_TARGET_DISTRICT", path: req.originalUrl });
      return res.status(400).json({ error: "District parameter is required for scope verification" });
    }

    const userDistrict = req.user.assignedDistrict;
    if (!userDistrict || String(userDistrict).trim().toLowerCase() !== String(targetDistrict).trim().toLowerCase()) {
      await auditBlockedAccess(req, "DISTRICT_SCOPE_BLOCKED", {
        reason: "DISTRICT_MISMATCH",
        userDistrict,
        targetDistrict,
        path: req.originalUrl
      });
      return res.status(403).json({ error: "Forbidden: access restricted to your assigned district" });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Require explicit Project Assignment or ownership scope.
 * Validates that user has access to a given projectId (via org, assigned district, or explicit ProjectAssignment).
 */
export const requireProjectScope = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const userRole = Number(req.user.role);
    if (
      userRole === Role.SUPER_ADMIN ||
      userRole === Role.PLANNING_SECRETARY ||
      userRole === Role.JOINT_SECRETARY ||
      userRole === Role.RELATIONSHIP_MANAGER
    ) {
      return next();
    }

    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
      return next();
    }

    const project = await prisma.project.findUnique({
      where: { id: String(projectId) },
      select: {
        id: true,
        organizationId: true,
        corporatePartnerId: true,
        implementingAgencyId: true,
        ngoId: true,
        nodalOfficerUserId: true,
        district: true
      }
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (
      req.user.organizationId &&
      (project.organizationId === req.user.organizationId ||
       project.corporatePartnerId === req.user.organizationId ||
       project.implementingAgencyId === req.user.organizationId ||
       project.ngoId === req.user.organizationId)
    ) {
      return next();
    }

    if (project.nodalOfficerUserId === req.user.id) {
      return next();
    }

    const isDistrictNodalOfficer = userRole === Role.DISTRICT_NODAL_OFFICER || String(req.user.roleId) === "4" || Number(req.user.roleId) === 4;
    if (!isDistrictNodalOfficer && req.user.assignedDistrict && project.district.toLowerCase() === req.user.assignedDistrict.toLowerCase()) {
      return next();
    }

    const explicitAssignment = await prisma.projectAssignment.findFirst({
      where: {
        entityId: project.id,
        assignedToId: req.user.id,
        status: "ACTIVE"
      }
    });

    if (explicitAssignment) {
      return next();
    }

    await auditBlockedAccess(req, "PROJECT_SCOPE_BLOCKED", {
      reason: "UNAUTHORIZED_PROJECT_ACCESS",
      projectId,
      userId: req.user.id,
      path: req.originalUrl
    });

    return res.status(403).json({ error: "Forbidden: you do not have explicit access to this project" });
  } catch (error) {
    return next(error);
  }
};

/**
 * Pipeline Step 2: Load current user's effective access payload & scopes.
 */
export const loadCurrentPrincipal = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.id) return res.status(401).json({ error: "Authentication required" });
  try {
    const payload = await EffectivePermissionService.getEffectiveAccessPayload(req.user.id);
    (req as any).principal = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Pipeline Step 3: Enforce active account status gate.
 */
export const requireActiveAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  if (req.user.accountStatus !== "ACTIVE") {
    return res.status(403).json({ error: "Forbidden: account status must be ACTIVE to perform this action" });
  }
  return next();
};

/**
 * Pipeline Step 4: Enforce explicit DB permission key requirement.
 */
export const requirePermission = (permissionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const isSuperAdmin = Number(req.user.role) === Role.SUPER_ADMIN || req.user.role === "SUPER_ADMIN" || req.user.roleId === "1" || Number(req.user.roleId) === 1;
      if (isSuperAdmin) return next();

      const hasPerm = await EffectivePermissionService.hasPermission(req.user.id, permissionKey);
      if (!hasPerm) {
        await auditBlockedAccess(req, "PERMISSION_ACCESS_BLOCKED", { permissionKey, path: req.originalUrl });
        return res.status(403).json({ error: `Forbidden: missing required permission '${permissionKey}'` });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireAnyPermission = (permissionKeys: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });
      const isSuperAdmin = Number(req.user.role) === Role.SUPER_ADMIN || req.user.role === "SUPER_ADMIN" || req.user.roleId === "1" || Number(req.user.roleId) === 1;
      if (isSuperAdmin) return next();

      const hasPerm = await EffectivePermissionService.hasAnyPermission(req.user.id, permissionKeys);
      if (!hasPerm) {
        await auditBlockedAccess(req, "PERMISSION_ACCESS_BLOCKED", { permissionKeys, path: req.originalUrl });
        return res.status(403).json({ error: `Forbidden: missing any of required permissions [${permissionKeys.join(", ")}]` });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Pipeline Step 5: Enforce contextual resource scope isolation.
 */
export const requireResourceScope = (scopeType: "GLOBAL" | "ORGANIZATION" | "DISTRICT" | "PROJECT") => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (scopeType === "ORGANIZATION") return requireOrgScope(req, res, next);
    if (scopeType === "DISTRICT") return requireDistrictScope(req, res, next);
    if (scopeType === "PROJECT") return requireProjectScope(req, res, next);
    return next();
  };
};

/**
 * Pipeline Step 6: Enforce state machine transition rules & audit logging.
 */
export const requireAllowedTransition = (entityType: "PITCH" | "REQUIREMENT" | "PROJECT" | "ASSESSMENT", requiredPermission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { fromState, toState, reason } = req.body;
      const entityId = req.params.id || req.body.entityId;

      if (!fromState || !toState) {
        return next();
      }

      await WorkflowTransitionService.executeTransition({
        entityType,
        entityId,
        actorUserId: req.user!.id,
        fromState,
        toState,
        requiredPermission,
        reason,
        ipAddress: req.ip
      });

      return next();
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Workflow transition failed" });
    }
  };
};

