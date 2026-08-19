import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { generateGrievanceTrackingId } from "../services/trackingIdService";
import { notify } from "../services/notificationService";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
} from "../utils/apiResponse";

/**
 * Check if user has resolver authority (State CSR Cell, JS, Planning Secretary, Admin, DNO, DNC, RM, Dept Head)
 */
const isAuthorityUser = (user: any): boolean => {
  if (!user) return false;
  const roleIdNum = Number(user.roleId || 0);
  const roleStr = String(user.role || "").toUpperCase();
  const roleSlug = String(user.roleSlug || "").toLowerCase();

  return (
    [1, 2, 3, 4, 5, 6, 7].includes(roleIdNum) ||
    roleStr.includes("SUPER_ADMIN") ||
    roleStr.includes("SECRETARY") ||
    roleStr.includes("JOINT_SECRETARY") ||
    roleStr.includes("STATE_CSR_CELL") ||
    roleStr.includes("DISTRICT_NODAL") ||
    roleStr.includes("DISTRICT_DNC") ||
    roleStr.includes("RELATIONSHIP_MANAGER") ||
    roleStr.includes("GOVT_DEPARTMENT") ||
    roleStr.includes("PORTAL_ADMIN") ||
    roleSlug.includes("joint-secretary") ||
    roleSlug.includes("nodal")
  );
};

// ─── 1. Raise Grievance (Nodal Officer / Partner / NGO / Dept / Citizen) ─────
export const raiseGrievance = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const { projectId, convergenceProjectId, issueTitle, title, issueDescription, description } = req.body;

    const actualProjectId = projectId || convergenceProjectId;
    const actualTitle = (issueTitle || title || "").trim();
    const actualDesc = (issueDescription || description || "").trim();

    if (!actualProjectId) {
      return validationErrorResponse(res, "Project ID is required to link the grievance");
    }
    if (!actualTitle || actualTitle.length < 5) {
      return validationErrorResponse(res, "Issue title must be at least 5 characters");
    }
    if (!actualDesc || actualDesc.length < 15) {
      return validationErrorResponse(res, "Issue description must be at least 15 characters");
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: actualProjectId },
      include: { organization: true, departmentOrganization: true },
    });

    if (!project) {
      return notFoundResponse(res, "Linked project not found");
    }

    const grievanceCode = await generateGrievanceTrackingId();

    const grievance = await prisma.grievance.create({
      data: {
        grievanceCode,
        projectId: actualProjectId,
        raisedByUserId: user.id,
        issueTitle: actualTitle,
        issueDescription: actualDesc,
        status: "RAISED",
      },
      include: {
        project: {
          select: { id: true, projectCode: true, title: true, district: true, sector: true },
        },
        raisedByUser: {
          select: { id: true, email: true, firstName: true, lastName: true, designation: true },
        },
      },
    });

    // Create initial Action Log (Level 1 Assignment to District CSR Cell / Org Head)
    await prisma.grievanceActionLog.create({
      data: {
        grievanceId: grievance.id,
        actorUserId: user.id,
        action: "RAISED",
        note: `Grievance recorded by ${user.email}. Dispatched to District CSR Cell & Organization Head for Level 1 Review.`,
      },
    });

    // Notify user
    await notify(user.id, "Grievance Registered", `Your grievance ${grievanceCode} has been logged and assigned for Level 1 review.`);

    return successResponse(res, grievance, `Grievance submitted successfully. Tracking Code: ${grievanceCode}`, 201);
  } catch (error: any) {
    console.error("Error in raiseGrievance:", error);
    return errorResponse(res, error.message || "Failed to raise grievance", 500);
  }
};

