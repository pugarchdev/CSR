import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const listPendingRelationships = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const relationships = await prisma.organizationRelationship.findMany({
      where: { status: "PENDING" },
      include: {
        childOrganization: {
          select: {
            id: true,
            name: true,
            officialIdentifierNumber: true,
            district: true,
            state: true,
            status: true,
            createdAt: true
          }
        },
        parentOrganization: {
          select: {
            id: true,
            name: true,
            parentRegistrationCode: true,
            district: true,
            state: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: relationships });
  } catch (error) {
    next(error);
  }
};

export const verifyRelationship = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ error: "Action must be APPROVE or REJECT" });
    }

    const rel = await prisma.organizationRelationship.findUnique({
      where: { id },
      include: { childOrganization: true, parentOrganization: true }
    });

    if (!rel) {
      return res.status(404).json({ error: "Organization relationship request not found" });
    }

    const newStatus = action === "APPROVE" ? "VERIFIED" : "REJECTED";

    const updatedRel = await prisma.organizationRelationship.update({
      where: { id },
      data: {
        status: newStatus,
        verifiedAt: new Date(),
        verifiedById: adminUser?.id,
        ...(rejectionReason ? { rejectionReason } : {})
      }
    });

    // Update child organization's parentRelationshipStatus
    await prisma.organization.update({
      where: { id: rel.childOrganizationId },
      data: {
        parentRelationshipStatus: newStatus
      }
    });

    return res.json({
      success: true,
      message: action === "APPROVE"
        ? `Relationship verified! ${rel.childOrganization.name} is now linked under ${rel.parentOrganization.name}.`
        : `Relationship request rejected.`,
      data: updatedRel
    });
  } catch (error) {
    next(error);
  }
};
