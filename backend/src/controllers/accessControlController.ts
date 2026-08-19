import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { AccessControlApiService } from "../services/accessControlApiService";
import { EffectivePermissionService } from "../services/effectivePermissionService";
import {
  CreateRoleSchema,
  PatchRoleSchema,
  UpdatePermissionsSchema,
  CloneRoleSchema,
  ImpactPreviewSchema,
  CreateAssignmentSchema,
  PatchAssignmentSchema,
} from "../validators/accessControlValidator";

export const getOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";
    const orgId = isSuper
      ? (req.query.organizationId as string | undefined)
      : req.user?.organizationId;
    const stats = await AccessControlApiService.getOverview(orgId);
    return res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getRoles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";
    const userOrgId = req.user?.organizationId;
    const { status, type, search } = req.query;

    const where: any = {};
    if (!isSuper) {
      if (!userOrgId) {
        where.id = -1;
      } else {
        where.organizationId = userOrgId;
        where.isSystemRole = false;
        where.id = { gt: 9 };
      }
    } else if (req.query.organizationId) {
      where.organizationId = String(req.query.organizationId);
    }

    if (status) where.status = String(status);
    if (type) where.type = String(type);
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: String(search), mode: "insensitive" } },
            { code: { contains: String(search), mode: "insensitive" } },
            { description: { contains: String(search), mode: "insensitive" } },
          ],
        },
      ];
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        _count: { select: { roleAssignments: true, users: true } },
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { id: "asc" },
    });

    return res.json({
      data: roles.map((r) => ({
        ...r,
        permissions: r.rolePermissions.map((rp) => rp.permission.key),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parseResult = CreateRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: parseResult.error.format(),
        });
    }

    const {
      code,
      name,
      displayName,
      description,
      defaultScope,
      organizationId,
      permissions = [],
    } = parseResult.data;
    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";

    if (!isSuper && !req.user?.organizationId) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden: user must belong to an organization to create custom roles",
        });
    }

    const targetOrgId = isSuper
      ? organizationId || null
      : req.user?.organizationId;

    // Check duplicate code or name
    const existingCode = await prisma.role.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(409).json({ error: "Role code already exists" });
    }

    if (permissions.length > 0) {
      await AccessControlApiService.validatePermissionKeys(permissions);
      await AccessControlApiService.checkDelegationCeiling(
        req.user!.id,
        permissions,
      );
    }

    const newRole = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code,
          name,
          displayName: displayName || name,
          description: description || null,
          type: "CUSTOM",
          defaultScope: defaultScope as any,
          status: "ACTIVE",
          isSystemRole: false,
          isProtected: false,
          version: 1,
          organizationId: targetOrgId,
        },
      });

      if (permissions.length > 0) {
        const permsInDb = await tx.permission.findMany({
          where: { key: { in: permissions } },
          select: { id: true },
        });

        await tx.rolePermission.createMany({
          data: permsInDb.map((p) => ({
            roleId: created.id,
            permissionId: p.id,
          })),
        });
      }

      await AccessControlApiService.recordAuditLog(
        tx,
        {
          actorUserId: req.user!.id,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
        "ROLE_CREATED",
        "ROLE",
        String(created.id),
        null,
        created,
        "Custom role created",
      );

      return created;
    });

    return res.status(201).json(newRole);
  } catch (error: any) {
    if (
      error.message?.includes("Delegation Ceiling") ||
      error.message?.includes("Invalid permission")
    ) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

export const getRoleById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId))
      return res.status(400).json({ error: "Invalid Role ID" });

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { roleAssignments: true, users: true } },
      },
    });

    if (!role) return res.status(404).json({ error: "Role not found" });

    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";
    if (
      !isSuper &&
      role.organizationId &&
      role.organizationId !== req.user?.organizationId
    ) {
      return res
        .status(403)
        .json({
          error: "Forbidden: access restricted to your organization's roles",
        });
    }

    return res.json({
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission.key),
    });
  } catch (error) {
    next(error);
  }
};

