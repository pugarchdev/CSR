import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import prisma from "../config/db";
import { revokeSession, revokeAllUserSessions } from "../services/sessionService";
import { successResponse, errorResponse, notFoundResponse, forbiddenResponse } from "../utils/apiResponse";

export const getActiveSessions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "User not authenticated", 401);

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiry: { gt: new Date() }
      },
      orderBy: { lastActivity: "desc" }
    });

    return successResponse(res, sessions, "Active sessions retrieved");
  } catch (error) {
    return errorResponse(res, "Failed to retrieve active sessions");
  }
};

export const getLoginHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "User not authenticated", 401);

    const history = await prisma.session.findMany({
      where: { userId },
      orderBy: { loginTime: "desc" },
      take: 50
    });

    return successResponse(res, history, "Login history retrieved");
  } catch (error) {
    return errorResponse(res, "Failed to retrieve login history");
  }
};

export const revokeSessionEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "User not authenticated", 401);

    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id }
    });

    if (!session) {
      return notFoundResponse(res, "Session not found");
    }

    // A user can only revoke their own session, unless they are a SUPER_ADMIN.
    if (session.userId !== userId && req.user?.role !== "SUPER_ADMIN") {
      return forbiddenResponse(res, "You are not authorized to revoke this session");
    }

    await revokeSession(id, userId, "Revoked via Security Dashboard");

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "SESSION_REVOKED",
        details: { sessionId: id, targetUserId: session.userId }
      }
    }).catch(() => {});

    return successResponse(res, null, "Session revoked successfully");
  } catch (error) {
    return errorResponse(res, "Failed to revoke session");
  }
};

export const revokeAllSessionsEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return errorResponse(res, "User not authenticated", 401);

    await revokeAllUserSessions(userId, userId, "Revoked all sessions via Security Dashboard");

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "ALL_SESSIONS_REVOKED",
        details: {}
      }
    }).catch(() => {});

    return successResponse(res, null, "All sessions revoked successfully");
  } catch (error) {
    return errorResponse(res, "Failed to revoke all sessions");
  }
};
