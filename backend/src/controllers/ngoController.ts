import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { VerificationStatus, Role } from "@prisma/client";

export const getNgos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as VerificationStatus | undefined;

    // Standard users can only view verified profiles. Super Admin can view all.
    let filter: any = {};
    if (req.user?.role !== Role.SUPER_ADMIN) {
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
          where: req.user?.role !== Role.SUPER_ADMIN ? { status: { notIn: ["DRAFT", "REJECTED"] } } : {}
        }
      }
    });

    if (!ngo) {
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

    // Check ownership: NGO Admin can only edit their own profile
    if (req.user?.role === Role.NGO_ADMIN && req.user.ngoId !== id) {
      return res.status(403).json({ error: "Forbidden: You do not own this profile" });
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
        userId: req.user?.id,
        action: "NGO_UPDATE",
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
        userId: req.user?.id,
        action: "NGO_VERIFY",
        details: { ngoId: id, status, rejectionReason }
      }
    });

    return res.json(ngo);
  } catch (error) {
    next(error);
  }
};
