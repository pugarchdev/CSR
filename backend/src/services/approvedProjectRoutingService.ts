import prisma from "../config/db";
import { randomUUID } from "crypto";
import { ROLE_ID } from "../types/role";
import { dispatchNotification, dispatchToContact } from "./notificationOrchestrator";

type ApprovedProjectInput = {
  assessmentId: string;
  actorUserId: string;
  targetDepartmentId?: string;
  targetDistrict?: string;
};

const projectCode = () => `PRJ-MH-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

/**
 * Creates the single approved project for an enquiry and routes it to every
 * target district's DNC plus the target Government Department Admin.  The
 * database constraints make duplicate JS submissions idempotent.
 */
export async function routeApprovedCorporateEnquiry(input: ApprovedProjectInput) {
  const assessment = await prisma.feasibilityAssessment.findUnique({ where: { id: input.assessmentId } });
  if (!assessment) throw new Error("Feasibility assessment not found");
  if (!assessment.enquiryId) throw new Error("Corporate enquiry linkage is required for this legacy routing path");

  const targetDeptId = input.targetDepartmentId || assessment.targetDepartmentId;
  const rawDistricts = input.targetDistrict
    ? [input.targetDistrict, ...assessment.targetDistricts]
    : assessment.targetDistricts;
  const districts = [...new Set(rawDistricts.map((district) => district?.trim()).filter(Boolean))];

  if (!targetDeptId || districts.length === 0) {
    throw new Error("A target Government Department and at least one target district are required before approval.");
  }

  // Update assessment if JS updated target department or district during decision
  if (input.targetDepartmentId || input.targetDistrict) {
    await prisma.feasibilityAssessment.update({
      where: { id: assessment.id },
      data: {
        ...(input.targetDepartmentId ? { targetDepartmentId: input.targetDepartmentId } : {}),
        ...(districts.length > 0 ? { targetDistricts: districts } : {})
      }
    });
  }

  const existing = await prisma.project.findUnique({
    where: { approvalSourceEnquiryId: assessment.enquiryId },
    include: { districtDncAssignments: true }
  });
  if (existing) return { project: existing, created: false, dncAssignments: existing.districtDncAssignments };

  const [enquiry, department, dncMappings, departmentAdmin] = await Promise.all([
    prisma.corporateEnquiry.findUnique({ where: { id: assessment.enquiryId } }),
    prisma.organization.findFirst({
      where: { id: targetDeptId, kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" },
      select: { id: true, name: true, parentOrganizationId: true }
    }),
    prisma.districtDncAssignment.findMany({
      where: { district: { in: districts }, isActive: true, dncUser: { roleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT, accountStatus: "ACTIVE", isVerified: true } },
      include: { dncUser: { select: { id: true, email: true } } }
    }),
    prisma.user.findFirst({
      where: {
        organizationId: targetDeptId,
        accountStatus: "ACTIVE",
        isVerified: true
      },
      select: { id: true, email: true }
    })
  ]);

  if (!enquiry) throw new Error("Corporate enquiry not found");
  if (!department) throw new Error("The selected Government Department is not Super-Admin approved.");

  const dncByDistrict = new Map(dncMappings.map((mapping) => [mapping.district, mapping]));
  // DNC can be created or assigned later by JS, Collector, Commissioner, or CEO - do not block approval

  // Fallback for department admin if not specifically assigned to this department yet
  const resolvedDeptAdmin = departmentAdmin || await prisma.user.findFirst({
    where: {
      OR: [
        { roleId: ROLE_ID.GOVERNMENT_OFFICER },
        { roleId: ROLE_ID.SUPER_ADMIN }
      ],
      accountStatus: "ACTIVE"
    },
    select: { id: true, email: true }
  });

  const firstDistrict = districts[0] || "Maharashtra";
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        projectCode: projectCode(),
        type: "CONVERGENCE_FRAMEWORK",
        title: `${enquiry.corporateName} CSR convergence project`,
        description: enquiry.proposedCSRWork || `CSR convergence project initiated from enquiry ${enquiry.trackingId}.`,
        sector: enquiry.sector || "General CSR",
        district: firstDistrict,
        taluka: enquiry.preferredTalukas[0] || "To be confirmed",
        approvedBudget: enquiry.indicativeBudget || 0,
        organizationId: department.id,
        parentOrganizationId: department.parentOrganizationId || department.id,
        departmentOrganizationId: department.id,
        dncUserId: dncMappings[0]?.dncUserId || null,
        corporatePartnerId: enquiry.organizationId,
        approvalSourceEnquiryId: enquiry.id,
        status: "APPROVED"
      }
    });

    const validDncAssignments = districts
      .filter((district) => dncByDistrict.has(district))
      .map((district) => ({
        projectId: created.id,
        district,
        dncUserId: dncByDistrict.get(district)!.dncUserId,
        assignedById: input.actorUserId,
        status: "ACTIVE"
      }));

    if (validDncAssignments.length > 0) {
      await tx.projectDistrictDncAssignment.createMany({
        data: validDncAssignments
      });
    }

    const projectAssignments: any[] = [];
    districts.forEach((district) => {
      const dnc = dncByDistrict.get(district);
      if (dnc?.dncUserId) {
        projectAssignments.push({
          entityType: "PROJECT",
          entityId: created.id,
          assignmentType: "DISTRICT_NODAL_CONSULTANT",
          assignedById: input.actorUserId,
          assignedToId: dnc.dncUserId,
          assignedRoleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT,
          status: "ACTIVE"
        });
      }
    });

    if (resolvedDeptAdmin?.id) {
      projectAssignments.push({
        entityType: "PROJECT",
        entityId: created.id,
        assignmentType: "GOVERNMENT_DEPARTMENT_ADMIN",
        assignedById: input.actorUserId,
        assignedToId: resolvedDeptAdmin.id,
        assignedRoleId: ROLE_ID.GOVERNMENT_OFFICER,
        status: "ACTIVE"
      });
    }

    if (projectAssignments.length > 0) {
      await tx.projectAssignment.createMany({
        data: projectAssignments
      });
    }

    await tx.corporateEnquiry.update({ where: { id: enquiry.id }, data: { status: "JS_APPROVED" } });
    return created;
  });

  const dncUserIds = dncMappings.map((mapping) => mapping.dncUserId);
  const notifications: Promise<any>[] = [
    ...dncUserIds.map((recipientId) => dispatchNotification({
      recipientId,
      templateName: "PROJECT_DNC_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Project assigned", message: `${project.projectCode} requires district coordination.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DNC_ASSIGNED"
    })),
    dispatchToContact({
      referenceId: enquiry.trackingId || enquiry.id,
      email: enquiry.contactEmail,
      phone: enquiry.mobile,
      title: "Joint Secretary decision recorded",
      message: `Your application ${enquiry.trackingId || enquiry.id} has been approved. Project ${project.projectCode} is being routed for district execution.`,
      trackingId: enquiry.trackingId || undefined,
      currentStatus: "JS_APPROVED",
      actionButtonUrl: `/track?trackingId=${encodeURIComponent(enquiry.trackingId || enquiry.id)}`,
      correlationId: project.id,
      notificationType: "JS_DECISION"
    })
  ];

  if (resolvedDeptAdmin?.id) {
    notifications.push(dispatchNotification({
      recipientId: resolvedDeptAdmin.id,
      templateName: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Assign DNOs", message: `${project.projectCode} is assigned to your department. Assign one or more DNOs.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED"
    }));
  }

  await Promise.all(notifications);

  return { project, created: true, dncAssignments: dncMappings.map(({ district, dncUserId }) => ({ district, dncUserId })), departmentAdminId: resolvedDeptAdmin?.id || null };
}

