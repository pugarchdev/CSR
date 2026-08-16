import "dotenv/config";
import { PrismaClient, RoleScope, AssignmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeBlindHash, encryptField } from "../src/utils/fieldCrypto";
import { PERMISSIONS, PAGE_PERMISSIONS } from "../src/config/platformAccess";
import { clearCachePattern } from "../src/config/redis";

const prisma = new PrismaClient();
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_INITIAL_PASSWORD || "111111";
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_INITIAL_EMAIL || "admin@mahacsr.gov.in";

async function main() {
  console.log("=================================================");
  console.log("Seeding Permissions, Roles & Solo Super Admin...");
  console.log("=================================================");

  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

  // 1. Seed All System Permissions (from PERMISSIONS & PAGE_PERMISSIONS)
  console.log("1. Populating complete permissions matrix...");
  const allDefs = [
    ...PERMISSIONS.map(([key, description, module]) => ({ key, description, module })),
    ...PAGE_PERMISSIONS.map(([key, description, module]) => ({ key, description, module }))
  ];

  await prisma.permission.createMany({
    data: allDefs,
    skipDuplicates: true,
  });

  const allDbPermissions = await prisma.permission.findMany({
    select: { id: true, key: true }
  });
  console.log(`✓ Seeded ${allDbPermissions.length} total permissions in database.`);

  // 2. Seed System Roles (1 to 9)
  console.log("2. Creating system roles 1 to 9...");
  const systemRoles = [
    { id: 1, name: "SUPER_ADMIN", code: "SUPER_ADMIN", description: "Super Administrator - Full System Authority", isSystemRole: true, isProtected: true },
    { id: 2, name: "PLANNING_SECRETARY", code: "PLANNING_SECRETARY", description: "Planning Secretary", isSystemRole: true, isProtected: true },
    { id: 3, name: "JOINT_SECRETARY", code: "JOINT_SECRETARY", description: "Joint Secretary - CSR Cell Head", isSystemRole: true, isProtected: true },
    { id: 4, name: "DISTRICT_NODAL_OFFICER", code: "DISTRICT_NODAL_OFFICER", description: "District Nodal Officer (DNO)", isSystemRole: true, isProtected: true },
    { id: 5, name: "DISTRICT_NODAL_CONSULTANT", code: "DISTRICT_NODAL_CONSULTANT", description: "District Nodal Consultant (DNC)", isSystemRole: true, isProtected: true },
    { id: 6, name: "RELATIONSHIP_MANAGER", code: "RELATIONSHIP_MANAGER", description: "Relationship Manager (RM)", isSystemRole: true, isProtected: true },
    { id: 7, name: "GOVERNMENT_OFFICER", code: "GOVERNMENT_OFFICER", description: "Government Department Admin / Officer", isSystemRole: true, isProtected: true },
    { id: 8, name: "COMPANY_ADMIN", code: "COMPANY_ADMIN", description: "CSR Company Administrator", isSystemRole: true, isProtected: true },
    { id: 9, name: "NGO_ADMIN", code: "NGO_ADMIN", description: "Implementing Agency / NGO Administrator", isSystemRole: true, isProtected: true },
  ];

  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        isSystemRole: role.isSystemRole,
        isProtected: role.isProtected
      },
      update: {
        name: role.name,
        code: role.code,
        description: role.description
      }
    });
  }
  console.log("✓ System roles 1 to 9 initialized.");

  // 3. Grant ALL permissions to Super Admin (Role 1)
  console.log("3. Assigning ALL permissions to Super Admin role...");
  await prisma.rolePermission.deleteMany({ where: { roleId: 1 } });
  await prisma.rolePermission.createMany({
    data: allDbPermissions.map(p => ({
      roleId: 1,
      permissionId: p.id
    })),
    skipDuplicates: true
  });
  console.log(`✓ Super Admin granted all ${allDbPermissions.length} permissions.`);

  // 4. Create Main Government Administrative Authority Organization
  console.log("4. Creating Platform Authority Organization...");
  const mainOrgRegNo = "MAHACSR-ORG-001";
  const mainOrgRegHash = computeBlindHash(mainOrgRegNo)!;

  const mainOrg = await prisma.organization.upsert({
    where: { registrationNumberHash: mainOrgRegHash },
    create: {
      registrationNumber: encryptField(mainOrgRegNo),
      registrationNumberHash: mainOrgRegHash,
      name: "Maharashtra CSR Authority, Mantralaya",
      kind: "PORTAL_ADMIN_ORG",
      state: "Maharashtra",
      district: "Mumbai",
      status: "ACTIVE"
    },
    update: {
      name: "Maharashtra CSR Authority, Mantralaya",
      kind: "PORTAL_ADMIN_ORG",
      status: "ACTIVE"
    }
  });
  console.log(`✓ Administrative Authority created: ${mainOrg.name}`);

  // 5. Create Sole Super Admin User Account
  console.log(`5. Creating Super Admin User (${SUPERADMIN_EMAIL})...`);
  const superAdmin = await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    create: {
      email: SUPERADMIN_EMAIL,
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      designation: "Platform Super Administrator",
      roleId: 1,
      organizationId: mainOrg.id,
      isVerified: true,
      accountStatus: "ACTIVE"
    },
    update: {
      passwordHash,
      roleId: 1,
      organizationId: mainOrg.id,
      isVerified: true,
      accountStatus: "ACTIVE"
    }
  });

  // 6. Assign Active Global Role Assignment
  await prisma.userRoleAssignment.deleteMany({
    where: { userId: superAdmin.id }
  });

  await prisma.userRoleAssignment.create({
    data: {
      userId: superAdmin.id,
      roleId: 1,
      organizationId: mainOrg.id,
      scopeType: "GLOBAL" as RoleScope,
      status: "ACTIVE" as AssignmentStatus,
    }
  });

  // 7. Clear application caches
  await clearCachePattern("*");

  console.log("=================================================");
  console.log("✓ Solo Super Admin Created Successfully!");
  console.log(`Email:    ${SUPERADMIN_EMAIL}`);
  console.log(`Password: ${SUPERADMIN_PASSWORD}`);
  console.log(`Role:     SUPER_ADMIN (Role ID: 1, Full Global Scope)`);
  console.log(`Authority: ${mainOrg.name}`);
  console.log("You can now login and add Joint Secretary, Relationship Managers, and all other users directly from the Admin Portal.");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error("Error creating Super Admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
