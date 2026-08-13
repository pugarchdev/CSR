import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ROLE_ID } from "../types/role";
import { dispatchNotification } from "../services/notificationOrchestrator";

export const getAssignmentContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId } = req.params;
    if (!entityId) {
      const [legacy, government] = await Promise.all([
        prisma.projectAssignment.findMany({ where: { assignedToId: req.user!.id, status: "ACTIVE" }, orderBy: { assignedAt: "desc" } }),
        prisma.governmentAssignment.findMany({ where: { OR: [{ primaryNodalUserId: req.user!.id }, { stateNodalUserId: req.user!.id }, { governmentOrganization: { departmentHeadUserId: req.user!.id } }, { dncLinks: { some: { dncUserId: req.user!.id, status: "ACTIVE" } } }], status: { notIn: ["CLOSED", "REVOKED"] } }, include: { case: true, governmentOrganization: true }, orderBy: { updatedAt: "desc" } }),
      ]);
      return res.json({ success: true, data: { projectAssignments: legacy, governmentAssignments: government } });
    }
    const legacy = await prisma.projectAssignment.findMany({ where: { entityType: String(entityType || "").toUpperCase(), entityId }, include: { assignedTo: { select: { id: true, firstName: true, lastName: true, designation: true, roleId: true } }, assignedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { assignedAt: "desc" } });
    const government = entityType?.toLowerCase() === "case" ? await prisma.governmentAssignment.findMany({ where: { caseId: entityId }, include: { governmentOrganization: true, districtAssignments: true, dncLinks: true, events: { orderBy: { createdAt: "asc" } } } }) : [];
    return res.json({ success: true, context: { entityType, entityId, projectAssignments: legacy, governmentAssignments: government } });
  } catch (error) {
    next(error);
  }
};

export const assignExistingOfficerHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId, assignedToId, assignmentType, assignedRoleId } = req.body;
    if (!entityType || !entityId || !assignedToId || !assignmentType) return res.status(400).json({ error: "Entity, assignee, and assignment type are required" });
    const assignee = await prisma.user.findFirst({ where: { id: assignedToId, accountStatus: "ACTIVE", isVerified: true, deletedAt: null } });
    if (!assignee) return res.status(400).json({ error: "Assignee must be active and verified" });
    const existing = await prisma.projectAssignment.findFirst({ where: { entityType: String(entityType).toUpperCase(), entityId, assignedToId, assignmentType, status: "ACTIVE" } });
    if (existing) return res.status(409).json({ error: "This active assignment already exists" });
    const assignment = await prisma.$transaction(async tx => {
      const created = await tx.projectAssignment.create({ data: { entityType: String(entityType).toUpperCase(), entityId, assignedToId, assignedById: req.user!.id, assignmentType, assignedRoleId: assignedRoleId || assignee.roleId, status: "ACTIVE" } });
      await tx.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: "OFFICER_ASSIGNED", entityType: String(entityType).toUpperCase(), entityId, details: { assignmentId: created.id, assignedToId, assignmentType } } });
      return created;
    });
    return res.status(201).json({ success: true, message: "Officer assigned", data: assignment });
  } catch (error) {
    next(error);
  }
};

export const createAndAssignOfficerHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.status(410).json({ error: "Direct officer creation from an assignment is disabled. Invite the officer through User Management, complete first-login activation, then assign the active identity." });
  } catch (error) {
    next(error);
  }
};

export const searchOfficersHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const officers = await prisma.user.findMany({ where: { roleId: 4 } });
    return res.json({ success: true, officers });
  } catch (error) {
    next(error);
  }
};

export const getAssignableRolesHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany();
    return res.json({ success: true, roles });
  } catch (error) {
    next(error);
  }
};

export const getDistrictsHandler = async (_req: AuthenticatedRequest, res: Response) => {
  const rows = await prisma.organization.findMany({ where: { district: { not: null }, deletedAt: null }, distinct: ["district"], select: { district: true }, orderBy: { district: "asc" } });
  return res.json({ success: true, districts: rows.map(row => row.district).filter(Boolean) });
};

