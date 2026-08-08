import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeBlindHash, encryptField } from "../src/utils/fieldCrypto";
import { PERMISSIONS, PAGE_PERMISSIONS, resolveSeedRolePermissionKeys } from "../src/config/platformAccess";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "111111";

async function main() {
  console.log("Starting database seed...");
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Seed System Roles & Permissions Matrix
  console.log("Seeding permissions matrix...");
  const allDefs = [
    ...PERMISSIONS.map(([key, description, module]) => ({ key, description, module })),
    ...PAGE_PERMISSIONS.map(([key, description, module]) => ({ key, description, module }))
  ];

  await prisma.permission.createMany({
    data: allDefs,
    skipDuplicates: true,
  });

  console.log("Seeding system roles 1 to 9...");
  const roles = [
    { id: 1, name: "SUPER_ADMIN", description: "Super Administrator", isSystemRole: true, isProtected: true },
    { id: 2, name: "PLANNING_SECRETARY", description: "Planning Secretary", isSystemRole: true, isProtected: true },
    { id: 3, name: "JOINT_SECRETARY", description: "Joint Secretary", isSystemRole: true, isProtected: true },
    { id: 4, name: "DISTRICT_NODAL_OFFICER", description: "District Nodal Officer", isSystemRole: true, isProtected: true },
    { id: 5, name: "DISTRICT_NODAL_CONSULTANT", description: "District Nodal Consultant", isSystemRole: true, isProtected: true },
    { id: 6, name: "RELATIONSHIP_MANAGER", description: "Relationship Manager", isSystemRole: true, isProtected: true },
    { id: 7, name: "GOVERNMENT_OFFICER", description: "Government Officer / Department", isSystemRole: true, isProtected: true },
    { id: 8, name: "COMPANY_ADMIN", description: "CSR Company Administrator", isSystemRole: true, isProtected: true },
    { id: 9, name: "NGO_ADMIN", description: "NGO Administrator", isSystemRole: true, isProtected: true },
  ];

  for (const role of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { id: role.id },
      create: role,
      update: { name: role.name, description: role.description }
    });

    const rolePermKeys = resolveSeedRolePermissionKeys(role.name);
    if (rolePermKeys.length > 0) {
      const permsInDb = await prisma.permission.findMany({
        where: { key: { in: rolePermKeys as string[] } },
        select: { id: true }
      });

      if (permsInDb.length > 0) {
        await prisma.rolePermission.createMany({
          data: permsInDb.map((p) => ({
            roleId: roleRecord.id,
            permissionId: p.id,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
  console.log("✓ System roles & permissions seeded (1 to 9).");

  // 2. Create Default System Organization & Maharashtra Government Departments
  console.log("Seeding system organization and government departments...");
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
    update: { name: "Maharashtra CSR Authority, Mantralaya" }
  });

  // Maharashtra Government Departments
  const govDepartmentsData = [
    { name: "Public Health Department", code: "PHD", regNo: "GOV-MAHA-PHD-01" },
    { name: "School Education and Sports Department", code: "SESD", regNo: "GOV-MAHA-SESD-02" },
    { name: "Rural Development Department", code: "RDD", regNo: "GOV-MAHA-RDD-03" },
    { name: "Tribal Development Department", code: "TDD", regNo: "GOV-MAHA-TDD-04" },
    { name: "Women and Child Development Department", code: "WCD", regNo: "GOV-MAHA-WCD-05" },
    { name: "Water Resources Department", code: "WRD", regNo: "GOV-MAHA-WRD-06" }
  ];

  const seededGovDepts = new Map<string, any>();
  for (const deptData of govDepartmentsData) {
    const regHash = computeBlindHash(deptData.regNo)!;
    const deptOrg = await prisma.organization.upsert({
      where: { registrationNumberHash: regHash },
      create: {
        registrationNumber: encryptField(deptData.regNo),
        registrationNumberHash: regHash,
        name: deptData.name,
        kind: "GOVERNMENT_DEPARTMENT",
        state: "Maharashtra",
        district: "Mumbai",
        status: "ACTIVE"
      },
      update: { name: deptData.name, status: "ACTIVE" }
    });
    seededGovDepts.set(deptData.code, deptOrg);
  }

  // Companies & NGOs
  const companyOrgRegNo = "MAHACSR-COMP-001";
  const companyOrgRegHash = computeBlindHash(companyOrgRegNo)!;

  const companyOrg = await prisma.organization.upsert({
    where: { registrationNumberHash: companyOrgRegHash },
    create: {
      registrationNumber: encryptField(companyOrgRegNo),
      registrationNumberHash: companyOrgRegHash,
      name: "TATA CSR Foundation",
      kind: "CSR_COMPANY",
      state: "Maharashtra",
      district: "Mumbai",
      status: "ACTIVE"
    },
    update: { status: "ACTIVE" }
  });

  const ngoOrgRegNo = "MAHACSR-NGO-001";
  const ngoOrgRegHash = computeBlindHash(ngoOrgRegNo)!;

  const ngoOrg = await prisma.organization.upsert({
    where: { registrationNumberHash: ngoOrgRegHash },
    create: {
      registrationNumber: encryptField(ngoOrgRegNo),
      registrationNumberHash: ngoOrgRegHash,
      name: "Swades Foundation",
      kind: "NGO",
      state: "Maharashtra",
      district: "Raigad",
      status: "ACTIVE"
    },
    update: { status: "ACTIVE" }
  });

  // 3. Seed Demo Users & Role Mappings (skipped in production)
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping demo user accounts in production environment.");
  } else {
    console.log("Seeding realistic Maharashtra demo accounts for testing...");
    const demoUsers = [
      // Authorities
      { email: "admin@mahacsr.gov.in", firstName: "Super", lastName: "Admin", roleId: 1, orgId: mainOrg.id, district: "Mumbai", designation: "Platform Super Administrator", dept: "Planning Department, Mantralaya" },
      { email: "secretary@mahacsr.gov.in", firstName: "Planning", lastName: "Secretary", roleId: 2, orgId: mainOrg.id, district: "Mumbai", designation: "Principal Secretary", dept: "Planning Department, Govt of Maharashtra" },
      { email: "js@mahacsr.gov.in", firstName: "Joint", lastName: "Secretary", roleId: 3, orgId: mainOrg.id, district: "Mumbai", designation: "Joint Secretary (CSR Cell)", dept: "Planning Department, Mantralaya" },
      
      // Relationship Managers (RMs)
      { email: "rm@mahacsr.gov.in", firstName: "Rajesh", lastName: "Kulkarni", roleId: 6, orgId: mainOrg.id, district: "Pune", designation: "Senior CSR Relationship Manager", dept: "Western Maharashtra Desk" },
      { email: "rm.vidarbha@mahacsr.gov.in", firstName: "Anand", lastName: "Deshmukh", roleId: 6, orgId: mainOrg.id, district: "Nagpur", designation: "CSR Relationship Manager", dept: "Vidarbha Desk" },
      { email: "rm.konkan@mahacsr.gov.in", firstName: "Sunil", lastName: "Patil", roleId: 6, orgId: mainOrg.id, district: "Thane", designation: "CSR Relationship Manager", dept: "Konkan Desk" },
      
      // District Nodal Consultants (DNCs) - 1 per target district
      { email: "dnc.pune@mahacsr.gov.in", firstName: "Milind", lastName: "Joshi", roleId: 5, orgId: mainOrg.id, district: "Pune", designation: "District Nodal Consultant", dept: "Collector Office, Pune" },
      { email: "dnc.thane@mahacsr.gov.in", firstName: "Priya", lastName: "Shinde", roleId: 5, orgId: mainOrg.id, district: "Thane", designation: "District Nodal Consultant", dept: "Collector Office, Thane" },
      { email: "dnc.nagpur@mahacsr.gov.in", firstName: "Vijay", lastName: "Gawande", roleId: 5, orgId: mainOrg.id, district: "Nagpur", designation: "District Nodal Consultant", dept: "Collector Office, Nagpur" },
      { email: "dnc.nashik@mahacsr.gov.in", firstName: "Sanjay", lastName: "More", roleId: 5, orgId: mainOrg.id, district: "Nashik", designation: "District Nodal Consultant", dept: "Collector Office, Nashik" },

      // District Nodal Officers (DNOs)
      { email: "nodal@mahacsr.gov.in", firstName: "Dr. Bhagwan", lastName: "Pawar", roleId: 4, orgId: seededGovDepts.get("PHD").id, district: "Pune", designation: "District Health Officer (DHO)", dept: "Public Health Department, ZP Pune" },
      { email: "dno.health.pune@mahacsr.gov.in", firstName: "Dr. Bhagwan", lastName: "Pawar", roleId: 4, orgId: seededGovDepts.get("PHD").id, district: "Pune", designation: "District Health Officer (DHO)", dept: "Public Health Department, ZP Pune" },
      { email: "dno.edu.pune@mahacsr.gov.in", firstName: "Sunanda", lastName: "Wakhare", roleId: 4, orgId: seededGovDepts.get("SESD").id, district: "Pune", designation: "Education Officer (Primary)", dept: "School Education Department, ZP Pune" },
      { email: "dno.rural.thane@mahacsr.gov.in", firstName: "Ramesh", lastName: "Bhoir", roleId: 4, orgId: seededGovDepts.get("RDD").id, district: "Thane", designation: "Executive Engineer (Rural Works)", dept: "Rural Development Department, ZP Thane" },

      // Government Department Admins
      { email: "dept.health@mahacsr.gov.in", firstName: "Dr. Nitin", lastName: "Ambadekar", roleId: 7, orgId: seededGovDepts.get("PHD").id, district: "Mumbai", designation: "Director of Health Services", dept: "Public Health Department, Govt of Maharashtra" },
      { email: "dept.education@mahacsr.gov.in", firstName: "Suraj", lastName: "Mandhare", roleId: 7, orgId: seededGovDepts.get("SESD").id, district: "Pune", designation: "Education Commissioner", dept: "School Education and Sports Department" },
      { email: "dept.rural@mahacsr.gov.in", firstName: "Amit", lastName: "Saini", roleId: 7, orgId: seededGovDepts.get("RDD").id, district: "Mumbai", designation: "Joint Secretary", dept: "Rural Development Department" },

      // Corporate & NGO Admins
      { email: "company.admin@mahacsr.gov.in", firstName: "Aarav", lastName: "Tata", roleId: 8, orgId: companyOrg.id, district: "Mumbai", designation: "Head of CSR", dept: "TATA CSR Foundation" },
      { email: "ngo.admin@mahacsr.gov.in", firstName: "Zarina", lastName: "Screwvala", roleId: 9, orgId: ngoOrg.id, district: "Raigad", designation: "Managing Trustee", dept: "Swades Foundation" }
    ];

    const createdUserMap = new Map<string, any>();
    for (const user of demoUsers) {
      const createdUser = await prisma.user.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          passwordHash: defaultPasswordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId,
          organizationId: user.orgId,
          isVerified: true,
          accountStatus: "ACTIVE"
        },
        update: {
          passwordHash: defaultPasswordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId,
          organizationId: user.orgId,
          accountStatus: "ACTIVE",
          isVerified: true
        }
      });
      createdUserMap.set(user.email, createdUser);

      await prisma.userOfficerProfile.upsert({
        where: { userId: createdUser.id },
        create: {
          userId: createdUser.id,
          fullName: `${user.firstName} ${user.lastName}`,
          designation: user.designation,
          department: user.dept,
          district: user.district
        },
        update: {
          fullName: `${user.firstName} ${user.lastName}`,
          designation: user.designation,
          department: user.dept,
          district: user.district
        }
      });
      console.log(`✓ User created/updated: ${user.email} (${user.designation})`);
    }

    // 4. Seed District DNC Assignments (1 active DNC per target district)
    console.log("Seeding District DNC Assignments...");
    const dncDistrictMappings = [
      { district: "Pune", email: "dnc.pune@mahacsr.gov.in" },
      { district: "Thane", email: "dnc.thane@mahacsr.gov.in" },
      { district: "Nagpur", email: "dnc.nagpur@mahacsr.gov.in" },
      { district: "Nashik", email: "dnc.nashik@mahacsr.gov.in" }
    ];

    const superAdminUser = createdUserMap.get("admin@mahacsr.gov.in");

    for (const mapping of dncDistrictMappings) {
      const dncUser = createdUserMap.get(mapping.email);
      if (dncUser) {
        await prisma.districtDncAssignment.upsert({
          where: { district: mapping.district },
          create: {
            district: mapping.district,
            dncUserId: dncUser.id,
            assignedById: superAdminUser.id,
            isActive: true
          },
          update: {
            dncUserId: dncUser.id,
            assignedById: superAdminUser.id,
            isActive: true
          }
        });
        console.log(`✓ DNC mapped: District '${mapping.district}' -> ${mapping.email}`);
      }
    }
  }

  console.log("Updating password hash for all existing users to default password ('111111')...");
  await prisma.user.updateMany({
    data: { passwordHash: defaultPasswordHash }
  });
  console.log("✓ All user passwords updated to 111111.");

  // 4. Seed Default Platform Settings
  await prisma.platformSetting.upsert({
    where: { key: "hero_slides" },
    create: {
      key: "hero_slides",
      value: JSON.parse(JSON.stringify([{ title: "MahaCSR Convergence Platform", active: true }]))
    },
    update: {}
  });

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
