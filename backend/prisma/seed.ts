import { PrismaClient, Role, VerificationStatus, ProjectStatus, MilestoneStatus, OnboardingStatus, OrganizationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "111111";

async function main() {
  console.log("Starting database seed with realistic Maharashtra CSR data...");
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await prisma.$transaction(async (tx) => {
    // 1. Clean Database
    console.log("Cleaning database...");
    await tx.auditLog.deleteMany();
    await tx.notification.deleteMany();
    await tx.report.deleteMany();
    await tx.matchScore.deleteMany();
    await tx.document.deleteMany();
    await tx.message.deleteMany();
    await tx.chat.deleteMany();
    await tx.milestone.deleteMany();
    await tx.project.deleteMany();
    await tx.user.deleteMany();
    await tx.nGO.deleteMany();
    await tx.company.deleteMany();
    console.log("Database cleared.");

    // ============================================
    // 2. CREATE ADMIN USERS
    // ============================================
    
    const superAdmin = await tx.user.create({
      data: {
        email: "admin@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.SUPER_ADMIN,
        isVerified: true,
      },
    });
    console.log("✓ Super Admin created:", superAdmin.email);

    const portalAdmin = await tx.user.create({
      data: {
        email: "portal.admin@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.PORTAL_ADMIN,
        isVerified: true,
      },
    });
    console.log("✓ Portal Admin created:", portalAdmin.email);

    const csrAdmin = await tx.user.create({
      data: {
        email: "csr.admin@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.CSR_ADMIN,
        isVerified: true,
      },
    });
    console.log("✓ CSR Admin created:", csrAdmin.email);

    // ============================================
    // 3. CREATE NGO PROFILES
    // ============================================

    // NGO 1: Sahyadri Eco Foundation (Pune)
    const ngo1 = await tx.nGO.create({
      data: {
        name: "Sahyadri Eco Foundation",
        displayName: "Sahyadri Eco Foundation",
        organizationType: OrganizationType.TRUST,
        registrationNumber: "MH/2021/0088921",
        registrationDate: new Date("2021-03-15"),
        registrationAuthority: "Charity Commissioner, Maharashtra",
        darpanNumber: "MH/2021/012345",
        csr1Number: "CSR00012345",
        pan: "AAATS2345P",
        yearEstablished: 2021,
        officialEmail: "contact@sahyadrieco.org",
        officialPhone: "+912024567890",
        certificate12AUrl: "https://cloudinary.com/sahyadri/12a.pdf",
        certificate80GUrl: "https://cloudinary.com/sahyadri/80g.pdf",
        address: "12, Karve Road, Deccan Gymkhana",
        state: "Maharashtra",
        district: "Pune",
        taluka: "Haveli",
        village: "Pune City",
        pincode: "411004",
        city: "Pune",
        website: "https://sahyadrieco.org",
        socialLinks: {
          twitter: "https://twitter.com/sahyadrieco",
          linkedin: "https://linkedin.com/company/sahyadrieco",
        },
        areasOfOperation: ["Pune", "Satara", "Sangli"],
        csrSectors: ["Water Conservation", "Environmental Sustainability", "Rural Development"],
        impactStatistics: {
          beneficiariesServed: 45000,
          projectsCompleted: 12,
        },
        status: VerificationStatus.VERIFIED,
      },
    });
    console.log("✓ NGO 1 created:", ngo1.name);

    // NGO 2: Vidarbha Development Society (Nagpur)
    const ngo2 = await tx.nGO.create({
      data: {
        name: "Vidarbha Development Society",
        displayName: "Vidarbha Development Society",
        organizationType: OrganizationType.SOCIETY,
        registrationNumber: "MH/2019/0045678",
        registrationDate: new Date("2019-06-20"),
        registrationAuthority: "Registrar of Societies, Maharashtra",
        darpanNumber: "MH/2019/045678",
        csr1Number: "CSR00045678",
        pan: "AABVD5678K",
        yearEstablished: 2019,
        officialEmail: "info@vidarbhadev.org",
        officialPhone: "+917122334455",
        address: "45, Civil Lines, Sitabuldi",
        state: "Maharashtra",
        district: "Nagpur",
        taluka: "Nagpur",
        village: "Nagpur City",
        pincode: "440001",
        city: "Nagpur",
        website: "https://vidarbhadev.org",
        areasOfOperation: ["Nagpur", "Wardha", "Chandrapur"],
        csrSectors: ["Education & Literacy", "Skill Development", "Women Empowerment"],
        impactStatistics: {
          beneficiariesServed: 28000,
          projectsCompleted: 8,
        },
        status: VerificationStatus.VERIFIED,
      },
    });
    console.log("✓ NGO 2 created:", ngo2.name);

    // NGO 3: Mumbai Education Trust (Mumbai)
    const ngo3 = await tx.nGO.create({
      data: {
        name: "Mumbai Education Trust",
        displayName: "Mumbai Education Trust",
        organizationType: OrganizationType.TRUST,
        registrationNumber: "MH/2018/0123456",
        registrationDate: new Date("2018-01-10"),
        registrationAuthority: "Charity Commissioner, Maharashtra",
        darpanNumber: "MH/2018/123456",
        csr1Number: "CSR00123456",
        pan: "AAAMT1234L",
        yearEstablished: 2018,
        officialEmail: "admin@mumbaiedu.org",
        officialPhone: "+912226789012",
        address: "23, Nariman Point, Fort",
        state: "Maharashtra",
        district: "Mumbai",
        taluka: "Mumbai City",
        village: "Mumbai",
        pincode: "400021",
        city: "Mumbai",
        website: "https://mumbaiedu.org",
        areasOfOperation: ["Mumbai", "Thane", "Raigad"],
        csrSectors: ["Education & Literacy", "Digital Literacy", "Vocational Training"],
        impactStatistics: {
          beneficiariesServed: 62000,
          projectsCompleted: 15,
        },
        status: VerificationStatus.VERIFIED,
      },
    });
    console.log("✓ NGO 3 created:", ngo3.name);

    // NGO 4: Konkan Welfare Association (Ratnagiri) - Pending Verification
    const ngo4 = await tx.nGO.create({
      data: {
        name: "Konkan Welfare Association",
        displayName: "Konkan Welfare Association",
        organizationType: OrganizationType.SOCIETY,
        registrationNumber: "MH/2023/0098765",
        registrationDate: new Date("2023-04-15"),
        registrationAuthority: "Registrar of Societies, Maharashtra",
        darpanNumber: "MH/2023/098765",
        pan: "AABKW9876M",
        yearEstablished: 2023,
        officialEmail: "contact@konkanwelfare.org",
        officialPhone: "+912352234567",
        address: "78, Ratnagiri Main Road",
        state: "Maharashtra",
        district: "Ratnagiri",
        taluka: "Ratnagiri",
        village: "Ratnagiri",
        pincode: "415612",
        city: "Ratnagiri",
        areasOfOperation: ["Ratnagiri", "Sindhudurg"],
        csrSectors: ["Coastal Development", "Fisheries", "Healthcare"],
        impactStatistics: {
          beneficiariesServed: 5000,
          projectsCompleted: 2,
        },
        status: VerificationStatus.PENDING,
      },
    });
    console.log("✓ NGO 4 created:", ngo4.name);

    // ============================================
    // 4. CREATE NGO ADMIN USERS
    // ============================================

    const ngo1Admin = await tx.user.create({
      data: {
        email: "contact@sahyadrieco.org",
        passwordHash: defaultPasswordHash,
        role: Role.NGO_ADMIN,
        isVerified: true,
        ngoId: ngo1.id,
      },
    });
    console.log("✓ NGO 1 Admin created:", ngo1Admin.email);

    const ngo2Admin = await tx.user.create({
      data: {
        email: "info@vidarbhadev.org",
        passwordHash: defaultPasswordHash,
        role: Role.NGO_ADMIN,
        isVerified: true,
        ngoId: ngo2.id,
      },
    });
    console.log("✓ NGO 2 Admin created:", ngo2Admin.email);

    const ngo3Admin = await tx.user.create({
      data: {
        email: "admin@mumbaiedu.org",
        passwordHash: defaultPasswordHash,
        role: Role.NGO_ADMIN,
        isVerified: true,
        ngoId: ngo3.id,
      },
    });
    console.log("✓ NGO 3 Admin created:", ngo3Admin.email);

    const ngo4Admin = await tx.user.create({
      data: {
        email: "contact@konkanwelfare.org",
        passwordHash: defaultPasswordHash,
        role: Role.NGO_ADMIN,
        isVerified: true,
        ngoId: ngo4.id,
      },
    });
    console.log("✓ NGO 4 Admin created:", ngo4Admin.email);

    // ============================================
    // 5. CREATE COMPANY PROFILES
    // ============================================

    // Company 1: Tata Motors (Large Cap)
    const company1 = await tx.company.create({
      data: {
        name: "Tata Motors Limited",
        cin: "L28920MH1945PLC004520",
        gst: "27AAACT2727Q1ZV",
        pan: "AAACT2727Q",
        csrBudget: 250000000.00, // 25 Crores
        csrPolicyUrl: "https://tatamotors.com/csr-policy.pdf",
        focusAreas: ["Education & Literacy", "Healthcare", "Environmental Sustainability", "Rural Development"],
        contactInfo: {
          phone: "+912266657000",
          alternateEmail: "csr.team@tatamotors.com",
        },
        status: VerificationStatus.VERIFIED,
      },
    });
    console.log("✓ Company 1 created:", company1.name);

    // Company 2: Infosys (IT Sector)
    const company2 = await tx.company.create({
      data: {
        name: "Infosys Limited",
        cin: "L85110KA1981PLC013115",
        gst: "29AAACI1681G1ZK",
        pan: "AAACI1681G",
        csrBudget: 450000000.00, // 45 Crores
        csrPolicyUrl: "https://infosys.com/csr-policy.pdf",
        focusAreas: ["Education & Literacy", "Digital Literacy", "Skill Development", "Healthcare"],
        contactInfo: {
          phone: "+918028520261",
          alternateEmail: "csr@infosys.com",
        },
        status: VerificationStatus.VERIFIED,
      },
    });
    console.log("✓ Company 2 created:", company2.name);

    // Company 3: Reliance Industries (Conglomerate)
    const company3 = await tx.company.create({
      data: {
        name: "Reliance Industries Limited",
        cin: "L17110MH1973PLC019786",
        gst: "27AAACR5055K1Z7",
        pan: "AAACR5055K",
        csrBudget: 850000000.00, // 85 Crores
        csrPolicyUrl: "https://ril.com/csr-policy.pdf",
        focusAreas: ["Rural Development", "Healthcare", "Education & Literacy", "Sports"],
        contactInfo: {
          phone: "+912240303030",
          alternateEmail: "csr.initiatives@ril.com",
        },
        status: VerificationStatus.VERIFIED,
      },
    });
    console.log("✓ Company 3 created:", company3.name);

    // Company 4: Mahindra & Mahindra
    const company4 = await tx.company.create({
      data: {
        name: "Mahindra & Mahindra Limited",
        cin: "L65990MH1945PLC004558",
        gst: "27AAACM0307L1ZB",
        pan: "AAACM0307L",
        csrBudget: 180000000.00, // 18 Crores
        csrPolicyUrl: "https://mahindra.com/csr-policy.pdf",
        focusAreas: ["Education & Literacy", "Environmental Sustainability", "Livelihood Enhancement"],
        contactInfo: {
          phone: "+912224905500",
          alternateEmail: "csr@mahindra.com",
        },
        status: VerificationStatus.VERIFIED,
      },
    });
    console.log("✓ Company 4 created:", company4.name);

    // ============================================
    // 6. CREATE COMPANY ADMIN USERS
    // ============================================

    const company1Admin = await tx.user.create({
      data: {
        email: "csr.team@tatamotors.com",
        passwordHash: defaultPasswordHash,
        role: Role.COMPANY_ADMIN,
        isVerified: true,
        companyId: company1.id,
      },
    });
    console.log("✓ Company 1 Admin created:", company1Admin.email);

    const company2Admin = await tx.user.create({
      data: {
        email: "csr@infosys.com",
        passwordHash: defaultPasswordHash,
        role: Role.COMPANY_ADMIN,
        isVerified: true,
        companyId: company2.id,
      },
    });
    console.log("✓ Company 2 Admin created:", company2Admin.email);

    const company3Admin = await tx.user.create({
      data: {
        email: "csr.initiatives@ril.com",
        passwordHash: defaultPasswordHash,
        role: Role.COMPANY_ADMIN,
        isVerified: true,
        companyId: company3.id,
      },
    });
    console.log("✓ Company 3 Admin created:", company3Admin.email);

    const company4Admin = await tx.user.create({
      data: {
        email: "csr@mahindra.com",
        passwordHash: defaultPasswordHash,
        role: Role.COMPANY_ADMIN,
        isVerified: true,
        companyId: company4.id,
      },
    });
    console.log("✓ Company 4 Admin created:", company4Admin.email);

    // ============================================
    // 7. CREATE PROJECTS
    // ============================================

    // Project 1: Water Conservation (Gadchiroli)
    const project1 = await tx.project.create({
      data: {
        ngoId: ngo1.id,
        title: "Gadchiroli Watershed & Afforestation Initiative",
        description: "Building check dams, bunds, and reforestation to restore groundwater levels in Aheri taluka, Gadchiroli. This project aims to address water scarcity in tribal areas through sustainable watershed management and community participation.",
        focusArea: "Water Conservation",
        sdgGoal: "SDG 6: Clean Water and Sanitation",
        beneficiaryCount: 12000,
        budgetRequested: 2500000.00, // 25 Lakhs
        budgetFunded: 2500000.00,
        state: "Maharashtra",
        district: "Gadchiroli",
        taluka: "Aheri",
        village: "Kamalpur",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2027-06-30"),
        status: ProjectStatus.FUNDED,
      },
    });
    console.log("✓ Project 1 created:", project1.title);

    // Project 2: Education (Pune)
    const project2 = await tx.project.create({
      data: {
        ngoId: ngo1.id,
        title: "Pune Rural Digital Smart-Classrooms",
        description: "Equipping 15 Zilla Parishad schools in Haveli and Mulshi talukas with smart interactive screens, digital content, and teacher training programs to enhance quality education in rural areas.",
        focusArea: "Education & Literacy",
        sdgGoal: "SDG 4: Quality Education",
        beneficiaryCount: 6500,
        budgetRequested: 3500000.00, // 35 Lakhs
        state: "Maharashtra",
        district: "Pune",
        taluka: "Haveli",
        village: "Loni Kalbhor",
        startDate: new Date("2026-08-15"),
        endDate: new Date("2027-05-15"),
        status: ProjectStatus.APPROVED,
      },
    });
    console.log("✓ Project 2 created:", project2.title);

    // Project 3: Skill Development (Nagpur)
    const project3 = await tx.project.create({
      data: {
        ngoId: ngo2.id,
        title: "Vidarbha Youth Skill Development Program",
        description: "Vocational training in IT, tailoring, and electrical work for 500 rural youth in Nagpur and Wardha districts, with placement assistance and entrepreneurship support.",
        focusArea: "Skill Development",
        sdgGoal: "SDG 8: Decent Work and Economic Growth",
        beneficiaryCount: 500,
        budgetRequested: 1800000.00, // 18 Lakhs
        state: "Maharashtra",
        district: "Nagpur",
        taluka: "Nagpur",
        village: "Kamptee",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-08-31"),
        status: ProjectStatus.UNDER_REVIEW,
      },
    });
    console.log("✓ Project 3 created:", project3.title);

    // Project 4: Healthcare (Mumbai)
    const project4 = await tx.project.create({
      data: {
        ngoId: ngo3.id,
        title: "Mumbai Slum Health & Nutrition Campaign",
        description: "Mobile health clinics, nutrition awareness, and free health check-ups for 10,000 slum dwellers in Mumbai suburbs, focusing on maternal and child health.",
        focusArea: "Healthcare",
        sdgGoal: "SDG 3: Good Health and Well-being",
        beneficiaryCount: 10000,
        budgetRequested: 4200000.00, // 42 Lakhs
        budgetFunded: 4200000.00,
        state: "Maharashtra",
        district: "Mumbai",
        taluka: "Mumbai Suburban",
        village: "Dharavi",
        startDate: new Date("2026-07-15"),
        endDate: new Date("2027-07-14"),
        status: ProjectStatus.FUNDED,
      },
    });
    console.log("✓ Project 4 created:", project4.title);

    // Project 5: Women Empowerment (Nagpur)
    const project5 = await tx.project.create({
      data: {
        ngoId: ngo2.id,
        title: "Women Self-Help Group Empowerment",
        description: "Formation and training of 50 women self-help groups in Wardha district for micro-enterprise development, financial literacy, and market linkages.",
        focusArea: "Women Empowerment",
        sdgGoal: "SDG 5: Gender Equality",
        beneficiaryCount: 750,
        budgetRequested: 1200000.00, // 12 Lakhs
        state: "Maharashtra",
        district: "Wardha",
        taluka: "Wardha",
        village: "Pulgaon",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2027-09-30"),
        status: ProjectStatus.SUBMITTED,
      },
    });
    console.log("✓ Project 5 created:", project5.title);

    // ============================================
    // 8. CREATE MILESTONES
    // ============================================

    await tx.milestone.createMany({
      data: [
        // Project 1 Milestones
        {
          projectId: project1.id,
          name: "Phase 1: Site Survey & Ground Preparation",
          description: "Geological survey and demarcation of 3 check dam sites in Kamalpur village with community consultation.",
          amount: 500000.00,
          dueDate: new Date("2026-09-01"),
          status: MilestoneStatus.APPROVED_BY_NGO,
        },
        {
          projectId: project1.id,
          name: "Phase 2: Check Dam Construction",
          description: "Excavation and brickwork laying for all 3 designated water storing check dams with quality monitoring.",
          amount: 1200000.00,
          dueDate: new Date("2026-12-15"),
          status: MilestoneStatus.PENDING,
        },
        {
          projectId: project1.id,
          name: "Phase 3: Afforestation & Community Training",
          description: "Sapling plantation across 10 hectares and training local water committees for maintenance.",
          amount: 800000.00,
          dueDate: new Date("2027-06-01"),
          status: MilestoneStatus.PENDING,
        },
        // Project 4 Milestones
        {
          projectId: project4.id,
          name: "Phase 1: Mobile Clinic Setup",
          description: "Procurement of 2 mobile health vans with medical equipment and staff recruitment.",
          amount: 1500000.00,
          dueDate: new Date("2026-09-15"),
          status: MilestoneStatus.APPROVED_BY_COMPANY,
        },
        {
          projectId: project4.id,
          name: "Phase 2: Health Camps & Awareness",
          description: "Conducting 50 health camps and nutrition awareness sessions in target slums.",
          amount: 1700000.00,
          dueDate: new Date("2027-03-15"),
          status: MilestoneStatus.PENDING,
        },
        {
          projectId: project4.id,
          name: "Phase 3: Follow-up & Documentation",
          description: "Follow-up care, impact assessment, and documentation of health outcomes.",
          amount: 1000000.00,
          dueDate: new Date("2027-07-01"),
          status: MilestoneStatus.PENDING,
        },
      ],
    });
    console.log("✓ Milestones created for funded projects");

    // ============================================
    // 9. CREATE MATCH SCORES
    // ============================================

    await tx.matchScore.createMany({
      data: [
        {
          companyId: company1.id,
          projectId: project1.id,
          score: 85,
          factors: {
            locationMatch: "state_match",
            focusAreaMatch: false,
            budgetFitScore: 95,
            aspirationalDistrict: true,
          },
        },
        {
          companyId: company1.id,
          projectId: project2.id,
          score: 92,
          factors: {
            locationMatch: "district_match",
            focusAreaMatch: true,
            budgetFitScore: 90,
          },
        },
        {
          companyId: company2.id,
          projectId: project2.id,
          score: 98,
          factors: {
            locationMatch: "district_match",
            focusAreaMatch: true,
            budgetFitScore: 95,
          },
        },
        {
          companyId: company2.id,
          projectId: project3.id,
          score: 94,
          factors: {
            locationMatch: "state_match",
            focusAreaMatch: true,
            budgetFitScore: 92,
          },
        },
        {
          companyId: company3.id,
          projectId: project4.id,
          score: 96,
          factors: {
            locationMatch: "district_match",
            focusAreaMatch: true,
            budgetFitScore: 98,
          },
        },
        {
          companyId: company4.id,
          projectId: project1.id,
          score: 88,
          factors: {
            locationMatch: "state_match",
            focusAreaMatch: true,
            budgetFitScore: 85,
            aspirationalDistrict: true,
          },
        },
      ],
    });
    console.log("✓ Match scores created");

    // ============================================
    // 10. CREATE AUDIT LOGS
    // ============================================

    await tx.auditLog.createMany({
      data: [
        {
          userId: superAdmin.id,
          action: "USER_LOGIN",
          details: { email: superAdmin.email, role: "SUPER_ADMIN" },
          ipAddress: "103.21.58.12",
        },
        {
          userId: ngo1Admin.id,
          action: "PROJECT_CREATED",
          details: { projectId: project1.id, title: project1.title },
          ipAddress: "103.21.58.45",
        },
        {
          userId: company1Admin.id,
          action: "PROJECT_FUNDED",
          details: { projectId: project1.id, amount: 2500000 },
          ipAddress: "103.21.58.78",
        },
      ],
    });
    console.log("✓ Audit logs created");

  }, {
    timeout: 60000
  });

  console.log("\n========================================");
  console.log("✅ Database seed completed successfully!");
  console.log("========================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Made with Bob
