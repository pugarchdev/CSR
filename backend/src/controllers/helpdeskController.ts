/**
 * Static Helpdesk Query Controller
 *
 * Public helpdesk with a 2-day resolution SLA (PDF SLA table:
 * STATIC_HELPDESK = 2 days). Anyone can submit; State CSR Cell /
 * admins resolve.
 */
import { Response } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { Role } from "../types/role";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../utils/apiResponse";
import { SLA_TIMELINES } from "../services/slaEscalationService";

const generateHelpdeskTrackingId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `HD-MH-${year}-`;
  const last = await prisma.helpdeskQuery.findFirst({
    where: { trackingId: { startsWith: prefix } },
    orderBy: { trackingId: "desc" },
    select: { trackingId: true },
  });
  const lastSequence = last?.trackingId.split("-").at(-1);
  const next = lastSequence && !Number.isNaN(Number(lastSequence)) ? Number(lastSequence) + 1 : 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
};

const isAuthorizedResolver = (user: any): boolean => {
  if (!user) return false;
  const roleIdNum = Number(user.roleId);
  const roleStr = String(user.role || "").toUpperCase();
  const roleSlug = String(user.roleSlug || "").toLowerCase();

  return (
    [1, 2, 3, 6].includes(roleIdNum) ||
    roleStr.includes("SUPER_ADMIN") ||
    roleStr.includes("SECRETARY") ||
    roleStr.includes("RELATIONSHIP_MANAGER") ||
    roleStr === "RM" ||
    roleStr.includes("PORTAL_ADMIN") ||
    roleStr.includes("STATE_CSR_CELL") ||
    roleSlug.includes("relationship-manager")
  );
};

// ─── Public: submit helpdesk query ──────────────────────────────────
export const submitQuery = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const { subject, message, name, email, mobile } = req.body as Record<string, string | undefined>;

    if (!subject || !subject.trim()) return validationErrorResponse(res, "Subject is required");
    if (subject.length > 200) return validationErrorResponse(res, "Subject must be under 200 characters");
    if (!message || !message.trim()) return validationErrorResponse(res, "Message is required");
    if (message.length > 5000) return validationErrorResponse(res, "Message must be under 5000 characters");
    if (!name || !name.trim()) return validationErrorResponse(res, "Name is required");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return validationErrorResponse(res, "Valid email is required");
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) return validationErrorResponse(res, "Mobile must be a valid 10-digit number");

    const trackingId = await generateHelpdeskTrackingId();
    const resolutionDueAt = new Date();
    resolutionDueAt.setDate(resolutionDueAt.getDate() + SLA_TIMELINES.STATIC_HELPDESK);

    const query = await prisma.helpdeskQuery.create({
      data: {
        trackingId,
        subject: subject.trim(),
        message: message.trim(),
        name: name.trim(),
        email: email.toLowerCase(),
        mobile: mobile || null,
        raisedByUserId: req.user?.id || null,
        resolutionDueAt,
      },
      select: { id: true, trackingId: true, subject: true, status: true, resolutionDueAt: true, createdAt: true },
    });

    return successResponse(
      res,
      query,
      `Query submitted. Tracking ID: ${trackingId}. You will receive a response within ${SLA_TIMELINES.STATIC_HELPDESK} days.`,
      201
    );
  } catch (error) {
    console.error("Error in submitQuery:", error);
    return errorResponse(res, "Failed to submit helpdesk query", 500);
  }
};

// ─── Public: check query status by tracking ID ──────────────────────
export const getQueryByTrackingId = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const { trackingId } = req.params;
    const query = await prisma.helpdeskQuery.findUnique({
      where: { trackingId },
      select: {
        trackingId: true,
        subject: true,
        status: true,
        resolution: true,
        resolutionDueAt: true,
        resolvedAt: true,
        createdAt: true,
      },
    });
    if (!query) return notFoundResponse(res, "Helpdesk query not found");
    return successResponse(res, query, "Query status retrieved");
  } catch (error) {
    console.error("Error in getQueryByTrackingId:", error);
    return errorResponse(res, "Failed to retrieve query", 500);
  }
};

// ─── Staff / Authenticated: list queries ────────────────────────────
export const listQueries = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");

    const isResolver = isAuthorizedResolver(user);
    const { status } = req.query as { status?: string };

    let where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }

    if (!isResolver) {
      where.OR = [
        { raisedByUserId: user.id },
        ...(user.email ? [{ email: user.email.toLowerCase() }] : [])
      ];
    }

    const queries = await prisma.helpdeskQuery.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
    });

    const now = new Date();
    const data = queries.map((q) => ({
      ...q,
      isOverdue: !q.resolvedAt && q.resolutionDueAt < now,
    }));

    return successResponse(res, data, "Helpdesk queries retrieved");
  } catch (error) {
    console.error("Error in listQueries:", error);
    return errorResponse(res, "Failed to retrieve helpdesk queries", 500);
  }
};

// ─── Staff: resolve query ───────────────────────────────────────────
export const resolveQuery = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
  try {
    const user = req.user;
    if (!user?.id) return unauthorizedResponse(res, "User not authenticated");
    if (!isAuthorizedResolver(user)) {
      return forbiddenResponse(res, "You don't have permission to resolve helpdesk queries");
    }

    const { id } = req.params;
    const { resolution, status } = req.body as { resolution?: string; status?: string };

    const allowedStatuses = ["IN_PROGRESS", "RESOLVED", "CLOSED"];
    if (status && !allowedStatuses.includes(status)) {
      return validationErrorResponse(res, `status must be one of: ${allowedStatuses.join(", ")}`);
    }
    if ((status === "RESOLVED" || status === "CLOSED") && (!resolution || !resolution.trim())) {
      return validationErrorResponse(res, "A resolution message is required to resolve or close a query");
    }

    const existing = await prisma.helpdeskQuery.findUnique({ where: { id } });
    if (!existing) return notFoundResponse(res, "Helpdesk query not found");

    const updated = await prisma.helpdeskQuery.update({
      where: { id },
      data: {
        status: status || "RESOLVED",
        resolution: resolution?.trim() || existing.resolution,
        resolvedByUserId: user.id,
        resolvedAt: status === "IN_PROGRESS" ? null : new Date(),
      },
    });

    return successResponse(res, updated, "Helpdesk query updated");
  } catch (error) {
    console.error("Error in resolveQuery:", error);
    return errorResponse(res, "Failed to update helpdesk query", 500);
  }
};