/** Super Admin links one of the active DNC supporters for a district/organization. */
export const configureDistrictDnc = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user!.id;
    const { district, dncUserId, organizationId } = req.body;
    if (!district || !dncUserId) return res.status(400).json({ error: "District and DNC user are required." });
    const [actor, dnc] = await Promise.all([
      prisma.user.findUnique({ where: { id: actorId }, select: { roleId: true } }),
      prisma.user.findFirst({ where: { id: dncUserId, roleId: ROLE_ID.DISTRICT_NODAL_CONSULTANT, accountStatus: "ACTIVE", isVerified: true }, select: { id: true, organizationId: true } })
    ]);
    if (actor?.roleId !== ROLE_ID.SUPER_ADMIN) return res.status(403).json({ error: "Only Super Admin can configure District DNCs." });
    if (!dnc) return res.status(400).json({ error: "Select an active, verified District Nodal Consultant." });
    const scopedOrganizationId = organizationId || dnc.organizationId;
    const existing = await prisma.districtDncAssignment.findFirst({
      where: { district: String(district).trim(), organizationId: scopedOrganizationId || null, dncUserId }
    });
    const mapping = existing
      ? await prisma.districtDncAssignment.update({ where: { id: existing.id }, data: { assignedById: actorId, isActive: true } })
      : await prisma.districtDncAssignment.create({
          data: { district: String(district).trim(), organizationId: scopedOrganizationId || null, dncUserId, assignedById: actorId, isActive: true }
        });
    return res.json({ success: true, message: "District DNC linked.", data: mapping });
  } catch (error) { next(error); }
};

