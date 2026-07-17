import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { RoleScope } from "@prisma/client";
import { CacheService } from "../services/cacheService";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  forbiddenResponse } from "../utils/apiResponse";

/**
 * Get all roles with search, filter, and pagination
 */
export const getRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      search,
      status,
      scope,
      category,
      isSystemRole,
      companyId,
      page = 1,
      limit = 10 } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {};

    // Apply filters
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
      ];
    }
    if (status) {
      where.status = String(status);
    }
    if (scope) {
      where.scope = scope as RoleScope;
    }
    if (category) {
      where.category = String(category);
    }
    if (isSystemRole !== undefined) {
      where.isSystemRole = isSystemRole === "true";
    }
    if (companyId === "null" || companyId === null) {
      where.companyId = null;
    } else if (companyId) {
      where.companyId = String(companyId);
    }

    const [roles, total] = await Promise.all([prisma.organizationRole.findMany({
        where, orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: limitNumber,
        include: {
          rolePermissions: {
            include: {
              permission: true } } } }),
      prisma.organizationRole.count({ where }),
    ]);

    return successResponse(res, {
      roles: roles.map((role) => ({
        ...role,
        permissions: role.rolePermissions.map((rp) => rp.permission.key) })),
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber) } });
  } catch (error) {
    next(error);
  }
};

/**
 * Get role details by ID
 */
export const getRoleById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const role = await prisma.organizationRole.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true } } } });

    if (!role) {
      return notFoundResponse(res, "Role not found");
    }

    return successResponse(res, {
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission.key) });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new dynamic role
 */
export const createRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      description,
      scope = RoleScope.GLOBAL,
      status = "ACTIVE",
      category,
      displayOrder = 0,
      companyId,
      permissions = [] } = req.body;

    if (!name || name.trim() === "") {
      return validationErrorResponse(res, "Role name is required");
    }


    // Check for duplicate name within same tenant context
    const existing = await prisma.organizationRole.findFirst({
      where: {
        name: name.trim(),
        companyId: companyId || null
      }
    });

    if (existing) {
      return validationErrorResponse(res, `Role '${name}' already exists in this context`);
    }

    // Resolve permission IDs from keys
    const dbPermissions = await prisma.permission.findMany({
      where: { key: { in: permissions } },
      select: { id: true } });

    const newRole = await prisma.organizationRole.create({
      data: {
        name: name.trim(),
        description,
        scope: scope as RoleScope,
        isSystemRole: false,
        isPermanent: false,
        status,
        category,
        displayOrder: Number(displayOrder),
        companyId: companyId || null,
        createdBy: req.user?.id,
        rolePermissions: {
          create: dbPermissions.map((p) => ({
            permissionId: p.id })) } },
      include: {
        rolePermissions: {
          include: {
            permission: true } } } });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "ROLE_CREATED",
        entityType: "OrganizationRole",
        entityId: newRole.id,
        details: {
          name: newRole.name,
          scope: newRole.scope,
          permissionsCount: permissions.length } } }).catch(console.error);

    return successResponse(res, newRole, "Role created successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing role
 */
export const updateRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      category,
      displayOrder,
      permissions } = req.body;

    const role = await prisma.organizationRole.findUnique({
      where: { id },
      include: {
        userRoles: { select: { userId: true } } } });

    if (!role) {
      return notFoundResponse(res, "Role not found");
    }

    // Super Admin & Permanent roles protection
    if (role.isPermanent || role.name === "SUPER_ADMIN") {
      if (name && name !== role.name) {
        return forbiddenResponse(res, "Permanent system roles cannot be renamed");
      }
      if (status && status !== role.status) {
        return forbiddenResponse(res, "Permanent system roles cannot be deactivated");
      }
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (description !== undefined) data.description = description;
    if (status) data.status = status;
    if (category !== undefined) data.category = category;
    if (displayOrder !== undefined) data.displayOrder = Number(displayOrder);

    // Dynamic Permission assignment updates
    if (permissions) {
      // Permanent roles cannot lose permissions
      if (role.isPermanent && role.name === "SUPER_ADMIN") {
        // Prevent deleting any permissions
      } else {
        const dbPermissions = await prisma.permission.findMany({
          where: { key: { in: permissions } },
          select: { id: true } });

        // Delete existing relations
        await prisma.organizationRolePermission.deleteMany({
          where: { roleId: id } });

        // Insert new ones
        data.rolePermissions = {
          create: dbPermissions.map((p) => ({
            permissionId: p.id })) };
      }
    }

    const updatedRole = await prisma.organizationRole.update({
      where: { id },
      data,
      include: {
        rolePermissions: {
          include: {
            permission: true } } } });

    // Invalidate permission cache for all users holding this role
    const userIds = role.userRoles.map((ur) => ur.userId);
    for (const userId of userIds) {
      await CacheService.invalidatePermissions(userId);
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "ROLE_UPDATED",
        entityType: "OrganizationRole",
        entityId: id,
        details: {
          name: updatedRole.name,
          updatedFields: Object.keys(data),
          affectedUsersCount: userIds.length } } }).catch(console.error);

    return successResponse(res, updatedRole, "Role updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate / Clone a role
 */
export const cloneRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { newName, newDescription } = req.body;

    if (!newName || newName.trim() === "") {
      return validationErrorResponse(res, "New role name is required");
    }

    const sourceRole = await prisma.organizationRole.findUnique({
      where: { id },
      include: {
        rolePermissions: { select: { permissionId: true } } } });

    if (!sourceRole) {
      return notFoundResponse(res, "Source role not found");
    }


    // Check duplicate
    const existing = await prisma.organizationRole.findFirst({
      where: {
        name: newName.trim(),
        companyId: sourceRole.companyId
      }
    });

    if (existing) {
      return validationErrorResponse(res, `Role '${newName}' already exists in this context`);
    }

    const cloned = await prisma.organizationRole.create({
      data: {
        name: newName.trim(),
        description: newDescription || `Clone of ${sourceRole.name}. ${sourceRole.description || ""}`,
        scope: sourceRole.scope,
        isSystemRole: false,
        isPermanent: false,
        status: "ACTIVE",
        category: sourceRole.category,
        displayOrder: sourceRole.displayOrder + 1,
        companyId: sourceRole.companyId,
        createdBy: req.user?.id,
        rolePermissions: {
          create: sourceRole.rolePermissions.map((rp) => ({
            permissionId: rp.permissionId })) } } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "ROLE_CLONED",
        entityType: "OrganizationRole",
        entityId: cloned.id,
        details: {
          sourceRoleId: id,
          sourceRoleName: sourceRole.name,
          clonedRoleName: cloned.name } } }).catch(console.error);

    return successResponse(res, cloned, "Role cloned successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a custom role
 */
export const deleteRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const role = await prisma.organizationRole.findUnique({
      where: { id },
      include: {
        userRoles: { select: { userId: true } } } });

    if (!role) {
      return notFoundResponse(res, "Role not found");
    }

    if (role.isPermanent || role.isSystemRole || role.name === "SUPER_ADMIN") {
      return forbiddenResponse(res, "System or permanent roles cannot be deleted");
    }

    // Invalidate cache for users before delete
    const userIds = role.userRoles.map((ur) => ur.userId);
    for (const userId of userIds) {
      await CacheService.invalidatePermissions(userId);
    }

    await prisma.organizationRole.delete({
      where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "ROLE_DELETED",
        entityType: "OrganizationRole",
        entityId: id,
        details: {
          name: role.name,
          affectedUsersCount: userIds.length } } }).catch(console.error);

    return successResponse(res, null, "Role deleted successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Get all available permissions grouped by category/module
 */
export const getPermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { key: "asc" }],
      include: {
        group: true } });

    // Group permissions by module
    const grouped: Record<string, any[]> = {};
    permissions.forEach((p) => {
      const mod = p.module || "Other";
      if (!grouped[mod]) {
        grouped[mod] = [];
      }
      grouped[mod].push(p);
    });

    return successResponse(res, {
      grouped,
      all: permissions });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permission groups
 */
