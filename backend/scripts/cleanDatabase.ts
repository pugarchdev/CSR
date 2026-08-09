import prisma from "../src/config/db";

async function cleanDatabase() {
  console.log("🧹 Starting database cleanup...");

  try {
    // 1. Project & Milestone & MoU related
    console.log("Deleting MilestoneEvidences...");
    await prisma.milestoneEvidence.deleteMany({});

    console.log("Deleting ProjectMilestones...");
    await prisma.projectMilestone.deleteMany({});

    console.log("Deleting MouVersions...");
    await prisma.mouVersion.deleteMany({});

    console.log("Deleting Mous...");
    await prisma.mou.deleteMany({});

    console.log("Deleting ProjectAssignments...");
    await prisma.projectAssignment.deleteMany({});

    console.log("Deleting ProjectInspections...");
    await prisma.projectInspection.deleteMany({});

    console.log("Deleting ProjectImplementingAgencies...");
    await prisma.projectImplementingAgency.deleteMany({});

    console.log("Deleting ProjectIssues...");
    await prisma.projectIssue.deleteMany({});

    console.log("Deleting ProjectCommunicationLogs...");
    await prisma.projectCommunicationLog.deleteMany({});

    console.log("Deleting Projects...");
    await prisma.project.deleteMany({});

    // 2. Enquiries, Pitches, Feasibility, Interests
    console.log("Deleting FeasibilityAssessments...");
    await prisma.feasibilityAssessment.deleteMany({}).catch(() => {});

    console.log("Deleting CompanyInterests...");
    await prisma.companyInterest.deleteMany({}).catch(() => {});

    console.log("Deleting CorporateEnquiries...");
    await prisma.corporateEnquiry.deleteMany({}).catch(() => {});

    console.log("Deleting GovernmentPitches...");
    await prisma.governmentPitch.deleteMany({}).catch(() => {});

    // 3. Grievances & Helpdesk
    console.log("Deleting GrievanceActionLogs...");
    await prisma.grievanceActionLog.deleteMany({}).catch(() => {});

    console.log("Deleting Grievances...");
    await prisma.grievance.deleteMany({}).catch(() => {});

    console.log("Deleting HelpdeskQueries...");
    await prisma.helpdeskQuery.deleteMany({}).catch(() => {});

    // 4. Documents, Logs, Sessions, Verifications
    console.log("Deleting Documents...");
    await prisma.document.deleteMany({});

    console.log("Deleting AuditLogs...");
    await prisma.auditLog.deleteMany({});

    console.log("Deleting Sessions...");
    await prisma.session.deleteMany({});

    console.log("Deleting VerificationRecords...");
    await prisma.verificationRecord.deleteMany({});

    // 5. Role Assignments & Nominations
    console.log("Deleting UserRoleAssignments...");
    await prisma.userRoleAssignment.deleteMany({});

    console.log("Deleting UserOrganizationRoles...");
    await prisma.userOrganizationRole.deleteMany({});

    console.log("Deleting DnoNominations...");
    await prisma.dnoNomination.deleteMany({});

    console.log("Deleting DistrictDncAssignments...");
    await prisma.districtDncAssignment.deleteMany({}).catch(() => {});

    console.log("Deleting DistrictNodalMappings...");
    await prisma.districtNodalMapping.deleteMany({}).catch(() => {});

    // 6. Profiles & Department structures
    console.log("Deleting UserOfficerProfiles...");
    await prisma.userOfficerProfile.deleteMany({});

    console.log("Deleting GovDepartmentProfiles...");
    await prisma.govDepartmentProfile.deleteMany({});

    console.log("Deleting NGOProfiles...");
    await prisma.nGOProfile.deleteMany({});

    console.log("Deleting CompanyProfiles...");
    await prisma.companyProfile.deleteMany({});

    console.log("Deleting SubDepartments...");
    await prisma.subDepartment.deleteMany({});

    console.log("Deleting OrganizationRelationships...");
    await prisma.organizationRelationship.deleteMany({});

    // 7. Users & Custom Roles & Organizations
    console.log("Deleting Users...");
    await prisma.user.deleteMany({});

    console.log("Deleting Custom Roles...");
    await prisma.role.deleteMany({
      where: {
        isSystemRole: false,
        id: { gt: 9 }
      }
    }).catch(() => {});

    console.log("Deleting Organizations...");
    await prisma.organization.deleteMany({});

    console.log("✨ Database cleaned successfully! All organizations and users have been deleted.");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
