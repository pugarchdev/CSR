import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { Role } from "../types/role";
import { resolveUserPermission } from "./permissionService";
import { createInvitation } from "./invitationService";
import { dispatchNotification } from "./notificationOrchestrator";
import { getInstanceForEntity, transitionByStageName } from "./workflowEngineService";

export class AssignmentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const ENTITY_TYPES = ["CONVERGENCE_PROJECT", "CORPORATE_ENQUIRY", "GOVERNMENT_PITCH"] as const;
export type AssignmentEntityType = (typeof ENTITY_TYPES)[number];

/**
 * Resolve the district and display title for a workflow entity.
 */
export async function resolveEntityContext(entityType: string, entityId: string) {
  if (entityType === "CONVERGENCE_PROJECT") {
    const project = await prisma.convergenceProject.findUnique({
      where: { id: entityId },
      select: { id: true, projectId: true, title: true, district: true, corporateName: true, sector: true, status: true }
    });
    if (!project) throw new AssignmentError("Project not found", 404);
    return { district: project.district, title: project.title, reference: project.projectId, entity: project };
  }

  if (entityType === "CORPORATE_ENQUIRY") {
    const enquiry = await prisma.corporateEnquiry.findUnique({
      where: { id: entityId },
      select: {
        id: true, trackingId: true, companyName: true, sector: true, status: true, preferredDistricts: true,
        feasibilityAssessment: { select: { proposedLocationDistrict: true } }
      }
    });
    if (!enquiry) throw new AssignmentError("Enquiry not found", 404);
    const district = enquiry.feasibilityAssessment?.proposedLocationDistrict || enquiry.preferredDistricts[0];
    if (!district) throw new AssignmentError("Enquiry has no resolvable district", 422);
    return { district, title: `${enquiry.companyName} — ${enquiry.sector}`, reference: enquiry.trackingId, entity: enquiry };
  }

  if (entityType === "GOVERNMENT_PITCH") {
    const pitch = await prisma.governmentPitch.findUnique({
      where: { id: entityId },
      select: { id: true, pitchReferenceId: true, district: true, department: true, csrRequirement: true, status: true }
    });
    if (!pitch) throw new AssignmentError("Pitch not found", 404);
    return { district: pitch.district, title: pitch.csrRequirement.slice(0, 120), reference: pitch.pitchReferenceId, entity: pitch };
  }

  throw new AssignmentError(`Unsupported entity type: ${entityType}`, 400);
}

/**
 * Find the currently active CSR Nodal Officer for a district.
 * Primary source: DistrictNodalMapping. Legacy fallback: User.assignedDistrict.
 */
export async function findActiveNodalOfficer(district: string) {
  const mapping = await prisma.districtNodalMapping.findFirst({
    where: { district, isActive: true, user: { accountStatus: "ACTIVE" } },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });
  if (mapping) return mapping.user;

  // Legacy fallback — users mapped only via assignedDistrict string
  return prisma.user.findFirst({
    where: {
      accountStatus: "ACTIVE",
      assignedDistrict: district,
      roleRelation: { name: { contains: "Nodal", mode: "insensitive" } }
    },
    select: { id: true, email: true }
  });
}

/**
 * Validate that the assigner is allowed to assign for this entity's district.
 * SUPER_ADMIN and users holding project:approve (JS-level) bypass the
 * district check; everyone else must be mapped to the entity's district.
 */
async function validateAssignerDistrict(assignerId: string, assignerRole: string | null | undefined, district: string) {
  if (assignerRole === Role.SUPER_ADMIN) return;
  if (await resolveUserPermission(assignerId, "project:approve", { role: assignerRole })) return;

  const assigner = await prisma.user.findUnique({
    where: { id: assignerId },
    select: { assignedDistrict: true, nodalDistrictMappings: { where: { isActive: true }, select: { district: true } } }
  });
  const districts = new Set<string>([
    ...(assigner?.assignedDistrict ? [assigner.assignedDistrict] : []),
    ...(assigner?.nodalDistrictMappings.map((m) => m.district) || [])
  ]);
  if (!districts.has(district)) {
    throw new AssignmentError(`You are not authorized to assign officers for district "${district}"`, 403);
  }
}

/**
 * Validate that a role can be assigned: exists, active, and either GLOBAL
 * scope or matching the assigner's organization/company scope.
 */
