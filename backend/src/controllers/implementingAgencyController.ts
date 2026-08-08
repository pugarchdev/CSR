import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ROLE_ID } from "../types/role";
import { createInvitation } from "../services/invitationService";
import { sendNgoInvitationEmail } from "../utils/mailer";

export const getAssignedProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(projects);
  } catch (error) {
    next(error);
  }
};

export const updateProjectProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, message: "Progress updated" });
  } catch (error) {
    next(error);
  }
};

export const submitMilestoneForVerification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, message: "Milestone submitted" });
  } catch (error) {
    next(error);
  }
};

export const uploadUC = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, message: "UC uploaded" });
  } catch (error) {
    next(error);
  }
};

export const createSubLogin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRoleId = req.user?.roleId ? Number(req.user.roleId) : null;
    const organizationId = req.user?.organizationId;

    const creatorOrganization = await prisma.organization.findUnique({
      where: { id: organizationId || "__none__" },
      select: { id: true, name: true, kind: true, status: true }
    });

    const isCompanyAdmin = userRoleId === ROLE_ID.COMPANY_ADMIN;

    if (!isCompanyAdmin || creatorOrganization?.kind !== "CSR_COMPANY") {
      return res.status(403).json({
        error: "NGO / implementing agency sub-logins can only be created by a Company Admin."
      });
    }

    if (!creatorOrganization || creatorOrganization.status !== "ACTIVE") {
      return res.status(403).json({ error: "Your company organization must be Super-Admin approved before it can create NGO sub-logins." });
    }

    const { ngoName, darpanId, email, contactPerson, phone } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Official email is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Enter a valid official email address." });
    }

    const cleanNgoName = String(ngoName || "").trim();
    if (cleanNgoName.length < 2) return res.status(400).json({ error: "NGO / implementing agency name is required." });

    const [existingUser, existingSubLogin] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.agencySubLogin.findUnique({ where: { email: normalizedEmail }, select: { id: true } })
    ]);
    if (existingUser) return res.status(409).json({ error: "A user account with this email already exists." });
    if (existingSubLogin) return res.status(409).json({ error: "An NGO invitation already exists for this email address." });

    const created = await prisma.$transaction(async (tx) => {
      const agency = await tx.organization.create({
        data: {
          kind: "NGO",
          name: cleanNgoName,
          legalName: cleanNgoName,
          officialEmail: normalizedEmail,
          officialPhone: phone ? String(phone).trim() : null,
          status: "PROFILE_INCOMPLETE",
          ngoProfile: {
            create: {
              darpanNumber: darpanId ? String(darpanId).trim() : null,
              areasOfOperation: [],
              csrSectors: []
            }
          }
        }
      });
      const subLogin = await tx.agencySubLogin.create({
        data: {
          organizationId: creatorOrganization.id,
          ngoName: cleanNgoName,
          agencyOrganizationId: agency.id,
          createdByUserId: req.user!.id,
          darpanId: darpanId ? String(darpanId).trim() : null,
          email: normalizedEmail,
          contactPerson: contactPerson ? String(contactPerson).trim() : null,
          phone: phone ? String(phone).trim() : null,
          status: "INVITE_SENT"
        }
      });
      const invitation = await createInvitation(
        {
          email: normalizedEmail,
          roleId: ROLE_ID.NGO_ADMIN,
          organizationId: agency.id,
          parentUserId: req.user!.id,
          agencySubLoginId: subLogin.id
        },
        tx
      );
      return { agency, subLogin, invitation };
    });

    let emailSent = true;
    try {
      await sendNgoInvitationEmail(normalizedEmail, cleanNgoName, created.invitation.activationUrl, creatorOrganization.name);
    } catch (mailError) {
      emailSent = false;
      console.error("[NGO invitation] Email delivery failed:", mailError);
    }
    return res.status(201).json({
      success: true,
      message: emailSent
        ? "NGO invitation sent. The NGO must set its password, complete onboarding, and receive Super Admin approval before project assignment."
        : "The NGO invitation was created, but email delivery failed. Please retry delivery or share the activation link securely.",
      data: {
        ...created.subLogin,
        agencyOrganization: { id: created.agency.id, name: created.agency.name, status: created.agency.status },
        emailSent,
        activationUrl: created.invitation.activationUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listMySubLogins = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.json([]);
    }

    const subLogins = await prisma.agencySubLogin.findMany({
      where: { organizationId },
      include: {
        assignedProject: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const agencyIds = subLogins.map((row) => row.agencyOrganizationId).filter((id): id is string => Boolean(id));
    const agencies = agencyIds.length
      ? await prisma.organization.findMany({
          where: { id: { in: agencyIds } },
          select: { id: true, name: true, status: true, rejectionReason: true, clarificationRemarks: true, ngoProfile: { select: { darpanNumber: true } } }
        })
      : [];
    const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));
    return res.json(subLogins.map((row) => ({ ...row, agencyOrganization: row.agencyOrganizationId ? agencyById.get(row.agencyOrganizationId) || null : null })));
  } catch (error) {
    next(error);
  }
};

export const listEligibleNgos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const roleId = Number(req.user?.roleId);
    if (![ROLE_ID.COMPANY_ADMIN, ROLE_ID.SUPER_ADMIN].includes(roleId as any)) return res.status(403).json({ error: "Only Company Admin can view eligible implementing NGOs." });
    const data = await prisma.organization.findMany({ where: { kind: "NGO", status: "ACTIVE" }, select: { id: true, name: true, ngoProfile: { select: { darpanNumber: true } } }, orderBy: { name: "asc" } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const assignAgencyToProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (Number(req.user?.roleId) !== ROLE_ID.COMPANY_ADMIN || !req.user?.organizationId) {
      return res.status(403).json({ error: "Only a Company Admin can assign an NGO to a project." });
    }
    const { subLoginId, projectId } = req.body;
    if (!subLoginId || !projectId) return res.status(400).json({ error: "NGO invitation and project are required." });

    const subLogin = await prisma.agencySubLogin.findFirst({
      where: { id: subLoginId, organizationId: req.user.organizationId },
      select: { id: true, agencyOrganizationId: true, assignedProjectId: true }
    });
    if (!subLogin?.agencyOrganizationId) return res.status(404).json({ error: "Invited NGO was not found." });
    if (subLogin.assignedProjectId && subLogin.assignedProjectId !== projectId) {
      return res.status(409).json({ error: "This NGO login is already assigned to another project." });
    }

    const [agency, project] = await Promise.all([
      prisma.organization.findFirst({ where: { id: subLogin.agencyOrganizationId, kind: "NGO", status: "ACTIVE" }, select: { id: true, name: true } }),
      prisma.project.findFirst({ where: { id: projectId, corporatePartnerId: req.user.organizationId }, select: { id: true, implementingAgencyId: true, ngoId: true } })
    ]);
    if (!agency) return res.status(400).json({ error: "Project assignment is locked until Super Admin approves the NGO onboarding application." });
    if (!project) return res.status(403).json({ error: "The selected project is not owned by your company." });
    const currentAgency = project.implementingAgencyId || project.ngoId;
    if (currentAgency && currentAgency !== agency.id) return res.status(409).json({ error: "This project already has a different implementing agency." });

    const updated = await prisma.$transaction(async (tx) => {
      const assigned = await tx.agencySubLogin.update({
        where: { id: subLogin.id },
        data: { assignedProjectId: project.id, status: "ACTIVE" },
        include: { assignedProject: { select: { id: true, title: true } } }
      });
      await tx.project.update({ where: { id: project.id }, data: { implementingAgencyId: agency.id, ngoId: agency.id } });
      await tx.auditLog.create({
        data: {
          actorUserId: req.user!.id,
          userId: req.user!.id,
          action: "NGO_ASSIGNED_TO_PROJECT",
          entityType: "Project",
          entityId: project.id,
          details: { agencyOrganizationId: agency.id, agencyName: agency.name, subLoginId: subLogin.id }
        }
      });
      return assigned;
    });
    return res.json({ success: true, message: `${agency.name} has been assigned to the project.`, data: updated });
  } catch (error) {
    next(error);
  }
};

export const listPendingApprovals = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json([]);
  } catch (error) {
    next(error);
  }
};

export const decideSubLogin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, message: "Decision recorded" });
  } catch (error) {
    next(error);
  }
};
