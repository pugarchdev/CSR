import { NextFunction, Response } from "express";
import { OrganizationOnboardingStatus, OrganizationStatus } from "@prisma/client";
import { Role } from "../types/role";
import prisma from "../config/db";
import { AuthenticatedRequest } from "./authMiddleware";
import { ROLE_PERMISSION_MAP } from "../config/platformAccess";
import { resolveUserPermission } from "../services/permissionService";

export interface TenantAwareRequest extends AuthenticatedRequest {
  tenantContext?: {
    organizationId: string | null;
    isMasterAdmin: boolean;
    tenantId?: string | null;
  };
}

export const resolveTenantContext = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    req.tenantContext = {
      organizationId: req.user?.organizationId || null,
      isMasterAdmin: false,
      tenantId: "global"
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const checkTenantActive = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  return next();
};

const auditBlockedAccess = async (req: TenantAwareRequest, action: string, details: Record<string, unknown>) => {
  await prisma.auditLog.create({
    data: {
      userId: req.user?.id,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action,
      entityType: "ACCESS_GUARD",
      details: details as any,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null
    }
  }).catch(() => {});
};

export const checkFeatureEnabled = (featureKey: string, sensitive = true) => {
  return async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    return next();
  };
};

export const checkPublicFeatureEnabled = (featureKey: string) => {
  return async (_req: TenantAwareRequest, res: Response, next: NextFunction) => {
    return next();
  };
};

export const checkOrganizationApproved = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    if (
      req.user?.role === Role.SUPER_ADMIN ||
      req.user?.role === Role.GOVERNMENT_OFFICER
    ) return next();
    const organizationId = req.tenantContext?.organizationId;

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
      organization.status !== OrganizationStatus.ACTIVE ||
      organization.onboardingStatus !== OrganizationOnboardingStatus.APPROVED
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

export const checkPermission = (permissionKey: string) => {
  return async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized access" });
      if (req.user.role === Role.SUPER_ADMIN) return next();
      const fallbackPermissions = req.user.role ? (ROLE_PERMISSION_MAP[req.user.role] || []) : [];
      if (fallbackPermissions.includes(permissionKey)) return next();

      // Shared resolver (same logic used by the workflow engine)
      const hasPermission = await resolveUserPermission(req.user.id, permissionKey, {
        role: null, // static fallback already checked above
        organizationId: req.tenantContext?.organizationId || undefined
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
