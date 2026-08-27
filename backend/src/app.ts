// Suppress the url.parse() DEP0169 deprecation warning emitted by nodemailer internals.
// This must execute before any imports that trigger the warning at module load time.
const _origEmitWarning = process.emitWarning;
process.emitWarning = function (warning: any, ...args: any[]) {
  if (typeof warning === "string" && warning.includes("url.parse()")) return;
  if (warning && typeof warning === "object" && (warning as any).code === "DEP0169") return;
  return (_origEmitWarning as Function).call(process, warning, ...args);
} as typeof process.emitWarning;

import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server } from "socket.io";
import helmet from "helmet";
import compression from "compression";
import { assertProductionEnv } from "./config/env";
import { corsOriginDelegate } from "./config/cors";

// Central API Router
import apiRoutes from "./routes";

// Middlewares
import { errorHandler } from "./middlewares/errorMiddleware";
import { registerChatSocket } from "./websocket/chatSocket";
import { registerNotificationSocket } from "./websocket/notificationSocket";
import { startSlaScheduler } from "./services/slaSchedulerService";
import { generalRateLimiter } from "./middlewares/rateLimitMiddleware";

import { runStartupSecurityCheck } from "./utils/securityCheck";
import { ensurePermissionsSeeded } from "./controllers/roleController";

// Configurations
dotenv.config();
assertProductionEnv();
runStartupSecurityCheck();
ensurePermissionsSeeded();

const app = express();
// Enable 'trust proxy' so Express & rate limiters accurately identify client IPs behind reverse proxies / API gateways (AWS Lambda, Vercel, Nginx, Cloudflare)
app.set("trust proxy", true);
const server = http.createServer(app);

const corsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(compression({ level: 6, threshold: 1024 }));
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(generalRateLimiter);

// Backward-compatible response adapter for legacy controllers
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (
      res.statusCode >= 400 &&
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      const legacy = body as { error: string; details?: unknown; [key: string]: unknown };
      const { error, details, ...rest } = legacy;
      return originalJson({
        ...rest,
        success: false,
        error: {
          code: res.statusCode === 401 ? "UNAUTHORIZED" : res.statusCode === 403 ? "FORBIDDEN" : res.statusCode === 404 ? "NOT_FOUND" : res.statusCode === 429 ? "RATE_LIMITED" : res.statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED",
          message: error,
          ...(details !== undefined ? { details } : {})
        }
      });
    }
    return originalJson(body);
  }) as typeof res.json;
  next();
});

// Enhanced Terminal Logger Middleware
const SENSITIVE_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/verify-otp", "/api/verification"];
app.use((req, res, next) => {
  const startTime = Date.now();
  const isSensitive = SENSITIVE_PATHS.some((path) => req.path.startsWith(path));
  const logPath = isSensitive ? "/api/auth/**" : req.originalUrl || req.path;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const statusText = status === 200 || status === 201 ? "OK" : status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status >= 500 ? "SERVER_ERROR" : `STATUS_${status}`;
    const icon = status >= 500 ? "🔥" : status >= 400 ? "⚠️" : status >= 300 ? "🔀" : "✅";

    console.log(`[API ${req.method}] ${icon} ${status} ${statusText} | ${logPath} | ${duration}ms`);
  });

  next();
});

// ============================================
// Centralized API Routes - MahaCSR Framework
// ============================================

app.use("/api", apiRoutes);

// Base route & Health check
app.get("/", (req, res) => {
  res.json({ message: "Welcome to MahaCSR API Platform Gateway" });
});

import redis from "./config/redis";

app.get("/health", async (req, res) => {
  let redisStatus = "CONNECTING";
  try {
    const pingResult = await Promise.race([
      redis.ping(),
      new Promise<string>((resolve) => setTimeout(() => resolve("TIMEOUT"), 200))
    ]);
    if (pingResult === "PONG") redisStatus = "HEALTHY";
    else if (pingResult === "TIMEOUT") redisStatus = "LATENCY_HIGH";
  } catch {
    redisStatus = "UNAVAILABLE";
  }
  res.json({ status: "UP", redis: redisStatus, timestamp: new Date().toISOString() });
});

// WebSocket Registration
const io = new Server(server, {
  cors: corsOptions
});

registerChatSocket(io);
registerNotificationSocket(io);

// Background Services
if (process.env.NODE_ENV !== "test") {
  startSlaScheduler();
}

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[Server Error] Port ${PORT} is already in use (EADDRINUSE). Closing hanging process...`);
    process.exit(1);
  } else {
    console.error("[Server Error]", err);
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`MahaCSR Server is running on port ${PORT}`);
  });
}

// Graceful shutdown handling for ts-node-dev / nodemon hot-reloads
const gracefulShutdown = (signal: string) => {
  console.log(`[Server Shutdown] Signal ${signal} received. Closing HTTP server & freeing port ${PORT}...`);
  server.close(() => {
    console.log("[Server Shutdown] Port freed cleanly.");
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1000).unref();
};

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGUSR2", () => gracefulShutdown("SIGUSR2"));

export default app;