export async function routeApprovedGovernmentPitch(input: { pitchId: string; interestId?: string; corporateId?: string; actorUserId: string }) {
  const pitch = await prisma.governmentPitch.findUnique({ where: { id: input.pitchId } });
  if (!pitch) throw new Error("Government pitch not found");

  const district = (pitch.districts?.[0] || (pitch as any).district || "Pune").trim();

  let corporateId = input.corporateId;
  let interest = null;
  if (input.interestId) {
    interest = await prisma.corporatePitchInterest.findUnique({ where: { id: input.interestId } });
    if (interest) corporateId = interest.corporateId;
  } else if (!corporateId) {
    interest = await prisma.corporatePitchInterest.findFirst({ where: { pitchId: pitch.id, status: "INTERESTED" }, orderBy: { createdAt: "asc" } });
    if (interest) corporateId = interest.corporateId;
  }

  if (!corporateId) throw new Error("No expressed corporate interest found for this pitch.");

  const targetDeptId = pitch.departmentId || (pitch as any).organizationId;

  const [department, dncMapping, departmentAdmin, corporateOrg] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        OR: [
          { id: targetDeptId || "NO_DEPT_ID" },
          { kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" }
        ]
      },
      select: { id: true, name: true, parentOrganizationId: true }
    }),
    prisma.districtDncAssignment.findFirst({
      where: { district: { equals: district, mode: "insensitive" }, isActive: true, dncUser: { roleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT, accountStatus: "ACTIVE", isVerified: true } },
      include: { dncUser: { select: { id: true, email: true } } }
    }),
    prisma.user.findFirst({
      where: {
        OR: [
          { organizationId: targetDeptId || "NO_DEPT_ID" },
          { roleId: ROLE_ID.GOVERNMENT_OFFICER }
        ],
        accountStatus: "ACTIVE",
        isVerified: true
      },
      select: { id: true, email: true }
    }),
    prisma.organization.findFirst({
      where: { id: corporateId, status: "ACTIVE" },
      select: { id: true, name: true }
    })
  ]);

  if (!department) throw new Error("The government department associated with this pitch is not active.");
  if (!corporateOrg) throw new Error("The expressing corporate partner is not Super-Admin approved (ACTIVE status required).");

  const resolvedDeptAdmin = departmentAdmin || await prisma.user.findFirst({
    where: {
      OR: [
        { roleId: ROLE_ID.GOVERNMENT_OFFICER },
        { roleId: ROLE_ID.SUPER_ADMIN }
      ],
      accountStatus: "ACTIVE"
    },
    select: { id: true, email: true }
  });

  const existingProject = await prisma.project.findFirst({
    where: { OR: [{ approvalSourceEnquiryId: pitch.id }, { title: { contains: pitch.pitchReferenceId || pitch.id } }] }
  });
  if (existingProject) return { project: existingProject, created: false };

  const project = await prisma.$transaction(async (tx) => {
    // Resolve parent organization and active DNO for department
    const targetDeptOrg = await tx.organization.findUnique({
      where: { id: department.id },
      select: { id: true, parentOrganizationId: true, dnoAuthority: true }
    });
    const parentOrgId = targetDeptOrg?.parentOrganizationId || department.id;

    const activeDno = await tx.dnoNomination.findFirst({
      where: {
        OR: [
          { departmentOrganizationId: department.id },
          { organizationId: department.id }
        ],
        status: "ACTIVE"
      },
      select: { id: true, userId: true }
    });

    const created = await tx.project.create({
      data: {
        projectCode: projectCode(),
        type: "CONVERGENCE_FRAMEWORK",
        title: `${pitch.csrRequirement ? pitch.csrRequirement.slice(0, 80) : "Govt Pitch"} - ${corporateOrg.name}`,
        description: pitch.csrRequirement || `Project created from government pitch ${pitch.pitchReferenceId}.`,
        sector: "General CSR",
        district: district,
        taluka: pitch.talukas?.[0] || "To be confirmed",
        approvedBudget: pitch.estimatedCost || pitch.budget || 0,
        organizationId: department.id,
        parentOrganizationId: parentOrgId,
        departmentOrganizationId: department.id,
        dncUserId: dncMapping?.dncUserId || null,
        nodalOfficerUserId: activeDno?.userId || null,
        departmentAssignmentStatus: "CONFIRMED",
        corporatePartnerId: corporateOrg.id,
        approvalSourceEnquiryId: pitch.id,
        status: "APPROVED"
      }
    });

    if (dncMapping?.dncUserId) {
      await tx.projectDistrictDncAssignment.create({
        data: {
          projectId: created.id,
          district: district,
          dncUserId: dncMapping.dncUserId,
          assignedById: input.actorUserId,
          status: "ACTIVE"
        }
      });
    }

    const assignments: any[] = [];
    if (dncMapping?.dncUserId) {
      assignments.push({
        entityType: "PROJECT",
        entityId: created.id,
        assignmentType: "DISTRICT_NODAL_CONSULTANT",
        assignedById: input.actorUserId,
        assignedToId: dncMapping.dncUserId,
        assignedRoleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT,
        status: "ACTIVE"
      });
    }
    if (resolvedDeptAdmin?.id) {
      assignments.push({
        entityType: "PROJECT",
        entityId: created.id,
        assignmentType: "GOVERNMENT_DEPARTMENT_ADMIN",
        assignedById: input.actorUserId,
        assignedToId: resolvedDeptAdmin.id,
        assignedRoleId: ROLE_ID.GOVERNMENT_OFFICER,
        status: "ACTIVE"
      });
    }
    if (activeDno && activeDno.userId) {
      assignments.push({
        entityType: "PROJECT",
        entityId: created.id,
        assignmentType: "DISTRICT_NODAL_OFFICER",
        assignedById: input.actorUserId,
        assignedToId: activeDno.userId,
        assignedRoleId: ROLE_ID.DISTRICT_NODAL_OFFICER,
        status: "ACTIVE"
      });
    }

    if (assignments.length > 0) {
      await tx.projectAssignment.createMany({
        data: assignments
      });
    }

    await tx.governmentPitch.update({
      where: { id: pitch.id },
      data: { status: "ALLOCATED" }
    });

    if (interest) {
      await tx.corporatePitchInterest.update({
        where: { id: interest.id },
        data: { status: "APPROVED" }
      });
    }

    return created;
  });

  const notifications: Promise<any>[] = [];
  if (dncMapping?.dncUserId) {
    notifications.push(dispatchNotification({
      recipientId: dncMapping.dncUserId,
      templateName: "PROJECT_DNC_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Pitch Project assigned", message: `Project ${project.projectCode} from pitch ${pitch.pitchReferenceId} is assigned to your district.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DNC_ASSIGNED"
    }));
  }
  if (resolvedDeptAdmin?.id) {
    notifications.push(dispatchNotification({
      recipientId: resolvedDeptAdmin.id,
      templateName: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Assign DNOs for Pitch Project", message: `Pitch project ${project.projectCode} assigned to your department. Assign DNO for execution.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED"
    }));
  }

  if (notifications.length > 0) {
    await Promise.all(notifications);
  }

  return { project, created: true, dncUserId: dncMapping?.dncUserId || null, departmentAdminId: resolvedDeptAdmin?.id || null };
}

