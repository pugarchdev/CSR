import { Response } from "express";
import { prisma } from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export const createDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(403).json({ error: "Access denied. Organization context is required." });
    }

    const { name, code, type, description, officeAddress, officialEmail, officialPhone, departmentHead, departmentHeadEmail, departmentHeadMobile } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Department name is required" });
    }

    const dept = await prisma.subDepartment.create({
      data: {
        organizationId: user.organizationId,
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null,
        type: type || null,
        description: description || null,
        officeAddress: officeAddress || null,
        officialEmail: officialEmail || null,
        officialPhone: officialPhone || null,
        departmentHead: departmentHead || null,
        departmentHeadEmail: departmentHeadEmail || null,
        departmentHeadMobile: departmentHeadMobile || null,
        status: "ACTIVE"
      }
    });

    return res.status(201).json({ success: true, message: "Department created successfully", data: dept });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to create department" });
  }
};

export const listDepartments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const organizationId = (req.query.organizationId as string) || user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const departments = await prisma.subDepartment.findMany({
      where: { organizationId },
      include: {
        dnoNominations: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officialDesignation: true,
            officialEmail: true,
            officialMobile: true,
            scope: true,
            effectiveFrom: true,
            effectiveTo: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return res.json({ success: true, data: departments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to list departments" });
  }
};

export const updateDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(403).json({ error: "Access denied. Organization context is required." });
    }

    const existing = await prisma.subDepartment.findFirst({
      where: { id, organizationId: user.organizationId }
    });
    if (!existing) {
      return res.status(404).json({ error: "Department not found in your organization" });
    }

    const { name, code, type, description, officeAddress, officialEmail, officialPhone, departmentHead, departmentHeadEmail, departmentHeadMobile, status } = req.body;

    const updated = await prisma.subDepartment.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code !== undefined ? { code: code ? code.trim().toUpperCase() : null } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(officeAddress !== undefined ? { officeAddress } : {}),
        ...(officialEmail !== undefined ? { officialEmail } : {}),
        ...(officialPhone !== undefined ? { officialPhone } : {}),
        ...(departmentHead !== undefined ? { departmentHead } : {}),
        ...(departmentHeadEmail !== undefined ? { departmentHeadEmail } : {}),
        ...(departmentHeadMobile !== undefined ? { departmentHeadMobile } : {}),
        ...(status !== undefined ? { status } : {})
      }
    });

    return res.json({ success: true, message: "Department updated successfully", data: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to update department" });
  }
};

export const deleteDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user || !user.organizationId) {
      return res.status(403).json({ error: "Access denied. Organization context is required." });
    }

    await prisma.subDepartment.deleteMany({
      where: { id, organizationId: user.organizationId }
    });

    return res.json({ success: true, message: "Department deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to delete department" });
  }
};

export const listGovernmentOrganizationsByDistrict = async (req: any, res: Response) => {
  try {
    const district = (req.query.district as string || "").trim();
    const where: any = {
      kind: "GOVERNMENT_DEPARTMENT",
      status: "ACTIVE"
    };
    if (district) {
      where.district = { equals: district, mode: "insensitive" };
    }

    const orgs = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        district: true,
        city: true,
        taluka: true,
        govDeptProfile: {
          select: { orgType: true, adminLevel: true }
        }
      },
      orderBy: [{ district: "asc" }, { name: "asc" }]
    });

    const formatted = orgs.map((org) => {
      const districtLabel = org.district ? `, ${org.district}` : "";
      const hasDistrictInName = org.name.toLowerCase().includes(org.district?.toLowerCase() || "___");
      const formattedLabel = hasDistrictInName ? org.name : `${org.name}${districtLabel}`;

      return {
        id: org.id,
        name: org.name,
        district: org.district,
        formattedLabel,
        type: org.govDeptProfile?.orgType || "Government Department"
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to list government organizations" });
  }
};
