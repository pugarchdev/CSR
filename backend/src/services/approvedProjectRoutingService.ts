import prisma from "../config/db";
import { randomUUID } from "crypto";
import { ROLE_ID } from "../types/role";
import { dispatchNotification, dispatchToContact } from "./notificationOrchestrator";

type ApprovedProjectInput = {
  assessmentId: string;
  actorUserId: string;
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

  const districts = [...new Set(assessment.targetDistricts.map((district) => district.trim()).filter(Boolean))];
  if (!assessment.targetDepartmentId || districts.length === 0) {
    throw new Error("A target Government Department and at least one target district are required before approval.");
  }

  const existing = await prisma.project.findUnique({
    where: { approvalSourceEnquiryId: assessment.enquiryId },
    include: { districtDncAssignments: true }
  });
  if (existing) return { project: existing, created: false, dncAssignments: existing.districtDncAssignments };

  const [enquiry, department, dncMappings, departmentAdmin] = await Promise.all([
    prisma.corporateEnquiry.findUnique({ where: { id: assessment.enquiryId } }),
    prisma.organization.findFirst({
      where: { id: assessment.targetDepartmentId, kind: "GOVERNMENT_DEPARTMENT", status: "ACTIVE" },
      select: { id: true, name: true }
    }),
    prisma.districtDncAssignment.findMany({
      where: { district: { in: districts }, isActive: true, dncUser: { roleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT, accountStatus: "ACTIVE", isVerified: true } },
      include: { dncUser: { select: { id: true, email: true } } }
    }),
    prisma.user.findFirst({
      where: { organizationId: assessment.targetDepartmentId, roleId: ROLE_ID.GOVERNMENT_OFFICER, accountStatus: "ACTIVE", isVerified: true },
      select: { id: true, email: true }
    })
  ]);

  if (!enquiry) throw new Error("Corporate enquiry not found");
  if (!department) throw new Error("The selected Government Department is not Super-Admin approved.");
  const dncByDistrict = new Map(dncMappings.map((mapping) => [mapping.district, mapping]));
  const unmappedDistricts = districts.filter((district) => !dncByDistrict.has(district));
  if (unmappedDistricts.length) {
    throw new Error(`No active DNC is configured for: ${unmappedDistricts.join(", ")}. Configure the district before approving.`);
  }
  if (!departmentAdmin) throw new Error("The selected Government Department has no active Department Admin.");

  const firstDistrict = districts[0];
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
        corporatePartnerId: enquiry.organizationId,
        approvalSourceEnquiryId: enquiry.id,
        status: "APPROVED"
      }
    });

    await tx.projectDistrictDncAssignment.createMany({
      data: districts.map((district) => ({
        projectId: created.id,
        district,
        dncUserId: dncByDistrict.get(district)!.dncUserId,
        assignedById: input.actorUserId,
        status: "ACTIVE"
      }))
    });

    await tx.projectAssignment.createMany({
      data: [
        ...districts.map((district) => ({
          entityType: "PROJECT",
          entityId: created.id,
          assignmentType: "DISTRICT_NODAL_CONSULTANT",
          assignedById: input.actorUserId,
          assignedToId: dncByDistrict.get(district)!.dncUserId,
          assignedRoleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT,
          status: "ACTIVE"
        })),
        {
          entityType: "PROJECT",
          entityId: created.id,
          assignmentType: "GOVERNMENT_DEPARTMENT_ADMIN",
          assignedById: input.actorUserId,
          assignedToId: departmentAdmin.id,
          assignedRoleId: ROLE_ID.GOVERNMENT_OFFICER,
          status: "ACTIVE"
        }
      ]
    });

    await tx.corporateEnquiry.update({ where: { id: enquiry.id }, data: { status: "JS_APPROVED" } });
    return created;
  });

  const dncUserIds = dncMappings.map((mapping) => mapping.dncUserId);
  await Promise.all([
    ...dncUserIds.map((recipientId) => dispatchNotification({
      recipientId,
      templateName: "PROJECT_DNC_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Project assigned", message: `${project.projectCode} requires district coordination.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DNC_ASSIGNED"
    })),
    dispatchNotification({
      recipientId: departmentAdmin.id,
      templateName: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Assign DNOs", message: `${project.projectCode} is assigned to your department. Assign one or more DNOs.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED"
    }),
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
  ]);

  return { project, created: true, dncAssignments: dncMappings.map(({ district, dncUserId }) => ({ district, dncUserId })), departmentAdminId: departmentAdmin.id };
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
      select: { id: true, name: true }
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
  if (!dncMapping) throw new Error(`No active DNC is configured for district '${district}'. Please configure the district DNC first.`);
  if (!departmentAdmin) throw new Error("The target government department has no active Department Admin.");
  if (!corporateOrg) throw new Error("The expressing corporate partner is not Super-Admin approved (ACTIVE status required).");

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
        dncUserId: dncMapping.dncUserId,
        nodalOfficerUserId: activeDno?.userId || null,
        departmentAssignmentStatus: "CONFIRMED",
        corporatePartnerId: corporateOrg.id,
        approvalSourceEnquiryId: pitch.id,
        status: "APPROVED"
      }
    });

    await tx.projectDistrictDncAssignment.create({
      data: {
        projectId: created.id,
        district: district,
        dncUserId: dncMapping.dncUserId,
        assignedById: input.actorUserId,
        status: "ACTIVE"
      }
    });

    await tx.projectAssignment.createMany({
      data: [
        {
          entityType: "PROJECT",
          entityId: created.id,
          assignmentType: "DISTRICT_NODAL_CONSULTANT",
          assignedById: input.actorUserId,
          assignedToId: dncMapping.dncUserId,
          assignedRoleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT,
          status: "ACTIVE"
        },
        {
          entityType: "PROJECT",
          entityId: created.id,
          assignmentType: "GOVERNMENT_DEPARTMENT_ADMIN",
          assignedById: input.actorUserId,
          assignedToId: departmentAdmin.id,
          assignedRoleId: ROLE_ID.GOVERNMENT_OFFICER,
          status: "ACTIVE"
        },
        ...(activeDno && activeDno.userId ? [{
          entityType: "PROJECT",
          entityId: created.id,
          assignmentType: "DISTRICT_NODAL_OFFICER",
          assignedById: input.actorUserId,
          assignedToId: activeDno.userId,
          assignedRoleId: ROLE_ID.DISTRICT_NODAL_OFFICER,
          status: "ACTIVE"
        }] : [])
      ]
    });

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

  await Promise.all([
    dispatchNotification({
      recipientId: dncMapping.dncUserId,
      templateName: "PROJECT_DNC_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Pitch Project assigned", message: `Project ${project.projectCode} from pitch ${pitch.pitchReferenceId} is assigned to your district.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DNC_ASSIGNED"
    }),
    dispatchNotification({
      recipientId: departmentAdmin.id,
      templateName: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
      variables: { title: "Assign DNOs for Pitch Project", message: `Pitch project ${project.projectCode} assigned to your department. Assign DNO for execution.`, currentStatus: project.status },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_DEPARTMENT_ADMIN_ASSIGNED"
    })
  ]);

  return { project, created: true, dncUserId: dncMapping.dncUserId, departmentAdminId: departmentAdmin.id };
}

