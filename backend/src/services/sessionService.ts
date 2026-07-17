import prisma from "../config/db";
import { getRedisClient } from "../utils/redis";
import { UAParser } from "ua-parser-js";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days (matching refresh token)

export interface SessionInfo {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export async function createSession(info: SessionInfo): Promise<string> {
  const redis = await getRedisClient();
  
  // Parse User Agent
  const ua = info.userAgent ? new UAParser(info.userAgent) : null;
  const browserObj = ua ? ua.getBrowser() : null;
  const osObj = ua ? ua.getOS() : null;
  const deviceObj = ua ? ua.getDevice() : null;
  
  const browser = browserObj ? `${browserObj.name || ""} ${browserObj.version || ""}`.trim() : null;
  const os = osObj ? `${osObj.name || ""} ${osObj.version || ""}`.trim() : null;
  const device = deviceObj ? `${deviceObj.vendor || ""} ${deviceObj.model || ""}`.trim() : null;

  const expiry = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  // Write Session to database
  const session = await prisma.session.create({
    data: {
      userId: info.userId,
      ipAddress: info.ipAddress || null,
      lastActivityIp: info.ipAddress || null,
      userAgent: info.userAgent || null,
      browser: browser || null,
      os: os || null,
      device: device || null,
      deviceId: info.deviceId || null,
      expiry } });

  // Store in Redis cache
  if (redis) {
    try {
      await redis.set(`session:${session.id}`, "ACTIVE", { EX: SESSION_TTL_SECONDS });
    } catch (err) {
      console.warn("Failed to save session to Redis cache:", err);
    }
  }
  return session.id;
}

export async function validateSession(sessionId: string): Promise<boolean> {
  const redis = await getRedisClient();
  let cachedStatus = null;

  if (redis) {
    try {
      cachedStatus = await redis.get(`session:${sessionId}`);
    } catch (err) {
      console.warn("Failed to get session from Redis cache:", err);
    }
  }

  if (cachedStatus === "ACTIVE") {
    // Session is active. Async update last activity in DB and Redis
    updateLastActivity(sessionId).catch(() => {});
    return true;
  }

  if (cachedStatus === "REVOKED") {
    return false;
  }

  // Fallback to database
  const session = await prisma.session.findUnique({
    where: { id: sessionId } });

  if (session && !session.isRevoked && session.expiry > new Date()) {
    // Populate cache and return true
    if (redis) {
      try {
        const remainingTime = Math.max(0, Math.floor((session.expiry.getTime() - Date.now()) / 1000));
        await redis.set(`session:${sessionId}`, "ACTIVE", { EX: remainingTime });
      } catch (err) {
        console.warn("Failed to populate session Redis cache:", err);
      }
    }
    return true;
  }

  return false;
}

export async function revokeSession(sessionId: string, revokedByUserId?: string, reason?: string): Promise<void> {
  const redis = await getRedisClient();
  
  // Update Redis cache
  if (redis) {
    try {
      await redis.set(`session:${sessionId}`, "REVOKED", { EX: 60 * 60 }); // Keep blacklist record for 1 hr
    } catch (err) {
      console.warn("Failed to write revoked session to Redis cache:", err);
    }
  }

  // Update Database
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      isRevoked: true,
      revokedByUserId: revokedByUserId || null,
      revokedAt: new Date(),
      revocationReason: reason || null } });
}

export async function revokeAllUserSessions(userId: string, revokedByUserId?: string, reason?: string): Promise<void> {
  const redis = await getRedisClient();
  
  // Find all active sessions in DB
  const activeSessions = await prisma.session.findMany({
    where: { userId, isRevoked: false, expiry: { gt: new Date() } },
    select: { id: true } });

  if (redis) {
    try {
      for (const session of activeSessions) {
        await redis.set(`session:${session.id}`, "REVOKED", { EX: 60 * 60 });
      }
    } catch (err) {
      console.warn("Failed to write revoked user sessions to Redis cache:", err);
    }
  }

  await prisma.session.updateMany({
    where: { userId, isRevoked: false },
    data: {
      isRevoked: true,
      revokedByUserId: revokedByUserId || null,
      revokedAt: new Date(),
      revocationReason: reason || null } });
}

export async function getSingleSessionPolicy(tenantId: string): Promise<"REPLACE" | "REJECT"> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: `single_session_policy:${tenantId}` } });
  return (setting?.value as "REPLACE" | "REJECT") || "REPLACE";
}

async function updateLastActivity(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActivity: new Date() } });
}
