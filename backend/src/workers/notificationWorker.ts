import { Worker, Queue, Job } from "bullmq";
import prisma from "../config/db";
import { sendTemplateEmail } from "../services/emailService";
import { sendSMS } from "../services/smsService";
import { emitNotificationToUser } from "../websocket/notificationSocket";
import os from "os";
import IORedis from "ioredis";

// Prefer REDIS_URL (used by the rest of the app), fall back to host/port pieces
const REDIS_URL = process.env.REDIS_URL?.trim();
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);

function createRedisConnection(options: Record<string, any>): IORedis {
  return REDIS_URL
    ? new IORedis(REDIS_URL, options)
    : new IORedis({ host: REDIS_HOST, port: REDIS_PORT, ...options });
}

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

// Lazy-initialized queue and worker — only created if Redis is reachable
let notificationQueueInstance: Queue | null = null;
let notificationWorkerInstance: Worker | null = null;
let bullmqReady = false;

/**
 * Process a notification job directly (fallback when Redis/BullMQ is unavailable).
 */
async function processNotificationDirect(payload: NotificationJobPayload): Promise<void> {
  const workerNodeId = `${os.hostname()}-pid-${process.pid}`;
  const correlationId = payload.correlationId || `corr-direct-${Date.now()}`;

  // 1. Process In-App notification
  let inAppRecord: any = null;
  if (payload.channels.includes("IN_APP")) {
    inAppRecord = await prisma.notification.create({
      data: {
        userId: payload.recipientId,
        title: payload.title,
        message: payload.message } });
  }

  // 2. Process Socket Notification
  if (payload.channels.includes("SOCKET") && inAppRecord) {
    emitNotificationToUser(payload.recipientId, inAppRecord);
  }

  // 3. Process Email
  if (payload.channels.includes("EMAIL") && payload.recipientEmail) {
    const emailLog = await prisma.notificationLog.create({
      data: {
        recipientId: payload.recipientId,
        recipientEmail: payload.recipientEmail,
        title: payload.title,
        message: payload.message,
        channel: "EMAIL",
        status: "PENDING",
        correlationId,
        notificationType: payload.notificationType || null,
        workerNodeId } });

    try {
      const mailResult = await sendTemplateEmail({
        to: payload.recipientEmail,
        templateName: "workflow_notification",
        trackingId: payload.trackingId,
        applicantName: payload.applicantName || "User",
        currentStatus: payload.currentStatus || payload.title,
        workflowStatus: payload.workflowStatus || payload.message,
        actionButtonUrl: payload.actionButtonUrl,
        subject: payload.title });

      await prisma.notificationLog.update({
        where: { id: emailLog.id },
        data: {
          status: "SENT",
          providerMessageId: mailResult.messageId,
          smtpResponseCode: mailResult.response,
          sentAt: new Date() } });
    } catch (err: any) {
      await prisma.notificationLog.update({
        where: { id: emailLog.id },
        data: {
          status: "FAILED",
          retryCount: 0,
          lastError: err.message || String(err) } });
    }
  }

  // 4. Process SMS
  if (payload.channels.includes("SMS") && payload.recipientPhone) {
    const smsLog = await prisma.notificationLog.create({
      data: {
        recipientId: payload.recipientId,
        recipientPhone: payload.recipientPhone,
        title: payload.title,
        message: payload.message,
        channel: "SMS",
        status: "PENDING",
        correlationId,
        notificationType: payload.notificationType || null,
        workerNodeId } });

    try {
      const smsResult = await sendSMS({
        to: payload.recipientPhone,
        trackingId: payload.trackingId,
        status: payload.currentStatus || payload.title,
        portalUrl: payload.actionButtonUrl,
        message: payload.message });

      await prisma.notificationLog.update({
        where: { id: smsLog.id },
        data: {
          status: "SENT",
          providerMessageId: smsResult.providerMessageId,
          smtpResponseCode: smsResult.responseCode,
          sentAt: new Date() } });
    } catch (err: any) {
      await prisma.notificationLog.update({
        where: { id: smsLog.id },
        data: {
          status: "FAILED",
          retryCount: 0,
          lastError: err.message || String(err) } });
    }
  }
}

/**
 * Initialize BullMQ Queue + Worker only if Redis is reachable.
 */
async function initBullMQ(): Promise<void> {
  try {
    // Test Redis connectivity first with a short timeout
    const testConn = createRedisConnection({
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // No retries
      connectTimeout: 3000,
      lazyConnect: true });
    testConn.on("error", () => {}); // Suppress error events
    await testConn.connect();
    await testConn.ping();
    await testConn.quit();

    // Redis is available — create BullMQ queue and worker
    const connection = createRedisConnection({
      maxRetriesPerRequest: null, // BullMQ requires this to be null
    });

    notificationQueueInstance = new Queue("notification-queue", {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 5000 },
        removeOnComplete: true } });

    notificationWorkerInstance = new Worker(
      "notification-queue",
      async (job: Job<NotificationJobPayload>) => {
        const payload = job.data;
        console.log(`[Notification Worker] Processing job ${job.id} for user ${payload.recipientId}`);
        await processNotificationDirect(payload);
      },
      { connection }
    );

    notificationWorkerInstance.on("failed", (job, err) => {
      console.error(`[Notification Worker] Job ${job?.id} failed:`, err.message);
    });

    notificationWorkerInstance.on("completed", (job) => {
      console.log(`[Notification Worker] Job ${job.id} completed successfully`);
    });

    bullmqReady = true;
    console.log("[Notification Worker] BullMQ Queue + Worker initialized with Redis.");
  } catch (err) {
    console.warn("[Notification Worker] Redis not available. Notifications will be processed directly (no queue).");
    bullmqReady = false;
  }
}

// Initialize on module load
initBullMQ();

/**
 * Exported notificationQueue proxy object.
 * If BullMQ/Redis is available, delegates to the real Queue.
 * Otherwise, processes the notification directly (synchronous fallback).
 */
export const notificationQueue = {
  async add(name: string, data: NotificationJobPayload): Promise<any> {
    if (bullmqReady && notificationQueueInstance) {
      return notificationQueueInstance.add(name, data);
    }
    // Direct fallback — process without queue
    try {
      await processNotificationDirect(data);
    } catch (err) {
      console.error("[Notification Direct] Failed to process notification:", err);
    }
  } };

export { notificationWorkerInstance as notificationWorker };
