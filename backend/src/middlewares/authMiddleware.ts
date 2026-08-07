import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../types/role";
import { userHasAnyRole } from "../services/roleResolver";
import { getJwtSecret } from "../config/env";
import prisma from "../config/db";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: Role | null;
    /** Stable slug of the user's dynamic OrganizationRole (e.g. "joint-secretary"). */
    roleSlug?: string | null;
    roleId?: string | null;
    organizationId?: string | null;
    accountStatus?: string | null;
    ngoId?: string | null;
    companyId?: string | null;
    assignedDistrict?: string | null;
    beneficiaryProfileId?: string | null;
    organization?: any;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, getJwtSecret(), async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired access token" });
    }
    const payload = decoded as any;
    if (!payload?.id) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          roleId: true,
          organizationId: true,
          accountStatus: true,
          isVerified: true,
          deletedAt: true,
          tokenVersion: true,
          officerProfile: { select: { district: true } }
        }
      });

      // Strict Invariant #2: No inactive, suspended, deleted, or unverified user can authenticate
      if (!dbUser || dbUser.deletedAt || dbUser.accountStatus !== "ACTIVE" || !dbUser.isVerified) {
        return res.status(401).json({ error: "Account is inactive, unverified, suspended, or deleted" });
      }

      if (payload.tokenVersion && dbUser.tokenVersion !== payload.tokenVersion) {
        return res.status(401).json({ error: "Session invalidated due to permission/role update. Please sign in again." });
      }

      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.roleId,
        roleId: dbUser.roleId ? String(dbUser.roleId) : null,
        organizationId: dbUser.organizationId,
        accountStatus: dbUser.accountStatus,
        assignedDistrict: dbUser.officerProfile?.district || null,
      };
      next();
    } catch (dbErr) {
      return res.status(500).json({ error: "Internal authentication error" });
    }
  });
};

export const optionalAuthenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return next();
  }

  jwt.verify(token, getJwtSecret(), async (err, decoded) => {
    if (!err && decoded && (decoded as any).id) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: (decoded as any).id },
          select: {
            id: true,
            email: true,
            roleId: true,
            organizationId: true,
            accountStatus: true,
            isVerified: true,
            deletedAt: true,
            tokenVersion: true,
            officerProfile: { select: { district: true } }
          }
        });
        if (dbUser && !dbUser.deletedAt && dbUser.accountStatus === "ACTIVE" && dbUser.isVerified) {
          const payload = decoded as any;
          if (!payload.tokenVersion || payload.tokenVersion === dbUser.tokenVersion) {
            req.user = {
              id: dbUser.id,
              email: dbUser.email,
              role: dbUser.roleId,
              roleId: dbUser.roleId ? String(dbUser.roleId) : null,
              organizationId: dbUser.organizationId,
              accountStatus: dbUser.accountStatus,
              assignedDistrict: dbUser.officerProfile?.district || null,
            };
          }
        }
      } catch (_) {}
    }
    return next();
  });
};

/**
 * Legacy role-gate. Checks the principal against the allowed identities on BOTH
 * axes (base enum bucket + dynamic role slug).
 */
export const authorizeRoles = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    if (!userHasAnyRole(req.user, allowedRoles)) {
      return res.status(403).json({ error: `Forbidden: role '${req.user.role}' lacks permissions` });
    }

    next();
  };
};
