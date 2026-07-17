/**
 * Implementing Agency Sub-Login Controller
 *
 * Convergence framework (PDF Section 6.1): a Corporate User can delegate
 * project implementation to an NGO/Foundation by creating a sub-login.
 * The sub-login requires District Nodal Officer approval before activation,
 * must carry a valid CSR-1 registration, and the corporate remains
 * fully accountable.
 */
import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { UserAccountStatus } from "@prisma/client";
import { Role } from "../types/role";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../utils/apiResponse";
import { notify, auditLog } from "../services/notificationService";

/**
 * Corporate roles are interchangeable across the platform: a corporate/company
 * account may carry any of these, and all of them represent the same "corporate"
 * actor in the convergence framework. Grouping them here keeps this controller
 * consistent with the rest of the codebase (grievance, convergence, dashboards).
 */
const CORPORATE_ROLES: Role[] = [
  Role.CORPORATE_USER,
  Role.COMPANY_ADMIN,
  Role.COMPANY_MEMBER,
];

// ─── Corporate: create IA sub-login ─────────────────────────────────
export const createSubLogin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");
    if (!CORPORATE_ROLES.includes(userRole!)) {
      return forbiddenResponse(res, "Only corporate users can create implementing agency sub-logins");
    }

    const { email, password, agencyName, csr1Number, projectId } = req.body as {
      email?: string;
      password?: string;
      agencyName?: string;
      csr1Number?: string;
      projectId?: string;
    };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return validationErrorResponse(res, "Valid email is required");
    }
    if (!password || password.length < 6) {
      return validationErrorResponse(res, "Password must be at least 6 characters");
    }
    if (!agencyName || agencyName.trim().length < 2) {
      return validationErrorResponse(res, "Agency name is required");
    }
    if (!csr1Number || !/^CSR[0-9]{8}$/i.test(csr1Number.trim())) {
      return validationErrorResponse(res, "Valid CSR-1 registration number is required (format: CSR00012345)");
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return validationErrorResponse(res, "A user with this email already exists");
    }

    // Optional project link — must belong to this corporate.
    let project = null;
    if (projectId) {
      project = await prisma.convergenceProject.findFirst({
        where: {
          id: projectId,
          OR: [
            { corporateUserId: userId },
            { corporateEnquiry: { email: { equals: req.user?.email, mode: "insensitive" } } },
          ],
        },
        select: { id: true, projectId: true, title: true, nodalOfficerUserId: true },
      });
      if (!project) {
        return notFoundResponse(res, "Project not found or does not belong to you");
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const iaUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: Role.IMPLEMENTING_AGENCY_USER,
        accountStatus: UserAccountStatus.PENDING_APPROVAL,
        isVerified: true, // credential delivery handled by corporate; activation gated on nodal approval
        parentCorporateUserId: userId,
        iaCsr1Number: csr1Number.trim().toUpperCase(),
        iaAgencyName: agencyName.trim(),
      },
      select: {
        id: true,
        email: true,
        role: true,
        accountStatus: true,
        iaAgencyName: true,
        iaCsr1Number: true,
        createdAt: true,
      },
    });

    // Notify the nodal officer (project-specific if given, otherwise all nodal officers idle)
    if (project?.nodalOfficerUserId) {
      await notify(
        project.nodalOfficerUserId,
        "Implementing Agency approval required",
        `${agencyName.trim()} (CSR-1: ${csr1Number.trim().toUpperCase()}) was added as implementing agency for project ${project.projectId}. Review and approve the sub-login.`
      ).catch(() => {});
    }

    await auditLog(userId, "IA_SUBLOGIN_CREATED", {
      iaUserId: iaUser.id,
      agencyName: agencyName.trim(),
      csr1Number: csr1Number.trim().toUpperCase(),
      projectId: project?.id,
    }).catch(() => {});

    return successResponse(
      res,
      iaUser,
      "Implementing agency sub-login created. It becomes active after District Nodal Officer approval.",
      201
    );
  } catch (error) {
    console.error("Error in createSubLogin:", error);
    return errorResponse(res, "Failed to create implementing agency sub-login", 500);
  }
};

