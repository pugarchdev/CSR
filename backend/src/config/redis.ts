import Redis, { RedisOptions } from "ioredis";

const rawRedisUrl = process.env.REDIS_URL || "redis://default:LRGqZlTymlEVm4R44JPswPo2CXH4rxSy@redis-18118.c258.us-east-1-4.ec2.cloud.redislabs.com:18118";

function buildRedisOptions(urlStr: string): RedisOptions {
  try {
    const parsed = new URL(urlStr);
    const isTls = parsed.protocol === "rediss:";
    const dbNum = parsed.pathname && parsed.pathname.length > 1 ? parseInt(parsed.pathname.slice(1), 10) : 0;
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db: isNaN(dbNum) ? 0 : dbNum,
      tls: isTls ? {} : undefined,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379 };
  }
}

export const redis = new Redis({
  ...buildRedisOptions(rawRedisUrl),
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null;
    return 1000;
  },
  connectTimeout: 3000,
  commandTimeout: 1000,
  enableReadyCheck: false,
  lazyConnect: true,
});

let isRedisConnected = false;

redis.connect().then(() => {
  isRedisConnected = true;
  console.log("[Redis] Connected to Cloud Redis instance");
}).catch((err) => {
  isRedisConnected = false;
  console.warn("[Redis] Initial connection warning (non-blocking fallback active):", err.message || err);
});

redis.on("connect", () => {
  isRedisConnected = true;
});

redis.on("error", (err) => {
  isRedisConnected = false;
});

// ============================================================================
// ULTRA-FAST L1 IN-PROCESS MEMORY CACHE (0.01ms Local Access)
// ============================================================================
interface L1CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const l1Map = new Map<string, L1CacheEntry<any>>();
const L1_MAX_ITEMS = 2000;
const L1_DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes local TTL

function getL1<T>(key: string): T | null {
  const entry = l1Map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    l1Map.delete(key);
    return null;
  }
  return entry.value;
}

function setL1<T>(key: string, value: T, ttlSeconds: number = 300): void {
  if (l1Map.size >= L1_MAX_ITEMS) {
    const oldestKey = l1Map.keys().next().value;
    if (oldestKey) l1Map.delete(oldestKey);
  }
  const expiresAt = Date.now() + Math.min(ttlSeconds * 1000, L1_DEFAULT_TTL_MS);
  l1Map.set(key, { value, expiresAt });
}

function delL1(key: string): void {
  l1Map.delete(key);
}

function clearL1Pattern(pattern: string): void {
  const regexStr = "^" + pattern.replace(/\*/g, ".*") + "$";
  const regex = new RegExp(regexStr);
  for (const k of l1Map.keys()) {
    if (regex.test(k)) {
      l1Map.delete(k);
    }
  }
}

/**
 * Timeout helper to prevent cross-ocean cloud Redis latency from blocking requests.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 40): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

// ============================================================================
// NON-BLOCKING TWO-TIER CACHE APIS
// ============================================================================

/**
 * Super-fast GET:
 * 1. Checks L1 RAM Cache (0.01ms - instant).
 * 2. If L1 misses, queries L2 Cloud Redis with a 40ms max timeout.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  // 1. Fast L1 RAM lookup (0ms)
  const l1Hit = getL1<T>(key);
  if (l1Hit !== null) {
    return l1Hit;
  }

  // 2. L2 Cloud Redis lookup with 40ms timeout safeguard
  if (!isRedisConnected) return null;
  try {
    const data = await withTimeout(redis.get(key), 40);
    if (!data) return null;
    const parsed = JSON.parse(data) as T;
    setL1(key, parsed, 300);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Non-blocking SET:
 * Updates L1 RAM cache immediately (0ms), and syncs to L2 Cloud Redis in background.
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  if (ttlSeconds <= 0) {
    // If TTL is 0 or negative, do not cache; evict any existing key
    delL1(key);
    if (isRedisConnected) {
      redis.del(key).catch(() => {});
    }
    return;
  }

  // 1. Immediate L1 RAM write (0ms)
  setL1(key, value, ttlSeconds);

  // 2. Non-blocking background L2 Redis write with explicit TTL
  if (isRedisConnected) {
    const serialized = JSON.stringify(value);
    redis.setex(key, ttlSeconds, serialized).catch(() => {});
  }
}

/**
 * Non-blocking DEL:
 * Evicts from L1 RAM immediately (0ms), and syncs deletion to L2 Cloud Redis in background.
 */
export async function delCache(keys: string | string[]): Promise<void> {
  const targetKeys = Array.isArray(keys) ? keys.filter(Boolean) : [keys];
  if (targetKeys.length === 0) return;

  // 1. Immediate L1 RAM deletion
  targetKeys.forEach(delL1);

  // 2. Non-blocking background L2 Redis deletion
  if (isRedisConnected) {
    redis.del(...targetKeys).catch(() => {});
  }
}

/**
 * Non-blocking Pattern Clear
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  clearL1Pattern(pattern);

  if (isRedisConnected) {
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      stream.on("data", (resultKeys: string[]) => {
        if (resultKeys.length > 0) {
          resultKeys.forEach(delL1);
          redis.pipeline(resultKeys.map((k) => ["del", k])).exec().catch(() => {});
        }
      });
    } catch {}
  }
}

/**
 * Cache or Fetch helper
 */
export async function cacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  if (ttlSeconds <= 0) {
    // Bypass cache completely for real-time live queries
    return fetchFn();
  }

  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fetchFn();
  if (result !== undefined && result !== null) {
    setCache<T>(key, result, ttlSeconds);
  }
  return result;
}

export default redis;