/** Department Admin can assign any number of active, district-eligible DNOs. */
export const assignDnosToProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user!.id;
    const { projectId } = req.params;
    const rawDnoUserIds: unknown[] = Array.isArray(req.body.dnoUserIds) ? req.body.dnoUserIds : [];
    const dnoUserIds: string[] = [...new Set(rawDnoUserIds.filter((id): id is string => typeof id === "string"))];
    if (!dnoUserIds.length) return res.status(400).json({ error: "Choose at least one DNO." });
    const [project, adminAssignment, dnos] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { id: true, district: true, districtDncAssignments: { select: { district: true } } } }),
      prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: projectId, assignmentType: "GOVERNMENT_DEPARTMENT_ADMIN", assignedToId: actorId, status: "ACTIVE" } }),
      prisma.user.findMany({ where: { id: { in: dnoUserIds }, roleId: ROLE_ID.DISTRICT_NODAL_OFFICER, accountStatus: "ACTIVE", isVerified: true }, select: { id: true, officerProfile: { select: { district: true } }, districtMappings: { where: { isActive: true }, select: { district: true } } } })
    ]);
    if (!project || !adminAssignment) return res.status(403).json({ error: "Only the assigned Government Department Admin can assign DNOs." });
    const targetDistricts = new Set(project.districtDncAssignments.map(({ district }) => district));
    if (!targetDistricts.size) targetDistricts.add(project.district);
    const eligible = dnos.filter((dno) => targetDistricts.has(dno.officerProfile?.district || "") || dno.districtMappings.some((mapping) => targetDistricts.has(mapping.district)));
    if (eligible.length !== dnoUserIds.length) return res.status(400).json({ error: "Every selected DNO must be active and mapped to one of the project districts." });
    const existing = await prisma.projectAssignment.findMany({ where: { entityType: "PROJECT", entityId: projectId, assignmentType: "DISTRICT_NODAL_OFFICER", assignedToId: { in: dnoUserIds }, status: "ACTIVE" }, select: { assignedToId: true } });
    const existingIds = new Set(existing.map((assignment) => assignment.assignedToId));
    const newIds = eligible.map((dno) => dno.id).filter((id) => !existingIds.has(id));
    if (newIds.length) await prisma.projectAssignment.createMany({ data: newIds.map((assignedToId) => ({ entityType: "PROJECT", entityId: projectId, assignmentType: "DISTRICT_NODAL_OFFICER", assignedById: actorId, assignedToId, assignedRoleId: ROLE_ID.DISTRICT_NODAL_OFFICER, status: "ACTIVE" })) });
    await Promise.all(newIds.map((recipientId) => dispatchNotification({ recipientId, templateName: "PROJECT_DNO_ASSIGNED", channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"], variables: { title: "Project assigned for monitoring", message: "You have been assigned as a District Nodal Officer.", currentStatus: "APPROVED" }, actionButtonUrl: `/projects/${projectId}`, correlationId: projectId, notificationType: "PROJECT_DNO_ASSIGNED" })));
    return res.status(201).json({ success: true, message: `${newIds.length} DNO(s) assigned.`, data: { assignedDnoIds: [...existingIds, ...newIds] } });
  } catch (error) { next(error); }
};

/** Joint Secretary is the sole authority for changing an existing project
 * assignment. Department Admin may add DNOs but cannot replace/reassign them. */
export const reassignProjectOfficerByJs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const actorId = req.user!.id;
    const { projectId, assignmentType, currentAssigneeId, replacementUserId, district } = req.body;
    if (!projectId || !assignmentType || !currentAssigneeId || !replacementUserId) return res.status(400).json({ error: "Project, assignment type, current assignee, and replacement are required." });
    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { districtDncAssignments: true } });
    if (!project) return res.status(404).json({ error: "Project not found." });
    const current = await prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: projectId, assignmentType, assignedToId: currentAssigneeId, status: "ACTIVE" } });
    if (!current) return res.status(404).json({ error: "Active assignment not found." });

    let requiredRoleId: number;
    let replacementWhere: any = { id: replacementUserId, accountStatus: "ACTIVE", isVerified: true };
    if (assignmentType === "DISTRICT_NODAL_CONSULTANT") {
      requiredRoleId = ROLE_ID.DISTRICT_NODAL_CONSULTANT;
      const targetDistrict = String(district || project.district).trim();
      const mapping = await prisma.districtDncAssignment.findFirst({ where: { district: targetDistrict, dncUserId: replacementUserId, isActive: true } });
      if (!mapping) return res.status(400).json({ error: "The replacement DNC must be the configured DNC for the selected project district." });
      replacementWhere.roleId = requiredRoleId;
      const replacement = await prisma.user.findFirst({ where: replacementWhere, select: { id: true } });
      if (!replacement) return res.status(400).json({ error: "Replacement DNC is not active and verified." });
      await prisma.projectDistrictDncAssignment.update({ where: { projectId_district: { projectId, district: targetDistrict } }, data: { dncUserId: replacementUserId, assignedById: actorId } });
    } else if (assignmentType === "GOVERNMENT_DEPARTMENT_ADMIN") {
      requiredRoleId = ROLE_ID.GOVERNMENT_OFFICER;
      replacementWhere = { ...replacementWhere, roleId: requiredRoleId, organizationId: project.organizationId };
      const replacement = await prisma.user.findFirst({ where: replacementWhere, select: { id: true } });
      if (!replacement) return res.status(400).json({ error: "Replacement must be an active Department Admin in this Government Department." });
    } else if (assignmentType === "DISTRICT_NODAL_OFFICER") {
      requiredRoleId = ROLE_ID.DISTRICT_NODAL_OFFICER;
      replacementWhere.roleId = requiredRoleId;
      const replacement = await prisma.user.findFirst({ where: replacementWhere, select: { id: true, officerProfile: { select: { district: true } }, districtMappings: { where: { isActive: true }, select: { district: true } } } });
      const projectDistricts = new Set(project.districtDncAssignments.map(({ district: itemDistrict }) => itemDistrict));
      if (!projectDistricts.size) projectDistricts.add(project.district);
      const eligible = replacement && (projectDistricts.has(replacement.officerProfile?.district || "") || replacement.districtMappings.some((mapping) => projectDistricts.has(mapping.district)));
      if (!eligible) return res.status(400).json({ error: "Replacement DNO must be active, verified, and mapped to a project district." });
    } else {
      return res.status(400).json({ error: "This assignment type cannot be reassigned through this workflow." });
    }
    if (currentAssigneeId === replacementUserId) return res.status(409).json({ error: "The replacement is already the current assignee." });
    await prisma.$transaction([
      prisma.projectAssignment.update({ where: { id: current.id }, data: { status: "REASSIGNED" } }),
      prisma.projectAssignment.create({ data: { entityType: "PROJECT", entityId: projectId, assignmentType, assignedById: actorId, assignedToId: replacementUserId, assignedRoleId: requiredRoleId!, status: "ACTIVE" } })
    ]);
    await dispatchNotification({ recipientId: replacementUserId, templateName: "PROJECT_ASSIGNMENT_REASSIGNED", channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"], variables: { title: "Project assignment reassigned by JS", message: `${project.projectCode} is now assigned to you.`, currentStatus: project.status }, actionButtonUrl: `/projects/${project.id}`, correlationId: project.id, notificationType: "PROJECT_REASSIGNMENT" });
    return res.json({ success: true, message: "Project assignment reassigned by Joint Secretary." });
  } catch (error) { next(error); }
};