export const patchRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId))
      return res.status(400).json({ error: "Invalid Role ID" });

    const parseResult = PatchRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: parseResult.error.format(),
        });
    }

    const { name, displayName, description, defaultScope, version, reason } =
      parseResult.data;
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!existingRole) return res.status(404).json({ error: "Role not found" });

    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";
    if (!isSuper && (existingRole.isSystemRole || existingRole.isProtected)) {
      return res
        .status(403)
        .json({
          error: "Forbidden: system roles can only be modified by Super Admin",
        });
    }
    if (
      !isSuper &&
      existingRole.organizationId &&
      existingRole.organizationId !== req.user?.organizationId
    ) {
      return res
        .status(403)
        .json({
          error: "Forbidden: access restricted to your organization's roles",
        });
    }

    // Optimistic Locking Check
    if (existingRole.version !== version) {
      return res.status(409).json({
        error:
          "Conflict: Role version mismatch. The role was updated by another administrator since you fetched it.",
        currentVersion: existingRole.version,
      });
    }

    const updatedRole = await prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: roleId },
        data: {
          ...(name ? { name } : {}),
          ...(displayName ? { displayName } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(defaultScope ? { defaultScope: defaultScope as any } : {}),
          version: { increment: 1 },
        },
      });

      await AccessControlApiService.recordAuditLog(
        tx,
        {
          actorUserId: req.user!.id,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
        "ROLE_UPDATED",
        "ROLE",
        String(roleId),
        existingRole,
        updated,
        reason || "Role metadata patched",
      );

      return updated;
    });

    return res.json(updatedRole);
  } catch (error) {
    next(error);
  }
};

export const cloneRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId))
      return res.status(400).json({ error: "Invalid Role ID" });

    const parseResult = CloneRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: parseResult.error.format(),
        });
    }

    const { newCode, newName, newDisplayName } = parseResult.data;
    const sourceRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: true },
    });

    if (!sourceRole)
      return res.status(404).json({ error: "Source role not found" });

    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";
    if (!isSuper && !req.user?.organizationId) {
      return res
        .status(403)
        .json({
          error:
            "Forbidden: user must belong to an organization to clone roles",
        });
    }

    const existingCode = await prisma.role.findUnique({
      where: { code: newCode },
    });
    if (existingCode)
      return res.status(409).json({ error: "Target role code already exists" });

    const cloned = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          code: newCode,
          name: newName,
          displayName: newDisplayName || newName,
          description: `Cloned from ${sourceRole.name} (${sourceRole.code})`,
          type: "CUSTOM",
          defaultScope: sourceRole.defaultScope,
          status: "ACTIVE",
          isSystemRole: false,
          isProtected: false,
          version: 1,
          organizationId: isSuper
            ? sourceRole.organizationId
            : req.user?.organizationId,
        },
      });

      if (sourceRole.rolePermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: sourceRole.rolePermissions.map((rp) => ({
            roleId: created.id,
            permissionId: rp.permissionId,
          })),
        });
      }

      await AccessControlApiService.recordAuditLog(
        tx,
        { actorUserId: req.user!.id, ipAddress: req.ip },
        "ROLE_CLONED",
        "ROLE",
        String(created.id),
        { sourceRoleId: roleId },
        created,
        `Cloned from role ID ${roleId}`,
      );

      return created;
    });

    return res.status(201).json(cloned);
  } catch (error) {
    next(error);
  }
};

export const activateRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const updated = await prisma.role.update({
      where: { id: roleId },
      data: { status: "ACTIVE", version: { increment: 1 } },
    });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deactivateRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const updated = await prisma.role.update({
      where: { id: roleId },
      data: { status: "INACTIVE", version: { increment: 1 } },
    });
    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { roleAssignments: { where: { status: "ACTIVE" } } },
        },
      },
    });

    if (!role) return res.status(404).json({ error: "Role not found" });
    if (role.isProtected || role.isSystemRole) {
      return res
        .status(403)
        .json({ error: "Forbidden: system protected roles cannot be deleted" });
    }

    if (role._count.roleAssignments > 0) {
      return res.status(422).json({
        error:
          "Invalid State Transition: Role cannot be deleted while active user assignments exist. Reassign users first.",
        activeAssignmentsCount: role._count.roleAssignments,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.role.delete({ where: { id: roleId } });

      await AccessControlApiService.recordAuditLog(
        tx,
        { actorUserId: req.user!.id, ipAddress: req.ip },
        "ROLE_DELETED",
        "ROLE",
        String(roleId),
        role,
        null,
        "Role deleted",
      );
    });

    return res.json({ message: "Role deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getPermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";
    let perms = await prisma.permission.findMany({ orderBy: { key: "asc" } });

    if (!isSuper && req.user?.id) {
      const userAccess =
        await EffectivePermissionService.getEffectiveAccessPayload(req.user.id);
      const userPermSet = new Set(userAccess.permissions);
      perms = perms.filter((p) => userPermSet.has(p.key));
    }

    return res.json({ data: perms });
  } catch (error) {
    next(error);
  }
};

export const getRolePermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });

    if (!role) return res.status(404).json({ error: "Role not found" });
    return res.json({
      roleId,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    });
  } catch (error) {
    next(error);
  }
};

