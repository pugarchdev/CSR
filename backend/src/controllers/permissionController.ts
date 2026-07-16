import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ROLE_PERMISSION_MAP } from "../config/platformAccess";
import { Role } from "@prisma/client";
import { successResponse } from "../utils/apiResponse";

/**
 * Get current user's permissions dynamically from database
 * Combines:
 * 1. System role permissions (from ROLE_PERMISSION_MAP fallback)
 * 2. Organization role permissions (from UserOrganizationRole assignments)
 */
export const getCurrentUserPermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;
    const organizationId = req.user.organizationId;

    // Start with system role permissions as fallback
    const systemPermissions = ROLE_PERMISSION_MAP[userRole] || [];
    const permissionSet = new Set<string>(systemPermissions);

    // Fetch dynamic organization role permissions
    const userOrgRoles = await prisma.userOrganizationRole.findMany({
      where: {
        userId,
        OR: [
          { tenantId: tenantId || undefined },
          { organizationId: organizationId || undefined },
        ],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Add permissions from organization roles
    userOrgRoles.forEach((assignment) => {
      assignment.role.rolePermissions.forEach((rolePermission) => {
        permissionSet.add(rolePermission.permission.key);
      });
    });

    // Fetch user's assigned roles
    const roles = userOrgRoles.map((assignment) => ({
      id: assignment.role.id,
      name: assignment.role.name,
      scope: assignment.role.scope,
      isSystemRole: assignment.role.isSystemRole,
    }));

    // Add system role if not already in organization roles
    const hasSystemRole = roles.some((r) => r.name === userRole);
    if (!hasSystemRole) {
      roles.push({
        id: userRole,
        name: userRole,
        scope: "GLOBAL" as const,
        isSystemRole: true,
      });
    }

    return successResponse(res, {
      permissions: Array.from(permissionSet),
      roles: roles.map((r) => r.name),
      roleDetails: roles,
      isAdmin: ([Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN] as Role[]).includes(userRole),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permissions for a specific module
 * Useful for loading module-specific permissions on demand
 */
export const getModulePermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { module } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const organizationId = req.user.organizationId;

    // Get all user permissions
    const systemPermissions = ROLE_PERMISSION_MAP[req.user.role] || [];
    const permissionSet = new Set<string>(
      systemPermissions.filter((p) => p.startsWith(`${module}:`))
    );

    const userOrgRoles = await prisma.userOrganizationRole.findMany({
      where: {
        userId,
        OR: [
          { tenantId: tenantId || undefined },
          { organizationId: organizationId || undefined },
        ],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    userOrgRoles.forEach((assignment) => {
      assignment.role.rolePermissions.forEach((rolePermission) => {
        if (rolePermission.permission.module === module) {
          permissionSet.add(rolePermission.permission.key);
        }
      });
    });

    return successResponse(res, {
      module,
      permissions: Array.from(permissionSet),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has specific permission
 * POST /api/auth/check-permission
 */
export const checkUserPermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { permission } = req.body;
    if (!permission) {
      return res.status(400).json({ error: "Permission key is required" });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const tenantId = req.user.tenantId;
    const organizationId = req.user.organizationId;

    // Admin bypass
    if (userRole === Role.SUPER_ADMIN) {
      return successResponse(res, { hasPermission: true, permission });
    }

    // Check system role permissions
    const systemPermissions = ROLE_PERMISSION_MAP[userRole] || [];
    if (systemPermissions.includes(permission)) {
      return successResponse(res, { hasPermission: true, permission });
    }

    // Check organization role permissions
    const userOrgRoles = await prisma.userOrganizationRole.findMany({
      where: {
        userId,
        OR: [
          { tenantId: tenantId || undefined },
          { organizationId: organizationId || undefined },
        ],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                permission: {
                  key: permission,
                },
              },
            },
          },
        },
      },
    });

    const hasPermission = userOrgRoles.some(
      (assignment) => assignment.role.rolePermissions.length > 0
    );

    return successResponse(res, { hasPermission, permission });
  } catch (error) {
    next(error);
  }
};
