import prisma from "../config/db";
import { sendTemplateEmail } from "../services/emailService";
import { sendSMS } from "../services/smsService";
import { emitNotificationToUser } from "../websocket/notificationSocket";
import os from "os";

export interface NotificationJobPayload {
  recipientId: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  title: string;
  message: string;
  channels: ("EMAIL" | "SMS" | "IN_APP" | "SOCKET")[];
  trackingId?: string;
  applicantName?: string;
  currentStatus?: string;
  workflowStatus?: string;
  actionButtonUrl?: string;
  correlationId?: string;
  notificationType?: string;
}

async function processNotificationDirect(payload: NotificationJobPayload): Promise<void> {
  let inAppRecord: any = null;
  if (payload.channels.includes("IN_APP") && prisma?.notification?.create) {
    try {
      inAppRecord = await prisma.notification.create({
        data: {
          recipientId: payload.recipientId,
          userId: payload.recipientId,
          title: payload.title,
          message: payload.message,
          type: payload.notificationType || "INFO",
          ...(payload.actionButtonUrl ? { actionUrl: payload.actionButtonUrl } as any : {})
        }
      });
    } catch (inAppErr) {
      console.warn("[NotificationWorker] Failed to create in-app notification:", inAppErr);
    }
  }

  if (payload.channels.includes("SOCKET") && inAppRecord) {
    emitNotificationToUser(payload.recipientId, inAppRecord);
  }

  if (payload.channels.includes("EMAIL") && payload.recipientEmail) {
    let emailLog: any = null;
    if (prisma?.notificationLog?.create) {
      try {
        emailLog = await prisma.notificationLog.create({
          data: {
            recipientId: payload.recipientId,
            recipient: payload.recipientEmail,
            channel: "EMAIL",
            status: "PENDING"
          }
        });
      } catch (logErr) {
        console.warn("[NotificationWorker] Failed to create email notification log:", logErr);
      }
    }

    try {
      const mailResult = await sendTemplateEmail({
        to: payload.recipientEmail,
        templateName: "workflow_notification",
        trackingId: payload.trackingId,
        applicantName: payload.applicantName || "User",
        currentStatus: payload.currentStatus || payload.title,
        workflowStatus: payload.workflowStatus || payload.message,
        actionButtonUrl: payload.actionButtonUrl,
        subject: payload.title
      });

      if (emailLog?.id && prisma?.notificationLog?.update) {
        await prisma.notificationLog.update({
          where: { id: emailLog.id },
          data: {
            status: "SENT",
            providerMessageId: mailResult.messageId,
            sentAt: new Date()
          }
        });
      }
    } catch (err: any) {
      if (emailLog?.id && prisma?.notificationLog?.update) {
        await prisma.notificationLog.update({
          where: { id: emailLog.id },
          data: {
            status: "FAILED",
            retryCount: 0,
            error: err.message || String(err)
          }
        });
      }
    }
  }

  if (payload.channels.includes("SMS") && payload.recipientPhone) {
    let smsLog: any = null;
    if (prisma?.notificationLog?.create) {
      try {
        smsLog = await prisma.notificationLog.create({
          data: {
            recipientId: payload.recipientId,
            recipient: payload.recipientPhone,
            channel: "SMS",
            status: "PENDING"
          }
        });
      } catch (logErr) {
        console.warn("[NotificationWorker] Failed to create sms notification log:", logErr);
      }
    }

    try {
      const smsResult = await sendSMS({
        to: payload.recipientPhone,
        trackingId: payload.trackingId,
        status: payload.currentStatus || payload.title,
        portalUrl: payload.actionButtonUrl,
        message: payload.message
      });

      if (smsLog?.id && prisma?.notificationLog?.update) {
        await prisma.notificationLog.update({
          where: { id: smsLog.id },
          data: {
            status: "SENT",
            providerMessageId: smsResult.providerMessageId,
            sentAt: new Date()
          }
        });
      }
    } catch (err: any) {
      if (smsLog?.id && prisma?.notificationLog?.update) {
        await prisma.notificationLog.update({
          where: { id: smsLog.id },
          data: {
            status: "FAILED",
            retryCount: 0,
            error: err.message || String(err)
          }
        });
      }
    }
  }
}

export async function queueNotification(payload: NotificationJobPayload): Promise<void> {
  setImmediate(() => {
    processNotificationDirect(payload).catch((err) => {
      console.error("[NotificationWorker] Direct notification processing failed:", err);
    });
  });
}
