import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { auditLog } from "./notificationService";

const INVITATION_TTL_HOURS = parseInt(process.env.INVITATION_TTL_HOURS || "72", 10);

export class InvitationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function buildActivationUrl(rawToken: string): string {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${base}/activate?token=${rawToken}`;
}

export interface CreateInvitationInput {
  userId: string;
  email: string;
  mobile?: string | null;
  createdById: string;
  companyId?: string | null;
  purpose?: string;
  expiresInHours?: number;
  tx?: any; // Prisma transaction client
}

/**
 * Create a single-use, expiring account-activation invitation.
 * Only the sha256 hash of the token is persisted; the raw token is returned
 * once for the activation email and never stored.
 */
export async function createInvitation(input: CreateInvitationInput) {
  const db = input.tx || prisma;

  // Prevent duplicate invitations: an unexpired PENDING invitation for the
  // same email blocks a new one.
  const existing = await db.userInvitation.findFirst({
    where: {
      email: input.email.toLowerCase(),
      status: "PENDING",
      expiresAt: { gt: new Date() }
    }
  });
  if (existing) {
    throw new InvitationError("An invitation is already pending for this email address", 409);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (input.expiresInHours || INVITATION_TTL_HOURS) * 60 * 60 * 1000);

  const invitation = await db.userInvitation.create({
    data: {
      userId: input.userId,
      email: input.email.toLowerCase(),
      mobile: input.mobile || null,
      tokenHash: hashToken(rawToken),
      purpose: input.purpose || "OFFICER_ACTIVATION",
      status: "PENDING",
      expiresAt,
      createdById: input.createdById,
      companyId: input.companyId || null
    }
  });

  return { invitation, rawToken, activationUrl: buildActivationUrl(rawToken) };
}

/**
 * Validate a raw token and return the invitation with its user.
 * Marks expired invitations lazily; logs invalid attempts for audit.
 */
export async function getInvitationByToken(rawToken: string, ipAddress?: string) {
  if (!rawToken || rawToken.length < 32) {
    throw new InvitationError("Invalid invitation token", 400);
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          accountStatus: true,
          officerProfile: { select: { fullName: true, designation: true, department: true, district: true } }
        }
      }
    }
  });

  if (!invitation) {
    await auditLog(undefined, "INVITATION_TOKEN_INVALID", { reason: "TOKEN_NOT_FOUND" }, ipAddress);
    throw new InvitationError("Invitation not found or invalid", 404);
  }

  await prisma.userInvitation.update({
    where: { id: invitation.id },
    data: { attemptCount: { increment: 1 } }
  });

  if (invitation.status === "ACCEPTED") {
    throw new InvitationError("This invitation has already been used", 410);
  }
  if (invitation.status === "REVOKED") {
    throw new InvitationError("This invitation has been revoked", 410);
  }
  if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
    if (invitation.status !== "EXPIRED") {
      await prisma.userInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    }
    await auditLog(invitation.userId, "INVITATION_TOKEN_EXPIRED", { invitationId: invitation.id }, ipAddress);
    throw new InvitationError("This invitation has expired. Please contact your administrator.", 410);
  }

  return invitation;
}

export interface AcceptInvitationInput {
  rawToken: string;
  password: string;
  ipAddress?: string;
}

/**
 * Accept an invitation: set the user's own password, activate the account,
 * and activate any assignments waiting on activation. Single-use is enforced
 * by re-checking status inside the transaction.
 */
export async function acceptInvitation(input: AcceptInvitationInput) {
  const invitation = await getInvitationByToken(input.rawToken, input.ipAddress);

  if (!input.password || input.password.length < 8) {
    throw new InvitationError("Password must be at least 8 characters long", 400);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    // Re-validate inside the transaction (single-use guard against races)
    const fresh = await tx.userInvitation.findUnique({ where: { id: invitation.id } });
    if (!fresh || fresh.status !== "PENDING" || fresh.expiresAt < new Date()) {
      throw new InvitationError("Invitation is no longer valid", 410);
    }

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() }
    });

    const updatedUser = await tx.user.update({
      where: { id: invitation.userId },
      data: {
        passwordHash,
        accountStatus: "ACTIVE",
        isVerified: true
      }
    });

    // Activate assignments that were waiting on account activation
    await tx.projectAssignment.updateMany({
      where: { assignedToId: invitation.userId, status: "PENDING_ACTIVATION" },
      data: { status: "ACTIVE" }
    });

    await tx.auditLog.create({
      data: {
        userId: invitation.userId,
        actorUserId: invitation.userId,
        action: "INVITATION_ACCEPTED",
        entityType: "UserInvitation",
        entityId: invitation.id,
        details: { email: invitation.email },
        ipAddress: input.ipAddress || null
      }
    });
    await tx.auditLog.create({
      data: {
        userId: invitation.userId,
        actorUserId: invitation.userId,
        action: "ACCOUNT_ACTIVATED",
        entityType: "User",
        entityId: invitation.userId,
        details: { email: invitation.email },
        oldValueJson: { accountStatus: "PENDING_ACTIVATION" },
        newValueJson: { accountStatus: "ACTIVE" },
        ipAddress: input.ipAddress || null
      }
    });

    return updatedUser;
  });

  return { user, invitation };
}

/**
 * Revoke an existing pending invitation and issue a fresh one.
 */
export async function resendInvitation(invitationId: string, resentById: string) {
  const old = await prisma.userInvitation.findUnique({ where: { id: invitationId } });
  if (!old) throw new InvitationError("Invitation not found", 404);
  if (old.status === "ACCEPTED") throw new InvitationError("Invitation already accepted", 409);

  await prisma.userInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED", revokedAt: new Date() }
  });

  return createInvitation({
    userId: old.userId,
    email: old.email,
    mobile: old.mobile,
    createdById: resentById,
    companyId: old.companyId,
    purpose: old.purpose
  });
}