// ─── Corporate: list own sub-logins ─────────────────────────────────
export const listMySubLogins = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");

    const subLogins = await prisma.user.findMany({
      where: { parentCorporateUserId: userId, role: Role.IMPLEMENTING_AGENCY_USER },
      select: {
        id: true,
        email: true,
        accountStatus: true,
        iaAgencyName: true,
        iaCsr1Number: true,
        iaApprovedByUser: { select: { email: true } },
        iaProjects: { select: { id: true, projectId: true, title: true, status: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, subLogins, "Sub-logins retrieved");
  } catch (error) {
    console.error("Error in listMySubLogins:", error);
    return errorResponse(res, "Failed to retrieve sub-logins", 500);
  }
};

// ─── Corporate: assign approved IA to own project ───────────────────
export const assignAgencyToProject = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");
    if (!CORPORATE_ROLES.includes(req.user?.role!)) {
      return forbiddenResponse(res, "Only corporate users can assign implementing agencies");
    }

    const { projectId, iaUserId } = req.body as { projectId?: string; iaUserId?: string };
    if (!projectId || !iaUserId) {
      return validationErrorResponse(res, "projectId and iaUserId are required");
    }

    const [project, iaUser] = await Promise.all([
      prisma.convergenceProject.findFirst({
        where: {
          id: projectId,
          OR: [
            { corporateUserId: userId },
            { corporateEnquiry: { email: { equals: req.user?.email, mode: "insensitive" } } },
          ],
        },
      }),
      prisma.user.findFirst({
        where: { id: iaUserId, parentCorporateUserId: userId, role: Role.IMPLEMENTING_AGENCY_USER },
      }),
    ]);

    if (!project) return notFoundResponse(res, "Project not found or does not belong to you");
    if (!iaUser) return notFoundResponse(res, "Implementing agency sub-login not found");
    if (iaUser.accountStatus !== UserAccountStatus.ACTIVE) {
      return validationErrorResponse(
        res,
        "This implementing agency is not yet approved by the District Nodal Officer"
      );
    }

    const updated = await prisma.convergenceProject.update({
      where: { id: project.id },
      data: { implementingAgencyUserId: iaUser.id },
      select: { id: true, projectId: true, title: true, implementingAgencyUser: { select: { email: true, iaAgencyName: true } } },
    });

    await notify(
      iaUser.id,
      "Project assigned",
      `You have been assigned as implementing agency for project ${project.projectId} — ${project.title}.`
    ).catch(() => {});

    await auditLog(userId, "IA_ASSIGNED_TO_PROJECT", {
      projectId: project.id,
      iaUserId: iaUser.id,
    }).catch(() => {});

    return successResponse(res, updated, "Implementing agency assigned to project");
  } catch (error) {
    console.error("Error in assignAgencyToProject:", error);
    return errorResponse(res, "Failed to assign implementing agency", 500);
  }
};

// ─── Nodal Officer: list pending IA approvals ───────────────────────
export const listPendingApprovals = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");

    const allowed: Role[] = [
      Role.DISTRICT_NODAL_OFFICER,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
      Role.STATE_CSR_CELL,
    ];
    if (!allowed.includes(userRole!)) {
      return forbiddenResponse(res, "You don't have permission to review implementing agency approvals");
    }

    const pending = await prisma.user.findMany({
      where: { role: Role.IMPLEMENTING_AGENCY_USER, accountStatus: UserAccountStatus.PENDING_APPROVAL },
      select: {
        id: true,
        email: true,
        iaAgencyName: true,
        iaCsr1Number: true,
        parentCorporateUser: { select: { id: true, email: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(res, pending, "Pending implementing agency approvals retrieved");
  } catch (error) {
    console.error("Error in listPendingApprovals:", error);
    return errorResponse(res, "Failed to retrieve pending approvals", 500);
  }
};

// ─── Nodal Officer: approve / reject IA sub-login ───────────────────
export const decideSubLogin = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return unauthorizedResponse(res, "User not authenticated");

    const allowed: Role[] = [
      Role.DISTRICT_NODAL_OFFICER,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
    ];
    if (!allowed.includes(userRole!)) {
      return forbiddenResponse(res, "You don't have permission to approve implementing agencies");
    }

    const { id } = req.params;
    const { decision, remarks } = req.body as { decision?: string; remarks?: string };

    if (!decision || !["APPROVE", "REJECT"].includes(decision)) {
      return validationErrorResponse(res, "decision must be APPROVE or REJECT");
    }

    const iaUser = await prisma.user.findFirst({
      where: { id, role: Role.IMPLEMENTING_AGENCY_USER, accountStatus: UserAccountStatus.PENDING_APPROVAL },
      select: { id: true, email: true, iaAgencyName: true, parentCorporateUserId: true },
    });
    if (!iaUser) return notFoundResponse(res, "Pending implementing agency sub-login not found");

    const updated = await prisma.user.update({
      where: { id: iaUser.id },
      data: {
        accountStatus: decision === "APPROVE" ? UserAccountStatus.ACTIVE : UserAccountStatus.SUSPENDED,
        iaApprovedByUserId: decision === "APPROVE" ? userId : null,
      },
      select: { id: true, email: true, accountStatus: true, iaAgencyName: true },
    });

    if (iaUser.parentCorporateUserId) {
      await notify(
        iaUser.parentCorporateUserId,
        decision === "APPROVE" ? "Implementing agency approved" : "Implementing agency rejected",
        decision === "APPROVE"
          ? `${iaUser.iaAgencyName || iaUser.email} has been approved by the District Nodal Officer and can now log in.`
          : `${iaUser.iaAgencyName || iaUser.email} was not approved.${remarks ? ` Reason: ${remarks}` : ""}`
      ).catch(() => {});
    }

    await auditLog(userId, `IA_SUBLOGIN_${decision}D`, {
      iaUserId: iaUser.id,
      remarks,
    }).catch(() => {});

    return successResponse(
      res,
      updated,
      decision === "APPROVE" ? "Implementing agency approved and activated" : "Implementing agency rejected"
    );
  } catch (error) {
    console.error("Error in decideSubLogin:", error);
    return errorResponse(res, "Failed to process approval decision", 500);
  }
};
