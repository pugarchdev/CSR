import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import prisma from "../config/db";
import { ScopedAssignmentService } from "../services/scopedAssignmentService";
import { RmAssignmentService } from "../services/rmAssignmentService";
import { ROLE_ID } from "../types/role";

const isSuperAdminOrStaff = (user: any) => {
  if (!user) return false;
  const roleIdVal = Number(user.roleId || user.roleNumericId || user.role?.id || (typeof user.role === "number" ? user.role : 0));
  const roleStr = String(user.role?.code || user.role?.name || user.role || "").toUpperCase();
  return (
    roleIdVal === 1 || roleIdVal === 2 || roleIdVal === 3 || roleIdVal === 6 ||
    roleStr.includes("SUPER") || roleStr.includes("SECRETARY") || roleStr.includes("MANAGER")
  );
};

export const getDncQueue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    let targetDistrict: string | null = (req.query.district as string | undefined) ?? null;

    if (!targetDistrict) {
      const dncAssignment = await prisma.districtDncAssignment.findFirst({
        where: { dncUserId: userId, isActive: true },
        select: { district: true },
      });
      targetDistrict = dncAssignment?.district ?? req.user?.assignedDistrict ?? (req.user as any)?.district ?? null;
    }

    const where: any = (targetDistrict && targetDistrict !== "ALL" && targetDistrict !== "All Districts")
      ? { district: { equals: targetDistrict, mode: "insensitive" } }
      : {};

    const projects = await prisma.project.findMany({
      where,
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });

    const projectIds = projects.map((p) => p.id);
    const assignments = await prisma.projectAssignment.findMany({
      where: {
        entityId: { in: projectIds },
        entityType: "PROJECT",
      },
      orderBy: { assignedAt: "desc" },
    });

    const assignmentMap = new Map<string, typeof assignments>();
    assignments.forEach((a) => {
      const list = assignmentMap.get(a.entityId) || [];
      list.push(a);
      assignmentMap.set(a.entityId, list);
    });

    const mappedProjects = projects.map((p) => {
      const pAssignments = assignmentMap.get(p.id) || [];
      const activeDnoDelegation = pAssignments.find(
        (a) => a.assignmentType === "DISTRICT_DNO_DELEGATION" && a.status === "ACTIVE"
      );
      return {
        ...p,
        currentOwner: activeDnoDelegation ? activeDnoDelegation.assignedToId : p.nodalOfficerUserId,
        delegationStatus: activeDnoDelegation ? "DELEGATED" : "PENDING_DELEGATION",
        activeDnoAssignment: activeDnoDelegation || null,
        history: pAssignments,
      };
    });

    return res.json({
      district: targetDistrict || "All Districts",
      total: projects.length,
      data: mappedProjects,
      projects: mappedProjects,
    });
  } catch (error) {
    next(error);
  }
};

export const delegateDncProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id || req.body.projectId;
    const dnoUserId = req.body.dnoUserId || req.body.officerUserId;
    const reason = req.body.reason;
    if (!projectId || !dnoUserId) {
      return res.status(400).json({ error: "projectId and dnoUserId are required" });
    }

    const assignment = await ScopedAssignmentService.delegateDistrictDno(
      projectId,
      dnoUserId,
      req.user!.id,
      reason
    );

    return res.json({
      message: "Project successfully delegated to District Nodal Officer",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

export const getEligibleDnos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let targetDistrict: string | null = (req.query.district as string) || null;

    if (!targetDistrict) {
      const dnc = await prisma.districtDncAssignment.findFirst({
        where: { dncUserId: req.user!.id, isActive: true },
        select: { district: true },
      });
      targetDistrict = dnc?.district ?? req.user?.assignedDistrict ?? (req.user as any)?.district ?? null;
    }

    const dnoUsers = await prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        deletedAt: null,
        OR: [
          { roleId: ROLE_ID.DISTRICT_NODAL_OFFICER },
          { role: { code: "DISTRICT_NODAL_OFFICER" } },
          { role: { name: { contains: "NODAL", mode: "insensitive" } } }
        ],
      },
      include: {
        officerProfile: true,
        organization: true,
      },
    });

    const results = dnoUsers.map((user) => {
      const userDistrict = user.officerProfile?.district || user.organization?.district || (user as any).district || "Unspecified";
      const isDistrictMatch =
        !targetDistrict || targetDistrict === "ALL" || targetDistrict === "All Districts" ||
        (userDistrict && userDistrict.toLowerCase() === targetDistrict.toLowerCase());

      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        district: userDistrict,
        isValid: true,
        disabledReason: null,
      };
    });

    return res.json({
      targetDistrict: targetDistrict || "All Districts",
      data: results,
      eligibleDnos: results
    });
  } catch (error) {
    next(error);
  }
};

