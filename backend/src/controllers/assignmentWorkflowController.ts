import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import prisma from "../config/db";
import { ScopedAssignmentService } from "../services/scopedAssignmentService";
import { RmAssignmentService } from "../services/rmAssignmentService";
import { ROLE_ID } from "../types/role";

export const getDncQueue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const isSuper = req.user?.role === 1 || req.user?.role === "SUPER_ADMIN" || req.user?.roleId === "1";

    // Find DNC's assigned district
    let targetDistrict: string | null = (req.query.district as string | undefined) ?? null;

    if (!targetDistrict && !isSuper) {
      const dncAssignment = await prisma.districtDncAssignment.findFirst({
        where: { dncUserId: userId, isActive: true },
        select: { district: true },
      });
      targetDistrict = dncAssignment?.district ?? req.user?.assignedDistrict ?? null;
    }

    if (!targetDistrict && !isSuper) {
      return res.status(400).json({ error: "District not found for District Nodal Consultant" });
    }

    const where: any = targetDistrict ? { district: targetDistrict } : {};

    const projects = await prisma.project.findMany({
      where,
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
      district: targetDistrict,
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
    const isSuper = req.user?.role === 1 || req.user?.role === "SUPER_ADMIN" || req.user?.roleId === "1";
    let targetDistrict: string | null = (req.query.district as string) || null;

    if (!targetDistrict && !isSuper) {
      const dnc = await prisma.districtDncAssignment.findFirst({
        where: { dncUserId: req.user!.id, isActive: true },
        select: { district: true },
      });
      targetDistrict = dnc?.district ?? null;
    }

    // Find all DNO users (Role ID 4)
    const dnoUsers = await prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        deletedAt: null,
        OR: [
          { roleId: ROLE_ID.DISTRICT_NODAL_OFFICER },
          { role: { code: "DISTRICT_NODAL_OFFICER" } },
        ],
      },
      include: {
        officerProfile: true,
        organization: true,
      },
    });

    const results = dnoUsers.map((user) => {
      const userDistrict = user.officerProfile?.district || user.organization?.district;
      const isDistrictMatch =
        !targetDistrict || (userDistrict && userDistrict.toLowerCase() === targetDistrict.toLowerCase());

      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        district: userDistrict || "Unspecified",
        isValid: isDistrictMatch,
        disabledReason: !isDistrictMatch
          ? `Officer belongs to district '${userDistrict}', which does not match target district '${targetDistrict}'`
          : null,
      };
    });

    return res.json({
      targetDistrict,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const getGovAdminQueue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userOrgId = req.user?.organizationId;
    const isSuper = req.user?.role === 1 || req.user?.role === "SUPER_ADMIN" || req.user?.roleId === "1";

    const targetOrgId = isSuper ? (req.query.organizationId as string | undefined) : userOrgId;

    const where: any = targetOrgId ? { organizationId: targetOrgId } : {};

    const projects = await prisma.project.findMany({
      where,
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
      organizationId: targetOrgId,
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
    const isSuper = req.user?.role === 1 || req.user?.role === "SUPER_ADMIN" || req.user?.roleId === "1";
    const targetOrgId = isSuper ? (req.query.organizationId as string) : req.user?.organizationId;

    if (!targetOrgId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // Find all users in the organization
    const orgUsers = await prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
      include: {
        organization: true,
        role: true,
      },
    });

    const results = orgUsers.map((user) => {
      const isOrgMatch = user.organizationId === targetOrgId;
      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        organizationId: user.organizationId,
        organizationName: user.organization?.name || "Unspecified",
        roleName: user.role?.displayName || user.role?.name || "Member",
        isValid: isOrgMatch,
        disabledReason: !isOrgMatch
          ? `Officer belongs to organization '${user.organizationId}', not project department '${targetOrgId}'`
          : null,
      };
    });

    return res.json({
      targetOrganizationId: targetOrgId,
      data: results,
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
