import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import { Role, VerificationStatus } from "@prisma/client";
import { sendOtpEmail } from "../utils/mailer";
import { getJwtRefreshSecret, getJwtSecret } from "../config/env";

const JWT_SECRET = getJwtSecret();
const JWT_REFRESH_SECRET = getJwtRefreshSecret();

// Helper to generate access & refresh tokens
const generateTokens = (user: { id: string; email: string; role: Role; ngoId?: string | null; companyId?: string | null }) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    ngoId: user.ngoId,
    companyId: user.companyId
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, profile } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    let createdNgoId: string | null = null;
    let createdCompanyId: string | null = null;

    // Create Profile depending on Role
    if (role === Role.NGO_ADMIN) {
      // Check if NGO already exists
      const existingNgo = await prisma.nGO.findFirst({
        where: {
          OR: [
            { registrationNumber: profile.registrationNumber },
            { pan: profile.pan }
          ]
        }
      });

      if (existingNgo) {
        return res.status(400).json({
          error: "NGO already registered with this Registration Number or PAN"
        });
      }

      const ngo = await prisma.nGO.create({
        data: {
          name: profile.name,
          registrationNumber: profile.registrationNumber,
          darpanNumber: profile.darpanNumber,
          csr1Number: profile.csr1Number,
          pan: profile.pan,
          certificate12AUrl: profile.certificate12AUrl || "",
          certificate80GUrl: profile.certificate80GUrl || "",
          address: profile.address,
          district: profile.district,
          taluka: profile.taluka,
          village: profile.village || null,
          website: profile.website || null,
          status: VerificationStatus.PENDING
        }
      });
      createdNgoId = ngo.id;
    } else if (role === Role.COMPANY_ADMIN) {
      // Check if Company already exists
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
        return res.status(400).json({
          error: "Company already registered with this CIN, GST, or PAN"
        });
      }

      const company = await prisma.company.create({
        data: {
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
    } else if (role === Role.PORTAL_ADMIN) {
      // Government entity self-registration creates a restricted account only.
      // Access must be granted later by a super admin through the user/role workflow.
      createdNgoId = null;
      createdCompanyId = null;
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        isVerified: false,
        otpCode,
        otpExpiresAt,
        ngoId: createdNgoId,
        companyId: createdCompanyId
      }
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTER",
        details: { email, role, ngoId: createdNgoId, companyId: createdCompanyId }
      }
    });

    // Dispatch real email OTP
    try {
      await sendOtpEmail(email, otpCode);
      console.log(`[SMTP] Verification code successfully sent to ${email}`);
    } catch (mailError) {
      // Rollback database changes to prevent orphaned unverified users that can't re-register
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

      return res.status(500).json({ error: "Failed to deliver OTP verification email. Please verify your email is correct and active." });
    }

    return res.status(201).json({
      message: "Registration successful. Please verify OTP sent to your email.",
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otpCode } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "User is already verified" });
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpCode !== otpCode) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Update user verification
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

    return res.json({ message: "Account verified successfully. You can now login." });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { ngo: true, company: true }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "Account not verified. Please verify OTP first." });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Verify Organization verification status
    if (user.role === Role.NGO_ADMIN || user.role === Role.NGO_MEMBER) {
      if (user.ngo && user.ngo.status === VerificationStatus.REJECTED) {
        return res.status(403).json({ error: "NGO organization verification was rejected. Access denied." });
      }
    } else if (user.role === Role.COMPANY_ADMIN || user.role === Role.COMPANY_MEMBER) {
      if (user.company && user.company.status === VerificationStatus.REJECTED) {
        return res.status(403).json({ error: "Company organization verification was rejected. Access denied." });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGIN",
        details: { ip: req.ip }
      }
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        ngoId: user.ngoId,
        companyId: user.companyId,
        ngo: user.ngo,
        company: user.company
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token missing" });
    }

    const user = await prisma.user.findFirst({
      where: { refreshToken },
      include: { ngo: true, company: true }
    });

    if (!user) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any) => {
      if (err) return res.status(403).json({ error: "Expired refresh token" });

      const tokens = generateTokens(user);
      return res.json({ accessToken: tokens.accessToken });
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await prisma.user.updateMany({
        where: { refreshToken },
        data: { refreshToken: null }
      });
    }

    res.clearCookie("refreshToken");
    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};
