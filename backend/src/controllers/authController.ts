import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/db";
import { OrganizationKind, OrganizationOnboardingStatus, OrganizationStatus, Role, VerificationStatus } from "@prisma/client";
import { sendOtpEmail } from "../utils/mailer";
import { getJwtRefreshSecret, getJwtSecret } from "../config/env";
import { ensureOrganizationAdminRole } from "../utils/orgRoles";
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from "../utils/apiResponse";

const JWT_SECRET = getJwtSecret();
const JWT_REFRESH_SECRET = getJwtRefreshSecret();

// In-memory cache for fast password verification (avoids slow bcryptjs.compare for repeated logins)
const credentialCache = new Map<string, number>();
const CREDENTIAL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

const generateTokens = (user: {
  id: string;
  email: string;
  role: Role;
  tenantId?: string | null;
  organizationId?: string | null;
  accountStatus?: string | null;
  ngoId?: string | null;
  companyId?: string | null;
  assignedDistrict?: string | null;
  beneficiaryProfileId?: string | null;
}) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    organizationId: user.organizationId,
    accountStatus: user.accountStatus,
    ngoId: user.ngoId,
    companyId: user.companyId,
    assignedDistrict: user.assignedDistrict,
    beneficiaryProfileId: user.beneficiaryProfileId
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

const getDefaultTenant = async () => {
  return prisma.tenant.upsert({
    where: { code: "MH-CSR" },
    update: {},
    create: {
      name: "Maharashtra CSR Portal",
      code: "MH-CSR",
      state: "Maharashtra",
      status: "ACTIVE"
    }
  });
};

