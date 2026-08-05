import { PrismaClient, Role, CorporateEnquiryStatus, FeasibilityResult, ChecklistAnswer } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MahaCSR Portal clean test data...");

  const defaultPasswordHash = await bcrypt.hash("111111", 10);

  // 1. Create RM User
  const rmUser = await prisma.user.upsert({
    where: { email: "rm@mahacsr.gov.in" },
    update: {
      passwordHash: defaultPasswordHash,
      role: Role.CSR_RELATIONSHIP_MANAGER,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
    create: {
      email: "rm@mahacsr.gov.in",
      passwordHash: defaultPasswordHash,
      role: Role.CSR_RELATIONSHIP_MANAGER,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
  });
  console.log("✓ Created RM User:", rmUser.email);

  // 2. Create Joint Secretary User
  const jsUser = await prisma.user.upsert({
    where: { email: "js@mahacsr.gov.in" },
    update: {
      passwordHash: defaultPasswordHash,
      role: Role.JOINT_SECRETARY,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
    create: {
      email: "js@mahacsr.gov.in",
      passwordHash: defaultPasswordHash,
      role: Role.JOINT_SECRETARY,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
  });
  console.log("✓ Created JS User:", jsUser.email);

  // 3. Create Nodal Officer User
  const nodalUser = await prisma.user.upsert({
    where: { email: "nodal@mahacsr.gov.in" },
    update: {
      passwordHash: defaultPasswordHash,
      role: Role.DISTRICT_NODAL_OFFICER,
      accountStatus: "ACTIVE",
      isVerified: true,
      assignedDistrict: "Pune",
    },
    create: {
      email: "nodal@mahacsr.gov.in",
      passwordHash: defaultPasswordHash,
      role: Role.DISTRICT_NODAL_OFFICER,
      accountStatus: "ACTIVE",
      isVerified: true,
      assignedDistrict: "Pune",
    },
  });
  console.log("✓ Created Nodal Officer User:", nodalUser.email);

  // 4. Create Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mahacsr.gov.in" },
    update: {
      passwordHash: defaultPasswordHash,
      role: Role.SUPER_ADMIN,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
    create: {
      email: "admin@mahacsr.gov.in",
      passwordHash: defaultPasswordHash,
      role: Role.SUPER_ADMIN,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
  });
  console.log("✓ Created Super Admin User:", adminUser.email);

  // 5. Create CSR Company User
  const companyUser = await prisma.user.upsert({
    where: { email: "deshmukh.vikram@mahindra.com" },
    update: {
      passwordHash: defaultPasswordHash,
      role: Role.COMPANY_ADMIN,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
    create: {
      email: "deshmukh.vikram@mahindra.com",
      passwordHash: defaultPasswordHash,
      role: Role.COMPANY_ADMIN,
      accountStatus: "ACTIVE",
      isVerified: true,
    },
  });
  console.log("✓ Created Company User:", companyUser.email);

  // 6. Create Platform Settings
  await prisma.platformSetting.upsert({
    where: { key: "PORTAL_NAME" },
    update: { value: "MahaCSR Portal" },
    create: { key: "PORTAL_NAME", value: "MahaCSR Portal" },
  });

  // 7. Seed Corporate Enquiries & Interaction Logs
  const enquiry1 = await prisma.corporateEnquiry.upsert({
    where: { trackingId: "CSR-MH-2026-000103" },
    update: {
      companyName: "Mahindra & Mahindra Ltd",
      mca21Cin: "L65990MH1945PLC004558",
      contactPersonName: "Vikram Deshmukh",
      email: "deshmukh.vikram@mahindra.com",
      mobile: "+91 98900 11223",
      sector: "Water Conservation & Watershed",
      preferredDistricts: ["Nashik", "Ahmednagar"],
      indicativeBudget: 45000000,
      proposedCsrWork: "Desiltation of 30 farm ponds and construction of check dams under Jalyukt Shivar convergence in Nashik and Ahmednagar.",
      status: CorporateEnquiryStatus.RM_CONTACTED,
      assignedRelationshipManagerId: rmUser.id,
      firstContactedAt: new Date(),
    },
    create: {
      trackingId: "CSR-MH-2026-000103",
      companyName: "Mahindra & Mahindra Ltd",
      mca21Cin: "L65990MH1945PLC004558",
      contactPersonName: "Vikram Deshmukh",
      email: "deshmukh.vikram@mahindra.com",
      mobile: "+91 98900 11223",
      sector: "Water Conservation & Watershed",
      preferredDistricts: ["Nashik", "Ahmednagar"],
      indicativeBudget: 45000000,
      proposedCsrWork: "Desiltation of 30 farm ponds and construction of check dams under Jalyukt Shivar convergence in Nashik and Ahmednagar.",
      status: CorporateEnquiryStatus.RM_CONTACTED,
      assignedRelationshipManagerId: rmUser.id,
      firstContactedAt: new Date(),
    },
  });

  // Seed Interaction Log
  await prisma.corporateEnquiryInteraction.create({
    data: {
      corporateEnquiryId: enquiry1.id,
      actorUserId: rmUser.id,
      interactionType: "CALL",
      note: "Briefed Mahindra CSR team on Mahagov Watershed Convergence guidelines. Scheduled technical site audit.",
    },
  });

  console.log("✓ Seeded Corporate Enquiry & Interaction Log:", enquiry1.trackingId);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
