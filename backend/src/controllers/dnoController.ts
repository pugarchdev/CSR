import { Response } from "express";
import { prisma } from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import bcrypt from "bcryptjs";
import { ROLE_ID } from "../types/role";

export const nominateDno = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(403).json({ error: "Access denied. Organization context is required." });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }
    if (org.status !== "ACTIVE") {
      return res.status(400).json({ error: "Organization must be ACTIVE before nominating a District / Department Nodal Officer (DNO)." });
    }

    const {
      firstName,
      lastName,
      officialDesignation,
      officialEmail,
      officialMobile,
      employeeId,
      departmentId,
      scope,
      appointmentOrderUrl
    } = req.body;

    if (!firstName || !lastName || !officialDesignation || !officialEmail || !officialMobile) {
      return res.status(400).json({ error: "First Name, Last Name, Designation, Official Email, and Official Mobile are required." });
    }

    if (!appointmentOrderUrl) {
      return res.status(400).json({ error: "DNO Appointment / Nomination Order document is required." });
    }

    const dnoScope = scope === "DEPARTMENT_SPECIFIC" ? "DEPARTMENT_SPECIFIC" : "ORGANIZATION_WIDE";
    let targetDeptOrgId: string | null = null;

    if (dnoScope === "DEPARTMENT_SPECIFIC") {
      if (!departmentId) {
        return res.status(400).json({ error: "Department selection is required for department-specific DNO scope." });
      }
      // Check if departmentId is a child Organization or SubDepartment
      const childOrg = await prisma.organization.findFirst({
        where: { id: departmentId, parentOrganizationId: user.organizationId }
      });
      if (childOrg) {
        targetDeptOrgId = childOrg.id;
      }
    }

    const nomination = await prisma.dnoNomination.create({
      data: {
        organizationId: user.organizationId,
        departmentOrganizationId: targetDeptOrgId,
        departmentId: targetDeptOrgId ? null : (departmentId || null),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        officialDesignation: officialDesignation.trim(),
        officialEmail: officialEmail.trim().toLowerCase(),
        officialMobile: officialMobile.trim(),
        employeeId: employeeId ? employeeId.trim() : null,
        scope: dnoScope,
        appointmentOrderUrl: appointmentOrderUrl.trim(),
        status: "PENDING_VERIFICATION"
      },
      include: {
        departmentOrganization: true,
        department: true,
        organization: true
      }
    });

    return res.status(201).json({
      success: true,
      message: "DNO nomination submitted successfully. It will be active once verified by Super Admin.",
      data: nomination
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to submit DNO nomination" });
  }
};

