import { createClient } from "redis";

let redisClient: any = null;
const isRedisEnabled = process.env.REDIS_URL || process.env.REDIS_ENABLED === "true";

// Local in-memory cache fallback
interface CacheEntry {
  permissions: string[];
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

// Initialize Redis Client
(async () => {
  if (isRedisEnabled) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: {
          reconnectStrategy: () => new Error("Redis reconnect disabled"),
          connectTimeout: 5000 }
      });
      redisClient.on("error", () => {
        // Silently absorb all Redis client errors
      });
      await redisClient.connect();
      console.log("Redis connected successfully for Dynamic RBAC Permission Caching.");
    } catch {
      console.warn("Redis connection failed. Dynamic RBAC falling back to In-Memory Cache.");
      if (redisClient) {
        try { await redisClient.disconnect(); } catch {}
      }
      redisClient = null;
    }
  } else {
    console.log("Redis is disabled or not configured. Dynamic RBAC using In-Memory Cache.");
  }
})();

export class CacheService {
  /**
   * Get cached permissions for a user
   */
  static async getPermissions(userId: string): Promise<string[] | null> {
    const cacheKey = `user:permissions:${userId}`;

    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        console.error("Error reading from Redis:", err);
      }
    }

    // Memory cache check
    const entry = memoryCache.get(userId);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.permissions;
      }
      // Evict expired entry
      memoryCache.delete(userId);
    }

    return null;
  }

  /**
   * Set cached permissions for a user
   */
  static async setPermissions(
    userId: string,
    permissions: string[],
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    const cacheKey = `user:permissions:${userId}`;

    if (redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(permissions), { EX: ttlSeconds });
        return;
      } catch (err) {
        console.error("Error writing to Redis:", err);
      }
    }

    // Memory cache write
    memoryCache.set(userId, {
      permissions,
      expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  /**
   * Invalidate cached permissions for a user
   */
  static async invalidatePermissions(userId: string): Promise<void> {
    const cacheKey = `user:permissions:${userId}`;

    if (redisClient) {
      try {
        await redisClient.del(cacheKey);
      } catch (err) {
        console.error("Error deleting from Redis:", err);
      }
    }

    // Memory cache invalidate
    memoryCache.delete(userId);
    console.log(`[CacheService] Invalidated permissions cache for user: ${userId}`);
  }

  /**
   * Invalidate all users' permission cache (useful during global role updates)
   */
  static async invalidateAll(): Promise<void> {
    if (redisClient) {
      try {
        const keys = await redisClient.keys("user:permissions:*");
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (err) {
        console.error("Error clearing Redis permission cache:", err);
      }
    }

    memoryCache.clear();
    console.log("[CacheService] Invalidated all permissions cache");
  }
}
