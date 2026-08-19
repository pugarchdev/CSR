import prisma from "../config/db";
import { EffectivePermissionService } from "./effectivePermissionService";
import { SYSTEM_ROLE_TEMPLATE_MAP } from "../types/role";

export interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class AccessControlApiService {
  /**
   * 1. Overview Statistics
   */
  public static async getOverview(
    organizationId?: string | null,
    userContext?: { isSuper: boolean; orgType?: string; userRoleId?: number }
  ) {
    let applicableSystemRoleIds: number[] = [];
    if (userContext?.isSuper || (!userContext && !organizationId)) {
      applicableSystemRoleIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    } else if (userContext?.orgType === "GOVERNMENT_DEPARTMENT" || userContext?.userRoleId === 7 || userContext?.userRoleId === 4) {
      applicableSystemRoleIds = [7, 4];
    } else if (userContext?.orgType === "CSR_COMPANY" || userContext?.userRoleId === 8) {
      applicableSystemRoleIds = [8];
    } else if (userContext?.orgType === "NGO" || userContext?.orgType === "IMPLEMENTING_AGENCY" || userContext?.userRoleId === 9) {
      applicableSystemRoleIds = [9];
    } else {
      applicableSystemRoleIds = [7, 4];
    }

    let roleWhere: any = {};
    if (!userContext?.isSuper && organizationId) {
      roleWhere = {
        OR: [
          { id: { in: applicableSystemRoleIds } },
          { organizationId, isSystemRole: false }
        ]
      };
    } else if (organizationId) {
      roleWhere = { OR: [{ organizationId }, { isSystemRole: true }] };
    }

    const assignmentWhere = organizationId ? { organizationId } : {};

    const [totalRoles, systemRoles, customRoles, totalAssignments, highRiskPermissionsCount] = await Promise.all([
      prisma.role.count({ where: roleWhere }),
      prisma.role.count({ where: { ...roleWhere, isSystemRole: true } }),
      prisma.role.count({ where: { ...roleWhere, isSystemRole: false } }),
      prisma.userRoleAssignment.count({ where: { ...assignmentWhere, status: "ACTIVE" } }),
      prisma.permission.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL"] } } })
    ]);

    return {
      totalRoles,
      systemRoles,
      customRoles,
      activeAssignments: totalAssignments,
      highRiskPermissionsCount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 2. Validate Permission Keys against authoritative DB Permission catalog.
   */
  public static async validatePermissionKeys(permissionKeys: string[]): Promise<void> {
    if (permissionKeys.length === 0) return;

    const dbPermissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { key: true }
    });

    const foundKeys = new Set(dbPermissions.map((p) => p.key));
    const missingKeys = permissionKeys.filter((k) => !foundKeys.has(k));

    if (missingKeys.length > 0) {
      throw new Error(`Invalid permission keys: ${missingKeys.join(", ")}`);
    }
  }

  /**
   * 3. Delegation Ceiling Check for non-SuperAdmin callers.
   */
  public static async checkDelegationCeiling(actorUserId: string, requestedPermissionKeys: string[]): Promise<void> {
    const actorAccess = await EffectivePermissionService.getEffectiveAccessPayload(actorUserId);
    if (actorAccess.isSuperAdmin) return;

    // Check if actor possesses all requested permissions
    const actorPermSet = new Set(actorAccess.permissions);
    const unpossessed = requestedPermissionKeys.filter((k) => !actorPermSet.has(k));

    if (unpossessed.length > 0) {
      throw new Error(`Delegation Ceiling Violation: You cannot grant permissions you do not possess (${unpossessed.join(", ")})`);
    }

    // Check for high-risk / critical permissions restricted to Super Admin
    const highRiskPerms = await prisma.permission.findMany({
      where: {
        key: { in: requestedPermissionKeys },
        riskLevel: { in: ["HIGH", "CRITICAL"] }
      },
      select: { key: true, riskLevel: true }
    });

    if (highRiskPerms.length > 0) {
      const highRiskKeys = highRiskPerms.map((p) => p.key);
      throw new Error(`Delegation Ceiling Violation: High-risk/Critical permissions (${highRiskKeys.join(", ")}) require Super Admin privileges`);
    }
  }

  /**
   * 4. Impact Preview computation
   */
  public static async computeImpactPreview(roleId: number, permissionsToAdd: string[], permissionsToRemove: string[]) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        roleAssignments: {
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } }
        },
        rolePermissions: { include: { permission: true } }
      }
    });

    if (!role) throw new Error("Role not found");

    const directlyAssignedUsers = role.roleAssignments.map((a) => a.user);
    const directUserIds = directlyAssignedUsers.map((u) => u.id);

    // High risk changes
    const affectedKeys = Array.from(new Set([...permissionsToAdd, ...permissionsToRemove]));
    const highRiskPerms = await prisma.permission.findMany({
      where: { key: { in: affectedKeys }, riskLevel: { in: ["HIGH", "CRITICAL"] } },
      select: { key: true, riskLevel: true, module: true }
    });

    const modulesAffected = Array.from(new Set(highRiskPerms.map((p) => p.module)));

    return {
      roleId,
      roleCode: role.code,
      roleName: role.name,
      usersDirectlyAssignedCount: directlyAssignedUsers.length,
      usersDirectlyAssigned: directlyAssignedUsers,
      usersIndirectlyAffectedCount: 0,
      activeSessionsCount: directlyAssignedUsers.length,
      permissionsAdded: permissionsToAdd,
      permissionsRemoved: permissionsToRemove,
      highRiskChanges: highRiskPerms,
      modulesAffected
    };
  }

  /**
   * 5. Record Audit Log within a Prisma Transaction
   */
  public static async recordAuditLog(
    tx: any,
    ctx: AuditContext,
    action: string,
    entityType: string,
    entityId: string,
    beforeState: any,
    afterState: any,
    reason?: string
  ) {
    await tx.auditLog.create({
      data: {
        actorUserId: ctx.actorUserId,
        action,
        entityType,
        entityId,
        details: {
          beforeState: beforeState || null,
          afterState: afterState || null,
          reason: reason || null,
          correlationId: ctx.correlationId || null,
          userAgent: ctx.userAgent || null
        },
        ipAddress: ctx.ipAddress || null
      }
    });
  }
}
