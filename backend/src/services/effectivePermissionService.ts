import prisma from "../config/db";
import { UserPermissionPayload } from "../types/role";
import { SEED_ROLE_PERMISSIONS, resolveSeedRolePermissionKeys } from "../config/platformAccess";

export interface EffectiveAccessPayload {
  userId: string;
  isSuperAdmin: boolean;
  activeRoles: Array<{
    id: number;
    code: string;
    displayName: string;
    type: string;
    defaultScope: string;
    organizationId?: string | null;
    districtCode?: string | null;
    projectId?: string | null;
  }>;
  permissions: string[];
  scopes: {
    global: boolean;
    organizationIds: string[];
    districtCodes: string[];
    projectIds: string[];
  };
}

export class EffectivePermissionService {
  /**
   * Load active canonical role assignments for a given user.
   */
  public static async getActiveAssignments(userId: string) {
    const now = new Date();

    const assignments = await prisma.userRoleAssignment.findMany({
      where: {
        userId,
        status: "ACTIVE",
        role: { status: "ACTIVE" },
        validFrom: { lte: now },
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } }
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

    return assignments;
  }

  /**
   * Compute effective access payload containing active permissions, roles, and contextual scopes.
   */
  public static async getEffectiveAccessPayload(userId: string, currentOrgIdContext?: string | null): Promise<EffectiveAccessPayload> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountStatus: true,
        isVerified: true,
        deletedAt: true,
        organizationId: true,
        roleId: true,
        role: {
          include: {
            rolePermissions: { include: { permission: true } }
          }
        }
      }
    });

    if (!user || user.deletedAt || user.accountStatus === "SUSPENDED") {
      return {
        userId,
        isSuperAdmin: false,
        activeRoles: [],
        permissions: [],
        scopes: { global: false, organizationIds: [], districtCodes: [], projectIds: [] }
      };
    }

    const assignments = await this.getActiveAssignments(userId);
    const permissionSet = new Set<string>();
    const orgScopeSet = new Set<string>();
    const districtScopeSet = new Set<string>();
    const projectScopeSet = new Set<string>();

    if (user.organizationId) {
      orgScopeSet.add(user.organizationId);
    }
    if (currentOrgIdContext) {
      orgScopeSet.add(currentOrgIdContext);
    }

    const SYSTEM_ROLE_MAP: Record<number, string> = {
      1: "SUPER_ADMIN",
      2: "PLANNING_SECRETARY",
      3: "JOINT_SECRETARY",
      4: "DISTRICT_NODAL_OFFICER",
      5: "DISTRICT_NODAL_CONSULTANT",
      6: "RELATIONSHIP_MANAGER",
      7: "GOVERNMENT_OFFICER",
      8: "COMPANY_ADMIN",
      9: "NGO_ADMIN",
    };

    const activeRoles: EffectiveAccessPayload["activeRoles"] = [];
    const primaryRoleId = Number(user.roleId || user.role?.id);
    let isSuperAdminUser = primaryRoleId === 1 || user.role?.code === "SUPER_ADMIN";

    // Check user.role / roleId fallback if no canonical assignments exist yet
    if (assignments.length === 0) {
      const fallbackRoleCode = user.role?.code || user.role?.name || SYSTEM_ROLE_MAP[primaryRoleId];

      if (fallbackRoleCode === "SUPER_ADMIN" || primaryRoleId === 1) {
        isSuperAdminUser = true;
      }

      if (primaryRoleId || fallbackRoleCode) {
        activeRoles.push({
          id: primaryRoleId || 0,
          code: fallbackRoleCode || `SYSTEM_ROLE_${primaryRoleId}`,
          displayName: user.role?.displayName || user.role?.name || fallbackRoleCode || "User Role",
          type: user.role?.type || "SYSTEM",
          defaultScope: user.role?.defaultScope || "ORGANIZATION",
          organizationId: user.organizationId
        });
      }

      if (user.role?.rolePermissions) {
        user.role.rolePermissions.forEach((rp) => {
          permissionSet.add(rp.permission.key);
        });
      }

      if (fallbackRoleCode && SEED_ROLE_PERMISSIONS[fallbackRoleCode]) {
        const seedKeys = resolveSeedRolePermissionKeys(fallbackRoleCode);
        seedKeys.forEach((key) => permissionSet.add(key));
      }
    }

    for (const assign of assignments) {
      const role = assign.role;
      if (role.code === "SUPER_ADMIN" || role.id === 1) {
        isSuperAdminUser = true;
      }

      if (!activeRoles.some((r) => r.id === role.id && r.organizationId === assign.organizationId)) {
        activeRoles.push({
          id: role.id,
          code: role.code || `ROLE_${role.id}`,
          displayName: role.displayName || role.name,
          type: role.type || "CUSTOM",
          defaultScope: role.defaultScope || "ORGANIZATION",
          organizationId: assign.organizationId,
          districtCode: assign.districtCode,
          projectId: assign.projectId
        });
      }

      role.rolePermissions.forEach((rp) => {
        permissionSet.add(rp.permission.key);
      });

      if (assign.organizationId) orgScopeSet.add(assign.organizationId);
      if (assign.districtCode) districtScopeSet.add(assign.districtCode);
      if (assign.projectId) projectScopeSet.add(assign.projectId);
    }

    if (isSuperAdminUser) {
      const allPerms = await prisma.permission.findMany({ select: { key: true } });
      allPerms.forEach((p) => permissionSet.add(p.key));
    }

    return {
      userId,
      isSuperAdmin: isSuperAdminUser,
      activeRoles,
      permissions: Array.from(permissionSet),
      scopes: {
        global: isSuperAdminUser,
        organizationIds: Array.from(orgScopeSet),
        districtCodes: Array.from(districtScopeSet),
        projectIds: Array.from(projectScopeSet)
      }
    };
  }

  /**
   * Single permission check.
   */
  public static async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const payload = await this.getEffectiveAccessPayload(userId);
    if (payload.isSuperAdmin) return true;
    return payload.permissions.includes(permissionKey);
  }

  /**
   * Check multiple permissions (ALL required).
   */
  public static async hasAllPermissions(userId: string, permissionKeys: string[]): Promise<boolean> {
    const payload = await this.getEffectiveAccessPayload(userId);
    if (payload.isSuperAdmin) return true;
    return permissionKeys.every((key) => payload.permissions.includes(key));
  }

  /**
   * Check multiple permissions (ANY required).
   */
  public static async hasAnyPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
    const payload = await this.getEffectiveAccessPayload(userId);
    if (payload.isSuperAdmin) return true;
    return permissionKeys.some((key) => payload.permissions.includes(key));
  }

  /**
   * Backward-compatible helper method replacing legacy computeUserPermissions.
   */
  public static async computeLegacyPermissions(principal: { userId: string; role?: string | number | null; roleId?: number | string | null; organizationId?: string | null }): Promise<UserPermissionPayload> {
    const payload = await this.getEffectiveAccessPayload(principal.userId, principal.organizationId);

    return {
      permissions: payload.permissions,
      roles: payload.activeRoles.map((r) => r.code),
      roleDetails: payload.activeRoles.map((r) => ({
        id: r.id,
        numericId: r.id,
        name: r.code,
        isSystemRole: r.type === "SYSTEM"
      })),
      isAdmin: payload.isSuperAdmin
    };
  }
}