export const getGovAdminQueue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userOrgId = req.user?.organizationId;
    const targetOrgId = (req.query.organizationId as string | undefined) || userOrgId;

    const where: any = targetOrgId ? {
      OR: [
        { organizationId: targetOrgId },
        { departmentId: targetOrgId }
      ]
    } : {};

    const projects = await prisma.project.findMany({
      where,
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });

    const projectIds = projects.map((p) => p.id);
    const assignments = await prisma.projectAssignment.findMany({
      where: {
        entityId: { in: projectIds },
        entityType: "PROJECT",
      },
      orderBy: { assignedAt: "desc" },
    });

    const assignmentMap = new Map<string, typeof assignments>();
    assignments.forEach((a) => {
      const list = assignmentMap.get(a.entityId) || [];
      list.push(a);
      assignmentMap.set(a.entityId, list);
    });

    const mappedProjects = projects.map((p) => {
      const pAssignments = assignmentMap.get(p.id) || [];
      const activeOfficerDelegation = pAssignments.find(
        (a) => a.assignmentType === "GOV_DEPT_OFFICER_DELEGATION" && a.status === "ACTIVE"
      );
      return {
        ...p,
        currentOwner: activeOfficerDelegation ? activeOfficerDelegation.assignedToId : null,
        delegationStatus: activeOfficerDelegation ? "DELEGATED" : "PENDING_DELEGATION",
        activeOfficerAssignment: activeOfficerDelegation || null,
        history: pAssignments,
      };
    });

    return res.json({
      organizationId: targetOrgId || "All Departments",
      total: projects.length,
      data: mappedProjects,
      projects: mappedProjects,
    });
  } catch (error) {
    next(error);
  }
};

export const delegateGovOfficerProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id || req.body.projectId;
    const officerUserId = req.body.officerUserId || req.body.dnoUserId;
    const reason = req.body.reason;
    if (!projectId || !officerUserId) {
      return res.status(400).json({ error: "projectId and officerUserId are required" });
    }

    const assignment = await ScopedAssignmentService.delegateGovDesignatedOfficer(
      projectId,
      officerUserId,
      req.user!.id,
      reason
    );

    return res.json({
      message: "Project successfully assigned to Designated Nodal Officer",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

export const getEligibleGovOfficers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const targetOrgId = (req.query.organizationId as string) || req.user?.organizationId;

    const orgUsers = await prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        deletedAt: null,
        ...(targetOrgId ? { OR: [{ organizationId: targetOrgId }, { organization: { id: targetOrgId } }] } : {})
      },
      include: {
        organization: true,
        role: true,
      },
    });

    const results = orgUsers.map((user) => {
      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        organizationId: user.organizationId || targetOrgId,
        organizationName: user.organization?.name || "Department Organization",
        roleName: user.role?.displayName || user.role?.name || "Nodal Officer",
        isValid: true,
        disabledReason: null,
      };
    });

    return res.json({
      targetOrganizationId: targetOrgId || "All Organizations",
      data: results,
      eligibleOfficers: results
    });
  } catch (error) {
    next(error);
  }
};

export const executeJsApproval = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const result = await ScopedAssignmentService.executeJsApprovalWorkflow(projectId, req.user!.id);
    return res.json({
      message: "Joint Secretary approval executed successfully in single transaction",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const reassignRelationshipManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { entityType, entityId, newRmId, reason } = req.body;
    if (!entityType || !entityId || !newRmId || !reason) {
      return res.status(400).json({ error: "entityType, entityId, newRmId, and reason are required" });
    }

    const result = await RmAssignmentService.reassignRm({
      entityType,
      entityId,
      newRmId,
      assignedById: req.user!.id,
      reason,
    });

    return res.json({
      message: "Relationship Manager successfully reassigned",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
