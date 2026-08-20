import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { successResponse, notFoundResponse } from "../utils/apiResponse";
import { ROLE_ID } from "../types/role";
import { dispatchNotification } from "../services/notificationOrchestrator";
import { isCollectorOrg, getDistrictProjectFilter } from "../services/districtScopeService";

async function projectAccess(projectId: string, userId: string, organizationId?: string | null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: { orderBy: { sequenceOrder: "asc" } },
      utilizationCertificates: true,
      documents: true,
      districtDncAssignments: true,
      organization: { select: { id: true, name: true, governmentType: true, governmentLevel: true, district: true } },
      mou: true
    }
  });
  if (!project) return null;
  const assignment = await prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: project.id, assignedToId: userId, status: "ACTIVE" } });
  const isPartner = Boolean(organizationId && [
    project.corporatePartnerId,
    project.implementingAgencyId,
    project.ngoId,
    project.organizationId,
    project.departmentOrganizationId,
    project.parentOrganizationId
  ].filter(Boolean).includes(organizationId));
  return { project, assignment, isPartner };
}

async function isAssignedDno(projectId: string, userId: string) {
  return Boolean(await prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: projectId, assignmentType: "DISTRICT_NODAL_OFFICER", assignedToId: userId, status: "ACTIVE" }, select: { id: true } }));
}

