import prisma from "../config/db";
import { emitNotificationToUser } from "../websocket/notificationSocket";

/**
 * Create an in-app notification for a single user and push it live over the
 * notification socket (if connected).
 */
export async function notify(
  userId: string,
  title: string,
  message: string
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, title, message }
  });
  emitNotificationToUser(userId, notification);
}

/**
 * Notify multiple users with the same title/message. Persists in one batch,
 * then pushes each user's own record live over the notification socket.
 */
export async function notifyMultiple(
  userIds: string[],
  title: string,
  message: string
): Promise<void> {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, title, message }))
  });
  // createMany does not return rows; fetch the just-created ones to emit.
  const created = await prisma.notification.findMany({
    where: { userId: { in: userIds }, title, message },
    orderBy: { createdAt: "desc" },
    take: userIds.length
  });
  for (const n of created) {
    emitNotificationToUser(n.userId, n);
  }
}

/**
 * Notify all users with a specific role.
 */
export async function notifyByRole(
  role: string,
  title: string,
  message: string
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role: role as any },
    select: { id: true }
  });
  await notifyMultiple(users.map((u) => u.id), title, message);
}

/**
 * Notify all users linked to a specific NGO.
 */
export async function notifyNGOUsers(
  ngoId: string,
  title: string,
  message: string
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { ngoId },
    select: { id: true }
  });
  await notifyMultiple(users.map((u) => u.id), title, message);
}

/**
 * Notify all users linked to a specific company.
 */
export async function notifyCompanyUsers(
  companyId: string,
  title: string,
  message: string
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true }
  });
  await notifyMultiple(users.map((u) => u.id), title, message);
}

/**
 * Notify district admins for a specific district.
 */
export async function notifyDistrictAdmins(
  district: string,
  title: string,
  message: string
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { role: "DISTRICT_ADMIN", assignedDistrict: district },
    select: { id: true }
  });
  // Also notify super admins
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true }
  });
  const allIds = [...users.map((u) => u.id), ...superAdmins.map((u) => u.id)];
  await notifyMultiple([...new Set(allIds)], title, message);
}

/**
 * Create an audit log entry.
 */
export async function auditLog(
  userId: string | undefined,
  action: string,
  details: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: { userId, action, details, ipAddress }
  });
}

type StubNotificationInput = {
  trackingId?: string;
  targetEmail?: string | null;
  targetMobile?: string | null;
  title: string;
  message: string;
  userId?: string;
};

async function safeNotificationStub(kind: string, input: StubNotificationInput): Promise<void> {
  if (input.userId) {
    await notify(input.userId, input.title, input.message);
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[DEV ${kind}] ${input.title}`, {
      trackingId: input.trackingId,
      email: input.targetEmail,
      mobile: input.targetMobile,
      message: input.message,
    });
  }
}

export async function sendTrackingIdNotification(input: StubNotificationInput): Promise<void> {
  await safeNotificationStub("TRACKING_NOTIFICATION", input);
}

export async function sendSlaEscalationNotification(input: StubNotificationInput): Promise<void> {
  await safeNotificationStub("SLA_ESCALATION", input);
}

export async function sendGrievanceAcknowledgement(input: StubNotificationInput): Promise<void> {
  await safeNotificationStub("GRIEVANCE_ACK", input);
}

export async function sendJsDecisionNotification(input: StubNotificationInput): Promise<void> {
  await safeNotificationStub("JS_DECISION", input);
}

export async function sendNodalOfficerAppointmentNotification(input: StubNotificationInput): Promise<void> {
  await safeNotificationStub("NODAL_APPOINTMENT", input);
}

export async function sendMouStatusNotification(input: StubNotificationInput): Promise<void> {
  await safeNotificationStub("MOU_STATUS", input);
}

export async function sendUcVerificationNotification(input: StubNotificationInput): Promise<void> {
  await safeNotificationStub("UC_VERIFICATION", input);
}
