import { Request, Response, NextFunction } from "express";
import { resolvePublicRegistrationAccountType } from "../utils/publicRegistration";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import prisma from "../config/db";
import { getJwtRefreshSecret, getJwtSecret } from "../config/env";
import { getRoleId } from "../types/role";
import { computeUserPermissions } from "../services/permissionService";
import { CacheService } from "../services/cacheService";
import { primeAuthenticatedUserCache } from "../middlewares/authMiddleware";
import { sendOtp as sendOtpService, verifyOtp as verifyOtpService, assertOtpVerified } from "../services/otpService";

const JWT_SECRET = getJwtSecret();
const JWT_REFRESH_SECRET = getJwtRefreshSecret();

const OTP_TTL_MINUTES = 10;

// Reusable SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || ""
  } : undefined,
});

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP email using the configured SMTP transport.
 */
async function sendOtpEmail(to: string, otpCode: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - MahaCSR Portal</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #334e68; }
          .container { max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin: 0 auto; }
          .header { background: #0d1c3a; padding: 30px; text-align: center; border-bottom: 4px solid #ff9800; }
          .header h1 { color: #ffffff; font-size: 22px; margin: 0; }
          .body { padding: 40px 30px; line-height: 1.6; }
          .otp-box { background: #f0f4f8; border: 2px dashed #0d1c3a; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0d1c3a; font-family: monospace; }
          .footer { background: #f0f4f8; text-align: center; padding: 20px; font-size: 12px; color: #627d98; border-top: 1px solid #d9e2ec; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MahaCSR Setu — Email Verification</h1>
          </div>
          <div class="body">
            <p>Dear User,</p>
            <p>Thank you for registering on the Maharashtra State CSR Convergence Portal. Please use the following OTP to verify your email address:</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <p>This code is valid for <strong>${OTP_TTL_MINUTES} minutes</strong>. Do not share this code with anyone.</p>
            <p>If you did not request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 Government of Maharashtra | CSR Convergence Portal</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"MahaCSR Portal" <${process.env.SMTP_USER || "noreply@mahacsr.gov.in"}>`,
    to,
    subject: "Email Verification OTP — MahaCSR Portal",
    html,
  });
}

/**
 * Create OTP record in database and send email.
 */
async function createAndSendOtp(email: string): Promise<void> {
  const otpCode = generateOtp();
  const otpHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      identifier: email.trim().toLowerCase(),
      otpHash,
      expiresAt,
    },
  });

  // Log OTP in development for debugging
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] Email: ${email} | OTP: ${otpCode}`);
  }

  // Fire-and-forget: send email in background, don't block the response
  sendOtpEmail(email, otpCode).then(() => {
    console.log(`[Email] OTP sent to ${email}`);
  }).catch((err: any) => {
    console.error(`[Email] Failed to send OTP to ${email}:`, err.message);
    // Don't fail registration if email fails — OTP is logged in dev mode
  });
}

const generateTokens = (user: {
  id: string;
  email: string;
  roleId?: number | null;
  organizationId?: string | null;
  tokenVersion?: number | null;
}, context?: { ngoAccessId?: string; corporateOrganizationId?: string }) => {
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion || 1,
    organizationId: user.organizationId || null,
    ...(context || {})
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, designation, role: rawRole, accountType: rawAccountType, entityType: rawEntityType, profile } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userFirstName = (firstName || profile?.firstName || profile?.contactPersonFirstName || "").trim() || null;
    const userLastName = (lastName || profile?.lastName || profile?.contactPersonLastName || "").trim() || null;
    const userDesignation = (designation || profile?.designation || profile?.cin || "").trim() || null;

    const normalizedEmail = email.trim().toLowerCase();

    const publicAccount = resolvePublicRegistrationAccountType(rawAccountType || rawEntityType || rawRole);
    if (!publicAccount) {
      return res.status(400).json({
        error: "Invalid or missing account type. Public registration accepts only CSR_COMPANY or GOVERNMENT_DEPARTMENT. NGOs and implementing agencies must use a company invitation."
      });
    }
    const effectiveRoleId = publicAccount.roleId;

    // 1. Ensure target Role exists in DB (never create system roles during public registration)
    const existingRole = await prisma.role.findUnique({ where: { id: effectiveRoleId } });
    if (!existingRole) {
      return res.status(400).json({ error: "System role for selected account type is not initialized." });
    }

    const cleanPan = profile?.pan && profile.pan.trim().length > 0 ? profile.pan.trim().toUpperCase() : null;
    const cleanCin = profile?.cin && profile.cin.trim().length > 0 ? profile.cin.trim().toUpperCase() : null;

    // 2. Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { organization: true }
    });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: "An account with this email is already registered and verified. Please sign in." });
    }

    // 3. Check existing organization by PAN
    if (cleanPan) {
      const existingPanOrg = await prisma.organization.findFirst({
        where: { pan: cleanPan },
        include: { users: true }
      });
      if (existingPanOrg) {
        const isVerifiedOrg = existingPanOrg.users.some((u) => u.isVerified);
        if (isVerifiedOrg && (!existingUser || existingUser.organizationId !== existingPanOrg.id)) {
          return res.status(400).json({ error: "An organization with this PAN is already registered and verified." });
        }
      }
    }

    // 4. Check existing organization by CIN
    if (cleanCin) {
      const existingCinOrg = await prisma.organization.findFirst({
        where: { cin: cleanCin },
        include: { users: true }
      });
      if (existingCinOrg) {
        const isVerifiedOrg = existingCinOrg.users.some((u) => u.isVerified);
        if (isVerifiedOrg && (!existingUser || existingUser.organizationId !== existingCinOrg.id)) {
          return res.status(400).json({ error: "An organization with this CIN is already registered and verified." });
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const orgKind = publicAccount.kind;

    // 5. Execute User & Organization creation / update inside atomic Prisma Transaction
    const user = await prisma.$transaction(async (tx) => {
      let organizationId: string | null = null;
      const fullAddress = [
        profile?.addressLine1,
        profile?.addressLine2,
        profile?.city,
        profile?.taluka,
        profile?.district,
        profile?.state,
        profile?.pincode
      ].filter(Boolean).join(", ") || profile?.address || null;

      if (profile?.name) {
        let resolvedParentOrgId: string | null = profile.parentOrganizationId || null;
        if (!resolvedParentOrgId && profile.parentRegistrationCode) {
          const matchedParent = await tx.organization.findUnique({
            where: { parentRegistrationCode: profile.parentRegistrationCode.trim().toUpperCase() }
          });
          if (matchedParent) resolvedParentOrgId = matchedParent.id;
        }

        const isChildDept = orgKind === "GOVERNMENT_DEPARTMENT" && profile.registrationCategory === "GOVT_DEPARTMENT" && Boolean(resolvedParentOrgId);
        const generatedParentCode = (orgKind === "GOVERNMENT_DEPARTMENT" && !isChildDept)
          ? `${(profile.officialCode || profile.name).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
          : null;

        const orgData = {
          name: profile.name,
          kind: orgKind,
          cin: cleanCin,
          pan: cleanPan,
          officialIdentifierType: profile.officialIdentifierType || (orgKind === "GOVERNMENT_DEPARTMENT" ? "GOVT_LOCAL_BODY_CODE" : cleanCin ? "CIN" : cleanPan ? "PAN" : null),
          officialIdentifierNumber: profile.officialIdentifierNumber || profile.officialRegNo || profile.registrationNumber || profile.officialCode || cleanCin || cleanPan || null,
          registrationNumber: profile.officialRegNo || profile.registrationNumber || profile.officialCode || null,
          parentOrganizationId: resolvedParentOrgId,
          parentRegistrationCode: generatedParentCode,
          parentRelationshipStatus: resolvedParentOrgId ? "PENDING_VERIFICATION" : "NONE",
          officialEmail: normalizedEmail,
          officialOfficeEmail: profile.officialOfficeEmail || normalizedEmail,
          officialPhone: profile.mobile || profile.representativeMobile || null,
          officialOfficePhone: profile.officialOfficePhone || profile.officePhone || profile.mobile || null,
          website: profile.website || null,
          address: fullAddress,
          addressLine1: profile.addressLine1 || null,
          addressLine2: profile.addressLine2 || null,
          city: profile.city || null,
          taluka: profile.taluka || null,
          district: profile.district || null,
          state: profile.state || "Maharashtra",
          pincode: profile.pincode || null,
        };

        if (existingUser && existingUser.organizationId) {
          // Update existing pending organization
          const updatedOrg = await tx.organization.update({
            where: { id: existingUser.organizationId },
            data: orgData
          });
          organizationId = updatedOrg.id;
        } else {
          // Create new organization
          const newOrg = await tx.organization.create({
            data: orgData
          });
          organizationId = newOrg.id;
        }

        // Create pending OrganizationRelationship record if registering under a parent
        if (organizationId && resolvedParentOrgId) {
          await tx.organizationRelationship.upsert({
            where: {
              childOrganizationId_parentOrganizationId: {
                childOrganizationId: organizationId,
                parentOrganizationId: resolvedParentOrgId
              }
            },
            create: {
              childOrganizationId: organizationId,
              parentOrganizationId: resolvedParentOrgId,
              status: "PENDING"
            },
            update: {
              status: "PENDING"
            }
          });
        }

        // Save uploaded organization documents if provided
        if (organizationId) {
          const docsToCreate = [];
          if (profile.govtDocUrl) {
            docsToCreate.push({
              title: "Government Registration / Authorization Document",
              documentType: "GOVT_AUTHORIZATION_DOC",
              fileUrl: profile.govtDocUrl,
              fileName: profile.govtDocName || "govt_authorization_doc.pdf",
              fileSize: profile.govtDocSize || 0,
              fileType: "application/pdf",
              organizationId
            });
          }
          if (profile.proofDocUrl) {
            docsToCreate.push({
              title: "Official Organization Proof",
              documentType: "OFFICIAL_ORG_PROOF",
              fileUrl: profile.proofDocUrl,
              fileName: profile.proofDocName || "official_org_proof.pdf",
              fileSize: profile.proofDocSize || 0,
              fileType: "application/pdf",
              organizationId
            });
          }
          if (profile.otherDocUrl) {
            docsToCreate.push({
              title: "Other Supporting Document",
              documentType: "SUPPORTING_DOC",
              fileUrl: profile.otherDocUrl,
              fileName: profile.otherDocName || "supporting_doc.pdf",
              fileSize: profile.otherDocSize || 0,
              fileType: "application/pdf",
              organizationId
            });
          }
          if (docsToCreate.length > 0) {
            await tx.document.createMany({ data: docsToCreate });
          }
        }

        // Upsert GovDepartmentProfile for government entities (capturing Authorized Representative info, NOT auto-DNO)
        if (orgKind === "GOVERNMENT_DEPARTMENT" && organizationId) {
          const fullName = [userFirstName, userLastName].filter(Boolean).join(" ") || profile?.name || "Authorized Representative";
          await tx.govDepartmentProfile.upsert({
            where: { organizationId },
            create: {
              organizationId,
              orgType: profile.orgType || null,
              adminLevel: profile.adminLevel || null,
              parentOrganization: profile.parentOrganization || null,
              officialRegNo: profile.officialIdentifierNumber || profile.officialRegNo || profile.registrationNumber || profile.officialCode || null,
              deptOfficeCode: profile.deptOfficeCode || profile.officialCode || null,
              departmentType: profile.orgType || null,
              departmentCode: profile.deptOfficeCode || profile.officialCode || null,
              employeeId: profile.employeeId || null,
              representativeMobile: profile.mobile || profile.representativeMobile || null,
            },
            update: {
              orgType: profile.orgType || null,
              adminLevel: profile.adminLevel || null,
              parentOrganization: profile.parentOrganization || null,
              officialRegNo: profile.officialIdentifierNumber || profile.officialRegNo || profile.registrationNumber || profile.officialCode || null,
              deptOfficeCode: profile.deptOfficeCode || profile.officialCode || null,
              departmentType: profile.orgType || null,
              departmentCode: profile.deptOfficeCode || profile.officialCode || null,
              employeeId: profile.employeeId || null,
              representativeMobile: profile.mobile || profile.representativeMobile || null,
            }
          });
        }
      }

      let createdOrUpdatedUser;
      if (existingUser) {
        // Update unverified pending user record
        createdOrUpdatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            firstName: userFirstName,
            lastName: userLastName,
            designation: userDesignation,
            mobile: profile?.mobile || profile?.representativeMobile || null,
            roleId: effectiveRoleId,
            organizationId: organizationId || existingUser.organizationId,
            isVerified: false,
            accountStatus: "PENDING_ACTIVATION",
          }
        });
      } else {
        // Create new user record
        createdOrUpdatedUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            firstName: userFirstName,
            lastName: userLastName,
            designation: userDesignation,
            mobile: profile?.mobile || profile?.representativeMobile || null,
            roleId: effectiveRoleId,
            organizationId,
            isVerified: false,
            accountStatus: "PENDING_ACTIVATION",
          }
        });
      }

      // Upsert UserOfficerProfile to store designation & full name
      const fullName = [userFirstName, userLastName].filter(Boolean).join(" ") || profile?.name || "Official User";
      await tx.userOfficerProfile.upsert({
        where: { userId: createdOrUpdatedUser.id },
        create: {
          userId: createdOrUpdatedUser.id,
          fullName,
          employeeId: profile?.employeeId || null,
          designation: userDesignation,
          department: profile?.name || null,
          district: profile?.district || null,
          taluka: profile?.taluka || null,
          officeAddress: fullAddress,
          mobile: profile?.mobile || profile?.representativeMobile || null,
        },
        update: {
          fullName,
          employeeId: profile?.employeeId || null,
          designation: userDesignation,
          department: profile?.name || null,
          district: profile?.district || null,
          taluka: profile?.taluka || null,
          officeAddress: fullAddress,
          mobile: profile?.mobile || profile?.representativeMobile || null,
        }
      });

      return createdOrUpdatedUser;
    });

    // 6. Generate & send OTP
    await createAndSendOtp(normalizedEmail);

    return res.status(201).json({
      message: "Registration initiated. A 6-digit verification code has been sent to your email.",
      userId: user.id
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, otpCode } = req.body;
    const code = otp || otpCode;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const normalizedEmail = email.trim().toLowerCase();

    if (!code) {
      return res.status(400).json({ error: "OTP code is required" });
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        identifier: normalizedEmail,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "OTP expired or not found. Please request a new one." });
    }

    if (otpRecord.attempts >= 5) {
      return res.status(400).json({ error: "Too many invalid attempts. Please request a new OTP." });
    }

    const isMatch = await bcrypt.compare(code, otpRecord.otpHash);
    if (!isMatch) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: "Invalid OTP code. Please try again." });
    }

    // Mark OTP as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    });

    // Mark user as verified and ACTIVE
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, accountStatus: "ACTIVE" },
      include: { organization: true, role: true }
    });

    const roleName = updatedUser.role?.name || "GUEST";
    const roleSlug = roleName.toLowerCase().replace(/_/g, "-");

    const userPayload = {
      ...updatedUser,
      orgKind: updatedUser.organization?.kind || null,
      roleNumericId: updatedUser.roleId,
      roleSlug,
      role: roleName
    };

    const tokens = generateTokens(updatedUser);
    const permissionData = await computeUserPermissions({
      userId: updatedUser.id,
      role: updatedUser.role?.name,
      roleId: updatedUser.roleId,
      organizationId: updatedUser.organizationId
    });

    return res.json({
      message: "Email verified successfully",
      ...tokens,
      user: userPayload,
      permissions: permissionData.permissions,
      roles: permissionData.roles,
      roleDetails: permissionData.roleDetails,
      isAdmin: permissionData.isAdmin
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const normalizedEmail = email.trim().toLowerCase();
    await createAndSendOtp(normalizedEmail);

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const searchParentOrganizations = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim();
    const parentOrgs = await prisma.organization.findMany({
      where: {
        kind: "GOVERNMENT_DEPARTMENT",
        parentOrganizationId: null,
        status: "ACTIVE",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { parentRegistrationCode: { contains: q, mode: "insensitive" } },
                { officialIdentifierNumber: { contains: q, mode: "insensitive" } },
                { district: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        name: true,
        parentRegistrationCode: true,
        officialIdentifierNumber: true,
        district: true,
        state: true
      },
      take: 20
    });

    return res.json({ success: true, data: parentOrgs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Failed to search parent organizations" });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, email, password } = req.body;
    const suppliedIdentifier = String(identifier || email || "").trim().toLowerCase();
    if (!suppliedIdentifier || !password) {
      return res.status(400).json({ error: "Login identifier and password are required" });
    }

    // Both identity types are valid login candidates. Resolve them concurrently so
    // ordinary users do not wait for an irrelevant NGO-access lookup first.
    const [ngoAccess, userRecord] = await Promise.all([
      prisma.corporateNgoAccess.findUnique({
        where: { loginIdentifier: suppliedIdentifier },
        include: { user: { include: { organization: true, role: true } }, membership: true },
      }),
      prisma.user.findFirst({
        where: { OR: [{ email: suppliedIdentifier }, { loginIdentifier: suppliedIdentifier }] },
        include: { organization: true, role: true }
      }),
    ]);
    if (ngoAccess) {
      const valid = await bcrypt.compare(password, ngoAccess.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid login identifier or password" });
      if (ngoAccess.mustResetPassword) {
        if (ngoAccess.temporaryPasswordExpiresAt && ngoAccess.temporaryPasswordExpiresAt <= new Date()) return res.status(401).json({ error: "Temporary password expired. Ask the corporate administrator for a new invitation." });
        const resetToken = jwt.sign({ id: ngoAccess.userId, ngoAccessId: ngoAccess.id, purpose: "NGO_CONTEXT_FIRST_LOGIN_RESET", tokenVersion: ngoAccess.tokenVersion }, JWT_SECRET, { expiresIn: "15m" });
        return res.status(428).json({ error: "Password reset required before first login", passwordResetRequired: true, resetToken });
      }
      if (ngoAccess.status !== "ACTIVE" || ngoAccess.membership.status !== "APPROVED" || ngoAccess.user.accountStatus !== "ACTIVE" || !ngoAccess.user.isVerified) return res.status(401).json({ error: "This Corporate–NGO access context is not active" });
      const tokens = generateTokens(ngoAccess.user, { ngoAccessId: ngoAccess.id, corporateOrganizationId: ngoAccess.membership.corporateOrganizationId });
      primeAuthenticatedUserCache(ngoAccess.user);
      const permissionData = await CacheService.getPermissions(ngoAccess.user.id)
        || await computeUserPermissions({ userId: ngoAccess.user.id, role: ngoAccess.user.role?.name, roleId: ngoAccess.user.roleId, organizationId: ngoAccess.user.organizationId });
      CacheService.setPermissions(ngoAccess.user.id, permissionData).catch(() => {});
      return res.json({ message: "Login successful", ...tokens, user: { ...ngoAccess.user, ngoAccessId: ngoAccess.id, corporateOrganizationId: ngoAccess.membership.corporateOrganizationId, projectIds: ngoAccess.projectIds }, permissions: permissionData.permissions, roles: permissionData.roles, roleDetails: permissionData.roleDetails, isAdmin: permissionData.isAdmin });
    }

    if (!userRecord || userRecord.deletedAt) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, userRecord.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (userRecord.mustResetPassword) {
      if (userRecord.temporaryPasswordExpiresAt && userRecord.temporaryPasswordExpiresAt <= new Date()) {
        return res.status(401).json({ error: "Temporary password expired. Ask your administrator for a new invitation." });
      }
      const resetToken = jwt.sign(
        { id: userRecord.id, purpose: "FIRST_LOGIN_RESET", tokenVersion: userRecord.tokenVersion },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      return res.status(428).json({
        error: "Password reset required before first login",
        passwordResetRequired: true,
        resetToken,
      });
    }

    if (!userRecord.isVerified || userRecord.accountStatus !== "ACTIVE") {
      return res.status(401).json({ error: "Your account is not active. Please contact administrator." });
    }

    const finalUserRecord = userRecord;

    const roleName = finalUserRecord.role?.name || "GUEST";
    const roleSlug = roleName.toLowerCase().replace(/_/g, "-");

    const user = {
      ...finalUserRecord,
      orgKind: finalUserRecord.organization?.kind || null,
      roleNumericId: finalUserRecord.roleId,
      roleSlug,
      role: roleName
    };

    const tokens = generateTokens(finalUserRecord);
    primeAuthenticatedUserCache(finalUserRecord);

    const permissionData = await CacheService.getPermissions(finalUserRecord.id)
      || await computeUserPermissions({
        userId: finalUserRecord.id,
        role: finalUserRecord.role?.name,
        roleId: finalUserRecord.roleId,
        organizationId: finalUserRecord.organizationId
      });

    CacheService.setPermissions(finalUserRecord.id, permissionData).catch(() => {});

    return res.json({
      message: "Login successful",
      ...tokens,
      user,
      permissions: permissionData.permissions,
      roles: permissionData.roles,
      roleDetails: permissionData.roleDetails,
      isAdmin: permissionData.isAdmin
    });
  } catch (error) {
    next(error);
  }
};

export const completeFirstLoginReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "A valid reset token and password of at least 6 characters are required" });
    }
    const payload = jwt.verify(resetToken, JWT_SECRET) as any;
    if (!payload?.id || !["FIRST_LOGIN_RESET", "NGO_CONTEXT_FIRST_LOGIN_RESET"].includes(payload?.purpose)) {
      return res.status(401).json({ error: "Invalid first-login reset token" });
    }
    if (payload.purpose === "NGO_CONTEXT_FIRST_LOGIN_RESET") {
      const access = await prisma.corporateNgoAccess.findUnique({ where: { id: payload.ngoAccessId }, include: { membership: true } });
      if (!access || access.userId !== payload.id || !access.mustResetPassword || access.tokenVersion !== payload.tokenVersion) return res.status(401).json({ error: "Reset token is no longer valid" });
      await prisma.corporateNgoAccess.update({ where: { id: access.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12), mustResetPassword: false, temporaryPasswordExpiresAt: null, tokenVersion: { increment: 1 }, status: access.membership.status === "APPROVED" ? "ACTIVE" : "INVITED" } });
      return res.json({ success: true, message: access.membership.status === "APPROVED" ? "Password updated. You can now sign in." : "Password updated. Access will activate after Corporate approval." });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.deletedAt || !user.mustResetPassword || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: "Reset token is no longer valid" });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          mustResetPassword: false,
          temporaryPasswordExpiresAt: null,
          passwordChangedAt: new Date(),
          invitationAcceptedAt: new Date(),
          isVerified: true,
          accountStatus: "ACTIVE",
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.organizationMembership.updateMany({
        where: { userId: user.id, status: "PENDING_FIRST_LOGIN" },
        data: { status: "ACTIVE", activatedAt: new Date() },
      }),
    ]);
    return res.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Invalid or expired first-login reset token" });
    }
    next(error);
  }
};

export const me = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true, role: true }
    });

    if (!userRecord || userRecord.deletedAt || userRecord.accountStatus !== "ACTIVE" || !userRecord.isVerified) {
      return res.status(401).json({ error: "User inactive or disabled" });
    }

    const roleName = userRecord.role?.name || "GUEST";
    const roleSlug = roleName.toLowerCase().replace(/_/g, "-");

    const user = {
      ...userRecord,
      orgKind: userRecord.organization?.kind || null,
      roleNumericId: userRecord.roleId,
      roleSlug,
      role: roleName
    };

    const permissionData = await CacheService.getPermissions(userRecord.id)
      || await computeUserPermissions({
        userId: userRecord.id,
        role: userRecord.role?.name,
        roleId: userRecord.roleId,
        organizationId: userRecord.organizationId
      });
    CacheService.setPermissions(userRecord.id, permissionData).catch(() => {});

    return res.json({
      user,
      permissions: permissionData.permissions,
      roles: permissionData.roles,
      roleDetails: permissionData.roleDetails,
      isAdmin: permissionData.isAdmin
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ error: "Refresh token is required" });

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    if (!decoded?.id) return res.status(401).json({ error: "Invalid token payload" });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.deletedAt || !user.isVerified || user.accountStatus !== "ACTIVE") {
      return res.status(401).json({ error: "Account is inactive, unverified, suspended, or deleted" });
    }

    let context: { ngoAccessId?: string; corporateOrganizationId?: string } | undefined;
    if (decoded.ngoAccessId) {
      const access = await prisma.corporateNgoAccess.findUnique({ where: { id: decoded.ngoAccessId }, include: { membership: true } });
      if (!access || access.userId !== user.id || access.status !== "ACTIVE" || access.membership.status !== "APPROVED") return res.status(401).json({ error: "NGO access context is inactive" });
      context = { ngoAccessId: access.id, corporateOrganizationId: access.membership.corporateOrganizationId };
    }
    const tokens = generateTokens(user, context);
    return res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
};

export const logout = async (_req: Request, res: Response) => {
  return res.json({ message: "Logged out successfully" });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { loginIdentifier: normalizedEmail }
        ],
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(404).json({ error: "No account found registered with this official email address." });
    }

    const otpResult = await sendOtpService("FORGOT_PASSWORD", "EMAIL", user.email);
    return res.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${user.email}.`,
      data: {
        email: user.email,
        expiresInMinutes: otpResult.expiresInMinutes,
        resendAfterSeconds: otpResult.resendAfterSeconds
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyResetOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and 6-digit OTP code are required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const result = await verifyOtpService("FORGOT_PASSWORD", "EMAIL", normalizedEmail, String(otp).trim());
    return res.json({
      success: true,
      message: "OTP verified successfully. You can now set your new password.",
      data: {
        verificationToken: result.verificationToken
      }
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Invalid or expired OTP" });
  }
};

export const resetPasswordWithOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, verificationToken, otp, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters in length" });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Validate OTP proof
    if (verificationToken) {
      await assertOtpVerified("FORGOT_PASSWORD", "EMAIL", normalizedEmail, verificationToken);
    } else if (otp) {
      await verifyOtpService("FORGOT_PASSWORD", "EMAIL", normalizedEmail, String(otp).trim());
    } else {
      return res.status(400).json({ error: "OTP verification is required to reset password" });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { loginIdentifier: normalizedEmail }
        ],
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User account not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustResetPassword: false,
        accountStatus: user.accountStatus === "PENDING_ACTIVATION" ? "ACTIVE" : user.accountStatus,
        isVerified: true,
        tokenVersion: { increment: 1 }
      }
    });

    console.log(`\n======================================================`);
    console.log(`🔑 [PASSWORD RESET COMPLETED]`);
    console.log(`📧 User Email: ${user.email}`);
    console.log(`👤 Name: ${[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}`);
    console.log(`🔒 Status: New password successfully saved and activated`);
    console.log(`======================================================\n`);

    return res.json({
      success: true,
      message: "Password reset successfully. You can now sign in with your new password."
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to reset password" });
  }
};
