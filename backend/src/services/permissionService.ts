import prisma from "../config/db";
import { ROLE_PERMISSION_MAP } from "../config/platformAccess";
import { Role } from "../types/role";

/**
 * Single source of truth for permission resolution, shared by the
 * checkPermission middleware and the workflow engine. Resolution order:
 * 1. SUPER_ADMIN bypass
 * 2. Static ROLE_PERMISSION_MAP fallback keyed by User.role / dynamic role name
 * 3. Dynamic RBAC via UserOrganizationRole -> OrganizationRole -> Permission
 */
export async function resolveUserPermission(
  userId: string,
  permissionKey: string,
  options?: { role?: string | null; organizationId?: string | null }
): Promise<boolean> {
  let role = options?.role;

  if (role === undefined) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, roleRelation: { select: { name: true } } }
    });
    if (!user) return false;
    role = user.role || user.roleRelation?.name || null;
  }

  if (role === Role.SUPER_ADMIN) return true;
  if (role && (ROLE_PERMISSION_MAP[role] || []).includes(permissionKey)) return true;

  const count = await prisma.userOrganizationRole.count({
    where: {
      userId,
      ...(options?.organizationId ? { organizationId: options.organizationId } : {}),
      role: {
        status: "ACTIVE",
        rolePermissions: { some: { permission: { key: permissionKey } } }
      }
    }
  });
  return count > 0;
}
