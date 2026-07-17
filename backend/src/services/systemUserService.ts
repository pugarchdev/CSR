import prisma from "../config/db";

export const SYSTEM_USER_EMAIL = "system@mahacsr.gov.in";

let cachedSystemUserId: string | null = null;

/**
 * Resolve (and cache) the seeded system user used for automated workflow
 * actions. WorkflowHistory.actionPerformedByUserId is a required FK, so
 * system-driven transitions must reference a real user row.
 */
export async function getSystemUserId(): Promise<string> {
  if (cachedSystemUserId) return cachedSystemUserId;

  const existing = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (existing) {
    cachedSystemUserId = existing.id;
    return existing.id;
  }

  // Self-heal in environments where the seed has not run: create a locked,
  // unusable system account (random password hash, INACTIVE so login is impossible).
  const crypto = await import("crypto");
  const created = await prisma.user.create({
    data: {
      email: SYSTEM_USER_EMAIL,
      passwordHash: crypto.randomBytes(48).toString("hex"),
      role: null,
      accountStatus: "INACTIVE",
      isVerified: false,
      isSystemSeeded: true
    }
  });
  cachedSystemUserId = created.id;
  return created.id;
}

export async function isSystemUser(userId: string): Promise<boolean> {
  return (await getSystemUserId()) === userId;
}
