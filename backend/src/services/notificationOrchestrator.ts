import prisma from "../config/db";
import { queueNotification, NotificationJobPayload } from "../workers/notificationWorker";

export interface DispatchInput {
  recipientId: string;
  templateName: string;
  variables?: Record<string, string | number | null | undefined>;
  channels?: ("EMAIL" | "SMS" | "IN_APP" | "SOCKET")[];
  actionButtonUrl?: string;
  ccRecipientIds?: string[];
  correlationId?: string;
  notificationType?: string;
}

/**
 * Contact-only dispatch for recipients that have no User row (e.g. public
 * corporate-enquiry / government-pitch applicants tracked by tracking ID).
 *
 * These recipients cannot receive an IN_APP Notification (that model requires
 * a userId FK), so only EMAIL + SMS are fanned out through the queue/worker,
 * which records a NotificationLog row (recipientId is a plain string there).
 * If a userId is also known, prefer dispatchNotification instead.
 */
export interface ContactDispatchInput {
  /** Stable reference used for NotificationLog.recipientId (e.g. tracking ID). */
  referenceId: string;
  email?: string | null;
  phone?: string | null;
  title: string;
  message: string;
  /** Defaults to EMAIL + SMS. IN_APP/SOCKET are ignored (no user to attach to). */
  channels?: ("EMAIL" | "SMS")[];
  trackingId?: string;
  currentStatus?: string;
  actionButtonUrl?: string;
  correlationId?: string;
  notificationType?: string;
}

export async function dispatchToContact(input: ContactDispatchInput): Promise<void> {
  const channels = (input.channels || ["EMAIL", "SMS"]).filter(
    (c) => (c === "EMAIL" && input.email) || (c === "SMS" && input.phone)
  ) as NotificationJobPayload["channels"];

  if (channels.length === 0) return; // nothing deliverable

  const payload: NotificationJobPayload = {
    recipientId: `contact:${input.referenceId}`,
    recipientEmail: input.email || null,
    recipientPhone: input.phone || null,
    title: input.title,
    message: input.message,
    channels,
    trackingId: input.trackingId,
    currentStatus: input.currentStatus,
    actionButtonUrl: input.actionButtonUrl,
    correlationId: input.correlationId,
    notificationType: input.notificationType || "CONTACT_NOTIFICATION"
  };

  await queueNotification(payload);
}

function interpolate(text: string, variables: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) =>
    variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : ""
  );
}

/**
 * Centralized notification dispatch. Loads a NotificationTemplate by name,
 * interpolates {{variables}}, and enqueues delivery via direct in-process background task.
 * All channels — dashboard (IN_APP + SOCKET), EMAIL, SMS (stub provider),
 * PUSH (future) — flow through this single path.
 */
export async function dispatchNotification(input: DispatchInput): Promise<void> {
  const variables = input.variables || {};

  let template: any = null;
  if (prisma?.notificationTemplate?.findFirst) {
    try {
      template = await prisma.notificationTemplate.findFirst({
        where: { name: input.templateName }
      });
    } catch {
      template = null;
    }
  }

  const subject = template?.subject ? interpolate(template.subject, variables) : (variables.title as string) || input.templateName;
  const emailBody = (template?.emailBody || template?.body) ? interpolate(template?.emailBody || template?.body || "", variables) : (variables.message as string) || subject;
  const channels =
    input.channels ||
    ((template?.channels?.length ? template.channels : ["IN_APP", "SOCKET", "EMAIL"]) as NotificationJobPayload["channels"]);

  const recipients = Array.from(
    new Set([input.recipientId, ...(input.ccRecipientIds || [])].filter((id): id is string => typeof id === "string" && id.trim().length > 0))
  );
  let users: any[] = [];
  if (prisma?.user?.findMany) {
    try {
      users = await prisma.user.findMany({
        where: { id: { in: recipients } },
        select: {
          id: true,
          email: true,
          mobile: true,
          firstName: true,
          lastName: true,
          officerProfile: { select: { fullName: true, mobile: true } }
        }
      });
    } catch {
      users = [];
    }
  }
  const userById = new Map(users.map((u) => [u.id, u]));

  for (const recipientId of recipients) {
    const user = userById.get(recipientId);
    if (!user) continue;

    const payload: NotificationJobPayload = {
      recipientId,
      recipientEmail: user.email,
      recipientPhone:
        (recipientId === input.recipientId ? (variables.mobile as string) : null) ||
        user.mobile ||
        user.officerProfile?.mobile ||
        null,
      title: subject,
      message: emailBody,
      channels,
      applicantName: user.officerProfile?.fullName || (user.firstName ? `${user.firstName} ${user.lastName || ""}` : (variables.recipientName as string)) || undefined,
      currentStatus: (variables.currentStatus as string) || undefined,
      workflowStatus: (variables.workflowStatus as string) || undefined,
      actionButtonUrl: input.actionButtonUrl,
      correlationId: input.correlationId,
      notificationType: input.notificationType || input.templateName
    };

    await queueNotification(payload);
  }
}
