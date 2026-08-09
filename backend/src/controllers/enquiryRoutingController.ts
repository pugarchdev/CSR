import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const getRecommendedDepartments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { enquiryId } = req.params;
    const enquiry = await prisma.corporateEnquiry.findUnique({
      where: { id: enquiryId }
    });

    if (!enquiry) {
      return res.status(404).json({ error: "Corporate enquiry not found" });
    }

    const targetDistrict = enquiry.preferredDistricts[0] || enquiry.district || null;
    const targetSector = enquiry.sector || "";

    const matchingDepts = await prisma.organization.findMany({
      where: {
        kind: "GOVERNMENT_DEPARTMENT",
        status: "ACTIVE",
        ...(targetDistrict
          ? {
              OR: [
                { district: { equals: targetDistrict, mode: "insensitive" } },
                { parentOrganizationId: null }
              ]
            }
          : {})
      },
      select: {
        id: true,
        name: true,
        parentOrganizationId: true,
        parentOrganization: {
          select: { id: true, name: true, district: true }
        },
        district: true,
        state: true,
        officialIdentifierNumber: true,
        departmentDnoNominations: {
          where: { status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true, officialDesignation: true, officialEmail: true }
        }
      },
      take: 20
    });

    return res.json({
      success: true,
      data: {
        enquiry,
        targetDistrict,
        targetSector,
        recommendations: matchingDepts
      }
    });
  } catch (error) {
    next(error);
  }
};

export const routeEnquiryToDepartment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { enquiryId } = req.params;
    const { departmentOrganizationId, parentOrganizationId, notes } = req.body;

    const enquiry = await prisma.corporateEnquiry.findUnique({
      where: { id: enquiryId }
    });

    if (!enquiry) {
      return res.status(404).json({ error: "Corporate enquiry not found" });
    }

    let resolvedParentId = parentOrganizationId || null;
    if (departmentOrganizationId) {
      const deptOrg = await prisma.organization.findUnique({
        where: { id: departmentOrganizationId },
        select: { id: true, parentOrganizationId: true }
      });
      if (deptOrg && deptOrg.parentOrganizationId) {
        resolvedParentId = deptOrg.parentOrganizationId;
      }
    }

    // Attempt to resolve district DNC assignment
    const targetDistrict = enquiry.preferredDistricts[0] || enquiry.district || null;
    let resolvedDncUserId = enquiry.dncUserId || null;
    if (targetDistrict && !resolvedDncUserId) {
      const dncAssignment = await prisma.districtDncAssignment.findFirst({
        where: { district: targetDistrict, isActive: true }
      });
      if (dncAssignment) resolvedDncUserId = dncAssignment.dncUserId;
    }

    // Check if active DNO exists for department
    let activeDnoId: string | null = null;
    if (departmentOrganizationId) {
      const activeDno = await prisma.dnoNomination.findFirst({
        where: {
          OR: [
            { departmentOrganizationId },
            { organizationId: departmentOrganizationId }
          ],
          status: "ACTIVE"
        }
      });
      if (activeDno) activeDnoId = activeDno.id;
    }

    const updated = await prisma.corporateEnquiry.update({
      where: { id: enquiryId },
      data: {
        departmentOrganizationId: departmentOrganizationId || null,
        parentOrganizationId: resolvedParentId,
        departmentAssignmentStatus: departmentOrganizationId ? "IDENTIFIED" : "PENDING",
        dncUserId: resolvedDncUserId,
        dnoId: activeDnoId
      }
    });

    return res.json({
      success: true,
      message: departmentOrganizationId
        ? "Enquiry routed to department. Pending confirmation & Joint Secretary approval."
        : "Department routing updated.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const confirmDepartmentRouting = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { enquiryId } = req.params;
    const enquiry = await prisma.corporateEnquiry.findUnique({
      where: { id: enquiryId }
    });

    if (!enquiry) {
      return res.status(404).json({ error: "Corporate enquiry not found" });
    }

    const updated = await prisma.corporateEnquiry.update({
      where: { id: enquiryId },
      data: {
        departmentAssignmentStatus: "CONFIRMED"
      }
    });

    return res.json({
      success: true,
      message: "Department routing confirmed.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
