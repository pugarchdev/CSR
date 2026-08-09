import prisma from "../src/config/db";

async function cleanDatabase() {
  console.log("🧹 Starting database cleanup...");

  try {
    const p = prisma as any;

    // 1. Milestone & MoU & Execution
    console.log("Deleting MilestoneEvidences...");
    if (p.milestoneEvidence) await p.milestoneEvidence.deleteMany({});

    console.log("Deleting ProjectMilestones...");
    if (p.projectMilestone) await p.projectMilestone.deleteMany({});

    console.log("Deleting MouVersions...");
    if (p.mouVersion) await p.mouVersion.deleteMany({});

    console.log("Deleting Mous...");
    if (p.mou) await p.mou.deleteMany({});

    console.log("Deleting ProjectAssignments...");
    if (p.projectAssignment) await p.projectAssignment.deleteMany({});

    console.log("Deleting ProjectInspections...");
    if (p.projectInspection) await p.projectInspection.deleteMany({});

    console.log("Deleting ProjectImplementingAgencies...");
    if (p.projectImplementingAgency) await p.projectImplementingAgency.deleteMany({});

    console.log("Deleting ProjectIssues...");
    if (p.projectIssue) await p.projectIssue.deleteMany({});

    console.log("Deleting ProjectCommunicationLogs...");
    if (p.projectCommunicationLog) await p.projectCommunicationLog.deleteMany({});

    console.log("Deleting Projects...");
    if (p.project) await p.project.deleteMany({});

    // 2. Enquiries, Pitches, Feasibility
    if (p.feasibilityAssessment) await p.feasibilityAssessment.deleteMany({});
    if (p.corporateEnquiry) await p.corporateEnquiry.deleteMany({});
    if (p.governmentPitch) await p.governmentPitch.deleteMany({});

    // 3. Grievances & Helpdesk
    if (p.grievanceActionLog) await p.grievanceActionLog.deleteMany({});
    if (p.grievance) await p.grievance.deleteMany({});
    if (p.helpdeskQuery) await p.helpdeskQuery.deleteMany({});

    // 4. Documents, Logs, Sessions, Verifications
    if (p.document) await p.document.deleteMany({});
    if (p.auditLog) await p.auditLog.deleteMany({});
    if (p.session) await p.session.deleteMany({});
    if (p.verificationRecord) await p.verificationRecord.deleteMany({});

    // 5. Role Assignments & Nominations
    if (p.userRoleAssignment) await p.userRoleAssignment.deleteMany({});
    if (p.userOrganizationRole) await p.userOrganizationRole.deleteMany({});
    if (p.dnoNomination) await p.dnoNomination.deleteMany({});

    // 6. Profiles & Department structures
    if (p.userOfficerProfile) await p.userOfficerProfile.deleteMany({});
    if (p.govDepartmentProfile) await p.govDepartmentProfile.deleteMany({});
    if (p.nGOProfile) await p.nGOProfile.deleteMany({});
    if (p.cSRCompanyProfile) await p.cSRCompanyProfile.deleteMany({});
    if (p.subDepartment) await p.subDepartment.deleteMany({});
    if (p.organizationRelationship) await p.organizationRelationship.deleteMany({});

    // 7. Users & Custom Roles & Organizations
    console.log("Deleting Users...");
    await p.user.deleteMany({});

    console.log("Deleting Custom Roles...");
    if (p.role) {
      await p.role.deleteMany({
        where: {
          isSystemRole: false,
          id: { gt: 9 }
        }
      });
    }

    console.log("Deleting Organizations...");
    await p.organization.deleteMany({});

    console.log("✨ Database cleaned successfully! All organizations and users have been deleted.");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