// ─── 2. List Grievances with Filters & Summary Counts ────────────────────────
export const listGrievances = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const { status, projectId, search, level } = req.query as Record<string, string | undefined>;

    let where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (level === "LEVEL_1") {
      where.status = { in: ["RAISED", "ACKNOWLEDGED", "LEVEL_1_REVIEW"] };
    } else if (level === "LEVEL_2") {
      where.status = { in: ["ESCALATED_TO_STATE_CELL", "ESCALATED_TO_JS_SECRETARY"] };
    } else if (level === "RESOLVED") {
      where.status = { in: ["LEVEL_1_RESOLVED", "LEVEL_2_RESOLVED", "CLOSED"] };
    }

    // Role-based visibility scoping
    const isAuthority = isAuthorityUser(user);
    if (!isAuthority) {
      // Regular partner / NGO / user sees only their raised grievances or their company's project grievances
      where.OR = [
        { raisedByUserId: user.id },
        { project: { corporatePartnerId: user.organizationId || "NONE" } },
        { project: { implementingAgencyId: user.organizationId || "NONE" } },
      ];
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { grievanceCode: { contains: term, mode: "insensitive" } },
            { issueTitle: { contains: term, mode: "insensitive" } },
            { issueDescription: { contains: term, mode: "insensitive" } },
            { project: { title: { contains: term, mode: "insensitive" } } },
            { project: { projectCode: { contains: term, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const [grievances, allForCounts] = await Promise.all([
      prisma.grievance.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              projectCode: true,
              title: true,
              district: true,
              sector: true,
              approvedBudget: true,
              organization: { select: { id: true, name: true } },
              departmentOrganization: { select: { id: true, name: true } },
            },
          },
          raisedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              designation: true,
              role: { select: { id: true, name: true } },
            },
          },
          actionLogs: {
            include: {
              actorUser: {
                select: { id: true, email: true, firstName: true, lastName: true, designation: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.grievance.findMany({
        select: { id: true, status: true },
      }),
    ]);

    const totalCount = allForCounts.length;
    const level1Count = allForCounts.filter((g) =>
      ["RAISED", "ACKNOWLEDGED", "LEVEL_1_REVIEW"].includes(g.status)
    ).length;
    const level2Count = allForCounts.filter((g) =>
      ["ESCALATED_TO_STATE_CELL", "ESCALATED_TO_JS_SECRETARY"].includes(g.status)
    ).length;
    const resolvedCount = allForCounts.filter((g) =>
      ["LEVEL_1_RESOLVED", "LEVEL_2_RESOLVED", "CLOSED"].includes(g.status)
    ).length;

    return successResponse(
      res,
      {
        grievances,
        stats: {
          total: totalCount,
          level1Pending: level1Count,
          level2Escalated: level2Count,
          resolved: resolvedCount,
        },
      },
      "Grievances retrieved successfully"
    );
  } catch (error: any) {
    console.error("Error in listGrievances:", error);
    return errorResponse(res, error.message || "Failed to list grievances", 500);
  }
};

// ─── 3. Get User's Own Grievances ───────────────────────────────────────────
export const getMyGrievances = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const grievances = await prisma.grievance.findMany({
      where: {
        OR: [
          { raisedByUserId: user.id },
          { project: { nodalOfficerUserId: user.id } },
          { project: { dncUserId: user.id } },
        ],
      },
      include: {
        project: {
          select: { id: true, projectCode: true, title: true, district: true, sector: true },
        },
        raisedByUser: {
          select: { id: true, email: true, firstName: true, lastName: true, designation: true },
        },
        actionLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, grievances, "My grievances retrieved successfully");
  } catch (error: any) {
    console.error("Error in getMyGrievances:", error);
    return errorResponse(res, error.message || "Failed to retrieve user grievances", 500);
  }
};

// ─── 4. Get Grievance by ID with Complete Hierarchy & Timeline ──────────────
export const getGrievanceById = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const { id } = req.params;

    const grievance = await prisma.grievance.findFirst({
      where: {
        OR: [{ id }, { grievanceCode: id }],
      },
      include: {
        project: {
          include: {
            organization: { select: { id: true, name: true, district: true } },
            departmentOrganization: { select: { id: true, name: true } },
          },
        },
        raisedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            designation: true,
            mobile: true,
            role: { select: { id: true, name: true } },
          },
        },
        actionLogs: {
          include: {
            actorUser: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                designation: true,
                role: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!grievance) {
      return notFoundResponse(res, "Grievance not found");
    }

    return successResponse(res, grievance, "Grievance details retrieved");
  } catch (error: any) {
    console.error("Error in getGrievanceById:", error);
    return errorResponse(res, error.message || "Failed to retrieve grievance", 500);
  }
};

// ─── 5. Get Assignable Officers for Grievance Routing ────────────────────────
export const getAssignableOfficers = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        roleId: { in: [1, 2, 3, 4, 5, 6, 7] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        designation: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true, district: true } },
      },
      orderBy: [{ roleId: "asc" }, { firstName: "asc" }],
      take: 100,
    });

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
      role: u.role?.name || `Role ${u.roleId}`,
      designation: u.designation || "Government Officer",
      assignedDistrict: u.organization?.district || null,
      orgName: u.organization?.name || null,
    }));

    return successResponse(res, formatted, "Assignable officers retrieved");
  } catch (error: any) {
    console.error("Error in getAssignableOfficers:", error);
    return errorResponse(res, error.message || "Failed to load officers", 500);
  }
};

