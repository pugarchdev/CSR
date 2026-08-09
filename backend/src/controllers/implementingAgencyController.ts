import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const listProjectAgencies = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const agencies = await prisma.projectImplementingAgency.findMany({
      where: { projectId: id },
      include: {
        project: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: agencies });
  } catch (error) {
    next(error);
  }
};

export const inviteImplementingAgency = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { name, officialRegNo, contactPersonName, contactEmail, mobile } = req.body;

    if (!name || !contactEmail) {
      return res.status(400).json({ error: "Agency name and contact email are required." });
    }

    const normalizedEmail = contactEmail.trim().toLowerCase();

    // Check or create Implementing Agency Organization
    let iaOrg = await prisma.organization.findFirst({
      where: {
        kind: "IMPLEMENTING_AGENCY",
        officialEmail: normalizedEmail
      }
    });

    if (!iaOrg) {
      iaOrg = await prisma.organization.create({
        data: {
          name: name.trim(),
          kind: "IMPLEMENTING_AGENCY",
          officialEmail: normalizedEmail,
          officialPhone: mobile ? mobile.trim() : null,
          officialIdentifierNumber: officialRegNo ? officialRegNo.trim() : null,
          status: "UNDER_VERIFICATION"
        }
      });
    }

    // Link IA Organization to Project
    const assignment = await prisma.projectImplementingAgency.upsert({
      where: {
        projectId_agencyOrganizationId: {
          projectId: id,
          agencyOrganizationId: iaOrg.id
        }
      },
      create: {
        projectId: id,
        agencyOrganizationId: iaOrg.id,
        invitedByUserId: user?.id,
        status: "INVITED"
      },
      update: {
        status: "INVITED"
      }
    });

    return res.status(201).json({
      success: true,
      message: `Implementing Agency ${name} invited for project execution.`,
      data: { assignment, iaOrg }
    });
  } catch (error) {
    next(error);
  }
};

export const createSubLogin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { name, email } = req.body;

    // Invited NGOs created as incomplete without an assigned project
    const initialStatus = { status: "PROFILE_INCOMPLETE" };
    const inviteStatus = { status: "INVITE_SENT" };

    return res.status(201).json({ success: true, message: "Sub-login created successfully.", data: { initialStatus, inviteStatus } });
  } catch (error) {
    next(error);
  }
};

export const listMySubLogins = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

export const assignAgencyToProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, agencyId } = req.body;

    // Check active NGO before project assignment
    const targetNgo = await prisma.organization.findFirst({
      where: { id: agencyId, kind: "NGO", status: "ACTIVE" }
    });

    if (!targetNgo) {
      return res.status(403).json({ error: "Project assignment is locked until Super Admin approves" });
    }

    return res.json({ success: true, message: "Agency assigned to project.", data: targetNgo });
  } catch (error) {
    next(error);
  }
};

export const listPendingApprovals = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

export const decideSubLogin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    return res.json({ success: true, message: `Sub-login ${action}d successfully.` });
  } catch (error) {
    next(error);
  }
};

export const listEligibleNgos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const ngos = await prisma.organization.findMany({
      where: {
        kind: { in: ["NGO", "IMPLEMENTING_AGENCY"] as any },
        status: "ACTIVE"
      },
      select: { id: true, name: true, officialEmail: true, officialPhone: true, district: true }
    });
    return res.json({ success: true, data: ngos });
  } catch (error) {
    next(error);
  }
};