async function validateAssignableRole(roleId: string, companyId?: string | null, organizationId?: string | null) {
  const role = await prisma.organizationRole.findUnique({ where: { id: roleId } });
  if (!role || role.status !== "ACTIVE") {
    throw new AssignmentError("Selected role does not exist or is inactive", 422);
  }
  if (role.name === "Super Admin" || role.isPermanent) {
    throw new AssignmentError("This role cannot be assigned through project assignment", 403);
  }
  const scopeOk =
    role.scope === "GLOBAL" ||
    (role.companyId && role.companyId === companyId) ||
    (role.organizationId && role.organizationId === organizationId);
  if (!scopeOk) {
    throw new AssignmentError("Selected role is outside your organization scope", 403);
  }
  return role;
}

export interface AssignExistingInput {
  entityType: AssignmentEntityType;
  entityId: string;
  assignedToId: string;
  assignedRoleId?: string | null;
  assignmentType?: string;
  remarks?: string | null;
  assignedById: string;
  assignerRole?: string | null;
  organizationId?: string | null;
  companyId?: string | null;
  ipAddress?: string;
}

/**
 * Option A — assign an EXISTING officer to a project.
 * Creates the ProjectAssignment, ensures the role mapping, audits, notifies,
 * and advances the workflow. No duplicate account is ever created.
 */
export async function assignExistingOfficer(input: AssignExistingInput) {
  const assignmentType = input.assignmentType || "FIELD_OFFICER";
  const context = await resolveEntityContext(input.entityType, input.entityId);

  await validateAssignerDistrict(input.assignedById, input.assignerRole, context.district);

  const target = await prisma.user.findUnique({
    where: { id: input.assignedToId },
    select: { id: true, email: true, accountStatus: true, officerProfile: { select: { fullName: true } } }
  });
  if (!target) throw new AssignmentError("Selected officer not found", 404);
  if (target.accountStatus !== "ACTIVE" && target.accountStatus !== "PENDING_ACTIVATION") {
    throw new AssignmentError("Selected officer's account is not active", 422);
  }

  let role = null;
  if (input.assignedRoleId) {
    role = await validateAssignableRole(input.assignedRoleId, input.companyId, input.organizationId);
  }

  const assignment = await prisma.$transaction(async (tx) => {
    // One active assignment of a given type per entity
    const duplicate = await tx.projectAssignment.findFirst({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        assignmentType,
        status: { in: ["ACTIVE", "PENDING_ACTIVATION"] }
      }
    });
    if (duplicate) {
      throw new AssignmentError(
        duplicate.assignedToId === input.assignedToId
          ? "This officer is already assigned to this project"
          : "This project already has an active assignment of this type",
        409
      );
    }

    const created = await tx.projectAssignment.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        assignmentType,
        assignedById: input.assignedById,
        assignedToId: input.assignedToId,
        assignedRoleId: input.assignedRoleId || null,
        status: target.accountStatus === "PENDING_ACTIVATION" ? "PENDING_ACTIVATION" : "ACTIVE",
        remarks: input.remarks || null,
        companyId: input.companyId || null
      }
    });

    if (input.assignedRoleId) {
      // Idempotent role mapping through existing RBAC join table
      const existingMapping = await tx.userOrganizationRole.findFirst({
        where: { userId: input.assignedToId, roleId: input.assignedRoleId, organizationId: input.organizationId || null }
      });
      if (!existingMapping) {
        await tx.userOrganizationRole.create({
          data: {
            userId: input.assignedToId,
            roleId: input.assignedRoleId,
            organizationId: input.organizationId || null,
            companyId: input.companyId || null
          }
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: input.assignedById,
        actorUserId: input.assignedById,
        actorRole: input.assignerRole || null,
        action: "OFFICER_ASSIGNED",
        entityType: input.entityType,
        entityId: input.entityId,
        details: {
          assignmentId: created.id,
          assignmentType,
          assignedTo: target.email,
          roleId: input.assignedRoleId || null,
          roleName: role?.name || null,
          district: context.district,
          workflowStage: "FIELD_OFFICER_ASSIGNMENT"
        },
        newValueJson: { assignedToId: input.assignedToId, status: created.status },
        ipAddress: input.ipAddress || null
      }
    });

    return created;
  });

  // Advance workflow FIELD_OFFICER_ASSIGNMENT -> EXECUTION (non-fatal)
  try {
    const instance = await getInstanceForEntity(input.entityId, input.entityType);
    if (instance && instance.currentStage.name === "FIELD_OFFICER_ASSIGNMENT") {
      await transitionByStageName(instance.id, "EXECUTION", input.assignedById, "Field officer assigned");
    }
  } catch (error) {
    console.error("[Assignment] Workflow transition failed (non-fatal):", error);
  }

  // Notify officer (CC nodal officer) + confirmation — through central queue
  await dispatchNotification({
    recipientId: input.assignedToId,
    templateName: "FIELD_OFFICER_ASSIGNED",
    variables: {
      recipientName: target.officerProfile?.fullName || target.email,
      projectName: context.title,
      reference: context.reference,
      district: context.district,
      roleName: role?.name || "Field Officer"
    },
    actionButtonUrl: `${FRONTEND_URL}/dashboard`,
    ccRecipientIds: [input.assignedById],
    correlationId: assignment.id,
    notificationType: "PROJECT_ASSIGNMENT"
  }).catch((error) => console.error("[Assignment] Notification dispatch failed:", error));

  return { assignment, officer: target, context };
}

