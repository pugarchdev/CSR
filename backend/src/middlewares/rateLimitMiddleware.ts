import rateLimit from "express-rate-limit";
import { Request } from "express";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Robust Client Key Identifier
 * 1. For authenticated requests: Keys by user token or user ID to avoid collisions on shared corporate IPs / NAT / reverse proxy IPs.
 * 2. For unauthenticated requests: Extracts the real client IP via Cloudflare, X-Real-IP, or the leftmost IP from X-Forwarded-For.
 */
export const getClientIdentifier = (req: Request): string => {
  // 1. Authenticated user ID or Token
  if ((req as any).user?.id) {
    return `user_${(req as any).user.id}`;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length >= 8) {
      return `auth_${token.slice(0, 32)}`;
    }
  }

  const cookieToken =
    (req as any).cookies?.mahacsr_access_token ||
    (req as any).cookies?.token ||
    (req as any).cookies?.accessToken;
  if (cookieToken && typeof cookieToken === "string" && cookieToken.length >= 8) {
    return `auth_${cookieToken.slice(0, 32)}`;
  }

  // 2. Client IP Extraction from Reverse Proxies
  const cfConnectingIp = req.headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    const ip = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    if (ip) return ip.trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    if (ip) return ip.trim();
  }

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const headerStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const clientIp = headerStr.split(",")[0]?.trim();
    if (clientIp) return clientIp;
  }

  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
};

const shouldSkipRateLimiting = (req: Request): boolean => {
  // Skip if rate limiting is explicitly disabled via env
  if (process.env.DISABLE_RATE_LIMIT === "true" || process.env.ENABLE_RATE_LIMITING === "false") {
    return true;
  }

  // Skip HTTP OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return true;
  }

  // Skip healthcheck / static routes
  const path = req.path || req.originalUrl || "";
  if (path === "/health" || path === "/api/health" || path === "/favicon.ico") {
    return true;
  }

  return false;
};

const GENERAL_MAX = Number(process.env.RATE_LIMIT_MAX_GENERAL) || (isDev ? 20000 : 10000);
const AUTH_MAX = Number(process.env.RATE_LIMIT_MAX_AUTH) || (isDev ? 5000 : 300);
const STRICT_MAX = Number(process.env.RATE_LIMIT_MAX_STRICT) || (isDev ? 2000 : 100);

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: (req: Request) => getClientIdentifier(req),
  skip: (req: Request) => isDev || shouldSkipRateLimiting(req),
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: (req: Request) => getClientIdentifier(req),
  skip: (req: Request) => isDev || shouldSkipRateLimiting(req),
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many failed attempts. Please try again in 15 minutes." } },
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: STRICT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: (req: Request) => getClientIdentifier(req),
  skip: (req: Request) => isDev || shouldSkipRateLimiting(req),
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again in a few minutes." } },
});

export const createCustomRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max: isDev ? Math.max(max * 10, 2000) : max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
    keyGenerator: (req: Request) => getClientIdentifier(req),
    skip: (req: Request) => isDev || shouldSkipRateLimiting(req),
    message: { success: false, error: { code: "RATE_LIMITED", message: message || "Too many requests. Please try again later." } },
  });
};
