import { CorporateEnquiryStatus, GovernmentPitchStatus, Prisma } from "@prisma/client";
import prisma from "../config/db";
import { generateProjectTrackingId } from "./trackingIdService";

type OnboardInput = {
  assessmentId: string;
  actorUserId?: string;
};

type OnboardResult = {
  status: "CREATED" | "EXISTING" | "WAITING_FOR_CORPORATE_INTEREST";
  project?: unknown;
  mou?: unknown;
};

const firstWords = (value: string | null | undefined, fallback: string, maxLength = 120) => {
  const text = (value || "").trim().replace(/\s+/g, " ");
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
};

const generateMouReferenceId = async () => {
  const year = new Date().getFullYear();
  const prefix = `MOU-MH-${year}-`;
  const lastMou = await prisma.standardMou.findFirst({
    where: { mouReferenceId: { startsWith: prefix } },
    orderBy: { mouReferenceId: "desc" },
    select: { mouReferenceId: true },
  });

  const lastSequence = lastMou?.mouReferenceId.split("-").at(-1);
  const nextSequence = lastSequence && !Number.isNaN(Number(lastSequence))
    ? Number(lastSequence) + 1
    : 1;

  return `${prefix}${String(nextSequence).padStart(6, "0")}`;
};

const buildDefaultMilestones = (sourceTitle: string) => [
  {
    name: "Mobilization and Planning",
    description: `Finalize scope, site readiness, implementation plan, and kickoff for ${sourceTitle}.`,
    workType: "SOFT_COMPONENT",
    geoTaggedPhotoUrls: [],
  },
  {
    name: "Implementation Progress",
    description: "Record physical execution progress, fund utilization, and field evidence.",
    workType: "CONSTRUCTION",
    geoTaggedPhotoUrls: [],
  },
  {
    name: "Completion and Handover",
    description: "Complete deliverables, upload UC evidence, and support nodal verification and handover.",
    workType: "SOFT_COMPONENT",
    geoTaggedPhotoUrls: [],
  },
];

export async function onboardApprovedAssessmentToProject(input: OnboardInput): Promise<OnboardResult> {
  const assessment = await prisma.feasibilityAssessment.findUnique({
    where: { id: input.assessmentId },
    include: {
      corporateEnquiry: true,
      governmentPitch: {
        include: {
          interests: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      nodalOfficerAppointment: {
        include: {
          nodalOfficerUser: { select: { id: true, email: true } },
        },
      },
    },
  });

  if (!assessment || !assessment.nodalOfficerAppointment || !assessment.jsDecisionAt) {
    return { status: "WAITING_FOR_CORPORATE_INTEREST" };
  }

  const existingProject = await prisma.convergenceProject.findFirst({
    where: {
      OR: [
        assessment.corporateEnquiryId ? { corporateEnquiryId: assessment.corporateEnquiryId } : undefined,
        assessment.governmentPitchId ? { governmentPitchId: assessment.governmentPitchId } : undefined,
      ].filter(Boolean) as Prisma.ConvergenceProjectWhereInput[],
    },
    include: { mou: true, milestones: true },
  });

  if (existingProject) {
    return { status: "EXISTING", project: existingProject, mou: existingProject.mou };
  }

  const corporateInterest = assessment.governmentPitch?.interests[0];
  if (assessment.governmentPitch && !corporateInterest) {
    return { status: "WAITING_FOR_CORPORATE_INTEREST" };
  }

  const tenantId = assessment.tenantId;
  const appointment = assessment.nodalOfficerAppointment;
  const sourceTitle = assessment.corporateEnquiry
    ? firstWords(assessment.corporateEnquiry.proposedCsrWork, `${assessment.corporateEnquiry.companyName} CSR Project`)
    : firstWords(assessment.governmentPitch?.csrRequirement, "Government Development Need");

  const district = assessment.governmentPitch?.district || appointment.district || assessment.proposedLocationDistrict;
  const taluka = assessment.governmentPitch?.taluka || "To be finalized";
  const location = assessment.governmentPitch?.exactLocation || district;
  const corporateName = assessment.corporateEnquiry?.companyName || corporateInterest?.companyName || assessment.companyName;
  const cin = assessment.corporateEnquiry?.mca21Cin || corporateInterest?.mca21Cin || assessment.cin || "N/A";
  const approvedBudget = assessment.governmentPitch?.estimatedCost || corporateInterest?.indicativeBudget || assessment.indicativeBudget;
  const implementationMode = corporateInterest?.implementationMode || "NGO_PARTNER";
  const projectId = await generateProjectTrackingId();
  const mouReferenceId = await generateMouReferenceId();
  const milestones = buildDefaultMilestones(sourceTitle);

  const result = await prisma.$transaction(async (tx) => {
    const mou = await tx.standardMou.create({
      data: {
        tenantId,
        mouReferenceId,
        corporateEnquiryId: assessment.corporateEnquiryId,
        governmentPitchId: assessment.governmentPitchId,
        districtDepartmentName: appointment.department,
        nodalOfficerName: appointment.nodalOfficerName,
        corporateName,
        cin,
        projectTitle: sourceTitle,
        projectDescription: assessment.developmentNeedAddressed,
        scheduleVIIClause: "To be confirmed during MoU review",
        projectLocation: location,
        deliverables: milestones.map((milestone) => ({
          name: milestone.name,
          description: milestone.description,
          workType: milestone.workType,
        })),
        timelineMonths: 12,
        financialContribution: approvedBudget,
        governmentContribution: null,
        implementationMode,
        implementingAgencyName: implementationMode === "SELF" ? corporateName : "To be finalized",
        ownershipAfterCompletion: "Government / local body after handover",
        maintenanceResponsibility: "Concerned department / local body",
        status: "DRAFT",
      },
    });

    const project = await tx.convergenceProject.create({
      data: {
        tenantId,
        projectId,
        corporateEnquiryId: assessment.corporateEnquiryId,
        governmentPitchId: assessment.governmentPitchId,
        mouId: mou.id,
        title: sourceTitle,
        district,
        taluka,
        location,
        sector: assessment.sector,
        corporateName,
        nodalOfficerUserId: appointment.nodalOfficerUserId,
        approvedBudget,
        status: "ONBOARDED",
        milestones: {
          create: milestones.map((milestone) => ({
            tenantId,
            ...milestone,
          })),
        },
      },
      include: {
        mou: true,
        milestones: true,
      },
    });

    if (assessment.corporateEnquiryId) {
      await tx.corporateEnquiry.update({
        where: { id: assessment.corporateEnquiryId },
        data: { status: CorporateEnquiryStatus.PROJECT_ONBOARDED },
      });
    }

    if (assessment.governmentPitchId) {
      await tx.governmentPitch.update({
        where: { id: assessment.governmentPitchId },
        data: { status: GovernmentPitchStatus.PROJECT_ONBOARDED },
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: input.actorUserId,
        action: "CONVERGENCE_PROJECT_ONBOARDED",
        entityType: "ConvergenceProject",
        entityId: project.id,
        details: {
          assessmentId: assessment.id,
          projectId: project.projectId,
          mouReferenceId: mou.mouReferenceId,
          corporateEnquiryId: assessment.corporateEnquiryId,
          governmentPitchId: assessment.governmentPitchId,
        },
      },
    });

    return { project, mou };
  });

  return { status: "CREATED", ...result };
}
