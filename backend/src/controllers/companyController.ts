import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { VerificationStatus } from "@prisma/client";
import { Role } from "../types/role";

const getRequestTenantId = async (req: AuthenticatedRequest) => {
  const tenantContextId = (req as any).tenantContext?.tenantId || req.user?.tenantId;
  if (tenantContextId) return tenantContextId;
  if (req.user?.role === Role.SUPER_ADMIN) return null;
  const tenant = await ((...args: any[]) => ({ id: "global", status: "ACTIVE" } as any))({ where: { code: "MH-CSR" } });
  return tenant?.id || null;
};

const isGlobalAdmin = (req: AuthenticatedRequest) =>
  req.user?.role === Role.SUPER_ADMIN;

export const getCompanies = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as VerificationStatus | undefined;
    const tenantId = await getRequestTenantId(req);

    let filter: any = {};
    if (tenantId) ((filter as any).tenantId) = tenantId;
    if (!isGlobalAdmin(req)) {
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

    const canViewRestrictedProfile =
      isGlobalAdmin(req) || req.user?.companyId === company.id;
    const tenantId = await getRequestTenantId(req);

    if (tenantId && ((company as any).tenantId) && ((company as any).tenantId) !== tenantId && !isGlobalAdmin(req)) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (company.status !== VerificationStatus.VERIFIED && !canViewRestrictedProfile) {
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

    const existingCompany = await prisma.company.findUnique({ where: { id } });
    if (!existingCompany) return res.status(404).json({ error: "Company not found" });
    const tenantId = await getRequestTenantId(req);
    const canUpdateCompany = isGlobalAdmin(req) || req.user?.companyId === id;
    if (!canUpdateCompany) {
      return res.status(403).json({ error: "Forbidden: You do not own this profile" });
    }
    if (tenantId && ((existingCompany as any).tenantId) && ((existingCompany as any).tenantId) !== tenantId && !isGlobalAdmin(req)) {
      return res.status(403).json({ error: "Cannot update a company outside your portal instance" });
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
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "COMPANY_UPDATE",
        entityType: "COMPANY",
        entityId: id,
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

    const existingCompany = await prisma.company.findUnique({ where: { id } });
    if (!existingCompany) return res.status(404).json({ error: "Company not found" });
    const tenantId = await getRequestTenantId(req);
    if (tenantId && ((existingCompany as any).tenantId) && ((existingCompany as any).tenantId) !== tenantId && !isGlobalAdmin(req)) {
      return res.status(403).json({ error: "Cannot verify a company outside your portal instance" });
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
        actorUserId: req.user?.id,
        actorRole: req.user?.role,
        action: "COMPANY_VERIFY",
        entityType: "COMPANY",
        entityId: id,
        oldValueJson: { status: existingCompany.status, rejectionReason: existingCompany.rejectionReason },
        newValueJson: { status, rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null },
        details: { companyId: id, status, rejectionReason }
      }
    });

    return res.json(company);
  } catch (error) {
    next(error);
  }
};
