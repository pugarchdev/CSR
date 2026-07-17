import prisma from "../config/db";
import { notificationQueue, NotificationJobPayload } from "../workers/notificationWorker";

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

function interpolate(text: string, variables: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) =>
    variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : ""
  );
}

/**
 * Centralized notification dispatch. Loads a NotificationTemplate by name,
 * interpolates {{variables}}, and enqueues delivery through the BullMQ
 * notification queue (Redis-backed with direct-processing fallback).
 * All channels — dashboard (IN_APP + SOCKET), EMAIL, SMS (stub provider),
 * PUSH (future) — flow through this single path.
 */
export async function dispatchNotification(input: DispatchInput): Promise<void> {
  const variables = input.variables || {};

  const template = await prisma.notificationTemplate.findFirst({
    where: { name: input.templateName }
  });

  const subject = template?.subject ? interpolate(template.subject, variables) : input.templateName;
  const emailBody = template?.emailBody ? interpolate(template.emailBody, variables) : subject;
  const channels =
    input.channels ||
    ((template?.channels?.length ? template.channels : ["IN_APP", "SOCKET", "EMAIL"]) as NotificationJobPayload["channels"]);

  const recipients = [input.recipientId, ...(input.ccRecipientIds || [])];
  const users = await prisma.user.findMany({
    where: { id: { in: recipients } },
    select: {
      id: true,
      email: true,
      officerProfile: { select: { fullName: true, mobile: true } },
      beneficiaryProfile: { select: { contactPhone: true } }
    }
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  for (const recipientId of recipients) {
    const user = userById.get(recipientId);
    if (!user) continue;

    const payload: NotificationJobPayload = {
      recipientId,
      recipientEmail: user.email,
      recipientPhone:
        (recipientId === input.recipientId ? (variables.mobile as string) : null) ||
        user.officerProfile?.mobile ||
        user.beneficiaryProfile?.contactPhone ||
        null,
      title: subject,
      message: emailBody,
      channels,
      applicantName: user.officerProfile?.fullName || (variables.recipientName as string) || undefined,
      currentStatus: (variables.currentStatus as string) || undefined,
      workflowStatus: (variables.workflowStatus as string) || undefined,
      actionButtonUrl: input.actionButtonUrl,
      correlationId: input.correlationId,
      notificationType: input.notificationType || input.templateName
    };

    await notificationQueue.add("notify", payload);
  }
}
