import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import { getJwtRefreshSecret, getJwtSecret } from "../config/env";
import {
  InvitationError,
  acceptInvitation,
  getInvitationByToken
} from "../services/invitationService";
import { successResponse, errorResponse } from "../utils/apiResponse";

const JWT_SECRET = getJwtSecret();
const JWT_REFRESH_SECRET = getJwtRefreshSecret();

const handleInvitationError = (res: Response, error: unknown): Response | null => {
  if (error instanceof InvitationError) {
    return errorResponse(res, error.message, (error as any).status || 400);
  }
  return null;
};

/**
 * GET /api/auth/invitations/:token   (public, rate limited)
 * Validates the invitation link and returns non-sensitive details so the
 * activation page can greet the officer and show their pre-filled profile.
 */
export const getInvitationDetails = async (req: Request, res: Response) => {
  try {
    const invitation = await getInvitationByToken(req.params.token, req.ip);

    return successResponse(res, {
      email: invitation.email,
      fullName: invitation.user?.officerProfile?.fullName || null,
      designation: invitation.user?.officerProfile?.designation || null,
      department: invitation.user?.officerProfile?.department || null,
      district: invitation.user?.officerProfile?.district || null,
      expiresAt: invitation.expiresAt,
      purpose: invitation.purpose
    });
  } catch (error) {
    const handled = handleInvitationError(res, error);
    if (handled) return handled;
    console.error("getInvitationDetails error:", error);
    return errorResponse(res, "Failed to validate invitation", 500);
  }
};

/**
 * POST /api/auth/invitations/:token/activate   (public, rate limited)
 * Body: { password }
 * Single-use: sets the officer's own password, activates the account, and
 * returns a login token pair so the user lands straight on their dashboard.
 */
export const activateInvitation = async (req: Request, res: Response) => {
  try {
    const { password } = req.body || {};
    const { user } = await acceptInvitation({
      rawToken: req.params.token,
      password,
      ipAddress: req.ip
    });

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, role: true, organizationId: true, accountStatus: true,
        ngoId: true, companyId: true, assignedDistrict: true,
        officerProfile: { select: { fullName: true, designation: true, district: true } }
      }
    });
    if (!fullUser) return errorResponse(res, "Account not found after activation", 500);

    const payload = {
      id: fullUser.id,
      email: fullUser.email,
      role: fullUser.role,
      organizationId: fullUser.organizationId,
      accountStatus: fullUser.accountStatus,
      ngoId: fullUser.ngoId,
      companyId: fullUser.companyId,
      assignedDistrict: fullUser.assignedDistrict,
      beneficiaryProfileId: null
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await prisma.user.update({ where: { id: fullUser.id }, data: { refreshToken } });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return successResponse(res, {
      accessToken,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        role: fullUser.role,
        accountStatus: fullUser.accountStatus,
        assignedDistrict: fullUser.assignedDistrict,
        profile: fullUser.officerProfile
      }
    }, "Account activated successfully");
  } catch (error) {
    const handled = handleInvitationError(res, error);
    if (handled) return handled;
    console.error("activateInvitation error:", error);
    return errorResponse(res, "Failed to activate account", 500);
  }
};
