import { Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { sendNgoInvitationEmail } from "../utils/mailer";
import { UserAccountStatus, VerificationStatus, NGOEmpanelmentStatus } from "@prisma/client";

// Helper for API responses
const successResponse = (res: Response, data: any, message = "Success", status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

const errorResponse = (res: Response, error: string, status = 400) => {
  return res.status(status).json({ success: false, error });
};

// ─── Invite Single NGO ──────────────────────────────────────────────
export const inviteNgo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    const tenantId = (req as any).tenantContext?.tenantId || user?.tenantId || null;

    if (!companyId) {
      return errorResponse(res, "User is not associated with a corporate company", 400);
    }

    const { email, ngoName } = req.body;
    if (!email || !ngoName) {
      return errorResponse(res, "Email and NGO Name are required", 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse(res, "An account with this email is already registered", 400);
    }

    // Check if invitation already sent
    const existingInvite = await prisma.ngoInvitation.findFirst({
      where: { email, companyId }
    });
    if (existingInvite && existingInvite.status !== "REVOKED") {
      return errorResponse(res, "An active invitation has already been sent to this email", 400);
    }

    const token = crypto.randomBytes(32).toString("hex");

    const invitation = await prisma.ngoInvitation.create({
      data: {
        companyId,
        tenantId,
        email,
        ngoName,
        token,
        status: "PENDING"
      }
    });

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company?.name || "Partner Corporate";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${frontendUrl}/register/invited?token=${token}`;

    try {
      await sendNgoInvitationEmail(email, ngoName, inviteUrl, companyName);
    } catch (emailErr) {
      console.error("Failed to send invitation email", emailErr);
      // We don't rollback so they can copy the link from dashboard if email fails
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tenantId,
        action: "NGO_INVITATION_SENT",
        details: { email, ngoName, invitationId: invitation.id }
      }
    });

    return successResponse(res, invitation, "NGO invitation sent successfully", 201);
  } catch (error) {
    next(error);
  }
};

// ─── Bulk Invite NGOs ───────────────────────────────────────────────
export const bulkInviteNgos = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    const tenantId = (req as any).tenantContext?.tenantId || user?.tenantId || null;

    if (!companyId) {
      return errorResponse(res, "User is not associated with a corporate company", 400);
    }

    const { invitations } = req.body; // Array of { email: string, ngoName: string }
    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return errorResponse(res, "A non-empty list of invitations is required", 400);
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company?.name || "Partner Corporate";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as string[]
    };

    for (const invite of invitations) {
      const { email, ngoName } = invite;
      if (!email || !ngoName) {
        results.failedCount++;
        results.errors.push(`Missing fields for item: ${JSON.stringify(invite)}`);
        continue;
      }

      // Check user check
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        results.failedCount++;
        results.errors.push(`Email already registered: ${email}`);
        continue;
      }

      const token = crypto.randomBytes(32).toString("hex");

      try {
        const invitation = await prisma.ngoInvitation.create({
          data: {
            companyId,
            tenantId,
            email,
            ngoName,
            token,
            status: "PENDING"
          }
        });

        const inviteUrl = `${frontendUrl}/register/invited?token=${token}`;
        await sendNgoInvitationEmail(email, ngoName, inviteUrl, companyName);

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            tenantId,
            action: "NGO_INVITATION_SENT",
            details: { email, ngoName, invitationId: invitation.id, type: "bulk" }
          }
        });

        results.successCount++;
      } catch (err: any) {
        results.failedCount++;
        results.errors.push(`Error inviting ${email}: ${err.message}`);
      }
    }

    return successResponse(res, results, "Bulk invitation process completed");
  } catch (error) {
    next(error);
  }
};

// ─── List Sent Invitations ──────────────────────────────────────────
export const listInvitations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;

    if (!companyId) {
      return errorResponse(res, "User is not associated with a corporate company", 400);
    }

    // Fetch invitations along with registered NGO details if registration is complete
    const invitations = await prisma.ngoInvitation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" }
    });

    // Enhance with onboarding/empanelment status of registered NGO
    const enhancedInvitations = await Promise.all(
      invitations.map(async (invite: any) => {
        const ngo = await prisma.nGO.findFirst({
          where: { officialEmail: invite.email },
          include: {
            onboardingApplication: true
          }
        });
        return {
          ...invite,
          ngoId: ngo?.id || null,
          ngoStatus: ngo?.status || null,
          ngoEmpanelmentStatus: ngo?.empanelmentStatus || null,
          preliminaryApproved: ngo?.preliminaryApproved || false,
          ngo: ngo || null
        };
      })
    );

    return successResponse(res, enhancedInvitations, "Sent invitations retrieved");
  } catch (error) {
    next(error);
  }
};

// ─── Revoke NGO Access ──────────────────────────────────────────────
export const revokeNgoAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    const tenantId = (req as any).tenantContext?.tenantId || user?.tenantId || null;

    if (!companyId) {
      return errorResponse(res, "User is not associated with a corporate company", 400);
    }

    const { id } = req.params; // Invitation ID
    const invitation = await prisma.ngoInvitation.findFirst({
      where: { id, companyId }
    });

    if (!invitation) {
      return errorResponse(res, "Invitation not found", 404);
    }

    await prisma.ngoInvitation.update({
      where: { id },
      data: { status: "REVOKED" }
    });

    // If NGO already signed up, suspend their user account
    const registeredUser = await prisma.user.findFirst({
      where: { email: invitation.email }
    });

    if (registeredUser) {
      await prisma.user.update({
        where: { id: registeredUser.id },
        data: { accountStatus: UserAccountStatus.SUSPENDED }
      });

      // Update NGO record too
      const ngo = await prisma.nGO.findFirst({
        where: { officialEmail: invitation.email }
      });
      if (ngo) {
        await prisma.nGO.update({
          where: { id: ngo.id },
          data: { status: VerificationStatus.REJECTED, empanelmentStatus: NGOEmpanelmentStatus.BLACKLISTED }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tenantId,
        action: "NGO_ACCESS_REVOKED",
        details: { email: invitation.email, invitationId: id }
      }
    });

    return successResponse(res, null, "NGO partner access revoked successfully");
  } catch (error) {
    next(error);
  }
};

// ─── Submit Preliminary Review ──────────────────────────────────────
export const submitPreliminaryReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const companyId = user?.companyId;
    const tenantId = (req as any).tenantContext?.tenantId || user?.tenantId || null;

    if (!companyId) {
      return errorResponse(res, "User is not associated with a corporate company", 400);
    }

    const { ngoId } = req.params;
    const { approved, remarks } = req.body; // approved is boolean

    if (typeof approved !== "boolean") {
      return errorResponse(res, "Field 'approved' (boolean) is required", 400);
    }

    const ngo = await prisma.nGO.findUnique({
      where: { id: ngoId }
    });

    if (!ngo) {
      return errorResponse(res, "NGO partner profile not found", 404);
    }

    if (ngo.invitedByCompanyId !== companyId) {
      return errorResponse(res, "Unauthorized: NGO was not invited by this corporate company", 403);
    }

    const updatedNgo = await prisma.nGO.update({
      where: { id: ngoId },
      data: {
        preliminaryApproved: approved,
        preliminaryApprovedAt: new Date(),
        preliminaryRemarks: remarks || null,
        empanelmentStatus: approved ? NGOEmpanelmentStatus.DOCUMENT_REVIEW : NGOEmpanelmentStatus.EMPANELMENT_REJECTED
      }
    });

    // Also update any onboarding application associated with it
    const application = await prisma.onboardingApplication.findFirst({
      where: { ngoId }
    });
    if (application) {
      await prisma.onboardingApplication.update({
        where: { id: application.id },
        data: {
          status: approved ? "UNDER_ANALYST_REVIEW" : "REJECTED"
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        tenantId,
        action: "NGO_PRELIMINARY_REVIEW_SUBMITTED",
        details: { ngoId, approved, remarks }
      }
    });

    return successResponse(res, updatedNgo, "Preliminary review submitted successfully");
  } catch (error) {
    next(error);
  }
};