export const getPermissionGroups = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const groups = await prisma.permissionGroup.findMany({
      include: {
        permissions: true },
      orderBy: { name: "asc" } });

    return successResponse(res, groups);
  } catch (error) {
    next(error);
  }
};

/**
 * Create permission group
 */
export const createPermissionGroup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === "") {
      return validationErrorResponse(res, "Group name is required");
    }

    const group = await prisma.permissionGroup.create({
      data: {
        name: name.trim(),
        description } });

    return successResponse(res, group, "Permission group created successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Assign one or more roles to a user
 */
export const assignUserRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { roleIds = [], companyId } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId } });

    if (!user) {
      return notFoundResponse(res, "User not found");
    }


    // Delete existing UserOrganizationRole mappings for this user
    await prisma.userOrganizationRole.deleteMany({
      where: {
        userId,
        companyId: companyId || undefined } });

    // Create new mappings
    if (roleIds.length > 0) {
      await prisma.userOrganizationRole.createMany({
        data: roleIds.map((roleId: string) => ({
          userId,
          roleId,
          companyId: companyId || null
        }))
      });
    }

    // Invalidate cached permissions for this user
    await CacheService.invalidatePermissions(userId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "USER_ROLES_ASSIGNED",
        entityType: "User",
        entityId: userId,
        details: {
          roleIds,
          companyId } } }).catch(console.error);

    return successResponse(res, null, "User roles assigned successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's assigned roles
 */
export const getUserRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const userRoles = await prisma.userOrganizationRole.findMany({
      where: { userId },
      include: {
        role: true } });

    return successResponse(res, userRoles.map((ur) => ur.role));
  } catch (error) {
    next(error);
  }
};