const assertRegistrationFeatureEnabled = async (tenantId: string, role: Role) => {
  const featureByRole: Partial<Record<Role, string>> = {
    [Role.NGO_ADMIN]: "enableNGORegistration",
    [Role.COMPANY_ADMIN]: "enableCompanyRegistration",
    [Role.BENEFICIARY_AGENCY]: "enableGovernmentDepartmentRegistration"
  };
  const featureKey = featureByRole[role];
  if (!featureKey) return;

  const feature = await prisma.tenantFeature.findUnique({
    where: { tenantId_featureKey: { tenantId, featureKey } }
  });
  if (feature && !feature.isEnabled) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "REGISTRATION_FEATURE_BLOCKED",
        actorRole: role,
        entityType: "TenantFeature",
        entityId: feature.id,
        details: { featureKey, role }
      }
    }).catch(() => {});
    const error = new Error("This feature is not enabled for your portal instance.");
    (error as any).statusCode = 403;
    throw error;
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, role, profile } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return validationErrorResponse(res, "Email already registered");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  let createdNgoId: string | null = null;
  let createdCompanyId: string | null = null;
  let createdBeneficiaryProfileId: string | null = null;
  let createdOrganizationId: string | null = null;
  const tenant = await getDefaultTenant();
  if (role === Role.NGO_ADMIN) {
    return validationErrorResponse(res, "Direct NGO registration is disabled. You must be invited by a corporate company.");
  }

  if (role === Role.NGO_ADMIN) {
    const existingNgo = await prisma.nGO.findFirst({
      where: {
        OR: [
          { registrationNumber: profile.registrationNumber },
          { pan: profile.pan }
        ]
      }
    });

    if (existingNgo) {
      return validationErrorResponse(res, "NGO already registered with this Registration Number or PAN");
    }

    const ngo = await prisma.nGO.create({
      data: {
        tenantId: tenant.id,
        name: profile.name,
        registrationNumber: profile.registrationNumber,
        darpanNumber: profile.darpanNumber,
        csr1Number: profile.csr1Number,
        pan: profile.pan,
        certificate12AUrl: profile.certificate12AUrl || "",
        certificate80GUrl: profile.certificate80GUrl || "",
        address: profile.address,
        state: profile.state || "Maharashtra",
        district: profile.district,
        taluka: profile.taluka,
        city: profile.city || null,
        village: profile.village || null,
        website: profile.website || null,
        status: VerificationStatus.PENDING
      }
    });
    createdNgoId = ngo.id;
    const organization = await prisma.organization.create({
      data: {
        tenantId: tenant.id,
        organizationType: OrganizationKind.NGO,
        name: profile.name,
        registrationNumber: profile.registrationNumber,
        pan: profile.pan,
        email,
        phone: profile.contactInfo?.phone,
        address: profile.address,
        district: profile.district,
        taluka: profile.taluka,
        onboardingStatus: OrganizationOnboardingStatus.REGISTERED,
        status: OrganizationStatus.ACTIVE,
        sourceNgoId: ngo.id
      }
    });
    createdOrganizationId = organization.id;
    await prisma.nGO.update({ where: { id: ngo.id }, data: { organizationId: organization.id } });
  } else if (role === Role.COMPANY_ADMIN) {
    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { cin: profile.cin },
          { gst: profile.gst },
          { pan: profile.pan }
        ]
      }
    });

    if (existingCompany) {
      return validationErrorResponse(res, "Company already registered with this CIN, GST, or PAN");
    }

    const company = await prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: profile.name,
        cin: profile.cin,
        gst: profile.gst,
        pan: profile.pan,
        csrBudget: profile.csrBudget || 0,
        focusAreas: profile.focusAreas || [],
        contactInfo: profile.contactInfo || {},
        status: VerificationStatus.PENDING
      }
    });
    createdCompanyId = company.id;
    const organization = await prisma.organization.create({
      data: {
        tenantId: tenant.id,
        organizationType: OrganizationKind.CSR_COMPANY,
        name: profile.name,
        registrationNumber: profile.cin,
        pan: profile.pan,
        gst: profile.gst,
        email,
        phone: profile.contactInfo?.phone,
        address: profile.address,
        district: profile.district,
        taluka: profile.taluka,
        onboardingStatus: OrganizationOnboardingStatus.REGISTERED,
        status: OrganizationStatus.ACTIVE,
        sourceCompanyId: company.id
      }
    });
    createdOrganizationId = organization.id;
    await prisma.company.update({ where: { id: company.id }, data: { organizationId: organization.id } });
  } else if (role === Role.PORTAL_ADMIN || role === Role.BENEFICIARY_AGENCY) {
    createdNgoId = null;
    createdCompanyId = null;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      tenantId: role === Role.PORTAL_ADMIN ? tenant.id : tenant.id,
      organizationId: createdOrganizationId,
      isVerified: false,
      otpCode,
      otpExpiresAt,
      ngoId: createdNgoId,
      companyId: createdCompanyId
    }
  });

  if (role === Role.BENEFICIARY_AGENCY) {
    const profileRecord = await prisma.beneficiaryProfile.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        agencyName: profile.name,
        agencyType: profile.contactInfo?.entityType || "Government Department",
        district: profile.district,
        taluka: profile.taluka,
        city: profile.city || null,
        village: profile.village || null,
        address: profile.address,
        contactPerson: profile.contactInfo?.contactPerson || profile.name,
        contactEmail: email,
        contactPhone: profile.contactInfo?.phone || "Not provided",
        designation: profile.contactInfo?.designation || profile.cin || null,
        website: profile.website || null
      }
    });
    createdBeneficiaryProfileId = profileRecord.id;
    const organization = await prisma.organization.create({
      data: {
        tenantId: tenant.id,
        organizationType: OrganizationKind.GOVERNMENT_DEPARTMENT,
        name: profile.name,
        registrationNumber: profile.cin,
        pan: profile.pan,
        email,
        phone: profile.contactInfo?.phone,
        address: profile.address,
        district: profile.district,
        taluka: profile.taluka,
        onboardingStatus: OrganizationOnboardingStatus.REGISTERED,
        status: OrganizationStatus.ACTIVE,
        sourceBeneficiaryProfileId: profileRecord.id
      }
    });
    createdOrganizationId = organization.id;
    await prisma.beneficiaryProfile.update({
      where: { id: profileRecord.id },
      data: { organizationId: organization.id }
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: organization.id }
    });
  }

  if (createdOrganizationId) {
    await ensureOrganizationAdminRole(createdOrganizationId, tenant.id);
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_REGISTER",
      details: { email, role, tenantId: tenant.id, organizationId: createdOrganizationId, ngoId: createdNgoId, companyId: createdCompanyId, beneficiaryProfileId: createdBeneficiaryProfileId }
    }
  });

  try {
    await sendOtpEmail(email, otpCode);
    console.log(`[SMTP] Verification code successfully sent to ${email}`);
  } catch (mailError) {
    console.error(`[SMTP Error] Failed to send email to ${email}, rolling back registration.`, mailError);
    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTER_FAILED_SMTP",
        details: { email, error: String(mailError) }
      }
    }).catch(() => {});

    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    if (createdNgoId) {
      await prisma.nGO.delete({ where: { id: createdNgoId } }).catch(() => {});
    }
    if (createdCompanyId) {
      await prisma.company.delete({ where: { id: createdCompanyId } }).catch(() => {});
    }
    if (createdBeneficiaryProfileId) {
      await prisma.beneficiaryProfile.delete({ where: { id: createdBeneficiaryProfileId } }).catch(() => {});
    }
    if (createdOrganizationId) {
      await prisma.userOrganizationRole.deleteMany({ where: { organizationId: createdOrganizationId } }).catch(() => {});
      await prisma.organizationRole.deleteMany({ where: { organizationId: createdOrganizationId } }).catch(() => {});
      await prisma.organization.delete({ where: { id: createdOrganizationId } }).catch(() => {});
    }

    return errorResponse(res, "Failed to deliver OTP verification email. Please verify your email is correct and active.", 500);
  }

  return successResponse(res, { userId: user.id, email: user.email }, "Registration successful. Please verify OTP sent to your email.", 201);
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  const { email, otpCode } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return notFoundResponse(res, "User not found");
  }

  if (user.isVerified) {
    return validationErrorResponse(res, "User is already verified");
  }

  if (!user.otpCode || !user.otpExpiresAt || user.otpCode !== otpCode) {
    return validationErrorResponse(res, "Invalid OTP code");
  }

  if (new Date() > user.otpExpiresAt) {
    return validationErrorResponse(res, "OTP has expired. Please request a new one.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      otpCode: null,
      otpExpiresAt: null
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_VERIFY_OTP",
      details: { email }
    }
  });

  return successResponse(res, null, "Account verified successfully. You can now login.");
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { ngo: true, company: true, beneficiaryProfile: true }
  });

  if (!user) {
    return unauthorizedResponse(res, "Invalid email or password");
  }

  if (!user.isVerified) {
    return forbiddenResponse(res, "Account not verified. Please verify OTP first.");
  }

  if (user.accountStatus !== "ACTIVE") {
    return forbiddenResponse(res, "Account is not active. Please contact your administrator.");
  }

  const credHash = crypto.createHash("sha256").update(`${email}:${password}`).digest("hex");
  let isValid = false;
  const cachedTime = credentialCache.get(credHash);
  
  if (cachedTime && Date.now() - cachedTime < CREDENTIAL_CACHE_TTL_MS) {
    isValid = true;
  } else {
    isValid = await bcrypt.compare(password, user.passwordHash);
    if (isValid) {
      credentialCache.set(credHash, Date.now());
    }
  }

  if (!isValid) {
    return unauthorizedResponse(res, "Invalid email or password");
  }

  if (user.role === Role.NGO_ADMIN || user.role === Role.NGO_MEMBER) {
    if (user.ngo && user.ngo.status === VerificationStatus.REJECTED) {
      return forbiddenResponse(res, "NGO organization verification was rejected. Access denied.");
    }
  } else if (user.role === Role.COMPANY_ADMIN || user.role === Role.COMPANY_MEMBER) {
    if (user.company && user.company.status === VerificationStatus.REJECTED) {
      return forbiddenResponse(res, "Company organization verification was rejected. Access denied.");
    }
  }

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    organizationId: user.organizationId,
    accountStatus: user.accountStatus,
    ngoId: user.ngoId,
    companyId: user.companyId,
    assignedDistrict: user.assignedDistrict,
    beneficiaryProfileId: user.beneficiaryProfile?.id
  });

  const [organization] = await Promise.all([
    user.organizationId
      ? prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { id: true, tenantId: true, name: true, organizationType: true, onboardingStatus: true, status: true }
        })
      : Promise.resolve(null),
    prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGIN",
        details: { ip: req.ip }
      }
    }).catch(err => {
      console.error("Failed to create login audit log:", err);
    })
  ]);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return successResponse(res, {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      accountStatus: user.accountStatus,
      organization,
      ngoId: user.ngoId,
      companyId: user.companyId,
      assignedDistrict: user.assignedDistrict,
      beneficiaryProfileId: user.beneficiaryProfile?.id,
      ngo: user.ngo,
      company: user.company
    }
  });
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return unauthorizedResponse(res, "Refresh token missing");
  }

  const user = await prisma.user.findFirst({
    where: { refreshToken },
    include: { ngo: true, company: true, beneficiaryProfile: true }
  });

  if (!user) {
    return forbiddenResponse(res, "Invalid refresh token");
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any) => {
    if (err) return forbiddenResponse(res, "Expired refresh token");

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      accountStatus: user.accountStatus,
      ngoId: user.ngoId,
      companyId: user.companyId,
      assignedDistrict: user.assignedDistrict,
      beneficiaryProfileId: user.beneficiaryProfile?.id
    });
    return successResponse(res, { accessToken: tokens.accessToken });
  });
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    await prisma.user.updateMany({
      where: { refreshToken },
      data: { refreshToken: null }
    });
  }

  res.clearCookie("refreshToken");
  return successResponse(res, null, "Logged out successfully");
};

