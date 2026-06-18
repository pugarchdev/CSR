import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { VerificationStatus, Role } from "@prisma/client";

export const getCompanies = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as VerificationStatus | undefined;

    let filter: any = {};
    if (req.user?.role !== Role.SUPER_ADMIN) {
      filter.status = VerificationStatus.VERIFIED;
    } else if (status) {
      filter.status = status;
    }

    const companies = await prisma.company.findMany({
      where: filter,
      orderBy: { name: "asc" }
    });

    return res.json(companies);
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    return res.json(company);
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, csrBudget, focusAreas, contactInfo, csrPolicyUrl } = req.body;

    if (req.user?.role === Role.COMPANY_ADMIN && req.user.companyId !== id) {
      return res.status(403).json({ error: "Forbidden: You do not own this profile" });
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        name,
        csrBudget,
        focusAreas,
        contactInfo,
        csrPolicyUrl
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "COMPANY_UPDATE",
        details: { companyId: id }
      }
    });

    return res.json(updatedCompany);
  } catch (error) {
    next(error);
  }
};

export const verifyCompany = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!Object.values(VerificationStatus).includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null
      }
    });

    // Notify Company admins
    const users = await prisma.user.findMany({ where: { companyId: id } });
    for (const u of users) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: `Company Verification Status Update`,
          message: `Your company profile has been ${status.toLowerCase()}.${status === VerificationStatus.REJECTED ? ` Reason: ${rejectionReason}` : ""}`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "COMPANY_VERIFY",
        details: { companyId: id, status, rejectionReason }
      }
    });

    return res.json(company);
  } catch (error) {
    next(error);
  }
};