export const listDnoNominations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const organizationId = (req.query.organizationId as string) || user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const statusFilter = req.query.status as string;

    const nominations = await prisma.dnoNomination.findMany({
      where: {
        OR: [
          { organizationId },
          { departmentOrganizationId: organizationId }
        ],
        ...(statusFilter ? { status: statusFilter } : {})
      },
      include: {
        departmentOrganization: true,
        department: true,
        user: {
          select: { id: true, email: true, accountStatus: true }
        },
        verifiedBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: nominations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to list DNO nominations" });
  }
};

export const listPendingDnoNominations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const nominations = await prisma.dnoNomination.findMany({
      where: { status: "PENDING_VERIFICATION" },
      include: {
        organization: true,
        departmentOrganization: true,
        department: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: nominations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to list pending DNO nominations" });
  }
};

export const verifyDnoNomination = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { action, effectiveFrom, effectiveTo, rejectionReason } = req.body;

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ error: "Action must be APPROVE or REJECT" });
    }

    const nomination = await prisma.dnoNomination.findUnique({
      where: { id },
      include: { organization: true, departmentOrganization: true, department: true }
    });

    if (!nomination) {
      return res.status(404).json({ error: "DNO nomination not found" });
    }

    if (action === "REJECT") {
      const updated = await prisma.dnoNomination.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || "DNO nomination rejected during Super Admin verification.",
          verifiedById: adminUser?.id,
          verifiedAt: new Date()
        }
      });
      return res.json({ success: true, message: "DNO nomination rejected", data: updated });
    }

    // Action === APPROVE
    const effectiveFromDate = effectiveFrom ? new Date(effectiveFrom) : new Date();
    const effectiveToDate = effectiveTo ? new Date(effectiveTo) : null;

    // Dynamically resolve DNO Role by code "DISTRICT_NODAL_OFFICER"
    const dnoRole = await prisma.role.findFirst({
      where: { code: "DISTRICT_NODAL_OFFICER" }
    });
    const resolvedRoleId = dnoRole ? dnoRole.id : ROLE_ID.DISTRICT_NODAL_OFFICER;

    const targetOrgId = nomination.departmentOrganizationId || nomination.organizationId;

    // Check or create DNO User account
    let dnoUser = await prisma.user.findUnique({
      where: { email: nomination.officialEmail }
    });

    if (!dnoUser) {
      const defaultPassword = await bcrypt.hash("MahaCSR@DNO2026", 12);
      dnoUser = await prisma.user.create({
        data: {
          email: nomination.officialEmail,
          passwordHash: defaultPassword,
          firstName: nomination.firstName,
          lastName: nomination.lastName,
          designation: nomination.officialDesignation,
          mobile: nomination.officialMobile,
          roleId: resolvedRoleId,
          organizationId: targetOrgId,
          isVerified: true,
          accountStatus: "ACTIVE"
        }
      });
    } else {
      dnoUser = await prisma.user.update({
        where: { id: dnoUser.id },
        data: {
          roleId: resolvedRoleId,
          organizationId: targetOrgId,
          firstName: nomination.firstName,
          lastName: nomination.lastName,
          designation: nomination.officialDesignation,
          mobile: nomination.officialMobile,
          isVerified: true,
          accountStatus: "ACTIVE"
        }
      });
    }

    // Map District Nodal Mapping if organization has a district
    if (nomination.organization.district) {
      await prisma.districtNodalMapping.upsert({
        where: { id: `dno-map-${dnoUser.id}-${nomination.organization.district}` },
        create: {
          id: `dno-map-${dnoUser.id}-${nomination.organization.district}`,
          district: nomination.organization.district,
          userId: dnoUser.id,
          assignedById: adminUser?.id || dnoUser.id,
          isActive: true
        },
        update: {
          isActive: true
        }
      });
    }

    // Upsert UserOfficerProfile
    await prisma.userOfficerProfile.upsert({
      where: { userId: dnoUser.id },
      create: {
        userId: dnoUser.id,
        fullName: `${nomination.firstName} ${nomination.lastName}`,
        designation: nomination.officialDesignation,
        department: nomination.department?.name || nomination.organization.name,
        district: nomination.organization.district,
        employeeId: nomination.employeeId,
        mobile: nomination.officialMobile
      },
      update: {
        fullName: `${nomination.firstName} ${nomination.lastName}`,
        designation: nomination.officialDesignation,
        department: nomination.department?.name || nomination.organization.name,
        district: nomination.organization.district,
        employeeId: nomination.employeeId,
        mobile: nomination.officialMobile
      }
    });

    // Update nomination status
    const verifiedNomination = await prisma.dnoNomination.update({
      where: { id },
      data: {
        status: "ACTIVE",
        userId: dnoUser.id,
        effectiveFrom: effectiveFromDate,
        effectiveTo: effectiveToDate,
        verifiedById: adminUser?.id,
        verifiedAt: new Date()
      },
      include: { department: true, organization: true, user: true }
    });

    // If department-specific, update dnoName on subDepartment
    if (nomination.departmentId) {
      await prisma.subDepartment.update({
        where: { id: nomination.departmentId },
        data: {
          dnoName: `${nomination.firstName} ${nomination.lastName}`
        }
      });
    }

    return res.json({
      success: true,
      message: "DNO nomination verified and activated successfully.",
      data: verifiedNomination
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to verify DNO nomination" });
  }
};

export const replaceDnoNomination = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const nomination = await prisma.dnoNomination.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!nomination) {
      return res.status(404).json({ error: "DNO nomination not found." });
    }

    // Set effectiveTo to now and status to INACTIVE
    const replaced = await prisma.dnoNomination.update({
      where: { id },
      data: {
        effectiveTo: new Date(),
        status: "INACTIVE"
      }
    });

    return res.json({
      success: true,
      message: "DNO nomination marked as replaced. Please submit a new nomination.",
      data: replaced
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to replace DNO nomination" });
  }
};

export const updateDnoAuthority = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const { dnoAuthority, organizationId } = req.body;
    const targetOrgId = organizationId || user?.organizationId;

    if (!targetOrgId) {
      return res.status(400).json({ error: "Organization ID is required." });
    }

    if (!["DEPARTMENT", "PARENT_ORGANIZATION", "SUPER_ADMIN"].includes(dnoAuthority)) {
      return res.status(400).json({ error: "dnoAuthority must be DEPARTMENT, PARENT_ORGANIZATION, or SUPER_ADMIN." });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: targetOrgId },
      data: { dnoAuthority }
    });

    return res.json({
      success: true,
      message: `DNO appointment authority updated to ${dnoAuthority}.`,
      data: updatedOrg
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update DNO appointment authority." });
  }
};
