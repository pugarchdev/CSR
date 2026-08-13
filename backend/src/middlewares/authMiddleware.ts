import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../types/role";
import { userHasAnyRole } from "../services/roleResolver";
import { getJwtSecret } from "../config/env";
import prisma from "../config/db";

const AUTH_VALIDATION_TTL_MS = Math.min(60_000, Math.max(5_000, Number(process.env.AUTH_VALIDATION_CACHE_MS) || 15_000));
const authValidationCache = new Map<string, { user: any; expiresAt: number }>();
const authValidationInflight = new Map<string, Promise<any>>();

export function primeAuthenticatedUserCache(user: any) {
  if (!user?.id) return;
  const key = `${user.id}:${user.tokenVersion ?? "legacy"}`;
  authValidationCache.set(key, { user, expiresAt: Date.now() + AUTH_VALIDATION_TTL_MS });
}

async function loadActiveUser(userId: string, tokenVersion?: number | null) {
  const key = `${userId}:${tokenVersion ?? "legacy"}`;
  const cached = authValidationCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  if (cached) authValidationCache.delete(key);

  const pending = authValidationInflight.get(key);
  if (pending) return pending;

  const request = prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, roleId: true, organizationId: true, accountStatus: true,
      isVerified: true, deletedAt: true, tokenVersion: true,
      officerProfile: { select: { district: true } }
    }
  }).then((user) => {
    if (authValidationCache.size >= 5_000) {
      const oldestKey = authValidationCache.keys().next().value;
      if (oldestKey) authValidationCache.delete(oldestKey);
    }
    if (user) primeAuthenticatedUserCache(user);
    return user;
  }).finally(() => authValidationInflight.delete(key));

  authValidationInflight.set(key, request);
  return request;
}

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
    ngoAccessId?: string | null;
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
      const dbUser = await loadActiveUser(payload.id, payload.tokenVersion);

      if (!dbUser || dbUser.deletedAt || !dbUser.isVerified || dbUser.accountStatus !== "ACTIVE") {
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
      if (payload.ngoAccessId) {
        const access = await prisma.corporateNgoAccess.findUnique({ where: { id: payload.ngoAccessId }, include: { membership: true } });
        if (!access || access.userId !== dbUser.id || access.status !== "ACTIVE" || access.membership.status !== "APPROVED") return res.status(401).json({ error: "NGO access context is inactive or revoked" });
        req.user.ngoAccessId = access.id;
        req.user.ngoId = access.membership.ngoOrganizationId;
        req.user.companyId = access.membership.corporateOrganizationId;
      }
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
        const payload = decoded as any;
        const dbUser = await loadActiveUser(payload.id, payload.tokenVersion);
        if (dbUser && !dbUser.deletedAt && dbUser.isVerified && dbUser.accountStatus === "ACTIVE") {
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
