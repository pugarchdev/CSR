import type { IncomingHttpHeaders } from "http";
import { getAllowedOrigins } from "./env";

const vercelPreviewOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;
type HeaderRequest = { headers: IncomingHttpHeaders & { origin?: string } };
type HeaderResponse = { setHeader(name: string, value: number | string | readonly string[]): unknown };

export const getCorsAllowedOrigin = (origin?: string): string | false => {
  if (!origin) return false;

  const cleanedOrigin = origin.replace(/\/$/, "");
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(cleanedOrigin)) return origin;
  if (vercelPreviewOriginPattern.test(cleanedOrigin)) return origin;

  return false;
};

export const buildCorsHeaders = (origin?: string): Record<string, string> => {
  const allowedOrigin = getCorsAllowedOrigin(origin);

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Cookie",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

export const applyCorsHeaders = (req: HeaderRequest, res: HeaderResponse) => {
  const headers = buildCorsHeaders(req.headers.origin);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
};

export const corsOriginDelegate = (
  origin: string | undefined,
  callback: (err: Error | null, origin?: boolean | string) => void
) => {
  if (!origin) return callback(null, true);

  const allowedOrigin = getCorsAllowedOrigin(origin);
  return callback(null, allowedOrigin || false);
};
