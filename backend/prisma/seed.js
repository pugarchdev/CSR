"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Pre-hashed bcrypt string for "Password123"
const DEFAULT_PASSWORD_HASH = "$2b$10$Epjvit763f7A56sKp6W1euK6R5rNfT6P9/Z1Nf6t.GkF8z7X.B6d2";
async function main() {
    console.log("Starting database seed...");
    // 1. Clean Database
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.report.deleteMany();
    await prisma.matchScore.deleteMany();
    await prisma.document.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.ngo.deleteMany();
    await prisma.company.deleteMany();
    console.log("Database cleared.");
    // 2. Create Super Admin
    const superAdmin = await prisma.user.create({
        data: {
            email: "admin@mahacsr.gov.in",
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: client_1.Role.SUPER_ADMIN,
            isVerified: true,
        },
    });
    console.log("Super Admin created: ", superAdmin.email);
    // 3. Create NGO Profile
    const ngo = await prisma.ngo.create({
        data: {
            name: "Sahyadri Eco Foundation",
            registrationNumber: "MH/2021/0088921",
            darpanNumber: "MH/2021/012345",
            csr1Number: "CSR00012345",
            pan: "AAATS2345P",
            certificate12AUrl: "https://cloudinary.com/sahyadri/12a.pdf",
            certificate80GUrl: "https://cloudinary.com/sahyadri/80g.pdf",
            address: "12, Karve Road, Deccan Gymkhana",
            state: "Maharashtra",
            district: "Pune",
            taluka: "Haveli",
            village: "Pune City",
            website: "https://sahyadrieco.org",
            socialLinks: {
                twitter: "https://twitter.com/sahyadrieco",
                linkedin: "https://linkedin.com/company/sahyadrieco",
            },
            impactStatistics: {
                beneficiariesServed: 45000,
                projectsCompleted: 12,
            },
            status: client_1.VerificationStatus.VERIFIED,
        },
    });
    console.log("NGO Profile created: ", ngo.name);
    // 4. Create NGO Admin User
    const ngoAdmin = await prisma.user.create({
        data: {
            email: "contact@sahyadrieco.org",
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: client_1.Role.NGO_ADMIN,
            isVerified: true,
            ngoId: ngo.id,
        },
    });
    console.log("NGO Admin User created: ", ngoAdmin.email);
    // 5. Create Company Profile
    const company = await prisma.company.create({
        data: {
            name: "Sahyadri Technology Ventures Ltd",
            cin: "L72200MH2018PLC309876",
            gst: "27AAACS1234P1Z5",
            pan: "AAACS1234P",
            csrBudget: 7500000.00, // 75 Lakhs
            focusAreas: ["Water Conservation", "Education & Literacy", "Environmental Sustainability"],
            contactInfo: {
                phone: "+919876543210",
                alternateEmail: "csr.leads@sahyadritech.com",
            },
            status: client_1.VerificationStatus.VERIFIED,
        },
    });
    console.log("Company Profile created: ", company.name);
    // 6. Create Company Admin User
    const companyAdmin = await prisma.user.create({
        data: {
            email: "csr@sahyadritech.com",
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: client_1.Role.COMPANY_ADMIN,
            isVerified: true,
            companyId: company.id,
        },
    });
    console.log("Company Admin User created: ", companyAdmin.email);
    // 7. Create Project 1 (Water Conservation)
    const project1 = await prisma.project.create({
        data: {
            ngoId: ngo.id,
            title: "Gadchiroli Watershed & Afforestation Initiative",
            description: "Building check dams, bunds, and reforestation to restore groundwater levels in Aheri taluka, Gadchiroli.",
            focusArea: "Water Conservation",
            sdgGoal: "SDG 6: Clean Water and Sanitation",
            beneficiaryCount: 12000,
            budgetRequested: 2500000.00, // 25 Lakhs
            state: "Maharashtra",
            district: "Gadchiroli",
            taluka: "Aheri",
            village: "Kamalpur",
            startDate: new Date("2026-07-01"),
            endDate: new Date("2027-06-30"),
            status: client_1.ProjectStatus.APPROVED,
        },
    });
    console.log("Project 1 created: ", project1.title);
    // 8. Create Milestones for Project 1
    await prisma.milestone.createMany({
        data: [
            {
                projectId: project1.id,
                name: "Phase 1: Site Survey & Ground Cleansing",
                description: "Geological survey and demarcation of 3 check dam sites in Kamalpur village.",
                amount: 500000.00,
                dueDate: new Date("2026-09-01"),
                status: client_1.MilestoneStatus.PENDING,
            },
            {
                projectId: project1.id,
                name: "Phase 2: Check Dam Structure Construction",
                description: "Excavation and brickwork laying for all 3 designated water storing check dams.",
                amount: 1200000.00,
                dueDate: new Date("2026-12-15"),
                status: client_1.MilestoneStatus.PENDING,
            },
            {
                projectId: project1.id,
                name: "Phase 3: Community Training & Forestry Drive",
                description: "Sapling plantation across 10 hectares and training local water committees for maintenance.",
                amount: 800000.00,
                dueDate: new Date("2027-06-01"),
                status: client_1.MilestoneStatus.PENDING,
            },
        ],
    });
    console.log("Milestones created for Project 1");
    // 9. Create Project 2 (Education)
    const project2 = await prisma.project.create({
        data: {
            ngoId: ngo.id,
            title: "Pune Rural Digital Smart-Classrooms",
            description: "Equipping 15 Zilla Parishad schools in Haveli and Mulshi talukas with smart interactive screens and content.",
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
            status: client_1.ProjectStatus.SUBMITTED,
        },
    });
    console.log("Project 2 created: ", project2.title);
    // 10. Generate initial dynamic Match Score
    await prisma.matchScore.createMany({
        data: [
            {
                companyId: company.id,
                projectId: project1.id,
                score: 85,
                factors: {
                    locationMatch: "district_mismatch_state_match",
                    focusAreaMatch: true,
                    budgetFitScore: 20,
                },
            },
            {
                companyId: company.id,
                projectId: project2.id,
                score: 95,
                factors: {
                    locationMatch: "district_and_taluka_match",
                    focusAreaMatch: true,
                    budgetFitScore: 20,
                },
            },
        ],
    });
    console.log("Initial Match Scores seeded.");
    console.log("Database seed completed successfully.");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
