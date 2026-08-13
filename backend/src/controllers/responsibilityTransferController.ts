import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const transferUserResponsibilities = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sourceUserId = req.params.id;
    const { replacementUserId, reason, deactivateSource = true } = req.body;
    if (!replacementUserId || !String(reason || "").trim()) return res.status(400).json({ error: "Replacement user and transfer reason are required" });
    if (replacementUserId === sourceUserId) return res.status(409).json({ error: "Replacement must be a different user" });
    const [source, replacement] = await Promise.all([
      prisma.user.findUnique({ where: { id: sourceUserId } }),
      prisma.user.findFirst({ where: { id: replacementUserId, accountStatus: "ACTIVE", isVerified: true, deletedAt: null } }),
    ]);
    if (!source || !replacement) return res.status(404).json({ error: "Source or active replacement user not found" });
    const isGlobal = [1, 2, 3].includes(Number(req.user?.roleId));
    if (!isGlobal && (!req.user?.organizationId || source.organizationId !== req.user.organizationId || replacement.organizationId !== req.user.organizationId)) return res.status(403).json({ error: "Both users must be in your organization scope" });
    if (source.organizationId && replacement.organizationId !== source.organizationId) return res.status(400).json({ error: "Replacement must belong to the same organization" });
    const openLegacy = await prisma.projectAssignment.findMany({ where: { assignedToId: sourceUserId, status: "ACTIVE" } });
    const result = await prisma.$transaction(async tx => {
      const portalCases = await tx.portalCase.updateMany({ where: { assignedRmId: sourceUserId, status: { notIn: ["CLOSED", "REJECTED", "COMPLETED"] } }, data: { assignedRmId: replacementUserId } });
      const primaryNodal = await tx.governmentAssignment.updateMany({ where: { primaryNodalUserId: sourceUserId, status: { notIn: ["CLOSED", "REVOKED"] } }, data: { primaryNodalUserId: replacementUserId } });
      const stateNodal = await tx.governmentAssignment.updateMany({ where: { stateNodalUserId: sourceUserId, status: { notIn: ["CLOSED", "REVOKED"] } }, data: { stateNodalUserId: replacementUserId } });
      const district = await tx.projectDistrictAssignment.updateMany({ where: { nodalUserId: sourceUserId, status: { notIn: ["CLOSED", "REVOKED"] } }, data: { nodalUserId: replacementUserId } });
      if (openLegacy.length) {
        await tx.projectAssignment.updateMany({ where: { id: { in: openLegacy.map(a => a.id) } }, data: { status: "REASSIGNED" } });
        await tx.projectAssignment.createMany({ data: openLegacy.map(a => ({ entityType: a.entityType, entityId: a.entityId, assignmentType: a.assignmentType, assignedById: req.user!.id, assignedToId: replacementUserId, assignedRoleId: replacement.roleId, status: "ACTIVE" })) });
      }
      if (deactivateSource) {
        await tx.user.update({ where: { id: sourceUserId }, data: { accountStatus: "INACTIVE", tokenVersion: { increment: 1 } } });
        await tx.session.updateMany({ where: { userId: sourceUserId, isRevoked: false }, data: { isRevoked: true, revokedByUserId: req.user!.id } });
        await tx.organizationMembership.updateMany({ where: { userId: sourceUserId, status: "ACTIVE" }, data: { status: "SUSPENDED" } });
        await tx.corporateNgoAccess.updateMany({ where: { userId: sourceUserId, status: "ACTIVE" }, data: { status: "SUSPENDED", tokenVersion: { increment: 1 } } });
      }
      await tx.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: "USER_RESPONSIBILITIES_TRANSFERRED", entityType: "User", entityId: sourceUserId, details: { replacementUserId, reason, deactivateSource, transferred: { portalCases: portalCases.count, primaryNodal: primaryNodal.count, stateNodal: stateNodal.count, districtAssignments: district.count, projectAssignments: openLegacy.length } } } });
      return { portalCases: portalCases.count, primaryNodal: primaryNodal.count, stateNodal: stateNodal.count, districtAssignments: district.count, projectAssignments: openLegacy.length };
    });
    return res.json({ success: true, message: "Open responsibilities transferred; historical actor attribution was preserved", data: result });
  } catch (error) { next(error); }
};
