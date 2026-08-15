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
    divisionCode?: string | null;
    departmentId?: string | null;
    projectId?: string | null;
  }>;
  permissions: string[];
  scopes: {
    global: boolean;
    organizationIds: string[];
    childOrganizationIds: string[];
    departmentIds: string[];
    districtCodes: string[];
    divisionCodes: string[];
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
    const [user, assignments] = await Promise.all([
      prisma.user.findUnique({
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
      }),
      this.getActiveAssignments(userId),
    ]);

    if (!user || user.deletedAt || user.accountStatus === "SUSPENDED") {
      return {
        userId,
        isSuperAdmin: false,
        activeRoles: [],
        permissions: [],
        scopes: {
          global: false,
          organizationIds: [],
          childOrganizationIds: [],
          departmentIds: [],
          districtCodes: [],
          divisionCodes: [],
          projectIds: []
        }
      };
    }

    const permissionSet = new Set<string>();
    const orgScopeSet = new Set<string>();
    const childOrgScopeSet = new Set<string>();
    const deptScopeSet = new Set<string>();
    const districtScopeSet = new Set<string>();
    const divisionScopeSet = new Set<string>();
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
          defaultScope: assign.scopeType || role.defaultScope || "ORGANIZATION",
          organizationId: assign.organizationId,
          districtCode: assign.districtCode,
          divisionCode: assign.divisionCode,
          departmentId: assign.departmentId,
          projectId: assign.projectId
        });
      }

      // Add database role permissions
      role.rolePermissions.forEach((rp) => {
        permissionSet.add(rp.permission.key);
      });

      // If role code matches a system role or protected custom role template, include seed permissions
      if (role.code && SEED_ROLE_PERMISSIONS[role.code]) {
        const seedKeys = resolveSeedRolePermissionKeys(role.code);
        seedKeys.forEach((key) => permissionSet.add(key));
      }

      if (assign.organizationId) orgScopeSet.add(assign.organizationId);
      if (assign.districtCode) districtScopeSet.add(assign.districtCode);
      if (assign.divisionCode) divisionScopeSet.add(assign.divisionCode);
      if (assign.departmentId) deptScopeSet.add(assign.departmentId);
      if (assign.projectId) projectScopeSet.add(assign.projectId);
    }

    // Fetch child organizations & sub-departments for any parent organizations in scope
    // Global administrators do not need tenant hierarchy expansion.
    if (orgScopeSet.size > 0 && !isSuperAdminUser) {
      const [childOrgs, subDepts] = await Promise.all([
        prisma.organization?.findMany ? prisma.organization.findMany({
          where: { parentOrganizationId: { in: Array.from(orgScopeSet) }, status: "ACTIVE" },
          select: { id: true }
        }) : Promise.resolve([]),
        prisma.subDepartment?.findMany ? prisma.subDepartment.findMany({
          where: { organizationId: { in: Array.from(orgScopeSet) }, status: "ACTIVE" },
          select: { id: true }
        }) : Promise.resolve([]),
      ]);
      childOrgs.forEach((co) => childOrgScopeSet.add(co.id));
      subDepts.forEach((sd) => childOrgScopeSet.add(sd.id));
    }

    if (isSuperAdminUser) {
      // The platform catalog is already loaded in memory and avoids another
      // remote database round-trip during cold admin login.
      resolveSeedRolePermissionKeys("SUPER_ADMIN").forEach((key) => permissionSet.add(key));
    }

    return {
      userId,
      isSuperAdmin: isSuperAdminUser,
      activeRoles,
      permissions: Array.from(permissionSet),
      scopes: {
        global: isSuperAdminUser,
        organizationIds: Array.from(orgScopeSet),
        childOrganizationIds: Array.from(childOrgScopeSet),
        departmentIds: Array.from(deptScopeSet),
        districtCodes: Array.from(districtScopeSet),
        divisionCodes: Array.from(divisionScopeSet),
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
   * Evaluate if a target resource is within the user's scope boundaries.
   */
  public static async authorizeAccess(
    userId: string,
    permissionKey: string,
    resource: {
      organizationId?: string | null;
      departmentId?: string | null;
      district?: string | null;
      division?: string | null;
      assignedUserId?: string | null;
      createdById?: string | null;
    }
  ): Promise<boolean> {
    const payload = await this.getEffectiveAccessPayload(userId);
    if (payload.isSuperAdmin) return true;
    if (!payload.permissions.includes(permissionKey)) return false;

    // Check scope match across user's active role assignments
    const scopes = payload.scopes;

    if (scopes.global) return true;

    if (resource.organizationId) {
      const inOrg = scopes.organizationIds.includes(resource.organizationId);
      const inChild = scopes.childOrganizationIds.includes(resource.organizationId);
      if (inOrg || inChild) return true;
    }

    if (resource.departmentId && scopes.departmentIds.includes(resource.departmentId)) {
      return true;
    }

    if (resource.district && scopes.districtCodes.map((d) => d.toLowerCase()).includes(resource.district.toLowerCase())) {
      return true;
    }

    if (resource.division && scopes.divisionCodes.map((d) => d.toLowerCase()).includes(resource.division.toLowerCase())) {
      return true;
    }

    if (resource.assignedUserId && resource.assignedUserId === userId) {
      return true;
    }

    if (resource.createdById && resource.createdById === userId) {
      return true;
    }

    // Fallback: If user has default organization scope matching organizationId
    if (payload.scopes.organizationIds.length === 0 && !resource.organizationId) {
      return true;
    }

    return true;
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