export const getInvitationDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return validationErrorResponse(res, "Invitation token is required");
    }

    const invitation = await prisma.ngoInvitation.findUnique({
      where: { token },
      include: { company: true }
    });

    if (!invitation || invitation.status !== "PENDING") {
      return errorResponse(res, "Invitation is invalid or has already been used", 400);
    }

    return successResponse(res, {
      email: invitation.email,
      ngoName: invitation.ngoName,
      companyName: invitation.company.name,
      companyId: invitation.companyId
    }, "Invitation verified");
  } catch (error) {
    next(error);
  }
};

export const registerInvitedNgo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      token,
      password,
      pan,
      address,
      state,
      district,
      city,
      taluka,
      village,
      website,
      registrationNumber,
      darpanNumber,
      csr1Number
    } = req.body;

    if (!token) {
      return validationErrorResponse(res, "Invitation token is required");
    }

    const invitation = await prisma.ngoInvitation.findUnique({
      where: { token }
    });

    if (!invitation || invitation.status !== "PENDING") {
      return errorResponse(res, "Invitation is invalid or has already been used", 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      return validationErrorResponse(res, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tenant = await getDefaultTenant();

    // Check if NGO already registered with registration number or PAN
    const existingNgo = await prisma.nGO.findFirst({
      where: {
        OR: [
          { registrationNumber },
          { pan }
        ]
      }
    });

    if (existingNgo) {
      return validationErrorResponse(res, "NGO already registered with this Registration Number or PAN");
    }

    // Create NGO
    const ngo = await prisma.nGO.create({
      data: {
        tenantId: tenant.id,
        name: invitation.ngoName,
        registrationNumber,
        darpanNumber,
        csr1Number,
        pan,
        address,
        state: state || "Maharashtra",
        district,
        taluka,
        city: city || null,
        village: village || null,
        website: website || null,
        status: VerificationStatus.PENDING,
        officialEmail: invitation.email,
        invitedByCompanyId: invitation.companyId
      }
    });

    // Create Organization
    const organization = await prisma.organization.create({
      data: {
        tenantId: tenant.id,
        organizationType: OrganizationKind.NGO,
        name: invitation.ngoName,
        registrationNumber,
        pan,
        email: invitation.email,
        address,
        district,
        taluka,
        onboardingStatus: OrganizationOnboardingStatus.REGISTERED,
        status: OrganizationStatus.ACTIVE,
        sourceNgoId: ngo.id
      }
    });

    await prisma.nGO.update({
      where: { id: ngo.id },
      data: { organizationId: organization.id }
    });

    // Create User
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        passwordHash,
        role: Role.NGO_ADMIN,
        tenantId: tenant.id,
        organizationId: organization.id,
        isVerified: true, // Email is verified since they completed register through email token
        ngoId: ngo.id,
        accountStatus: "ACTIVE"
      }
    });

    await ensureOrganizationAdminRole(organization.id, tenant.id);

    // Update invitation status to ACCEPTED
    await prisma.ngoInvitation.update({
      where: { token },
      data: { status: "ACCEPTED" }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        action: "NGO_INVITATION_ACCEPTED",
        details: { email: invitation.email, ngoId: ngo.id }
      }
    });

    return successResponse(res, { userId: user.id, email: user.email }, "NGO registration successful. Please log in to complete onboarding.", 201);
  } catch (error) {
    next(error);
  }
};
