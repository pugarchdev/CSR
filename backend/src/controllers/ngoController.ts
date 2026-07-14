/**
 * @deprecated LEGACY - NOT MOUNTED. Part of the disabled NGO-marketplace flow
 * (see app.ts: ENABLE_LEGACY_NGO_MARKETPLACE). This controller's route is not
 * registered; editing it has NO runtime effect in the MahaCSR Convergence Framework.
 * Active replacement: convergenceProjectController.ts (State-led convergence model)
 */
import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { VerificationStatus, Role } from "@prisma/client";

const getRequestTenantId = async (req: AuthenticatedRequest) => {
  const tenantContextId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
  if (tenantContextId) return tenantContextId;
  if (req.user?.role === Role.MASTER_ADMIN || req.user?.role === Role.SUPER_ADMIN) return null;
  const tenant = await prisma.tenant.findUnique({ where: { code: "MH-CSR" } });
  return tenant?.id || null;
};

const isGlobalAdmin = (req: AuthenticatedRequest) =>
  req.user?.role === Role.MASTER_ADMIN || req.user?.role === Role.SUPER_ADMIN;

export const getNgos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as VerificationStatus | undefined;
    const tenantId = await getRequestTenantId(req);

    // Standard users can only view verified profiles. Super Admin can view all.
    let filter: any = {};
    if (tenantId) filter.tenantId = tenantId;
    if (!isGlobalAdmin(req)) {
      filter.status = VerificationStatus.VERIFIED;
    } else if (status) {
      filter.status = status;
    }

    const ngos = await prisma.nGO.findMany({
      where: filter,
      orderBy: { name: "asc" }
    });

    return res.json(ngos);
  } catch (error) {
    next(error);
  }
};

export const getNgoById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const ngo = await prisma.nGO.findUnique({
      where: { id },
      include: {
        projects: {
          where: !isGlobalAdmin(req) ? { status: { notIn: ["DRAFT", "REJECTED"] } } : {}
        }
      }
    });

    if (!ngo) {
      return res.status(404).json({ error: "NGO not found" });
    }

    const canViewRestrictedProfile = isGlobalAdmin(req) || req.user?.ngoId === ngo.id;
    const tenantId = await getRequestTenantId(req);

    if (tenantId && ngo.tenantId && ngo.tenantId !== tenantId && !isGlobalAdmin(req)) {
      return res.status(404).json({ error: "NGO not found" });
    }

    if (ngo.status !== VerificationStatus.VERIFIED && !canViewRestrictedProfile) {
      return res.status(404).json({ error: "NGO not found" });
    }

    return res.json(ngo);
  } catch (error) {
    next(error);
  }
};

export const updateNgo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, website, socialLinks, address, district, taluka, village, impactStatistics } = req.body;

    const existingNgo = await prisma.nGO.findUnique({ where: { id } });
    if (!existingNgo) return res.status(404).json({ error: "NGO not found" });
    const tenantId = await getRequestTenantId(req);
    const canUpdateNgo = isGlobalAdmin(req) || req.user?.ngoId === id;
    if (!canUpdateNgo) {
      return res.status(403).json({ error: "Forbidden: You do not own this profile" });
    }
    if (tenantId && existingNgo.tenantId && existingNgo.tenantId !== tenantId && !isGlobalAdmin(req)) {
      return res.status(403).json({ error: "Cannot update an NGO outside your portal instance" });
    }

    const updatedNgo = await prisma.nGO.update({
      where: { id },
      data: {
        name,
        website,
        socialLinks,
        address,
        district,
        taluka,
        village,
        impactStatistics
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: existingNgo.tenantId || tenantId,
        userId: req.user?.id,
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "NGO_UPDATE",
        entityType: "NGO",
        entityId: id,
        details: { ngoId: id }
      }
    });

    return res.json(updatedNgo);
  } catch (error) {
    next(error);
  }
};

export const verifyNgo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!Object.values(VerificationStatus).includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const existingNgo = await prisma.nGO.findUnique({ where: { id } });
    if (!existingNgo) return res.status(404).json({ error: "NGO not found" });
    const tenantId = await getRequestTenantId(req);
    if (tenantId && existingNgo.tenantId && existingNgo.tenantId !== tenantId && !isGlobalAdmin(req)) {
      return res.status(403).json({ error: "Cannot verify an NGO outside your portal instance" });
    }

    const ngo = await prisma.nGO.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null
      }
    });

    // Notify NGO admins
    const users = await prisma.user.findMany({ where: { ngoId: id } });
    for (const u of users) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: `NGO Verification Status Update`,
          message: `Your NGO profile has been ${status.toLowerCase()}.${status === VerificationStatus.REJECTED ? ` Reason: ${rejectionReason}` : ""}`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: ngo.tenantId || tenantId,
        userId: req.user?.id,
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "NGO_VERIFY",
        entityType: "NGO",
        entityId: id,
        oldValueJson: { status: existingNgo.status, rejectionReason: existingNgo.rejectionReason },
        newValueJson: { status, rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null },
        details: { ngoId: id, status, rejectionReason }
      }
    });

    return res.json(ngo);
  } catch (error) {
    next(error);
  }
};

export const verifyNgoEmpanelment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { empanelmentStatus, empanelmentRemarks } = req.body;

    const existingNgo = await prisma.nGO.findUnique({ where: { id } });
    if (!existingNgo) return res.status(404).json({ error: "NGO not found" });
    const tenantId = await getRequestTenantId(req);
    if (tenantId && existingNgo.tenantId && existingNgo.tenantId !== tenantId && !isGlobalAdmin(req)) {
      return res.status(403).json({ error: "Cannot update NGO empanelment outside your portal instance" });
    }

    const ngo = await prisma.nGO.update({
      where: { id },
      data: {
        empanelmentStatus,
        empanelmentRemarks
      }
    });

    // Notify NGO admins
    const users = await prisma.user.findMany({ where: { ngoId: id } });
    for (const u of users) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: `NGO Empanelment Update`,
          message: `Your NGO empanelment status is now: ${empanelmentStatus.replace(/_/g, " ")}.${empanelmentRemarks ? ` Remarks: ${empanelmentRemarks}` : ""}`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: ngo.tenantId || tenantId,
        userId: req.user?.id,
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "NGO_EMPANELMENT_VERIFY",
        entityType: "NGO",
        entityId: id,
        oldValueJson: {
          empanelmentStatus: existingNgo.empanelmentStatus,
          empanelmentRemarks: existingNgo.empanelmentRemarks
        },
        newValueJson: { empanelmentStatus, empanelmentRemarks },
        details: { ngoId: id, empanelmentStatus, empanelmentRemarks }
      }
    });

    return res.json(ngo);
  } catch (error) {
    next(error);
  }
};
