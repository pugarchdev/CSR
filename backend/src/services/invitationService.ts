import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "../config/db";
import { getPrimaryFrontendUrl } from "../config/env";

const INVITATION_TTL_HOURS = parseInt(process.env.INVITATION_TTL_HOURS || "72", 10);

export class InvitationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function buildActivationUrl(rawToken: string): string {
  const base = getPrimaryFrontendUrl();
  return `${base}/activate?token=${rawToken}`;
}

export interface CreateInvitationInput {
  email: string;
  roleId?: number;
  organizationId?: string | null;
  parentUserId?: string | null;
  agencySubLoginId?: string | null;
}

type InvitationDb = { userInvitation: any };

export async function createInvitation(input: CreateInvitationInput, db: InvitationDb = prisma) {
  const existing = await db.userInvitation.findFirst({
    where: {
      email: input.email.toLowerCase(),
      status: "PENDING"
    }
  });

  if (existing) {
    throw new InvitationError("An invitation is already pending for this email address", 409);
  }

  const token = crypto.randomBytes(32).toString("hex");

  const invitation = await db.userInvitation.create({
    data: {
      email: input.email.toLowerCase(),
      token,
      status: "PENDING",
      roleId: input.roleId || null,
      organizationId: input.organizationId || null,
      parentUserId: input.parentUserId || null,
      agencySubLoginId: input.agencySubLoginId || null
    }
  });

  return { invitation, rawToken: token, activationUrl: buildActivationUrl(token) };
}

export async function getInvitationByToken(token: string) {
  if (!token || token.length < 32) {
    throw new InvitationError("Invalid invitation token", 400);
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { token }
  });

  if (!invitation || invitation.status !== "PENDING") {
    throw new InvitationError("Invitation not found or invalid", 404);
  }

  const expiresAt = new Date(invitation.createdAt.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
  if (expiresAt <= new Date()) {
    throw new InvitationError("Invitation has expired. Ask the company to send a new invitation.", 410);
  }

  return { ...invitation, expiresAt };
}

export async function acceptInvitation(input: { token: string; password: string }) {
  const invitation = await getInvitationByToken(input.token);

  if (!input.password || input.password.length < 8) {
    throw new InvitationError("Password must be at least 8 characters long", 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existingUser) throw new InvitationError("An account already exists for this email. Sign in or reset your password.", 409);

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" }
    });

    const createdUser = await tx.user.create({
      data: {
        email: invitation.email,
        loginIdentifier: invitation.email,
        passwordHash,
        accountStatus: "ACTIVE",
        isVerified: true,
        passwordChangedAt: new Date(),
        invitationAcceptedAt: new Date(),
        roleId: invitation.roleId,
        organizationId: invitation.organizationId,
        parentUserId: invitation.parentUserId
      }
    });

    if (invitation.agencySubLoginId) {
      await tx.agencySubLogin.update({
        where: { id: invitation.agencySubLoginId },
        data: { userId: createdUser.id, status: "ONBOARDING_REQUIRED" }
      });
    }

    return createdUser;
  });

  return { user, invitation };
}