// ─── 6. Respond / Resolve at Level 1 or Level 2 ──────────────────────────────
export const respondGrievance = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const { id } = req.params;
    const { resolutionText, responseText, note, status } = req.body;
    const resText = (resolutionText || responseText || note || "").trim();

    if (!resText || resText.length < 10) {
      return validationErrorResponse(res, "Resolution notes must be at least 10 characters");
    }

    const existing = await prisma.grievance.findFirst({
      where: { OR: [{ id }, { grievanceCode: id }] },
      include: { raisedByUser: true },
    });

    if (!existing) return notFoundResponse(res, "Grievance not found");

    // Determine target status based on current hierarchy stage
    let nextStatus = status;
    if (!nextStatus) {
      if (["ESCALATED_TO_STATE_CELL", "ESCALATED_TO_JS_SECRETARY"].includes(existing.status)) {
        nextStatus = "LEVEL_2_RESOLVED";
      } else {
        nextStatus = "LEVEL_1_RESOLVED";
      }
    }

    const actionName = nextStatus === "LEVEL_2_RESOLVED" ? "LEVEL_2_RESOLVED" : "LEVEL_1_RESOLVED";

    const updated = await prisma.grievance.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        resolutionText: resText,
      },
    });

    // Record Action Log
    await prisma.grievanceActionLog.create({
      data: {
        grievanceId: existing.id,
        actorUserId: user.id,
        action: actionName,
        note: resText,
      },
    });

    // Notify the user who raised it
    if (existing.raisedByUserId) {
      await notify(
        existing.raisedByUserId,
        "Grievance Resolution Updated",
        `Your grievance ${existing.grievanceCode} has been marked as ${nextStatus.replace(/_/g, " ")}. Resolution notes have been posted.`
      );
    }

    return successResponse(res, updated, `Grievance successfully updated to ${nextStatus.replace(/_/g, " ")}`);
  } catch (error: any) {
    console.error("Error in respondGrievance:", error);
    return errorResponse(res, error.message || "Failed to submit resolution", 500);
  }
};