export const updateRolePermissions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const parseResult = UpdatePermissionsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: parseResult.error.format(),
        });
    }

    const { permissions, version, reason } = parseResult.data;
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!existingRole) return res.status(404).json({ error: "Role not found" });

    if (existingRole.version !== version) {
      return res.status(409).json({
        error:
          "Conflict: Role version mismatch. Permissions were modified by another administrator.",
        currentVersion: existingRole.version,
      });
    }

    await AccessControlApiService.validatePermissionKeys(permissions);
    await AccessControlApiService.checkDelegationCeiling(
      req.user!.id,
      permissions,
    );

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      const permsInDb = await tx.permission.findMany({
        where: { key: { in: permissions } },
        select: { id: true },
      });

      if (permsInDb.length > 0) {
        await tx.rolePermission.createMany({
          data: permsInDb.map((p) => ({ roleId, permissionId: p.id })),
        });
      }

      await tx.role.update({
        where: { id: roleId },
        data: { version: { increment: 1 } },
      });

      // Session revocation: increment tokenVersion for assigned users
      const activeAssignments = await tx.userRoleAssignment.findMany({
        where: { roleId, status: "ACTIVE" },
        select: { userId: true },
      });

      const userIds = Array.from(
        new Set(activeAssignments.map((a) => a.userId)),
      );
      if (userIds.length > 0) {
        await tx.user.updateMany({
          where: { id: { in: userIds } },
          data: { tokenVersion: { increment: 1 } },
        });
      }

      await AccessControlApiService.recordAuditLog(
        tx,
        { actorUserId: req.user!.id, ipAddress: req.ip },
        "ROLE_PERMISSIONS_UPDATED",
        "ROLE",
        String(roleId),
        { previousPermissionsCount: permissions.length },
        { updatedPermissionsCount: permissions.length },
        reason || "Permissions replaced",
      );
    });

    return res.json({ message: "Role permissions updated successfully" });
  } catch (error: any) {
    if (
      error.message?.includes("Delegation Ceiling") ||
      error.message?.includes("Invalid permission")
    ) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

export const getImpactPreview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const parseResult = ImpactPreviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: parseResult.error.format(),
        });
    }

    const preview = await AccessControlApiService.computeImpactPreview(
      roleId,
      parseResult.data.permissionsToAdd,
      parseResult.data.permissionsToRemove,
    );

    return res.json(preview);
  } catch (error) {
    next(error);
  }
};

