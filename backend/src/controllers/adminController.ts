import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";
import { runEscalationSweep } from "../services/slaSchedulerService";
import SLAEscalationService from "../services/slaEscalationService";

const getRequestTenantId = (req: AuthenticatedRequest) =>
  (req as any).tenantContext?.tenantId || req.user?.tenantId || null;

const isGlobalAdmin = (req: AuthenticatedRequest) =>
  req.user?.role === Role.MASTER_ADMIN || req.user?.role === Role.SUPER_ADMIN;

const isTopLevelAdminRole = (role: Role) =>
  role === Role.MASTER_ADMIN || role === Role.SUPER_ADMIN;

const tenantScope = (req: AuthenticatedRequest) => {
  const tenantId = getRequestTenantId(req);
  if (!tenantId || isGlobalAdmin(req)) return {};
  return { tenantId };
};

export const getAdminOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where = tenantScope(req);
    const [
      users,
      pendingNgos,
      pendingCompanies,
      submittedProjects,
      auditLogs
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.nGO.count({ where: { ...where, status: "PENDING" } }),
      prisma.company.count({ where: { ...where, status: "PENDING" } }),
      prisma.project.count({ where: { ...where, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({ users, pendingNgos, pendingCompanies, submittedProjects, auditLogs });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where = tenantScope(req);
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        organizationId: true,
        email: true,
        role: true,
        accountStatus: true,
        isVerified: true,
        ngoId: true,
        companyId: true,
        createdAt: true,
        ngo: { select: { name: true, status: true } },
        company: { select: { name: true, status: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 250
    });

    return res.json(users);
  } catch (error) {
    next(error);
  }
};

export const createAdminUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, assignedDistrict, accountStatus = "ACTIVE" } = req.body;
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (req.user?.role === Role.PORTAL_ADMIN && isTopLevelAdminRole(role)) {
      return res.status(403).json({ error: "Portal Admin cannot create Master Admin or Super Admin users" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "Email already registered" });

    const tenantId = getRequestTenantId(req) || (await prisma.tenant.findUnique({ where: { code: "MH-CSR" } }))?.id || null;
    const passwordHash = await bcrypt.hash(password, 10);
    const needsDistrict = role === Role.CSR_RELATIONSHIP_MANAGER || role === Role.DISTRICT_NODAL_OFFICER || role === Role.DISTRICT_ADMIN;

    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        role,
        accountStatus,
        isVerified: true,
        assignedDistrict: needsDistrict ? assignedDistrict || null : assignedDistrict || null,
      },
      select: {
        id: true,
        tenantId: true,
        organizationId: true,
        email: true,
        role: true,
        accountStatus: true,
        isVerified: true,
        assignedDistrict: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user?.id,
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "ADMIN_USER_CREATED",
        entityType: "USER",
        entityId: user.id,
        details: {
          email: user.email,
          role: user.role,
          assignedDistrict: user.assignedDistrict,
          accountStatus: user.accountStatus,
        },
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { role, assignedDistrict, accountStatus } = req.body;
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existingUser) return res.status(404).json({ error: "User not found" });
    if (!isGlobalAdmin(req) && existingUser.tenantId !== getRequestTenantId(req)) {
      return res.status(403).json({ error: "Cannot update a user outside your portal instance" });
    }
    if (existingUser.role === Role.MASTER_ADMIN && req.user?.role !== Role.MASTER_ADMIN) {
      return res.status(403).json({ error: "Master Admin cannot be modified by this account" });
    }
    if (req.user?.role === Role.PORTAL_ADMIN && (isTopLevelAdminRole(existingUser.role) || isTopLevelAdminRole(role))) {
      return res.status(403).json({ error: "Portal Admin cannot modify Master Admin or Super Admin access" });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        role,
        assignedDistrict: assignedDistrict ?? existingUser.assignedDistrict,
        accountStatus: accountStatus ?? existingUser.accountStatus,
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: existingUser.tenantId || getRequestTenantId(req),
        userId: req.user?.id,
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "ADMIN_USER_ROLE_UPDATE",
        entityType: "USER",
        entityId: req.params.id,
        oldValueJson: {
          role: existingUser.role,
          assignedDistrict: existingUser.assignedDistrict,
          accountStatus: existingUser.accountStatus,
        },
        newValueJson: { role, assignedDistrict: user.assignedDistrict, accountStatus: user.accountStatus },
        details: { targetUserId: req.params.id, role, assignedDistrict: user.assignedDistrict, accountStatus: user.accountStatus }
      }
    });

    return res.json({ id: user.id, email: user.email, role: user.role, assignedDistrict: user.assignedDistrict, accountStatus: user.accountStatus });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually trigger the SLA escalation sweep.
 *
 * The scheduler runs this automatically on an interval, but this endpoint lets
 * an admin force a sweep on demand and is also the entry point for an external
 * cron on serverless deployments (where interval timers don't run).
 */
export const runSlaEscalations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await runEscalationSweep();
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "SLA_ESCALATION_SWEEP_TRIGGERED",
        details: result
      }
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * Return SLA compliance statistics for the admin dashboard.
 */
export const getSlaStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await SLAEscalationService.getStatistics();
    return res.json(stats);
  } catch (error) {
    next(error);
  }
};