// ─── 7. Escalate Grievance (Level 1 -> Level 2 State CSR Cell / JS) ───────────
export const escalateGrievance = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const { id } = req.params;
    const { escalationReason, escalateTo, note } = req.body;
    const reason = (escalationReason || note || "").trim();

    if (!reason || reason.length < 10) {
      return validationErrorResponse(res, "Escalation justification must be at least 10 characters");
    }

    const existing = await prisma.grievance.findFirst({
      where: { OR: [{ id }, { grievanceCode: id }] },
      include: { raisedByUser: true },
    });

    if (!existing) return notFoundResponse(res, "Grievance not found");

    const targetStatus = escalateTo === "JOINT_SECRETARY" ? "ESCALATED_TO_JS_SECRETARY" : "ESCALATED_TO_STATE_CELL";
    const actionName = targetStatus;

    const updated = await prisma.grievance.update({
      where: { id: existing.id },
      data: {
        status: targetStatus,
      },
    });

    // Record Action Log
    await prisma.grievanceActionLog.create({
      data: {
        grievanceId: existing.id,
        actorUserId: user.id,
        action: actionName,
        note: `Escalated: ${reason}`,
      },
    });

    // Notify
    if (existing.raisedByUserId) {
      await notify(
        existing.raisedByUserId,
        "Grievance Escalated",
        `Your grievance ${existing.grievanceCode} has been escalated to ${targetStatus === "ESCALATED_TO_JS_SECRETARY" ? "Joint Secretary" : "State CSR Cell"}.`
      );
    }

    return successResponse(res, updated, `Grievance escalated to ${targetStatus.replace(/_/g, " ")}`);
  } catch (error: any) {
    console.error("Error in escalateGrievance:", error);
    return errorResponse(res, error.message || "Failed to escalate grievance", 500);
  }
};

// ─── 8. Close Grievance (Official Final Determination) ───────────────────────
export const closeGrievance = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const { id } = req.params;
    const { closureReason, resolutionSummary, note } = req.body;
    const reason = (closureReason || resolutionSummary || note || "Grievance resolved and verified with stakeholders.").trim();

    const existing = await prisma.grievance.findFirst({
      where: { OR: [{ id }, { grievanceCode: id }] },
      include: { raisedByUser: true },
    });

    if (!existing) return notFoundResponse(res, "Grievance not found");

    const updated = await prisma.grievance.update({
      where: { id: existing.id },
      data: {
        status: "CLOSED",
        resolutionText: existing.resolutionText ? `${existing.resolutionText}\n\nFinal Closure: ${reason}` : reason,
      },
    });

    await prisma.grievanceActionLog.create({
      data: {
        grievanceId: existing.id,
        actorUserId: user.id,
        action: "CLOSED",
        note: `Formally closed by authority: ${reason}`,
      },
    });

    if (existing.raisedByUserId) {
      await notify(
        existing.raisedByUserId,
        "Grievance Closed",
        `Your grievance ${existing.grievanceCode} has been formally closed with final resolution.`
      );
    }

    return successResponse(res, updated, "Grievance formally closed");
  } catch (error: any) {
    console.error("Error in closeGrievance:", error);
    return errorResponse(res, error.message || "Failed to close grievance", 500);
  }
};

// ─── 9. Assign Grievance to Specific Officer / Desk ─────────────────────────
export const assignGrievance = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const { id } = req.params;
    const { userId, officerEmail, note } = req.body;

    const existing = await prisma.grievance.findFirst({
      where: { OR: [{ id }, { grievanceCode: id }] },
    });

    if (!existing) return notFoundResponse(res, "Grievance not found");

    let assignedUser: any = null;
    if (userId) {
      assignedUser = await prisma.user.findUnique({ where: { id: userId } });
    } else if (officerEmail) {
      assignedUser = await prisma.user.findUnique({ where: { email: officerEmail.toLowerCase() } });
    }

    const assigneeDesc = assignedUser
      ? `${assignedUser.email} (${[assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(" ") || "Officer"})`
      : "Designated Desk";

    await prisma.grievanceActionLog.create({
      data: {
        grievanceId: existing.id,
        actorUserId: user.id,
        action: "ASSIGNED",
        note: `Assigned to ${assigneeDesc}${note ? `. Remark: ${note}` : ""}`,
      },
    });

    if (assignedUser) {
      await notify(
        assignedUser.id,
        "Grievance Assigned",
        `Grievance ${existing.grievanceCode} has been assigned to you for investigation and action.`
      );
    }

    return successResponse(res, existing, `Grievance successfully assigned to ${assigneeDesc}`);
  } catch (error: any) {
    console.error("Error in assignGrievance:", error);
    return errorResponse(res, error.message || "Failed to assign grievance", 500);
  }
};
