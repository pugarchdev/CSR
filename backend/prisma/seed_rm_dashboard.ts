import { PrismaClient, Role, CorporateEnquiryStatus, GovernmentPitchStatus, ChecklistAnswer, FeasibilityResult } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding rich test data for Relationship Manager Dashboard...");

  const defaultPasswordHash = await bcrypt.hash("111111", 10);

  // 1. Ensure RM User exists
  let rmUser = await prisma.user.findUnique({
    where: { email: "rm@mahacsr.gov.in" },
  });

  if (!rmUser) {
    rmUser = await prisma.user.create({
      data: {
        email: "rm@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.GOVERNMENT_OFFICER,
        accountStatus: "ACTIVE",
        isVerified: true,
      },
    });
  }

  // Ensure RM Role assignment
  const rmRole = await prisma.organizationRole.upsert({
    where: { id: "rm-role-id" },
    update: { name: "CSR_RELATIONSHIP_MANAGER" },
    create: {
      id: "rm-role-id",
      name: "CSR_RELATIONSHIP_MANAGER",
      description: "CSR Relationship Manager",
      scope: "GLOBAL",
      isSystemRole: true,
    },
  });

  await prisma.userOrganizationRole.deleteMany({ where: { userId: rmUser.id } });
  await prisma.userOrganizationRole.create({
    data: { userId: rmUser.id, roleId: rmRole.id },
  });

  // Ensure JS User exists for assessment approvals
  let jsUser = await prisma.user.findUnique({
    where: { email: "js@mahacsr.gov.in" },
  });

  if (!jsUser) {
    jsUser = await prisma.user.create({
      data: {
        email: "js@mahacsr.gov.in",
        passwordHash: defaultPasswordHash,
        role: Role.GOVERNMENT_OFFICER,
        accountStatus: "ACTIVE",
        isVerified: true,
      },
    });
  }

  // Clear existing RM mock records
  await prisma.feasibilityChecklistItem.deleteMany();
  await prisma.feasibilityAssessment.deleteMany();
  await prisma.corporateEnquiryInteraction.deleteMany();
  await prisma.corporateEnquiry.deleteMany();
  await prisma.governmentPitch.deleteMany();

  console.log("Cleared existing RM data.");

  // ============================================================
  // 2. SEED CORPORATE ENQUIRIES & INTERACTION LOGS
  // ============================================================

  // Enquiry 1: TCS (Feasibility In Progress)
  const enq1 = await prisma.corporateEnquiry.create({
    data: {
      trackingId: "CSR-MH-2026-000101",
      companyName: "Tata Consultancy Services Ltd",
      mca21Cin: "L72200MH1995PLC085601",
      contactPersonName: "Rajesh V. Sharma",
      contactPersonDesignation: "Head of CSR & Social Impact",
      email: "rajesh.sharma@tcs.com",
      mobile: "+91 98201 12345",
      sector: "Education & Digital Literacy",
      preferredDistricts: ["Pune", "Satara"],
      indicativeBudget: 35000000, // ₹3.5 Cr
      proposedCsrWork: "Setting up 75 Digital Smart Classrooms with solar power backup and teacher training across Zilla Parishad schools in rural Pune and Satara districts.",
      status: CorporateEnquiryStatus.ASSESSMENT_PENDING,
      assignedRelationshipManagerId: rmUser.id,
      submittedAt: new Date(Date.now() - 86400000 * 7),
      firstContactedAt: new Date(Date.now() - 86400000 * 5),
    },
  });

  await prisma.corporateEnquiryInteraction.createMany({
    data: [
      {
        corporateEnquiryId: enq1.id,
        actorUserId: rmUser.id,
        interactionType: "CALL",
        note: "Initial telephonic discussion with TCS CSR lead Mr. Rajesh Sharma regarding project scope in Pune ZP schools.",
      },
      {
        corporateEnquiryId: enq1.id,
        actorUserId: rmUser.id,
        interactionType: "MEETING",
        note: "Joint field visit conducted with District Education Officer (DEO Pune) to evaluate 15 proposed school sites.",
      },
      {
        corporateEnquiryId: enq1.id,
        actorUserId: rmUser.id,
        interactionType: "PORTAL_NOTE",
        note: "Completed preliminary 13-factor feasibility assessment. Criteria 1 to 12 satisfied. Forwarded report for JS review.",
      },
    ],
  });

  // Enquiry 2: Reliance Foundation (JS Approved)
  const enq2 = await prisma.corporateEnquiry.create({
    data: {
      trackingId: "CSR-MH-2026-000102",
      companyName: "Reliance Foundation",
      mca21Cin: "L17110MH1973PLC019786",
      contactPersonName: "Dr. Ananya Roy",
      contactPersonDesignation: "Director - Rural Health Initiative",
      email: "ananya.roy@reliancefoundation.org",
      mobile: "+91 98202 67890",
      sector: "Healthcare & Infrastructure",
      preferredDistricts: ["Nagpur", "Chandrapur"],
      indicativeBudget: 60000000, // ₹6.0 Cr
      proposedCsrWork: "Upgradation of 20 Primary Health Centres (PHCs) with solar microgrids, ICU beds, and telemedicine units in tribal belts of Nagpur and Chandrapur.",
      status: CorporateEnquiryStatus.JS_APPROVED,
      assignedRelationshipManagerId: rmUser.id,
      submittedAt: new Date(Date.now() - 86400000 * 14),
      firstContactedAt: new Date(Date.now() - 86400000 * 12),
    },
  });

  await prisma.corporateEnquiryInteraction.createMany({
    data: [
      {
        corporateEnquiryId: enq2.id,
        actorUserId: rmUser.id,
        interactionType: "CALL",
        note: "Reviewed PHC list provided by Public Health Department. Confirmed non-duplication of funds.",
      },
      {
        corporateEnquiryId: enq2.id,
        actorUserId: rmUser.id,
        interactionType: "STATUS_CHANGE",
        note: "Assessment submitted to Joint Secretary. High feasibility score (94/100).",
      },
    ],
  });

  // Enquiry 3: Mahindra & Mahindra (RM Assigned / Under Review)
  const enq3 = await prisma.corporateEnquiry.create({
    data: {
      trackingId: "CSR-MH-2026-000103",
      companyName: "Mahindra & Mahindra Ltd",
      mca21Cin: "L65990MH1945PLC004558",
      contactPersonName: "Vikram Deshmukh",
      contactPersonDesignation: "Vice President - Sustainable Development",
      email: "deshmukh.vikram@mahindra.com",
      mobile: "+91 98900 11223",
      sector: "Water Conservation & Watershed",
      preferredDistricts: ["Nashik", "Ahmednagar"],
      indicativeBudget: 45000000, // ₹4.5 Cr
      proposedCsrWork: "Desiltation of 30 farm ponds and construction of check dams under Jalyukt Shivar convergence in Nashik and Ahmednagar.",
      status: CorporateEnquiryStatus.RM_CONTACTED,
      assignedRelationshipManagerId: rmUser.id,
      submittedAt: new Date(Date.now() - 86400000 * 3),
      firstContactedAt: new Date(Date.now() - 86400000 * 1),
    },
  });

  await prisma.corporateEnquiryInteraction.create({
    data: {
      corporateEnquiryId: enq3.id,
      actorUserId: rmUser.id,
      interactionType: "CALL",
      note: "Briefed Mahindra CSR team on Mahagov Watershed Convergence guidelines. Scheduled technical site audit.",
    },
  });

  // Enquiry 4: Infosys Foundation (Completed)
  const enq4 = await prisma.corporateEnquiry.create({
    data: {
      trackingId: "CSR-MH-2026-000104",
      companyName: "Infosys Foundation",
      mca21Cin: "U85300KA1996NPL020500",
      contactPersonName: "Meera Kulkarni",
      contactPersonDesignation: "Lead Manager - Western Region",
      email: "meera_kulkarni@infosys.com",
      mobile: "+91 98450 99887",
      sector: "Skill Development & Livelihood",
      preferredDistricts: ["Chhatrapati Sambhajinagar"],
      indicativeBudget: 28000000, // ₹2.8 Cr
      proposedCsrWork: "Establishing a COE (Centre of Excellence) in Electric Vehicle Servicing & Repair at Government ITI Chhatrapati Sambhajinagar.",
      status: CorporateEnquiryStatus.COMPLETED,
      assignedRelationshipManagerId: rmUser.id,
      submittedAt: new Date(Date.now() - 86400000 * 30),
      firstContactedAt: new Date(Date.now() - 86400000 * 28),
    },
  });

  // ============================================================
  // 3. SEED 13-FACTOR FEASIBILITY ASSESSMENTS
  // ============================================================

  // Assessment 1 for TCS
  const assess1 = await prisma.feasibilityAssessment.create({
    data: {
      reportReference: "FAR-MH-2026-0001",
      corporateEnquiryId: enq1.id,
      relationshipManagerId: rmUser.id,
      companyName: enq1.companyName,
      cin: enq1.mca21Cin,
      sector: enq1.sector,
      contactSummary: "Mr. Rajesh Sharma (Head CSR) - rajesh.sharma@tcs.com - 9820112345",
      proposedLocationDistrict: "Pune & Satara",
      indicativeBudget: enq1.indicativeBudget!,
      developmentNeedAddressed: "Digital literacy gap in rural government schools; provision of smart boards, tablets, and interactive content.",
      dateOfFirstContact: new Date(Date.now() - 86400000 * 5),
      summaryOfInteraction: "Conducted 2 virtual rounds & 1 field visit with ZP Education Officer. High commitment from TCS CSR team.",
      feasibilityResult: FeasibilityResult.FEASIBLE,
      recommendation: "Strong recommendation to approve. Align with State School Education Department for nodal officer appointment.",
      suggestedNodalOfficerDomain: "School Education & Sports Department",
      submittedToJsAt: new Date(Date.now() - 86400000 * 2),
      checklistItems: {
        create: [
          { itemNumber: 1, dimension: "Alignment", checkText: "1. Alignment with State CSR Policy & District Development Priorities", isCritical: true, answer: ChecklistAnswer.YES, remarks: "100% aligned with Maharashtra Education Mission 2026." },
          { itemNumber: 2, dimension: "Statutory", checkText: "2. Statutory and MCA21 Corporate Eligibility Compliance", isCritical: true, answer: ChecklistAnswer.YES, remarks: "Clean track record, 3-year CSR spend verified." },
          { itemNumber: 3, dimension: "Financial", checkText: "3. Financial Adequacy & Budget Realism", isCritical: true, answer: ChecklistAnswer.YES, remarks: "Budget of ₹3.5 Cr covers hardware, software, and 3-year AMC." },
          { itemNumber: 4, dimension: "Land & Infra", checkText: "4. Infrastructure / Land Availability", isCritical: true, answer: ChecklistAnswer.YES, remarks: "Rooms identified in all 75 ZP schools with secure doors/windows." },
          { itemNumber: 5, dimension: "Duplication", checkText: "5. Non-Duplication of Govt / Other Agency Funding", isCritical: true, answer: ChecklistAnswer.YES, remarks: "DEO certified no existing smart classroom funds allocated." },
          { itemNumber: 6, dimension: "Execution", checkText: "6. Implementing Partner Capability & Track Record", isCritical: false, answer: ChecklistAnswer.YES, remarks: "TCS iON platform to handle execution directly." },
          { itemNumber: 7, dimension: "Sustainability", checkText: "7. O&M & Long-term Sustainability Plan", isCritical: false, answer: ChecklistAnswer.YES, remarks: "TCS committed 3-year maintenance and local IT technician support." },
          { itemNumber: 8, dimension: "Environment", checkText: "8. Environmental & Social Impact Clearance", isCritical: false, answer: ChecklistAnswer.YES, remarks: "Solar panels included to ensure eco-friendly green energy." },
          { itemNumber: 9, dimension: "Community", checkText: "9. Local Community Acceptance & Stakeholder Readiness", isCritical: false, answer: ChecklistAnswer.YES, remarks: "School Management Committees (SMC) gave written consent." },
          { itemNumber: 10, dimension: "Security", checkText: "10. Asset Security & Theft Prevention Measures", isCritical: false, answer: ChecklistAnswer.YES, remarks: "CCTV & biometric locks included in school budgets." },
          { itemNumber: 11, dimension: "Monitoring", checkText: "11. Real-time Monitoring & Geo-tagging Feasibility", isCritical: false, answer: ChecklistAnswer.YES, remarks: "Dashboards compatible with MahaCSR Portal API." },
          { itemNumber: 12, dimension: "Governance", checkText: "12. Tripartite MoU Terms Readiness", isCritical: false, answer: ChecklistAnswer.YES, remarks: "Standard Mou template accepted by corporate legal team." },
          { itemNumber: 13, dimension: "SLA Timelines", checkText: "13. Feasibility Completion within 15-day SLA Window", isCritical: false, answer: ChecklistAnswer.YES, remarks: "Completed in 5 working days." },
        ],
      },
    },
  });

  // Assessment 2 for Reliance Foundation (Approved by JS)
  const assess2 = await prisma.feasibilityAssessment.create({
    data: {
      reportReference: "FAR-MH-2026-0002",
      corporateEnquiryId: enq2.id,
      relationshipManagerId: rmUser.id,
      companyName: enq2.companyName,
      cin: enq2.mca21Cin,
      sector: enq2.sector,
      contactSummary: "Dr. Ananya Roy - ananya.roy@reliancefoundation.org",
      proposedLocationDistrict: "Nagpur & Chandrapur",
      indicativeBudget: enq2.indicativeBudget!,
      developmentNeedAddressed: "Solar electrification and oxygen plant installation at 20 remote tribal PHCs.",
      dateOfFirstContact: new Date(Date.now() - 86400000 * 12),
      summaryOfInteraction: "Joint review with Health Secretary. High impact proposal.",
      feasibilityResult: FeasibilityResult.FEASIBLE,
      recommendation: "Approved for MoU signing.",
      suggestedNodalOfficerDomain: "Public Health & Family Welfare Department",
      submittedToJsAt: new Date(Date.now() - 86400000 * 8),
      jsDecisionById: jsUser.id,
      jsDecisionAt: new Date(Date.now() - 86400000 * 4),
      jsDecisionRemarks: "Approved as per RM recommendation. Appoint District Health Officers (DHO) as Nodal Officers.",
      checklistItems: {
        create: [
          { itemNumber: 1, dimension: "Alignment", checkText: "1. Policy Alignment", isCritical: true, answer: ChecklistAnswer.YES, remarks: "Directly satisfies Rural Health Mission objectives." },
          { itemNumber: 2, dimension: "Statutory", checkText: "2. Statutory Compliance", isCritical: true, answer: ChecklistAnswer.YES, remarks: "Verified." },
          { itemNumber: 3, dimension: "Financial", checkText: "3. Financial Adequacy", isCritical: true, answer: ChecklistAnswer.YES, remarks: "₹6.0 Cr committed." },
        ],
      },
    },
  });

  // ============================================================
  // 4. SEED GOVERNMENT PITCHES
  // ============================================================
  await prisma.governmentPitch.createMany({
    data: [
      {
        pitchReferenceId: "GP-MH-2026-000501",
        officialName: "Shri Santosh Patil",
        designation: "District Collector & Magistrate",
        department: "Revenue & District Administration",
        officeName: "District Collectorate Office Pune",
        serviceClass: "CLASS_1",
        mobile: "+91 94220 11111",
        email: "collector.pune@maharashtra.gov.in",
        district: "Pune",
        taluka: "Haveli",
        exactLocation: "Khed-Shivapur ZP High School Cluster",
        csrRequirement: "Construction of a 200-seat digital library and STEM laboratory for rural students.",
        estimatedCost: 15000000, // ₹1.5 Cr
        govtFundDeclaration: false,
        certificationType: "HOD",
        status: GovernmentPitchStatus.RM_REVIEW,
        assignedRelationshipManagerId: rmUser.id,
      },
      {
        pitchReferenceId: "GP-MH-2026-000502",
        officialName: "Dr. Sunita Kadam",
        designation: "Civil Surgeon / District Health Officer",
        department: "Public Health Department",
        officeName: "District Civil Hospital Nashik",
        serviceClass: "CLASS_1",
        mobile: "+91 94220 22222",
        email: "dho.nashik@maharashtra.gov.in",
        district: "Nashik",
        taluka: "Trimbakeshwar",
        exactLocation: "Rural Hospital Trimbakeshwar",
        csrRequirement: "Provision of 2 Advanced Life Support (ALS) Ambulances and Mobile Medical Van.",
        estimatedCost: 8500000, // ₹85 Lakhs
        govtFundDeclaration: false,
        certificationType: "SELF",
        status: GovernmentPitchStatus.VERIFIED_PUBLIC,
        assignedRelationshipManagerId: rmUser.id,
      },
      {
        pitchReferenceId: "GP-MH-2026-000503",
        officialName: "Shri Rameshwar Pawar",
        designation: "Executive Engineer",
        department: "Water Resources & Irrigation",
        officeName: "Minor Irrigation Division Solapur",
        serviceClass: "CLASS_1",
        mobile: "+91 94220 33333",
        email: "ee.irrigation.solapur@maharashtra.gov.in",
        district: "Solapur",
        taluka: "Barshi",
        exactLocation: "Kavhe Village Nalla Stream",
        csrRequirement: "Desiltation and rejuvenation of 12 cement nalla bunds to augment groundwater.",
        estimatedCost: 22000000, // ₹2.2 Cr
        govtFundDeclaration: false,
        certificationType: "HOD",
        status: GovernmentPitchStatus.MATCHED,
        assignedRelationshipManagerId: rmUser.id,
      },
    ],
  });

  console.log("✓ Successfully seeded Relationship Manager Dashboard test data!");
}

main()
  .catch((e) => {
    console.error("RM seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