const generateProjectCode = () => `PRJ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

export const createConvergenceProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.create({
      data: {
        projectCode: generateProjectCode(),
        title: req.body.title,
        description: req.body.description || req.body.title,
        type: "CONVERGENCE_FRAMEWORK",
        status: "SUBMITTED",
        sector: req.body.sector || "General",
        district: req.body.district || "Pune",
        taluka: req.body.taluka || "NA",
        approvedBudget: req.body.approvedBudget || 0,
        organizationId: req.user?.organizationId || req.body.organizationId
      }
    });
    return res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

export const getConvergenceProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.user?.roleId);
    const userRoleStr = String(req.user?.role || "").toUpperCase();
    const isState = [ROLE_ID.SUPER_ADMIN, ROLE_ID.JOINT_SECRETARY, ROLE_ID.PLANNING_SECRETARY].includes(roleId as any) ||
      ["SUPER_ADMIN", "JOINT_SECRETARY", "PLANNING_SECRETARY", "STATE_CSR_CELL"].includes(userRoleStr);
    const deptQuery = String(req.query.dept || "").toLowerCase();

    // Check if user is a Collector (district-wide visibility)
    let isDistrictCollector = false;
    let collectorDistrict: string | null = null;
    let userOrg: any = null;

    if (req.user?.organizationId) {
      userOrg = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { id: true, name: true, governmentType: true, governmentLevel: true, district: true, parentOrganizationId: true },
      });
      if (userOrg && (isCollectorOrg(userOrg) || userRoleStr === "DISTRICT_COLLECTOR" || (roleId === 7 && userOrg.governmentType === "COLLECTORATE"))) {
        isDistrictCollector = true;
        collectorDistrict = userOrg.district || null;
      }
    }

    const isDNO = roleId === ROLE_ID.DISTRICT_NODAL_OFFICER || userRoleStr === "DISTRICT_NODAL_OFFICER";

    let baseWhere: any = { type: "CONVERGENCE_FRAMEWORK" };

    if (isState) {
      // Full statewide visibility
      baseWhere = { type: "CONVERGENCE_FRAMEWORK" };
    } else if (isDistrictCollector && collectorDistrict) {
      // Collectorate: District-wide visibility across all projects in the district
      const districtFilter = await getDistrictProjectFilter(collectorDistrict);
      baseWhere = {
        type: "CONVERGENCE_FRAMEWORK",
        ...districtFilter
      };
    } else if (isDNO) {
      const assignmentIds = (await prisma.projectAssignment.findMany({
        where: { entityType: "PROJECT", assignedToId: req.user?.id, status: "ACTIVE" },
        select: { entityId: true }
      })).map(({ entityId }) => entityId);

      baseWhere = {
        type: "CONVERGENCE_FRAMEWORK",
        OR: [
          { nodalOfficerUserId: req.user?.id },
          { id: { in: assignmentIds } }
        ]
      };
    } else {
      // ZP / MNC / Specific Department: Show ONLY their assigned projects
      const userOrgId = req.user?.organizationId;
      const orgIds: string[] = userOrgId ? [userOrgId] : [];

      if (userOrg?.parentOrganizationId) {
        orgIds.push(userOrg.parentOrganizationId);
      }

      // If user is a main ZP or MNC, include child sub-departments
      if (userOrgId && (userOrg?.governmentType === "ZILLA_PARISHAD" || userOrg?.governmentType === "MUNICIPAL_CORPORATION")) {
        const childOrgs = await prisma.organization.findMany({
          where: { parentOrganizationId: userOrgId, deletedAt: null },
          select: { id: true }
        });
        childOrgs.forEach(c => orgIds.push(c.id));
      }

      const assignmentIds = (await prisma.projectAssignment.findMany({
        where: { entityType: "PROJECT", assignedToId: req.user?.id, status: "ACTIVE" },
        select: { entityId: true }
      })).map(({ entityId }) => entityId);

      // Lookup linked corporate enquiries for corporate user
      const corporateEnquiryIds = (req.user?.organizationId || req.user?.id || req.user?.email) ? (await prisma.corporateEnquiry.findMany({
        where: {
          OR: [
            ...(req.user?.organizationId ? [{ organizationId: req.user.organizationId }] : []),
            ...(req.user?.id ? [{ submittedByUserId: req.user.id }] : []),
            ...(req.user?.email ? [{ contactEmail: { equals: req.user.email, mode: "insensitive" as const } }] : [])
          ]
        },
        select: { id: true }
      })).map((e) => e.id) : [];

      baseWhere = {
        type: "CONVERGENCE_FRAMEWORK",
        OR: [
          ...(orgIds.length > 0 ? [
            { organizationId: { in: orgIds } },
            { departmentOrganizationId: { in: orgIds } },
            { parentOrganizationId: { in: orgIds } },
            { corporatePartnerId: { in: orgIds } },
            { implementingAgencyId: { in: orgIds } },
            { ngoId: { in: orgIds } }
          ] : []),
          ...(corporateEnquiryIds.length > 0 ? [{ approvalSourceEnquiryId: { in: corporateEnquiryIds } }] : []),
          ...(assignmentIds.length > 0 ? [{ id: { in: assignmentIds } }] : [])
        ]
      };
    }

    // Apply department filter query (zp, mnc, collectorate) if provided
    if (deptQuery === "zp") {
      const zpOrgs = await prisma.organization.findMany({ where: { governmentType: "ZILLA_PARISHAD" }, select: { id: true } });
      const zpOrgIds = zpOrgs.map(o => o.id);
      baseWhere = {
        AND: [
          baseWhere,
          {
            OR: [
              { organization: { governmentType: "ZILLA_PARISHAD" } },
              { departmentOrganizationId: { in: zpOrgIds } },
              { parentOrganizationId: { in: zpOrgIds } }
            ]
          }
        ]
      };
    } else if (deptQuery === "mnc") {
      const mncOrgs = await prisma.organization.findMany({ where: { governmentType: "MUNICIPAL_CORPORATION" }, select: { id: true } });
      const mncOrgIds = mncOrgs.map(o => o.id);
      baseWhere = {
        AND: [
          baseWhere,
          {
            OR: [
              { organization: { governmentType: "MUNICIPAL_CORPORATION" } },
              { departmentOrganizationId: { in: mncOrgIds } },
              { parentOrganizationId: { in: mncOrgIds } }
            ]
          }
        ]
      };
    } else if (deptQuery === "collectorate") {
      const colOrgs = await prisma.organization.findMany({ where: { governmentType: "COLLECTORATE" }, select: { id: true } });
      const colOrgIds = colOrgs.map(o => o.id);
      baseWhere = {
        AND: [
          baseWhere,
          {
            OR: [
              { organization: { governmentType: "COLLECTORATE" } },
              { departmentOrganizationId: { in: colOrgIds } },
              { parentOrganizationId: { in: colOrgIds } }
            ]
          }
        ]
      };
    }

    const projects = await prisma.project.findMany({
      where: baseWhere,
      include: {
        organization: {
          select: { id: true, name: true, governmentType: true, governmentLevel: true, district: true }
        },
        milestones: {
          select: { id: true, status: true, utilizedAmount: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const enquiryIds = projects.map((p) => p.approvalSourceEnquiryId).filter(Boolean) as string[];
    const corpPartnerIds = projects.map((p) => p.corporatePartnerId).filter(Boolean) as string[];
    const agencyIds = projects.map((p) => p.implementingAgencyId).filter(Boolean) as string[];

    const [enquiriesMap, corpOrgsMap, agenciesMap] = await Promise.all([
      enquiryIds.length > 0 ? prisma.corporateEnquiry.findMany({
        where: { id: { in: enquiryIds } },
        select: { id: true, corporateName: true }
      }) : [],
      corpPartnerIds.length > 0 ? prisma.organization.findMany({
        where: { id: { in: corpPartnerIds } },
        select: { id: true, name: true }
      }) : [],
      agencyIds.length > 0 ? prisma.organization.findMany({
        where: { id: { in: agencyIds } },
        select: { id: true, name: true }
      }) : []
    ]);

    const enqDict = new Map(enquiriesMap.map((e) => [e.id, e.corporateName]));
    const orgDict = new Map(corpOrgsMap.map((o) => [o.id, o.name]));
    const agencyDict = new Map(agenciesMap.map((a) => [a.id, a.name]));

    const mappedProjects = projects.map((p: any) => {
      const compName = (p.approvalSourceEnquiryId ? enqDict.get(p.approvalSourceEnquiryId) : null) ||
                       (p.corporatePartnerId ? orgDict.get(p.corporatePartnerId) : null) ||
                       null;
      const agencyName = (p.implementingAgencyId ? agencyDict.get(p.implementingAgencyId) : null) || null;
      const deptName = p.organization?.name || null;
      const govType = p.organization?.governmentType || null;

      return {
        ...p,
        corporateName: compName,
        company: compName,
        implementingAgencyName: agencyName,
        department: deptName,
        governmentType: govType
      };
    });

    return res.json(mappedProjects);
  } catch (error) {
    next(error);
  }
};

export const getConvergenceProjectById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const access = await projectAccess(req.params.id, req.user!.id, req.user?.organizationId);
    if (!access) return notFoundResponse(res, "Project not found");
    const roleId = Number(req.user?.roleId);
    const userRoleStr = String(req.user?.role || "").toUpperCase();
    const isState = [ROLE_ID.SUPER_ADMIN, ROLE_ID.JOINT_SECRETARY, ROLE_ID.PLANNING_SECRETARY].includes(roleId as any) ||
      ["SUPER_ADMIN", "JOINT_SECRETARY", "PLANNING_SECRETARY", "STATE_CSR_CELL"].includes(userRoleStr);

    // Collector gets read-only access to all projects in their district
    let isDistrictCollector = false;
    if (!isState && !access.isPartner && !access.assignment && req.user?.organizationId) {
      const userOrg = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { governmentType: true, governmentLevel: true, district: true },
      });
      if (userOrg && (isCollectorOrg(userOrg) || userRoleStr === "DISTRICT_COLLECTOR" || (roleId === 7 && userOrg.governmentType === "COLLECTORATE")) &&
          userOrg.district && access.project.district?.toLowerCase() === userOrg.district.toLowerCase()) {
        isDistrictCollector = true;
      }
    }

    if (!isState && !access.isPartner && !access.assignment && !isDistrictCollector) {
      return res.status(403).json({ error: "You are not assigned to this project." });
    }
    return res.json(access.project);
  } catch (error) {
    next(error);
  }
};

export const updateConvergenceProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        sector: req.body.sector,
        district: req.body.district
      }
    });
    return res.json(project);
  } catch (error) {
    next(error);
  }
};

export const listProjectsForNodalOfficer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    return successResponse(res, projects, "Projects retrieved");
  } catch (error) {
    next(error);
  }
};

export const listProjectsForImplementingAgency = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    return successResponse(res, projects, "Projects retrieved");
  } catch (error) {
    next(error);
  }
};

export const defineMilestones = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const access = await projectAccess(req.params.id, req.user!.id, req.user?.organizationId);
    if (!access) return notFoundResponse(res, "Project not found");
    const roleId = Number(req.user?.roleId);
    const mayDraft = access.isPartner && [ROLE_ID.COMPANY_ADMIN, ROLE_ID.NGO_ADMIN].includes(roleId as any);
    if (!mayDraft) return res.status(403).json({ error: "Only the Corporate Partner or assigned Implementing Agency can draft milestones." });
    const milestones = Array.isArray(req.body.milestones) ? req.body.milestones : [];
    if (!milestones.length || milestones.length > 50) return res.status(400).json({ error: "Provide between 1 and 50 milestones." });
    const normalised = milestones.map((milestone: any) => ({
      name: String(milestone.name || "").trim(),
      description: milestone.description ? String(milestone.description).trim() : null,
      completionCriteria: String(milestone.completionCriteria || "Pending completion criteria").trim(),
      targetAmount: milestone.targetAmount !== undefined && milestone.targetAmount !== null && milestone.targetAmount !== "" ? Number(milestone.targetAmount) : 0,
      dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null
    }));
    if (normalised.some((m: any) => !m.name || Number.isNaN(m.targetAmount) || m.targetAmount < 0 || (m.dueDate && Number.isNaN(m.dueDate.getTime())))) {
      return res.status(400).json({ error: "Every milestone needs a valid name and valid timeline." });
    }
    const proposedTotal = normalised.reduce((sum: number, milestone: any) => sum + milestone.targetAmount, 0);
    if (proposedTotal > Number(access.project.approvedBudget)) return res.status(400).json({ error: "Milestone tranche total cannot exceed the approved project budget." });
    const created = await prisma.$transaction(async (tx) => {
      await tx.projectMilestone.deleteMany({ where: { projectId: access.project.id, status: "DRAFT" } });
      return tx.projectMilestone.createMany({ data: normalised.map((m: any) => ({ ...m, projectId: access.project.id, geoTaggedPhotoUrls: [] })) });
    });
    return res.status(201).json({ success: true, message: "Milestones drafted from the MoU schedule.", data: created });
  } catch (error) { next(error); }
};

export const addSingleMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const access = await projectAccess(req.params.id, req.user!.id, req.user?.organizationId);
    if (!access) return notFoundResponse(res, "Project not found");
    const roleId = Number(req.user?.roleId);
    const mayAdd = (access.isPartner && [ROLE_ID.COMPANY_ADMIN, ROLE_ID.NGO_ADMIN].includes(roleId as any)) || [ROLE_ID.SUPER_ADMIN, ROLE_ID.DISTRICT_NODAL_OFFICER].includes(roleId as any);
    if (!mayAdd) return res.status(403).json({ error: "Only assigned partners, DNOs, or Super Admins can add a milestone." });

    const name = String(req.body.name || "").trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    const completionCriteria = req.body.completionCriteria ? String(req.body.completionCriteria).trim() : "Pending completion criteria";
    const targetAmount = req.body.targetAmount !== undefined && req.body.targetAmount !== null && req.body.targetAmount !== "" ? Number(req.body.targetAmount) : 0;
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;

    if (!name) {
      return res.status(400).json({ error: "Milestone name is required." });
    }
    if (Number.isNaN(targetAmount) || targetAmount < 0) {
      return res.status(400).json({ error: "Target amount must be a valid non-negative number." });
    }
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: "Invalid due date provided." });
    }

    const created = await prisma.projectMilestone.create({
      data: {
        projectId: access.project.id,
        name,
        description,
        completionCriteria,
        targetAmount,
        dueDate,
        status: "DRAFT",
        geoTaggedPhotoUrls: []
      }
    });

    return res.status(201).json({ success: true, message: "Milestone added successfully.", data: created });
  } catch (error) { next(error); }
};

export const updateMilestoneProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone || milestone.projectId !== req.params.id) return notFoundResponse(res, "Milestone not found");
    const roleId = Number(req.user?.roleId);
    const mayUpdate = [ROLE_ID.COMPANY_ADMIN, ROLE_ID.NGO_ADMIN].includes(roleId as any) && [milestone.project.corporatePartnerId, milestone.project.implementingAgencyId, milestone.project.ngoId].includes(req.user?.organizationId || null);
    if (!mayUpdate) return res.status(403).json({ error: "Only the Corporate Partner or assigned Implementing Agency can update milestone evidence." });
    const status = String(req.body.status || "IN_PROGRESS");
    if (!["IN_PROGRESS", "SUBMITTED_FOR_VERIFICATION"].includes(status)) return res.status(400).json({ error: "Milestones may only be saved as IN_PROGRESS or SUBMITTED_FOR_VERIFICATION by the implementer." });
    const geoTaggedPhotoUrls = Array.isArray(req.body.geoTaggedPhotoUrls) ? req.body.geoTaggedPhotoUrls.filter((url: unknown) => typeof url === "string" && /^https?:\/\//.test(url)).slice(0, 20) : milestone.geoTaggedPhotoUrls;
    if (status === "SUBMITTED_FOR_VERIFICATION" && geoTaggedPhotoUrls.length === 0) return res.status(400).json({ error: "At least one geo-tagged photo is required before DNO verification." });
    const updated = await prisma.projectMilestone.update({ where: { id: milestone.id }, data: { status: status as any, utilizedAmount: req.body.utilizedAmount === undefined ? milestone.utilizedAmount : Number(req.body.utilizedAmount), geoTaggedPhotoUrls, progressRemarks: req.body.progressRemarks ? String(req.body.progressRemarks).slice(0, 4000) : null, submittedAt: status === "SUBMITTED_FOR_VERIFICATION" ? new Date() : null } });
    return res.json({ success: true, message: status === "SUBMITTED_FOR_VERIFICATION" ? "Milestone submitted to the assigned DNO for verification." : "Milestone progress saved.", data: updated });
  } catch (error) { next(error); }
};

export const verifyMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.milestoneId }, include: { project: true } });
    if (!milestone || milestone.projectId !== req.params.id) return notFoundResponse(res, "Milestone not found");
    if (!(await isAssignedDno(milestone.projectId, req.user!.id))) return res.status(403).json({ error: "Only an assigned DNO can verify this milestone." });
    if (milestone.status !== "SUBMITTED_FOR_VERIFICATION") return res.status(409).json({ error: "The implementer must submit the milestone for verification first." });
    const updated = await prisma.projectMilestone.update({ where: { id: milestone.id }, data: { status: "APPROVED", verifiedAt: new Date(), verifiedByUserId: req.user!.id } });
    const recipientIds = await prisma.projectAssignment.findMany({ where: { entityType: "PROJECT", entityId: milestone.projectId, status: "ACTIVE", assignmentType: { in: ["GOVERNMENT_DEPARTMENT_ADMIN", "DISTRICT_NODAL_CONSULTANT"] } }, select: { assignedToId: true } });
    await Promise.all(recipientIds.map(({ assignedToId }) => dispatchNotification({ recipientId: assignedToId, templateName: "MILESTONE_VERIFIED", channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"], variables: { title: "Milestone verified", message: `${updated.name} was verified by the assigned DNO.`, currentStatus: "VERIFIED" }, actionButtonUrl: `/projects/${milestone.projectId}`, correlationId: updated.id, notificationType: "MILESTONE_VERIFIED" })));
    return res.json({ success: true, message: "Milestone verified and marked complete. It is now eligible for its next tranche workflow and public reporting.", data: updated });
  } catch (error) { next(error); }
};

export const uploadUC = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const access = await projectAccess(req.params.id, req.user!.id, req.user?.organizationId);
    if (!access) return notFoundResponse(res, "Project not found");
    const roleId = Number(req.user?.roleId);
    if (!access.isPartner || ![ROLE_ID.COMPANY_ADMIN, ROLE_ID.NGO_ADMIN].includes(roleId as any)) return res.status(403).json({ error: "Only the Corporate Partner or assigned Implementing Agency can submit a Utilisation Certificate." });
    if (!req.body.certificateUrl || !/^https?:\/\//.test(req.body.certificateUrl) || !Number.isFinite(Number(req.body.amountUtilized)) || Number(req.body.amountUtilized) < 0) return res.status(400).json({ error: "A secure certificate URL and valid utilized amount are required." });
    const uc = await prisma.utilizationCertificate.create({ data: { projectId: access.project.id, milestoneId: req.body.milestoneId || null, certificateUrl: req.body.certificateUrl, amountUtilized: Number(req.body.amountUtilized), remarks: req.body.remarks ? String(req.body.remarks).slice(0, 4000) : null } });
    return res.status(201).json({ success: true, message: "Utilisation Certificate submitted for DNO verification.", data: uc });
  } catch (error) { next(error); }
};

export const verifyUC = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const uc = await prisma.utilizationCertificate.findUnique({ where: { id: req.params.ucId } });
    if (!uc || uc.projectId !== req.params.id) return notFoundResponse(res, "Utilisation Certificate not found");
    if (!(await isAssignedDno(uc.projectId, req.user!.id))) return res.status(403).json({ error: "Only an assigned DNO can verify a Utilisation Certificate." });
    const updated = await prisma.utilizationCertificate.update({ where: { id: uc.id }, data: { verificationStatus: "VERIFIED", verifiedByUserId: req.user!.id, verifiedAt: new Date() } });
    return res.json({ success: true, message: "Utilisation Certificate verified.", data: updated });
  } catch (error) { next(error); }
};

export const raiseGrievance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return res.json({ success: true, message: "Grievance raised" });
};

export const getProjectGrievances = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const grievances = await prisma.grievance.findMany({ where: { projectId: req.params.id } });
    return res.json(grievances);
  } catch (error) {
    next(error);
  }
};

/**
 * Collector Project Reassignment
 * 
 * Allows the District Collector to reassign a project from one government
 * organization to another within the same district. This handles the case
 * where JS assigns a project to the wrong department (e.g., ZP instead of MNC).
 */
export const collectorReassignProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id: projectId } = req.params;
    const { targetOrganizationId, reason } = req.body;
    const userId = req.user!.id;
    const roleId = Number(req.user?.roleId);

    if (roleId !== 7 || !req.user?.organizationId) {
      return res.status(403).json({ error: "Only government officers can reassign projects." });
    }

    // Verify the user is a Collector
    const userOrg = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { governmentType: true, governmentLevel: true, district: true },
    });

    if (!isCollectorOrg(userOrg)) {
      return res.status(403).json({ error: "Only the District Collector can reassign projects between departments." });
    }

    const collectorDistrict = userOrg?.district;
    if (!collectorDistrict) {
      return res.status(400).json({ error: "Collector organization does not have a district assigned." });
    }

    // Get the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, district: true, organizationId: true, status: true },
    });

    if (!project) return notFoundResponse(res, "Project not found");
    if (project.district !== collectorDistrict) {
      return res.status(403).json({ error: "You can only reassign projects within your district." });
    }

    // Verify the target organization is in the same district and is a MAIN gov org
    const targetOrg = await prisma.organization.findUnique({
      where: { id: targetOrganizationId },
      select: { id: true, name: true, governmentType: true, governmentLevel: true, district: true, kind: true },
    });

    if (!targetOrg) {
      return res.status(404).json({ error: "Target organization not found." });
    }
    if (targetOrg.kind !== "GOVERNMENT_DEPARTMENT" || targetOrg.governmentLevel !== "MAIN") {
      return res.status(400).json({ error: "Projects can only be reassigned to a main government department (Collectorate, ZP, or MNC)." });
    }
    if (targetOrg.district !== collectorDistrict) {
      return res.status(400).json({ error: "Target organization must be in the same district." });
    }
    if (targetOrg.id === project.organizationId) {
      return res.status(400).json({ error: "Project is already assigned to this organization." });
    }

    // Perform the reassignment
    const previousOrgId = project.organizationId;
    const updated = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          organizationId: targetOrganizationId,
          departmentAssignmentStatus: "CONFIRMED",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PROJECT_REASSIGNED_BY_COLLECTOR",
          entityType: "Project",
          entityId: projectId,
          actorUserId: userId,
          details: {
            previousOrganizationId: previousOrgId,
            newOrganizationId: targetOrganizationId,
            newOrganizationName: targetOrg.name,
            reason: reason || "Reassigned by District Collector",
            district: collectorDistrict,
          },
        },
      });

      return updatedProject;
    });

    return res.json({
      success: true,
      message: `Project "${project.title}" has been reassigned to ${targetOrg.name}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all main government departments in the user's district (Collectorate, ZP, MNC)
 */
export const getDistrictDepartments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userOrgId = req.user?.organizationId;
    if (!userOrgId) return res.json([]);
    const userOrg = await prisma.organization.findUnique({
      where: { id: userOrgId },
      select: { district: true, governmentType: true }
    });
    if (!userOrg?.district) return res.json([]);

    const orgs = await prisma.organization.findMany({
      where: {
        kind: "GOVERNMENT_DEPARTMENT",
        governmentLevel: "MAIN",
        district: userOrg.district,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true, name: true, governmentType: true, district: true }
    });

    return res.json(orgs);
  } catch (error) {
    next(error);
  }
};
