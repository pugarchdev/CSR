import { NextFunction, Response } from "express";
import { OrganizationOnboardingStatus, OrganizationStatus, Role, TenantStatus } from "@prisma/client";
import prisma from "../config/db";
import { AuthenticatedRequest } from "./authMiddleware";
import { ROLE_PERMISSION_MAP } from "../config/platformAccess";

export interface TenantAwareRequest extends AuthenticatedRequest {
  tenantContext?: {
    tenantId: string | null;
    organizationId: string | null;
    isMasterAdmin: boolean;
  };
}

const DEFAULT_TENANT_CODE = "MH-CSR";

export const resolveTenantContext = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      const tenant = await prisma.tenant.findUnique({ where: { code: DEFAULT_TENANT_CODE } });
      req.tenantContext = {
        tenantId: tenant?.id || null,
        organizationId: null,
        isMasterAdmin: false
      };
      return next();
    }



    let tenantId = req.user.tenantId || null;
    if (!tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { code: DEFAULT_TENANT_CODE } });
      tenantId = tenant?.id || null;
    }

    req.tenantContext = {
      tenantId,
      organizationId: req.user.organizationId || null,
      isMasterAdmin: false
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

export const checkTenantActive = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    if (req.tenantContext?.isMasterAdmin) return next();
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) return res.status(403).json({ error: "Portal instance is not assigned to this account." });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.status !== TenantStatus.ACTIVE || tenant.isHidden) {
      return res.status(403).json({ error: "This portal instance is not active." });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const auditBlockedAccess = async (req: TenantAwareRequest, action: string, details: Record<string, unknown>) => {
  await prisma.auditLog.create({
    data: {
      tenantId: req.tenantContext?.tenantId || null,
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
    try {
      if (req.tenantContext?.isMasterAdmin) return next();
      const tenantId = req.tenantContext?.tenantId;
      if (!tenantId) return res.status(403).json({ error: "Portal instance is not assigned to this account." });

      const feature = await prisma.tenantFeature.findUnique({
        where: { tenantId_featureKey: { tenantId, featureKey } }
      });

      if (feature && !feature.isEnabled) {
        if (sensitive) {
          await auditBlockedAccess(req, "FEATURE_ACCESS_BLOCKED", { featureKey, path: req.originalUrl });
        }
        return res.status(403).json({ error: "This feature is not enabled for your portal instance." });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const checkPublicFeatureEnabled = (featureKey: string) => {
  return async (_req: TenantAwareRequest, res: Response, next: NextFunction) => {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { code: DEFAULT_TENANT_CODE } });
      if (!tenant) return next();
      const feature = await prisma.tenantFeature.findUnique({
        where: { tenantId_featureKey: { tenantId: tenant.id, featureKey } }
      });
      if (feature && !feature.isEnabled) {
        return res.status(403).json({ error: "This feature is not enabled for your portal instance." });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const checkOrganizationApproved = async (req: TenantAwareRequest, res: Response, next: NextFunction) => {
  try {
    if (
      req.tenantContext?.isMasterAdmin ||
      req.user?.role === Role.SUPER_ADMIN ||
      req.user?.role === Role.PORTAL_ADMIN ||
      req.user?.role === Role.CSR_ADMIN ||
      req.user?.role === Role.DISTRICT_ADMIN ||
      req.user?.role === Role.FINANCE_USER
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
      const fallbackPermissions = ROLE_PERMISSION_MAP[req.user.role] || [];
      if (fallbackPermissions.includes(permissionKey)) return next();

      const userRoles = await prisma.userOrganizationRole.findMany({
        where: {
          userId: req.user.id,
          OR: [
            { tenantId: req.tenantContext?.tenantId || undefined },
            { organizationId: req.tenantContext?.organizationId || undefined }
          ]
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      const hasPermission = userRoles.some((assignment) =>
        assignment.role.rolePermissions.some((rolePermission) => rolePermission.permission.key === permissionKey)
      );

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
