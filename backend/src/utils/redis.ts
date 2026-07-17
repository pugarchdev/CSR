import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient: any = null;
let connectionFailed = false;

export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }
  if (connectionFailed) {
    return null;
  }

  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: () => new Error("Redis reconnect disabled"),
        connectTimeout: 5000 }
    });

    redisClient.on("error", () => {
      // Silently absorb all Redis client errors
    });

    await redisClient.connect();
    console.log("Redis Connected Successfully (Shared Client)");
    return redisClient;
  } catch {
    console.warn("Redis connection failed. Falling back to DB-only session tracking.");
    if (redisClient) {
      try { await redisClient.disconnect(); } catch {}
    }
    redisClient = null;
    connectionFailed = true;
    return null;
  }
}

