import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { sendUserInvitationEmail } from "../services/emailService";
import { notifyHierarchy } from "../services/hierarchyNotificationService";

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
const tempPassword = () => `Ngo!${crypto.randomBytes(8).toString("base64url")}7a`;
const loginId = (name: string, corporateId: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 28)}.${corporateId.slice(0, 6)}.${crypto.randomBytes(2).toString("hex")}`;

async function requireCorporateScope(req: AuthenticatedRequest, projectId?: string) {
  const organizationId = req.user?.organizationId;
  if (!organizationId) throw new Error("Corporate organization context is required");
  const organization = await prisma.organization.findFirst({ where: { id: organizationId, kind: "CSR_COMPANY", status: "ACTIVE" } });
  if (!organization) throw new Error("Only an active Corporate organization can manage NGO memberships");
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null, OR: [{ corporatePartnerId: organizationId }, { organizationId }] } });
    if (!project) throw new Error("Project is outside your Corporate organization scope");
  }
  return organization;
}

export const listProjectAgencies = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireCorporateScope(req, req.params.id);
    const agencies = await prisma.projectImplementingAgency.findMany({ where: { projectId: req.params.id }, include: { project: { select: { id: true, title: true } } }, orderBy: { createdAt: "desc" } });
    const memberships = await prisma.corporateNgoMembership.findMany({ where: { corporateOrganizationId: req.user!.organizationId!, ngoOrganizationId: { in: agencies.map(a => a.agencyOrganizationId) } }, include: { ngoOrganization: { include: { ngoProfile: true } }, accesses: true } });
    return res.json({ success: true, data: memberships });
  } catch (error) { next(error); }
};

export const searchNgoMaster = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireCorporateScope(req);
    const q = String(req.query.q || "").trim();
    const ngos = await prisma.organization.findMany({ where: { kind: { in: ["NGO", "IMPLEMENTING_AGENCY"] }, deletedAt: null, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { officialIdentifierNumber: { contains: q, mode: "insensitive" } }, { ngoProfile: { darpanNumber: { contains: q, mode: "insensitive" } } }, { ngoProfile: { csr1Number: { contains: q, mode: "insensitive" } } }] } : {}) }, select: { id: true, name: true, status: true, district: true, officialIdentifierNumber: true, officialEmail: true, ngoProfile: { select: { darpanNumber: true, csr1Number: true, yearEstablished: true, areasOfOperation: true, csrSectors: true } } }, take: 20 });
    return res.json({ success: true, data: ngos });
  } catch (error) { next(error); }
};

export const inviteImplementingAgency = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const corporate = await requireCorporateScope(req, projectId);
    const { ngoOrganizationId, name, officialRegNo, darpanNumber, contactPersonName, contactEmail, mobile } = req.body;
    const email = normalize(contactEmail);
    if (!email || (!ngoOrganizationId && !name)) return res.status(400).json({ error: "Select an NGO master or provide a new NGO name and contact email" });
    const password = tempPassword();
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const result = await prisma.$transaction(async tx => {
      let ngo = ngoOrganizationId ? await tx.organization.findFirst({ where: { id: ngoOrganizationId, kind: { in: ["NGO", "IMPLEMENTING_AGENCY"] }, deletedAt: null } }) : null;
      if (!ngo) {
        ngo = await tx.organization.create({ data: { name: String(name).trim(), kind: "NGO", officialEmail: email, officialPhone: mobile || null, officialIdentifierNumber: officialRegNo || null, status: "PROFILE_INCOMPLETE", ngoProfile: { create: { darpanNumber: darpanNumber || null, areasOfOperation: [], csrSectors: [] } } } });
      }
      let masterUser = await tx.user.findUnique({ where: { email } });
      if (!masterUser) {
        const names = String(contactPersonName || "NGO Administrator").trim().split(/\s+/);
        masterUser = await tx.user.create({ data: { email, passwordHash: await bcrypt.hash(tempPassword(), 12), firstName: names.shift() || "NGO", lastName: names.join(" ") || null, roleId: 9, organizationId: ngo.id, accountStatus: "ACTIVE", isVerified: true } });
      } else if (masterUser.organizationId !== ngo.id) {
        throw new Error("The contact email belongs to another portal identity; select the matching NGO master or use a different contact email");
      }
      const membership = await tx.corporateNgoMembership.upsert({ where: { corporateOrganizationId_ngoOrganizationId: { corporateOrganizationId: corporate.id, ngoOrganizationId: ngo.id } }, create: { corporateOrganizationId: corporate.id, ngoOrganizationId: ngo.id, contactEmail: email, invitedByUserId: req.user!.id, status: "INVITED" }, update: { contactEmail: email, status: "INVITED", reviewRemarks: null } });
      const identifier = loginId(ngo.name, corporate.id);
      let access = await tx.corporateNgoAccess.findFirst({ where: { membershipId: membership.id, userId: masterUser.id } });
      if (access) access = await tx.corporateNgoAccess.update({ where: { id: access.id }, data: { projectIds: [...new Set([...access.projectIds, projectId])], passwordHash: await bcrypt.hash(password, 12), mustResetPassword: true, temporaryPasswordExpiresAt: expiry, status: "INVITED", tokenVersion: { increment: 1 } } });
      else access = await tx.corporateNgoAccess.create({ data: { membershipId: membership.id, userId: masterUser.id, loginIdentifier: identifier, contactEmail: email, passwordHash: await bcrypt.hash(password, 12), temporaryPasswordExpiresAt: expiry, projectIds: [projectId], status: "INVITED" } });
      const assignment = await tx.projectImplementingAgency.upsert({ where: { projectId_agencyOrganizationId: { projectId, agencyOrganizationId: ngo.id } }, create: { projectId, agencyOrganizationId: ngo.id, invitedByUserId: req.user!.id, status: "INVITED" }, update: { status: "INVITED" } });
      const legacyAccess = await tx.agencySubLogin.findFirst({ where: { corporateNgoMembershipId: membership.id } });
      if (legacyAccess) await tx.agencySubLogin.update({ where: { id: legacyAccess.id }, data: { userId: masterUser.id, loginIdentifier: access.loginIdentifier, assignedProjectId: projectId, status: "INVITE_SENT" } });
      else await tx.agencySubLogin.create({ data: { organizationId: corporate.id, ngoName: ngo.name, agencyOrganizationId: ngo.id, userId: masterUser.id, createdByUserId: req.user!.id, email, loginIdentifier: access.loginIdentifier, corporateNgoMembershipId: membership.id, contactPerson: contactPersonName || null, phone: mobile || null, assignedProjectId: projectId, status: "INVITE_SENT" } });
      await tx.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: "CORPORATE_NGO_INVITED", entityType: "CorporateNgoMembership", entityId: membership.id, details: { corporateOrganizationId: corporate.id, ngoOrganizationId: ngo.id, projectId, accessId: access.id, loginIdentifier: access.loginIdentifier } } });
      return { ngo, membership, access, assignment };
    });
    await sendUserInvitationEmail({ to: email, applicantName: contactPersonName || result.ngo.name, roleName: `NGO access for ${corporate.name}`, password, loginUrl: "/login", isAutogenerated: true }).catch(err => console.error("NGO invitation email failed", err?.message));
    return res.status(201).json({ success: true, message: "NGO invited with a corporate-specific login context", data: { membershipId: result.membership.id, loginIdentifier: result.access.loginIdentifier, projectIds: result.access.projectIds, reusedMaster: Boolean(ngoOrganizationId) } });
  } catch (error) { next(error); }
};

export const submitNgoMasterProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.ngoAccessId || !req.user.ngoId) return res.status(403).json({ error: "Corporate-specific NGO access context required" });
    const { darpanNumber, csr1Number, yearEstablished, areasOfOperation = [], csrSectors = [], officialRegNo, address, district } = req.body;
    const access = await prisma.corporateNgoAccess.findUnique({ where: { id: req.user.ngoAccessId }, select: { membershipId: true } });
    if (!access) return res.status(403).json({ error: "NGO access context no longer exists" });
    await prisma.$transaction([
      prisma.organization.update({ where: { id: req.user.ngoId }, data: { officialIdentifierNumber: officialRegNo || undefined, address: address || undefined, district: district || undefined, status: "UNDER_VERIFICATION" } }),
      prisma.nGOProfile.upsert({ where: { organizationId: req.user.ngoId }, create: { organizationId: req.user.ngoId, darpanNumber: darpanNumber || null, csr1Number: csr1Number || null, yearEstablished: yearEstablished || null, areasOfOperation, csrSectors }, update: { darpanNumber: darpanNumber || null, csr1Number: csr1Number || null, yearEstablished: yearEstablished || null, areasOfOperation, csrSectors } }),
      prisma.corporateNgoMembership.updateMany({ where: { id: access.membershipId }, data: { status: "PENDING_CORPORATE_REVIEW" } }),
      prisma.auditLog.create({ data: { actorUserId: req.user.id, userId: req.user.id, action: "NGO_MASTER_PROFILE_SUBMITTED", entityType: "Organization", entityId: req.user.ngoId, details: { ngoAccessId: req.user.ngoAccessId, corporateOrganizationId: req.user.companyId } } }),
    ]);
    notifyHierarchy({
      title: "NGO Profile Submitted for Review",
      message: `NGO master profile submitted for verification.`,
      organizationId: req.user.ngoId,
      district: district || undefined,
      includeOrgUsers: false,
      includePortalAdmins: true,
      includeRms: true,
      actionButtonUrl: `/admin/onboarding-approvals`,
      variables: {
        currentStatus: "UNDER_VERIFICATION",
        workflowStatus: "Profile submitted for corporate and admin review"
      }
    }).catch(err => console.error("[ImplementingAgency] Profile submit notification failed:", err));

    return res.json({ success: true, status: "PENDING_CORPORATE_REVIEW" });
  } catch (error) { next(error); }
};

export const listMySubLogins = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireCorporateScope(req);
    const data = await prisma.corporateNgoMembership.findMany({ where: { corporateOrganizationId: req.user!.organizationId! }, include: { ngoOrganization: { include: { ngoProfile: true } }, accesses: { select: { id: true, loginIdentifier: true, projectIds: true, status: true, mustResetPassword: true, lastContextLoginAt: true } } }, orderBy: { updatedAt: "desc" } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const assignAgencyToProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, membershipId } = req.body;
    await requireCorporateScope(req, projectId);
    const membership = await prisma.corporateNgoMembership.findFirst({ where: { id: membershipId, corporateOrganizationId: req.user!.organizationId!, status: "APPROVED" }, include: { accesses: { where: { status: "ACTIVE" } } } });
    if (!membership || !membership.accesses.length) return res.status(403).json({ error: "The Corporate–NGO membership and access must be approved and active" });
    await prisma.$transaction(async tx => {
      await tx.projectImplementingAgency.upsert({ where: { projectId_agencyOrganizationId: { projectId, agencyOrganizationId: membership.ngoOrganizationId } }, create: { projectId, agencyOrganizationId: membership.ngoOrganizationId, invitedByUserId: req.user!.id, status: "ACTIVE", acceptedAt: new Date() }, update: { status: "ACTIVE", acceptedAt: new Date() } });
      for (const access of membership.accesses) await tx.corporateNgoAccess.update({ where: { id: access.id }, data: { projectIds: [...new Set([...access.projectIds, projectId])] } });
    });
    return res.json({ success: true, message: "Approved NGO membership assigned to the project" });
  } catch (error) { next(error); }
};

export const listPendingApprovals = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireCorporateScope(req);
    const data = await prisma.corporateNgoMembership.findMany({ where: { corporateOrganizationId: req.user!.organizationId!, status: { in: ["INVITED", "PENDING_CORPORATE_REVIEW", "CLARIFICATION_REQUIRED"] } }, include: { ngoOrganization: { include: { ngoProfile: true } }, accesses: true }, orderBy: { createdAt: "asc" } });
    return res.json({ success: true, data, counts: { awaitingReview: data.filter(x => x.status === "PENDING_CORPORATE_REVIEW").length, clarification: data.filter(x => x.status === "CLARIFICATION_REQUIRED").length } });
  } catch (error) { next(error); }
};

export const decideSubLogin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { action, remarks } = req.body;
    await requireCorporateScope(req);
    const membership = await prisma.corporateNgoMembership.findFirst({ where: { id: req.params.id, corporateOrganizationId: req.user!.organizationId! }, include: { accesses: true, ngoOrganization: true } });
    if (!membership) return res.status(404).json({ error: "NGO membership not found in your corporate scope" });
    if (!["APPROVE", "CLARIFY", "REJECT"].includes(action)) return res.status(400).json({ error: "Action must be APPROVE, CLARIFY, or REJECT" });
    if (action !== "APPROVE" && !String(remarks || "").trim()) return res.status(400).json({ error: "Remarks are required" });
    const status = action === "APPROVE" ? "APPROVED" : action === "CLARIFY" ? "CLARIFICATION_REQUIRED" : "REJECTED";
    await prisma.$transaction(async tx => {
      await tx.corporateNgoMembership.update({ where: { id: membership.id }, data: { status, reviewedByUserId: req.user!.id, reviewRemarks: remarks || null, approvedAt: action === "APPROVE" ? new Date() : null } });
      await tx.corporateNgoAccess.updateMany({ where: { membershipId: membership.id }, data: { status: action === "APPROVE" ? "ACTIVE" : action === "REJECT" ? "REVOKED" : "INVITED", tokenVersion: { increment: 1 } } });
      await tx.projectImplementingAgency.updateMany({ where: { agencyOrganizationId: membership.ngoOrganizationId, projectId: { in: membership.accesses.flatMap(a => a.projectIds) } }, data: { status: action === "APPROVE" ? "ACTIVE" : action === "REJECT" ? "REVOKED" : "INVITED", acceptedAt: action === "APPROVE" ? new Date() : null } });
      await tx.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: `CORPORATE_NGO_${action}`, entityType: "CorporateNgoMembership", entityId: membership.id, details: { remarks: remarks || null, accessIds: membership.accesses.map(a => a.id) } } });
    });

    notifyHierarchy({
      title: action === "APPROVE" ? "NGO Partner Membership Approved" : action === "CLARIFY" ? "Clarification Required for NGO Membership" : "NGO Partner Membership Rejected",
      message: action === "APPROVE"
        ? `NGO partner "${membership.ngoOrganization?.name || 'NGO'}" has been approved for project implementation.`
        : action === "CLARIFY"
        ? `Clarification requested for NGO partner "${membership.ngoOrganization?.name || 'NGO'}". Remarks: ${remarks}`
        : `NGO partner "${membership.ngoOrganization?.name || 'NGO'}" membership was rejected. Reason: ${remarks}`,
      organizationId: membership.ngoOrganizationId,
      includeOrgUsers: true,
      includePortalAdmins: true,
      includeRms: true,
      actionButtonUrl: `/organization/onboarding/status`,
      variables: {
        currentStatus: status,
        workflowStatus: remarks || `Corporate decision: ${action}`
      }
    }).catch(err => console.error("[ImplementingAgency] Decision notification failed:", err));

    return res.json({ success: true, status });
  } catch (error) { next(error); }
};

export const listEligibleNgos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await requireCorporateScope(req);
    const data = await prisma.corporateNgoMembership.findMany({ where: { corporateOrganizationId: req.user!.organizationId!, status: "APPROVED" }, include: { ngoOrganization: { include: { ngoProfile: true } }, accesses: { where: { status: "ACTIVE" } } } });
    return res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const listNgoContextProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.ngoAccessId) return res.status(403).json({ error: "NGO access context required" });
    const access = await prisma.corporateNgoAccess.findUnique({ where: { id: req.user.ngoAccessId }, include: { membership: true } });
    if (!access || access.status !== "ACTIVE" || access.membership.status !== "APPROVED") return res.status(403).json({ error: "NGO access context is inactive" });
    const projects = await prisma.project.findMany({ where: { id: { in: access.projectIds }, implementingAgencies: { some: { agencyOrganizationId: access.membership.ngoOrganizationId, status: "ACTIVE" } } }, include: { milestones: true }, orderBy: { updatedAt: "desc" } });
    return res.json({ success: true, data: projects, context: { accessId: access.id, corporateOrganizationId: access.membership.corporateOrganizationId, ngoOrganizationId: access.membership.ngoOrganizationId } });
  } catch (error) { next(error); }
};
