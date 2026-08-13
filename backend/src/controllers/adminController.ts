import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/db";
import { getPrimaryFrontendUrl } from "../config/env";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ROLE_ID, getRoleId } from "../types/role";
import { createInvitation } from "../services/invitationService";
import { sendUserInvitationEmail } from "../services/emailService";

export const getAdminOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const where = {};
    const [
      users,
      pendingNgos,
      pendingCompanies,
      submittedProjects,
      auditLogs
    ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.organization.count({ where: { kind: "NGO" } }),
      prisma.organization.count({ where: { kind: "CSR_COMPANY" } }),
      prisma.project.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({ users, pendingNgos, pendingCompanies, submittedProjects, auditLogs });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";

    const userRole = String(req.user?.role || "").toUpperCase();
    const isGlobalAdmin = ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_ADMIN", "PORTAL_ADMIN"].includes(userRole) || String(req.user?.roleId) === "1" || Number(req.user?.roleId) === 1;

    const where: any = { deletedAt: null };
    const conditions: any[] = [];

    if (!isGlobalAdmin) {
      if (req.user?.organizationId) {
        conditions.push({
          OR: [
            { organizationId: req.user.organizationId },
            { parentUserId: req.user.id }
          ]
        });
      } else {
        conditions.push({ parentUserId: req.user?.id || "NO_MATCH" });
      }
    }

    if (search) {
      conditions.push({
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { designation: { contains: search, mode: "insensitive" } }
        ]
      });
    }

    if (status) {
      where.accountStatus = status;
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          organizationId: true,
          email: true,
          firstName: true,
          lastName: true,
          mobile: true,
          designation: true,
          accountStatus: true,
          isVerified: true,
          createdAt: true,
          roleId: true,
          role: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true, kind: true } },
          officerProfile: { select: { designation: true, fullName: true, department: true, district: true, taluka: true, mobile: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    const mappedUsers = users.map((u) => ({
      ...u,
      assignedDistrict: u.officerProfile?.district || null
    }));

    return res.json({
      success: true,
      data: mappedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createAdminUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password: inputPassword,
      sendInvitation: inputSendInvitation,
      roleId: inputRoleId,
      role: inputRole,
      accountStatus = "ACTIVE",
      organizationId,
      firstName: rawFirstName,
      lastName: rawLastName,
      fullName,
      mobile: rawMobile,
      designation: rawDesignation,
      department: rawDepartment,
      district: inputDistrict,
      assignedDistrict,
      taluka
    } = req.body;

    const district = String(inputDistrict || assignedDistrict || "").trim();
    const firstName = String(rawFirstName || (fullName ? String(fullName).trim().split(/\s+/)[0] : "")).trim();
    const lastName = String(rawLastName || (fullName ? String(fullName).trim().split(/\s+/).slice(1).join(" ") : "")).trim();
    const mobile = String(rawMobile || "").trim();
    const designation = String(rawDesignation || "").trim();
    const department = String(rawDepartment || "MahaCSR Portal").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return res.status(400).json({ error: "A valid official email is required." });
    if (!firstName || !lastName) return res.status(400).json({ error: "First name and last name are required." });
    if (!designation) return res.status(400).json({ error: "Designation is required." });
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile)) return res.status(400).json({ error: "A valid mobile number (10-15 digits) is required." });

    const requestedRole = inputRoleId ?? inputRole;
    let roleId = getRoleId(requestedRole);
    if (!roleId && typeof requestedRole === "string" && requestedRole.trim()) {
      const dynamicRole = await prisma.role.findFirst({ where: { name: requestedRole.trim() }, select: { id: true } });
      roleId = dynamicRole?.id ?? null;
    }
    if (!roleId || !Number.isInteger(roleId)) return res.status(400).json({ error: "A valid platform role is required." });

    const userRole = String(req.user?.role || "").toUpperCase();
    const isGlobalAdmin = ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_ADMIN", "PORTAL_ADMIN"].includes(userRole) || String(req.user?.roleId) === "1" || Number(req.user?.roleId) === 1;

    const roleRecord = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true, isSystemRole: true, organizationId: true } });
    if (!roleRecord) return res.status(400).json({ error: "Selected role does not exist." });

    if (!isGlobalAdmin) {
      const allowedSystemRoleIds: number[] = [ROLE_ID.COMPANY_ADMIN, ROLE_ID.NGO_ADMIN, ROLE_ID.GOVERNMENT_OFFICER];
      const isAllowedSystemRole = roleRecord.isSystemRole && allowedSystemRoleIds.includes(Number(roleRecord.id));
      const isOwnOrgCustomRole = !roleRecord.isSystemRole && roleRecord.organizationId === req.user?.organizationId;

      if (!isAllowedSystemRole && !isOwnOrgCustomRole) {
        return res.status(403).json({ error: "Forbidden: You can only assign organization member roles or custom roles created for your organization." });
      }
    }

    if ((roleId === ROLE_ID.DISTRICT_NODAL_OFFICER || roleId === ROLE_ID.DISTRICT_NODAL_CONSULTANT) && !district) {
      return res.status(400).json({ error: "A district is required for district nodal officers and consultants." });
    }

    // Check active non-deleted user with this email
    const activeUser = await prisma.user.findFirst({ where: { email: normalizedEmail, deletedAt: null } });
    if (activeUser) return res.status(409).json({ error: "Email already registered." });

    if (mobile) {
      const activeMobile = await prisma.user.findFirst({ where: { mobile, deletedAt: null } });
      if (activeMobile) return res.status(409).json({ error: "Mobile number is already registered." });
    }

    if (organizationId) {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
      if (!organization) return res.status(400).json({ error: "Selected organization does not exist." });
    }

    // Determine password and email invitation rules
    const isPasswordBlank = !inputPassword || !String(inputPassword).trim();
    const finalPassword = isPasswordBlank
      ? `MahaCSR@${crypto.randomInt(100000, 999999)}`
      : String(inputPassword).trim();

    // If password left blank -> send invitation is COMPULSORY (true)
    // If password set manually -> send invitation is OPTIONAL (boolean passed or true by default)
    const sendInvitation = isPasswordBlank ? true : (inputSendInvitation === undefined ? true : Boolean(inputSendInvitation));

    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const targetOrgId = isGlobalAdmin ? (organizationId || null) : (req.user?.organizationId || null);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        loginIdentifier: normalizedEmail,
        passwordHash,
        roleId,
        organizationId: targetOrgId,
        parentUserId: req.user?.id || null,
        firstName,
        lastName,
        mobile,
        designation,
        accountStatus: "ACTIVE",
        isVerified: true,
        mustResetPassword: sendInvitation,
        temporaryPasswordExpiresAt: sendInvitation ? new Date(Date.now() + 72 * 60 * 60 * 1000) : null,
        officerProfile: {
          create: {
            fullName: `${firstName} ${lastName}`.trim(),
            designation,
            department,
            district: district || null,
            taluka: taluka ? String(taluka).trim() : null,
            mobile
          }
        }
      },
      select: {
        id: true,
        email: true,
        roleId: true,
        accountStatus: true,
        isVerified: true,
        createdAt: true,
        firstName: true,
        lastName: true,
        designation: true,
        mobile: true,
        officerProfile: { select: { fullName: true, designation: true, department: true, district: true, taluka: true } }
      }
    });

    // Link DNC support without replacing other active DNCs in the same district.
    const cleanDistrict = district || null;
    if (cleanDistrict) {
      if (roleId === ROLE_ID.DISTRICT_NODAL_CONSULTANT) {
        await prisma.districtDncAssignment.create({
          data: {
            district: cleanDistrict,
            organizationId: targetOrgId || null,
            dncUserId: user.id,
            assignedById: req.user!.id,
            isActive: true
          }
        }).catch((err) => console.error("Error creating DistrictDncAssignment:", err));
      } else if (roleId === ROLE_ID.DISTRICT_NODAL_OFFICER) {
        await prisma.districtNodalMapping.create({
          data: {
            district: cleanDistrict,
            userId: user.id,
            assignedById: req.user!.id,
            isActive: true
          }
        }).catch((err) => console.error("Error creating DistrictNodalMapping:", err));
      }
    }

    let invitationEmailSent = false;
    let resetUrl = "";

    if (sendInvitation) {
      const frontendUrl = getPrimaryFrontendUrl();
      const loginUrl = `${frontendUrl}/login`;
      const dashboardUrl = `${frontendUrl}/dashboard`;

      try {
        await sendUserInvitationEmail({
          to: normalizedEmail,
          applicantName: `${firstName} ${lastName}`.trim(),
          roleName: roleRecord.name,
          password: finalPassword,
          loginUrl,
          dashboardUrl,
          isAutogenerated: isPasswordBlank
        });
        invitationEmailSent = true;
      } catch (emailErr) {
        console.error("Failed to send invitation email:", emailErr);
      }
    }

    return res.status(201).json({
      success: true,
      user: {
        ...user,
        assignedDistrict: user.officerProfile?.district || null
      },
      invitationSent: invitationEmailSent,
      isPasswordAutoGenerated: isPasswordBlank
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const userRole = String(req.user?.role || "").toUpperCase();
    const isGlobalAdmin = ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_ADMIN", "PORTAL_ADMIN"].includes(userRole) || String(req.user?.roleId) === "1" || Number(req.user?.roleId) === 1;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { officerProfile: { select: { district: true } } }
    });
    if (!existingUser) return res.status(404).json({ error: "User not found" });

    if (!isGlobalAdmin) {
      const belongsToOrg = req.user?.organizationId && existingUser.organizationId === req.user.organizationId;
      const isSubLogin = existingUser.parentUserId === req.user?.id;
      if (!belongsToOrg && !isSubLogin) {
        return res.status(403).json({ error: "Forbidden: You can only manage users within your own organization." });
      }
    }

    const {
      email: rawEmail,
      password: rawPassword,
      accountStatus,
      roleId: inputRoleId,
      role: inputRole,
      firstName: rawFirstName,
      lastName: rawLastName,
      mobile: rawMobile,
      designation: rawDesignation,
      department: rawDepartment,
      district: inputDistrict,
      assignedDistrict,
      taluka
    } = req.body;

    const district = inputDistrict !== undefined ? inputDistrict : assignedDistrict;
    const email = rawEmail === undefined ? undefined : String(rawEmail).trim().toLowerCase();
    const firstName = rawFirstName === undefined ? undefined : String(rawFirstName).trim();
    const lastName = rawLastName === undefined ? undefined : String(rawLastName).trim();
    const mobile = rawMobile === undefined ? undefined : String(rawMobile).trim();
    const designation = rawDesignation === undefined ? undefined : String(rawDesignation).trim();
    const department = rawDepartment === undefined ? undefined : String(rawDepartment).trim();
    const password = rawPassword === undefined ? undefined : String(rawPassword).trim();

    if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "A valid official email is required." });
    if (mobile !== undefined && !/^\+?[1-9]\d{9,14}$/.test(mobile)) return res.status(400).json({ error: "A valid mobile number (10-15 digits) is required." });
    if (firstName !== undefined && !firstName) return res.status(400).json({ error: "First name is required." });
    if (lastName !== undefined && !lastName) return res.status(400).json({ error: "Last name is required." });
    if (designation !== undefined && !designation) return res.status(400).json({ error: "Designation is required." });

    if (email !== undefined) {
      const duplicateEmail = await prisma.user.findFirst({ where: { email, NOT: { id }, deletedAt: null }, select: { id: true } });
      if (duplicateEmail) return res.status(409).json({ error: "Email already registered." });
    }

    if (mobile !== undefined) {
      const duplicateMobile = await prisma.user.findFirst({ where: { mobile, NOT: { id }, deletedAt: null }, select: { id: true } });
      if (duplicateMobile) return res.status(409).json({ error: "Mobile number is already registered." });
    }

    const requestedRole = inputRoleId ?? inputRole;
    let resolvedRoleId = requestedRole === undefined ? undefined : getRoleId(requestedRole);
    if (requestedRole !== undefined && !resolvedRoleId && typeof requestedRole === "string" && requestedRole.trim()) {
      const dynamicRole = await prisma.role.findFirst({ where: { name: requestedRole.trim() }, select: { id: true } });
      resolvedRoleId = dynamicRole?.id;
    }
    if (requestedRole !== undefined && (!resolvedRoleId || !Number.isInteger(resolvedRoleId))) {
      return res.status(400).json({ error: "Selected role does not exist." });
    }

    if (resolvedRoleId && !isGlobalAdmin) {
      const targetRole = await prisma.role.findUnique({ where: { id: resolvedRoleId }, select: { id: true, isSystemRole: true, organizationId: true } });
      if (targetRole && (targetRole.isSystemRole || targetRole.id <= 9)) {
        return res.status(403).json({ error: "Forbidden: Company Admins and Government Officers can only assign custom roles created for their organization." });
      }
      if (targetRole?.organizationId && targetRole.organizationId !== req.user?.organizationId) {
        return res.status(403).json({ error: "Forbidden: You cannot assign custom roles belonging to another organization." });
      }
    }

    const effectiveRoleId = resolvedRoleId || existingUser.roleId;
    const effectiveDistrict = district !== undefined ? String(district || "").trim() : (existingUser.officerProfile?.district || "");

    if ((effectiveRoleId === ROLE_ID.DISTRICT_NODAL_OFFICER || effectiveRoleId === ROLE_ID.DISTRICT_NODAL_CONSULTANT) && !effectiveDistrict) {
      return res.status(400).json({ error: "A district is required for district nodal officers and consultants." });
    }

    let passwordHashToSet: string | undefined = undefined;
    if (password && password.length >= 6) {
      passwordHashToSet = await bcrypt.hash(password, 10);
    }

    const updatedData: any = {};
    if (email !== undefined) updatedData.email = email;
    if (passwordHashToSet) updatedData.passwordHash = passwordHashToSet;
    if (accountStatus) {
      updatedData.accountStatus = accountStatus;
      if (accountStatus !== "ACTIVE") updatedData.tokenVersion = { increment: 1 };
    }
    if (resolvedRoleId) updatedData.roleId = resolvedRoleId;
    if (firstName !== undefined) updatedData.firstName = firstName;
    if (lastName !== undefined) updatedData.lastName = lastName;
    if (mobile !== undefined) updatedData.mobile = mobile;
    if (designation !== undefined) updatedData.designation = designation;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...updatedData,
        officerProfile: {
          upsert: {
            create: {
              fullName: [firstName, lastName].filter(Boolean).join(" ") || "Official User",
              designation: designation || null,
              department: department || "MahaCSR Portal",
              district: district ? String(district).trim() : null,
              taluka: taluka ? String(taluka).trim() : null,
              mobile: mobile || null
            },
            update: {
              ...(firstName !== undefined || lastName !== undefined ? { fullName: [firstName, lastName].filter(Boolean).join(" ") || "Official User" } : {}),
              ...(designation !== undefined ? { designation } : {}),
              ...(department !== undefined ? { department } : {}),
              ...(district !== undefined ? { district: String(district || "").trim() || null } : {}),
              ...(taluka !== undefined ? { taluka: String(taluka || "").trim() || null } : {}),
              ...(mobile !== undefined ? { mobile } : {})
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        roleId: true,
        accountStatus: true,
        firstName: true,
        lastName: true,
        designation: true,
        mobile: true,
        officerProfile: { select: { fullName: true, designation: true, department: true, district: true, taluka: true } },
        updatedAt: true
      }
    });

    if (accountStatus && accountStatus !== "ACTIVE") {
      await Promise.all([
        prisma.session.updateMany({ where: { userId: id, isRevoked: false }, data: { isRevoked: true, revokedByUserId: req.user!.id } }),
        prisma.organizationMembership.updateMany({ where: { userId: id, status: "ACTIVE" }, data: { status: "SUSPENDED" } }),
        prisma.corporateNgoAccess.updateMany({ where: { userId: id, status: "ACTIVE" }, data: { status: "SUSPENDED", tokenVersion: { increment: 1 } } }),
      ]);
    }
    await prisma.auditLog.create({ data: { actorUserId: req.user!.id, userId: req.user!.id, action: "USER_UPDATED", entityType: "User", entityId: id, details: { before: { accountStatus: existingUser.accountStatus, roleId: existingUser.roleId, email: existingUser.email }, after: { accountStatus: accountStatus || existingUser.accountStatus, roleId: effectiveRoleId, email: email || existingUser.email } } } });

    if (effectiveDistrict) {
      if (effectiveRoleId === ROLE_ID.DISTRICT_NODAL_CONSULTANT) {
        const existingDncLink = await prisma.districtDncAssignment.findFirst({
          where: { district: effectiveDistrict, organizationId: existingUser.organizationId || null, dncUserId: user.id }
        });
        if (existingDncLink) {
          await prisma.districtDncAssignment.update({
            where: { id: existingDncLink.id },
            data: { assignedById: req.user!.id, isActive: true }
          }).catch((err) => console.error("Error updating DistrictDncAssignment:", err));
        } else {
          await prisma.districtDncAssignment.create({
            data: {
              district: effectiveDistrict,
              organizationId: existingUser.organizationId || null,
              dncUserId: user.id,
              assignedById: req.user!.id,
              isActive: true
            }
          }).catch((err) => console.error("Error creating DistrictDncAssignment:", err));
        }
      } else if (effectiveRoleId === ROLE_ID.DISTRICT_NODAL_OFFICER) {
        await prisma.districtNodalMapping.create({
          data: {
            district: effectiveDistrict,
            userId: user.id,
            assignedById: req.user!.id,
            isActive: true
          }
        }).catch((err) => console.error("Error creating DistrictNodalMapping:", err));
      }
    }

    return res.json({
      success: true,
      user: {
        ...user,
        assignedDistrict: user.officerProfile?.district || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "User not found" });

    const userRole = String(req.user?.role || "").toUpperCase();
    const isGlobalAdmin = ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_ADMIN", "PORTAL_ADMIN"].includes(userRole) || String(req.user?.roleId) === "1" || Number(req.user?.roleId) === 1;

    if (!isGlobalAdmin) {
      const belongsToOrg = req.user?.organizationId && existing.organizationId === req.user.organizationId;
      const isSubLogin = existing.parentUserId === req.user?.id;
      if (!belongsToOrg && !isSubLogin) {
        return res.status(403).json({ error: "Forbidden: You can only delete users within your own organization." });
      }
    }

    const timestamp = Date.now();
    const anonymizedEmail = existing.email.includes(".deleted.") 
      ? existing.email 
      : `${existing.email}.deleted.${timestamp}`;
    const anonymizedMobile = existing.mobile 
      ? `${existing.mobile}_del_${timestamp}` 
      : null;

    await prisma.user.update({
      where: { id },
      data: {
        email: anonymizedEmail,
        mobile: anonymizedMobile,
        accountStatus: "DELETED",
        deletedAt: new Date(),
        deletedById: req.user?.id || null
      }
    });

    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const importAdminUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "An array of user objects in 'users' field is required." });
    }

    const results = {
      imported: [] as any[],
      errors: [] as any[],
      totalProcessed: users.length
    };

    for (let idx = 0; idx < users.length; idx++) {
      const u = users[idx];
      try {
        const email = String(u.email || "").trim().toLowerCase();
        const firstName = String(u.firstName || "").trim();
        const lastName = String(u.lastName || "").trim();
        const mobile = String(u.mobile || "").trim();
        const designation = String(u.designation || "Relationship Manager").trim();
        const department = String(u.department || "MahaCSR State Cell").trim();
        const district = String(u.district || u.assignedDistrict || "").trim();
        const requestedRole = u.role || "RELATIONSHIP_MANAGER";

        let roleId = getRoleId(requestedRole);
        if (!roleId) roleId = 6; // Default to Relationship Manager if unmapped

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          throw new Error("Invalid or missing email address.");
        }
        if (!firstName) {
          throw new Error("First name is required.");
        }

        const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
        if (existing) {
          throw new Error(`Email ${email} is already registered.`);
        }

        const tempPassword = `MahaCSR@${crypto.randomInt(100000, 999999)}`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const createdUser = await prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            mobile: mobile || null,
            designation,
            roleId,
            accountStatus: "ACTIVE",
            organizationId: req.user?.organizationId || null,
            officerProfile: {
              create: {
                fullName: `${firstName} ${lastName}`.trim(),
                designation,
                department,
                district: district || null
              }
            }
          }
        });

        results.imported.push({
          id: createdUser.id,
          email: createdUser.email,
          name: `${firstName} ${lastName}`.trim(),
          role: requestedRole,
          tempPassword
        });
      } catch (err: any) {
        results.errors.push({
          row: idx + 1,
          email: u.email || "Unknown",
          error: err.message || "Import failed"
        });
      }
    }

    return res.json({
      success: true,
      message: `Imported ${results.imported.length} users successfully (${results.errors.length} failed).`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};