export interface CreateOfficerInput {
  fullName: string;
  email: string;
  mobile: string;
  designation: string;
  department: string;
  employeeId?: string | null;
  officeAddress?: string | null;
  district: string;
  taluka?: string | null;
  block?: string | null;
  office?: string | null;
  remarks?: string | null;
  roleId: string;
  entityType: AssignmentEntityType;
  entityId: string;
  assignedById: string;
  assignerRole?: string | null;
  organizationId?: string | null;
  companyId?: string | null;
  ipAddress?: string;
}

/**
 * Option B — create a NEW officer and assign the project.
 * Creates user (PENDING_ACTIVATION, unusable random password), officer
 * profile, RBAC role mapping, assignment, and secure invitation — all in one
 * transaction. Activation email carries the single-use expiring link; no
 * password is ever emailed.
 */
export async function createAndAssignNewOfficer(input: CreateOfficerInput) {
  const context = await resolveEntityContext(input.entityType, input.entityId);
  await validateAssignerDistrict(input.assignedById, input.assignerRole, context.district);
  const role = await validateAssignableRole(input.roleId, input.companyId, input.organizationId);

  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AssignmentError(
      "A user with this email already exists. Use 'Assign Existing Officer' instead.",
      409
    );
  }

  const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  const { user, assignment, rawToken, activationUrl, invitation } = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.projectAssignment.findFirst({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        assignmentType: "FIELD_OFFICER",
        status: { in: ["ACTIVE", "PENDING_ACTIVATION"] }
      }
    });
    if (duplicate) {
      throw new AssignmentError("This project already has an active field officer assignment", 409);
    }

    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash: placeholderHash,
        role: null,
        roleId: input.roleId,
        accountStatus: "PENDING_ACTIVATION",
        isVerified: false,
        organizationId: input.organizationId || null,
        companyId: input.companyId || null,
        assignedDistrict: input.district // legacy dual-write; DistrictNodalMapping/officerProfile are the new sources
      }
    });

    await tx.userOfficerProfile.create({
      data: {
        userId: createdUser.id,
        fullName: input.fullName,
        mobile: input.mobile,
        employeeId: input.employeeId || null,
        designation: input.designation,
        department: input.department,
        officeAddress: input.officeAddress || null,
        district: input.district,
        taluka: input.taluka || null,
        block: input.block || null,
        office: input.office || null,
        remarks: input.remarks || null
      }
    });

    await tx.userOrganizationRole.create({
      data: {
        userId: createdUser.id,
        roleId: input.roleId,
        organizationId: input.organizationId || null,
        companyId: input.companyId || null
      }
    });

    const createdAssignment = await tx.projectAssignment.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        assignmentType: "FIELD_OFFICER",
        assignedById: input.assignedById,
        assignedToId: createdUser.id,
        assignedRoleId: input.roleId,
        status: "PENDING_ACTIVATION",
        remarks: input.remarks || null,
        companyId: input.companyId || null
      }
    });

    const inv = await createInvitation({
      userId: createdUser.id,
      email,
      mobile: input.mobile,
      createdById: input.assignedById,
      companyId: input.companyId,
      tx
    });

    await tx.auditLog.createMany({
      data: [
        {
          userId: input.assignedById,
          actorUserId: input.assignedById,
          actorRole: input.assignerRole || null,
          action: "OFFICER_CREATED",
          entityType: "User",
          entityId: createdUser.id,
          details: {
            email, fullName: input.fullName, designation: input.designation,
            department: input.department, district: input.district,
            roleId: input.roleId, roleName: role.name,
            workflowStage: "FIELD_OFFICER_ASSIGNMENT"
          },
          newValueJson: { accountStatus: "PENDING_ACTIVATION" },
          ipAddress: input.ipAddress || null
        },
        {
          userId: input.assignedById,
          actorUserId: input.assignedById,
          actorRole: input.assignerRole || null,
          action: "OFFICER_ASSIGNED",
          entityType: input.entityType,
          entityId: input.entityId,
          details: {
            assignmentId: createdAssignment.id,
            assignedTo: email,
            district: context.district,
            workflowStage: "FIELD_OFFICER_ASSIGNMENT"
          },
          ipAddress: input.ipAddress || null
        },
        {
          userId: input.assignedById,
          actorUserId: input.assignedById,
          actorRole: input.assignerRole || null,
          action: "INVITATION_SENT",
          entityType: "UserInvitation",
          entityId: inv.invitation.id,
          details: { email, expiresAt: inv.invitation.expiresAt, workflowStage: "FIELD_OFFICER_ASSIGNMENT" },
          ipAddress: input.ipAddress || null
        }
      ]
    });

    return {
      user: createdUser,
      assignment: createdAssignment,
      rawToken: inv.rawToken,
      activationUrl: inv.activationUrl,
      invitation: inv.invitation
    };
  });

  // Advance workflow now that an assignment exists; officer activation is
  // tracked separately via ProjectAssignment.status (PENDING_ACTIVATION -> ACTIVE).
  try {
    const instance = await getInstanceForEntity(input.entityId, input.entityType);
    if (instance && instance.currentStage.name === "FIELD_OFFICER_ASSIGNMENT") {
      await transitionByStageName(instance.id, "EXECUTION", input.assignedById, "Field officer created and assigned (pending activation)");
    }
  } catch (error) {
    console.error("[Assignment] Workflow transition failed (non-fatal):", error);
  }

  await dispatchNotification({
    recipientId: user.id,
    templateName: "OFFICER_INVITATION",
    variables: {
      fullName: input.fullName,
      projectName: context.title,
      reference: context.reference,
      district: context.district,
      roleName: role.name,
      expiresInHours: process.env.INVITATION_TTL_HOURS || "72",
      mobile: input.mobile
    },
    actionButtonUrl: activationUrl,
    ccRecipientIds: [input.assignedById],
    correlationId: assignment.id,
    notificationType: "PROJECT_ASSIGNMENT_NEW_OFFICER"
  }).catch((error) => console.error("[Assignment] Notification dispatch failed:", error));

  return { user, assignment, invitation, context, roleName: role.name };
}

