import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

const isDev = process.env.NODE_ENV !== "production";

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => isDev,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many failed login attempts. Please try again in 15 minutes." } },
});

export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests from this IP. Please try again in 1 hour." } },
});

export const createCustomRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max: isDev ? 1000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isDev,
    message: { success: false, error: { code: "RATE_LIMITED", message: message || "Too many requests. Please try again later." } },
  });
};