export const getAssignments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const isSuper =
      req.user?.role === 1 ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleId === "1";
    const userOrgId = req.user?.organizationId;

    const where: any = {};
    if (!isSuper) {
      if (!userOrgId) {
        where.id = "NO_MATCH";
      } else {
        where.organizationId = userOrgId;
        where.role = { isSystemRole: false, id: { gt: 9 } };
      }
    } else if (req.query.organizationId) {
      where.organizationId = String(req.query.organizationId);
    }

    const assignments = await prisma.userRoleAssignment.findMany({
      where,
      include: {
        role: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: assignments });
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parseResult = CreateAssignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: parseResult.error.format(),
        });
    }

    const {
      userId,
      roleId,
      organizationId,
      scopeType,
      districtCode,
      divisionCode,
      departmentId,
      projectId,
      validFrom,
      validUntil,
    } = parseResult.data;

    // Prevent self-assignment (SUPER_ADMIN exempt)
    const isSuperAdmin = Number(req.user?.roleId) === 1 || req.user?.role === "SUPER_ADMIN" || String(req.user?.roleId) === "1";
    if (!isSuperAdmin && userId === req.user!.id) {
      return res.status(403).json({ error: "Forbidden: You cannot assign a role to yourself." });
    }
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ error: "Target role not found" });

    if (role.status !== "ACTIVE") {
      return res
        .status(422)
        .json({
          error:
            "Invalid State Transition: Inactive roles cannot be newly assigned",
        });
    }

    const created = await prisma.$transaction(async (tx) => {
      const assignment = await tx.userRoleAssignment.create({
        data: {
          userId,
          roleId,
          organizationId: organizationId || role.organizationId || null,
          scopeType: (scopeType as any) || role.defaultScope || "ORGANIZATION",
          districtCode: districtCode || null,
          divisionCode: divisionCode || null,
          departmentId: departmentId || null,
          projectId: projectId || null,
          status: "ACTIVE",
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          validUntil: validUntil ? new Date(validUntil) : null,
          assignedById: req.user!.id,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });

      await AccessControlApiService.recordAuditLog(
        tx,
        { actorUserId: req.user!.id, ipAddress: req.ip },
        "ROLE_ASSIGNED",
        "USER_ROLE_ASSIGNMENT",
        assignment.id,
        null,
        assignment,
        "Role assigned to user",
      );

      return assignment;
    });

    return res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const patchAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const assignmentId = req.params.id;
    const parseResult = PatchAssignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({
          error: "Validation error",
          details: parseResult.error.format(),
        });
    }

    const { status, validUntil } = parseResult.data;

    // Prevent self-modification (SUPER_ADMIN exempt)
    const existingAssignment = await prisma.userRoleAssignment.findUnique({ where: { id: assignmentId }, select: { userId: true } });
    if (!existingAssignment) return res.status(404).json({ error: "Assignment not found" });
    const isSuperAdmin = Number(req.user?.roleId) === 1 || req.user?.role === "SUPER_ADMIN" || String(req.user?.roleId) === "1";
    if (!isSuperAdmin && existingAssignment.userId === req.user!.id) {
      return res.status(403).json({ error: "Forbidden: You cannot modify your own role assignment." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const asgn = await tx.userRoleAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(status ? { status: status as any } : {}),
          ...(validUntil !== undefined
            ? { validUntil: validUntil ? new Date(validUntil) : null }
            : {}),
        },
      });

      await tx.user.update({
        where: { id: asgn.userId },
        data: { tokenVersion: { increment: 1 } },
      });

      return asgn;
    });

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const assignmentId = req.params.id;

    // Prevent self-revocation (SUPER_ADMIN exempt)
    const existingAssignment = await prisma.userRoleAssignment.findUnique({ where: { id: assignmentId }, select: { userId: true } });
    if (!existingAssignment) return res.status(404).json({ error: "Assignment not found" });
    const isSuperAdmin = Number(req.user?.roleId) === 1 || req.user?.role === "SUPER_ADMIN" || String(req.user?.roleId) === "1";
    if (!isSuperAdmin && existingAssignment.userId === req.user!.id) {
      return res.status(403).json({ error: "Forbidden: You cannot revoke your own role assignment." });
    }

    await prisma.$transaction(async (tx) => {
      const asgn = await tx.userRoleAssignment.delete({
        where: { id: assignmentId },
      });
      await tx.user.update({
        where: { id: asgn.userId },
        data: { tokenVersion: { increment: 1 } },
      });

      await AccessControlApiService.recordAuditLog(
        tx,
        { actorUserId: req.user!.id, ipAddress: req.ip },
        "ROLE_ASSIGNMENT_REVOKED",
        "USER_ROLE_ASSIGNMENT",
        assignmentId,
        asgn,
        null,
        "Role assignment revoked",
      );
    });

    return res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getUserEffectiveAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params.id;
    const access =
      await EffectivePermissionService.getEffectiveAccessPayload(userId);
    return res.json(access);
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { action, actorUserId, entityType, limit = 100 } = req.query;
    const where: any = {};
    if (action) where.action = String(action);
    if (actorUserId) where.actorUserId = String(actorUserId);
    if (entityType) where.entityType = String(entityType);

    const logs = await prisma.auditLog.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: logs });
  } catch (error) {
    next(error);
  }
};