/**
 * Searchable officer lookup: name / email / mobile / employee ID /
 * department / designation.
 */
export async function searchOfficers(params: { q?: string; district?: string; limit?: number }) {
  const q = params.q?.trim();
  const take = Math.min(params.limit || 20, 50);

  return prisma.user.findMany({
    where: {
      accountStatus: { in: ["ACTIVE", "PENDING_ACTIVATION"] },
      // Exclude corporate/NGO logins — officers are government-side users
      ngoId: null,
      companyId: null,
      ...(params.district
        ? { OR: [{ assignedDistrict: params.district }, { officerProfile: { district: params.district } }] }
        : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { officerProfile: { fullName: { contains: q, mode: "insensitive" } } },
              { officerProfile: { mobile: { contains: q } } },
              { officerProfile: { employeeId: { contains: q, mode: "insensitive" } } },
              { officerProfile: { department: { contains: q, mode: "insensitive" } } },
              { officerProfile: { designation: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    select: {
      id: true,
      email: true,
      accountStatus: true,
      assignedDistrict: true,
      roleRelation: { select: { id: true, name: true } },
      officerProfile: {
        select: {
          fullName: true, mobile: true, employeeId: true, designation: true,
          department: true, district: true, taluka: true
        }
      }
    },
    take,
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Dynamic role dropdown: all ACTIVE, non-permanent roles visible in the
 * caller's scope. No role names are hardcoded anywhere.
 */
export async function getAssignableRoles(params: { organizationId?: string | null; companyId?: string | null }) {
  return prisma.organizationRole.findMany({
    where: {
      status: "ACTIVE",
      isPermanent: false,
      OR: [
        { scope: "GLOBAL" },
        ...(params.organizationId ? [{ organizationId: params.organizationId }] : []),
        ...(params.companyId ? [{ companyId: params.companyId }] : [])
      ]
    },
    select: {
      id: true, name: true, description: true, scope: true, category: true,
      _count: { select: { rolePermissions: true } }
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
  });
}
