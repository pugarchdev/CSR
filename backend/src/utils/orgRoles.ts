import prisma from "../config/db";
import { ROLE_PERMISSION_MAP } from "../config/platformAccess";
import { RoleScope, OrganizationKind } from "@prisma/client";

/**
 * Ensures that the system role for an organization exists, and that the organization's registering user
 * is mapped to this role in the UserOrganizationRole table.
 */
export async function ensureOrganizationAdminRole(organizationId: string) {
  try {
    // 1. Get the organization to determine its type
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (!organization) {
      console.warn(`[ensureOrganizationAdminRole] Organization not found: ${organizationId}`);
      return;
    }

    // 2. Map organization kind to role name
    let roleName = "";
    let userRoleSearch = "";
    if (organization.organizationType === OrganizationKind.NGO) {
      roleName = "NGO_ADMIN";
      userRoleSearch = "NGO_ADMIN";
    } else if (organization.organizationType === OrganizationKind.CSR_COMPANY) {
      roleName = "COMPANY_ADMIN";
      userRoleSearch = "COMPANY_ADMIN";
    } else if (organization.organizationType === OrganizationKind.GOVERNMENT_DEPARTMENT) {
      roleName = "BENEFICIARY_AGENCY";
      userRoleSearch = "BENEFICIARY_AGENCY";
    } else {
      console.log(`[ensureOrganizationAdminRole] Organization type ${organization.organizationType} does not require default roles`);
      return;
    }

    console.log(`[ensureOrganizationAdminRole] Syncing system role ${roleName} for organization ${organizationId}`);

    // 3. Find or create the system role for this organization
    let orgRole = await prisma.organizationRole.findFirst({
      where: {
        organizationId,
        name: roleName
      }
    });

    if (!orgRole) {
      const permissions = await prisma.permission.findMany();
      const permissionIdByKey = new Map(permissions.map(p => [p.key, p.id]));
      const rolePermissions = ROLE_PERMISSION_MAP[roleName] || [];

      orgRole = await prisma.organizationRole.create({
        data: {
          organizationId,
          name: roleName,
          description: `${roleName.replace(/_/g, " ")} system role`,
          scope: RoleScope.ORGANIZATION,
          isSystemRole: true,
          rolePermissions: {
            create: rolePermissions
              .map(key => ({ permissionId: permissionIdByKey.get(key)! }))
              .filter(item => !!item.permissionId)
          }
        }
      });
      console.log(`[ensureOrganizationAdminRole] Created system role: ${orgRole.id} (${orgRole.name})`);
    }

    // 4. Find all users in this organization who have the admin role
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        role: userRoleSearch as any
      }
    });

    // 5. Create UserOrganizationRole assignments for these users if they don't already exist
    for (const user of users) {
      const existingAssignment = await prisma.userOrganizationRole.findFirst({
        where: {
          userId: user.id,
          roleId: orgRole.id,
          organizationId
        }
      });

      if (!existingAssignment) {
        await prisma.userOrganizationRole.create({
          data: {
            userId: user.id,
            roleId: orgRole.id,
            organizationId
          }
        });
        console.log(`[ensureOrganizationAdminRole] Assigned user ${user.email} (${user.id}) to role ${orgRole.name}`);
      }
    }
  } catch (error) {
    console.error(`[ensureOrganizationAdminRole] Error syncing organization admin roles:`, error);
  }
}
