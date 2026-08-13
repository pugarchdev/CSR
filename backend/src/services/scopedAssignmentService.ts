import prisma from "../config/db";
import { ROLE_ID } from "../types/role";

export class ScopedAssignmentService {
  /**
   * 1. Assign District Nodal Consultant (DNC) for a district.
   * One or more DNC supporters may be active for a district/organization.
   */
  public static async assignDistrictDnc(district: string, dncUserId: string, assignedById: string) {
    const normalizedDistrict = district.trim();

    // Verify DNC user exists and has DNC role (Role ID 5 or code DISTRICT_NODAL_CONSULTANT)
    const user = await prisma.user.findFirst({
      where: {
        id: dncUserId,
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
      include: {
        role: true,
        officerProfile: true,
      },
    });

    if (!user) {
      throw new Error(`User ${dncUserId} not found or not active`);
    }

    const isDncRole = user.roleId === ROLE_ID.DISTRICT_NODAL_CONSULTANT || user.role?.code === "DISTRICT_NODAL_CONSULTANT";
    if (!isDncRole) {
      throw new Error(`User ${dncUserId} does not possess the DISTRICT_NODAL_CONSULTANT role`);
    }

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.districtDncAssignment.findFirst({
        where: { district: normalizedDistrict, organizationId: user.organizationId || null, dncUserId }
      });
      const assignment = existing
        ? await tx.districtDncAssignment.update({
            where: { id: existing.id },
            data: { assignedById, isActive: true, updatedAt: new Date() },
          })
        : await tx.districtDncAssignment.create({
            data: {
              district: normalizedDistrict,
              organizationId: user.organizationId || null,
              dncUserId,
              assignedById,
              isActive: true,
            },
          });

      // Also ensure user officer profile specifies district
      if (user.officerProfile) {
        await tx.userOfficerProfile.update({
          where: { userId: dncUserId },
          data: { district: normalizedDistrict },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          actorUserId: assignedById,
          action: "ASSIGN_DISTRICT_DNC",
          entityType: "DISTRICT",
          entityId: normalizedDistrict,
          details: { dncUserId, district: normalizedDistrict },
        },
      });

      return assignment;
    });
  }

  /**
   * 2. DNC delegates a project to a District Nodal Officer (DNO).
   * Rules:
   * - DNO must belong to the project's district.
   * - Cannot delegate to officer from another district.
   * - Closes previous active DNO delegation for this project with reason.
   */
  public static async delegateDistrictDno(
    projectId: string,
    dnoUserId: string,
    assignedById: string,
    reason?: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectCode: true, title: true, district: true, status: true },
    });

    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Verify target DNO user exists, active, and has DNO role (Role ID 4 or code DISTRICT_NODAL_OFFICER)
    const dnoUser = await prisma.user.findFirst({
      where: {
        id: dnoUserId,
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
      include: {
        role: true,
        officerProfile: true,
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!dnoUser) {
      throw new Error(`District Nodal Officer user '${dnoUserId}' not found or inactive`);
    }

    const isDnoRole =
      dnoUser.roleId === ROLE_ID.DISTRICT_NODAL_OFFICER ||
      dnoUser.role?.code === "DISTRICT_NODAL_OFFICER" ||
      dnoUser.userRoles.some((ur) => ur.role.code === "DISTRICT_NODAL_OFFICER");

    if (!isDnoRole) {
      throw new Error(`User '${dnoUserId}' does not possess the DISTRICT_NODAL_OFFICER role`);
    }

    // District match check: DNO must belong to project's district
    const userDistrict = dnoUser.officerProfile?.district || dnoUser.organization?.district;
    if (userDistrict && userDistrict.toLowerCase() !== project.district.toLowerCase()) {
      throw new Error(
        `Wrong District Error: Officer '${dnoUserId}' belongs to district '${userDistrict}', but project is in district '${project.district}'`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Close previous active DNO delegation for this project
      await tx.projectAssignment.updateMany({
        where: {
          entityId: projectId,
          entityType: "PROJECT",
          assignmentType: "DISTRICT_DNO_DELEGATION",
          status: "ACTIVE",
        },
        data: {
          status: "INACTIVE",
        },
      });

      // Create new active DNO delegation assignment
      const assignment = await tx.projectAssignment.create({
        data: {
          entityType: "PROJECT",
          entityId: projectId,
          assignmentType: "DISTRICT_DNO_DELEGATION",
          assignedById,
          assignedToId: dnoUserId,
          assignedRoleId: ROLE_ID.DISTRICT_NODAL_OFFICER,
          status: "ACTIVE",
        },
      });

      // Also set nodalOfficerUserId on Project
      await tx.project.update({
        where: { id: projectId },
        data: { nodalOfficerUserId: dnoUserId },
      });

      // Create audit entry
      await tx.auditLog.create({
        data: {
          actorUserId: assignedById,
          action: "DELEGATE_PROJECT_DNO",
          entityType: "PROJECT",
          entityId: projectId,
          details: {
            projectId,
            dnoUserId,
            district: project.district,
            reason: reason || "Delegated by DNC",
          },
        },
      });

      // Notify DNO
      await tx.notification.create({
        data: {
          userId: dnoUserId,
          recipientId: dnoUserId,
          title: "Project Delegated",
          message: `You have been assigned to monitor project '${project.title}' (${project.projectCode}) in ${project.district}.`,
          type: "INFO",
          actionUrl: `/projects/${projectId}`,
        },
      });

      return assignment;
    });
  }

  /**
   * 3. Government Organization Admin delegates a project to a Designated Nodal Officer.
   * Rules:
   * - Designated Nodal Officer must belong to the SAME government organization as the project.
   * - Cannot assign officer from another organization.
   * - Closes previous active officer assignment for this project with reason.
   */
  public static async delegateGovDesignatedOfficer(
    projectId: string,
    officerUserId: string,
    assignedById: string,
    reason?: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectCode: true, title: true, organizationId: true, status: true },
    });

    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Verify officer user exists, active, and belongs to project's organizationId
    const officerUser = await prisma.user.findFirst({
      where: {
        id: officerUserId,
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
      include: {
        role: true,
        organization: true,
      },
    });

    if (!officerUser) {
      throw new Error(`Designated Nodal Officer user '${officerUserId}' not found or inactive`);
    }

    if (officerUser.organizationId !== project.organizationId) {
      throw new Error(
        `Wrong Organization Error: Officer '${officerUserId}' belongs to organization '${officerUser.organizationId}', but project belongs to department organization '${project.organizationId}'`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Close previous active department officer delegation for this project
      await tx.projectAssignment.updateMany({
        where: {
          entityId: projectId,
          entityType: "PROJECT",
          assignmentType: "GOV_DEPT_OFFICER_DELEGATION",
          status: "ACTIVE",
        },
        data: {
          status: "INACTIVE",
        },
      });

      // Create new active department officer assignment
      const assignment = await tx.projectAssignment.create({
        data: {
          entityType: "PROJECT",
          entityId: projectId,
          assignmentType: "GOV_DEPT_OFFICER_DELEGATION",
          assignedById,
          assignedToId: officerUserId,
          assignedRoleId: officerUser.roleId ?? ROLE_ID.GOVERNMENT_OFFICER,
          status: "ACTIVE",
        },
      });

      // Audit entry
      await tx.auditLog.create({
        data: {
          actorUserId: assignedById,
          action: "DELEGATE_PROJECT_GOV_OFFICER",
          entityType: "PROJECT",
          entityId: projectId,
          details: {
            projectId,
            officerUserId,
            organizationId: project.organizationId,
            reason: reason || "Delegated by Government Org Admin",
          },
        },
      });

      // Notify officer
      await tx.notification.create({
        data: {
          userId: officerUserId,
          recipientId: officerUserId,
          title: "Department Project Assigned",
          message: `You have been designated for project '${project.title}' (${project.projectCode}).`,
          type: "INFO",
          actionUrl: `/projects/${projectId}`,
        },
      });

      return assignment;
    });
  }

  /**
   * 4. Joint Secretary (JS) Approval Workflow.
   * Atomic & Idempotent single-transaction execution:
   * - Resolves project district and locates exact active DNC for that district. Fails clearly if no DNC configured.
   * - Resolves government department organization and locates active Gov Org Admin(s).
   * - Idempotently creates DNC project assignment and Gov Org Admin queue assignment.
   * - Updates project status to APPROVED.
   * - Dispatches notifications to both parties.
   * - Rolls back completely on error without partial state.
   */
  public static async executeJsApprovalWorkflow(projectId: string, jsUserId: string) {
    return await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          projectCode: true,
          title: true,
          district: true,
          organizationId: true,
          status: true,
        },
      });

      if (!project) {
        throw new Error(`JS Approval Error: Project '${projectId}' not found`);
      }

      const targetDistrict = project.district.trim();

      // 1. Locate active DNC for project's district
      const dncAssignment = await tx.districtDncAssignment.findFirst({
        where: {
          district: targetDistrict,
          isActive: true,
        },
        include: { dncUser: true },
      });

      if (!dncAssignment || !dncAssignment.dncUserId || dncAssignment.dncUser.accountStatus !== "ACTIVE") {
        throw new Error(
          `JS Approval Failed: No active District Nodal Consultant (DNC) configured for district '${targetDistrict}'. Approval cannot proceed without a valid district coordinator.`
        );
      }

      const dncUserId = dncAssignment.dncUserId;

      // 2. Locate active Government Org Admin(s) for project's organization
      const govAdminUser = await tx.user.findFirst({
        where: {
          organizationId: project.organizationId,
          accountStatus: "ACTIVE",
          deletedAt: null,
          OR: [
            { roleId: ROLE_ID.GOVERNMENT_OFFICER },
            { role: { code: "GOVERNMENT_ORG_ADMIN" } },
            { role: { code: "GOVERNMENT_OFFICER" } },
          ],
        },
        select: { id: true, email: true },
      });

      if (!govAdminUser) {
        throw new Error(
          `JS Approval Failed: No active Government Organization Admin found for department organization '${project.organizationId}'. Approval cannot proceed without a valid organization administrator.`
        );
      }

      // 3. Idempotent DNC District Project Assignment
      const existingProjectDnc = await tx.projectDistrictDncAssignment.findUnique({
        where: {
          projectId_district: {
            projectId,
            district: targetDistrict,
          },
        },
      });

      if (!existingProjectDnc) {
        await tx.projectDistrictDncAssignment.create({
          data: {
            projectId,
            district: targetDistrict,
            dncUserId,
            assignedById: jsUserId,
            status: "ACTIVE",
          },
        });
      }

      // 4. Idempotent Generic DNC Project Assignment
      const existingDncAssignment = await tx.projectAssignment.findFirst({
        where: {
          entityId: projectId,
          entityType: "PROJECT",
          assignmentType: "DISTRICT_DNC",
          status: "ACTIVE",
        },
      });

      if (!existingDncAssignment) {
        await tx.projectAssignment.create({
          data: {
            entityType: "PROJECT",
            entityId: projectId,
            assignmentType: "DISTRICT_DNC",
            assignedById: jsUserId,
            assignedToId: dncUserId,
            assignedRoleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT,
            status: "ACTIVE",
          },
        });
      }

      // 5. Idempotent Gov Org Admin Queue Assignment
      const existingGovAdminAssignment = await tx.projectAssignment.findFirst({
        where: {
          entityId: projectId,
          entityType: "PROJECT",
          assignmentType: "GOV_ORG_ADMIN_QUEUE",
          status: "ACTIVE",
        },
      });

      if (!existingGovAdminAssignment) {
        await tx.projectAssignment.create({
          data: {
            entityType: "PROJECT",
            entityId: projectId,
            assignmentType: "GOV_ORG_ADMIN_QUEUE",
            assignedById: jsUserId,
            assignedToId: govAdminUser.id,
            assignedRoleId: ROLE_ID.GOVERNMENT_OFFICER,
            status: "ACTIVE",
          },
        });
      }

      // 6. Update Project Status
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: "APPROVED",
        },
      });

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          actorUserId: jsUserId,
          action: "JS_PROJECT_APPROVAL",
          entityType: "PROJECT",
          entityId: projectId,
          details: {
            projectId,
            district: targetDistrict,
            dncUserId,
            govAdminUserId: govAdminUser.id,
            organizationId: project.organizationId,
          },
        },
      });

      // 8. Notifications
      await tx.notification.create({
        data: {
          userId: dncUserId,
          recipientId: dncUserId,
          title: "New Project Assigned for District Coordination",
          message: `Joint Secretary approved project '${project.title}' (${project.projectCode}) in district ${targetDistrict}.`,
          type: "INFO",
          actionUrl: `/assignments/dnc`,
        },
      });

      await tx.notification.create({
        data: {
          userId: govAdminUser.id,
          recipientId: govAdminUser.id,
          title: "New Project in Department Queue",
          message: `Joint Secretary approved project '${project.title}' (${project.projectCode}). Please designate a project officer.`,
          type: "INFO",
          actionUrl: `/assignments/gov-admin`,
        },
      });

      return {
        project: updatedProject,
        dncUserId,
        govAdminUserId: govAdminUser.id,
      };
    });
  }
}
