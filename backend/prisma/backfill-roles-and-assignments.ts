import { PrismaClient } from "@prisma/client";
import { SYSTEM_ROLE_TEMPLATE_MAP } from "../src/types/role";

const prisma = new PrismaClient();

export async function runBackfill(): Promise<{ rolesUpdated: number; assignmentsCreated: number }> {
  console.log("=== STARTING ROLES AND ASSIGNMENTS BACKFILL ===");

  let rolesUpdated = 0;
  let assignmentsCreated = 0;

  // 1. Backfill Role.code, displayName, type, defaultScope, status
  const existingRoles = await prisma.role.findMany();
  for (const role of existingRoles) {
    const sysTemplate = SYSTEM_ROLE_TEMPLATE_MAP[role.id];
    let targetCode: string;
    let displayName: string;
    let defaultScope: "GLOBAL" | "ORGANIZATION" | "DISTRICT" | "PROJECT" = "ORGANIZATION";
    let isSystem = role.isSystemRole;

    if (sysTemplate) {
      targetCode = sysTemplate.code;
      displayName = sysTemplate.displayName;
      defaultScope = sysTemplate.defaultScope;
      isSystem = true;
    } else {
      targetCode = role.code || `CUSTOM_ROLE_${role.id}_${role.name.toUpperCase().replace(/[^A_Z0-9]/g, "_")}`;
      displayName = role.name;
    }

    await prisma.role.update({
      where: { id: role.id },
      data: {
        code: targetCode,
        displayName,
        type: isSystem ? "SYSTEM" : "CUSTOM",
        defaultScope,
        status: "ACTIVE",
        isSystemRole: isSystem,
        isProtected: isSystem ? true : role.isProtected,
      },
    });
    rolesUpdated++;
  }
  console.log(`✓ Backfilled codes for ${rolesUpdated} roles.`);

  // 2. Backfill UserRoleAssignment from User.roleId
  const usersWithRole = await prisma.user.findMany({
    where: { roleId: { not: null }, deletedAt: null },
    include: { dncDistricts: true }
  });

  for (const user of usersWithRole) {
    if (!user.roleId) continue;

    const existingAssignment = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: user.id,
        roleId: user.roleId,
        organizationId: user.organizationId || null,
        status: "ACTIVE"
      }
    });

    if (!existingAssignment) {
      const assignedDistrict = user.dncDistricts.find((assignment) => assignment.isActive)?.district || null;
      await prisma.userRoleAssignment.create({
        data: {
          userId: user.id,
          roleId: user.roleId,
          organizationId: user.organizationId || null,
          districtCode: assignedDistrict,
          status: "ACTIVE",
          validFrom: new Date(),
        }
      });
      assignmentsCreated++;
    }
  }

  // 3. Backfill UserRoleAssignment from UserOrganizationRole table
  const userOrgRoles = await prisma.userOrganizationRole.findMany();
  for (const uor of userOrgRoles) {
    const existing = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: uor.userId,
        roleId: uor.roleId,
        organizationId: uor.organizationId || null,
        status: "ACTIVE"
      }
    });

    if (!existing) {
      await prisma.userRoleAssignment.create({
        data: {
          userId: uor.userId,
          roleId: uor.roleId,
          organizationId: uor.organizationId || null,
          status: "ACTIVE",
          validFrom: uor.createdAt || new Date(),
        }
      });
      assignmentsCreated++;
    }
  }
  console.log(`✓ Created/Backfilled ${assignmentsCreated} canonical UserRoleAssignment records.`);

  // 4. Align PostgreSQL autoincrement sequence for Role table
  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Role"', 'id'), COALESCE((SELECT MAX(id) FROM "Role"), 1), true);`
    );
    console.log("✓ Corrected PostgreSQL sequence for Role.id.");
  } catch (err: any) {
    console.warn("Notice: Sequence setval executed or skipped depending on driver capability:", err.message);
  }

  console.log("=== ROLES AND ASSIGNMENTS BACKFILL COMPLETED ===");
  return { rolesUpdated, assignmentsCreated };
}

if (require.main === module) {
  runBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Backfill failed:", err);
      process.exit(1);
    });
}
