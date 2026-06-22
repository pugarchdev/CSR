import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server } from "socket.io";
import helmet from "helmet";
import { assertProductionEnv } from "./config/env";
import { applyCorsHeaders, corsOriginDelegate } from "./config/cors";

// Configurations
dotenv.config();
assertProductionEnv();

// Routes
import authRoutes from "./routes/authRoutes";
import ngoRoutes from "./routes/ngoRoutes";
import companyRoutes from "./routes/companyRoutes";
import projectRoutes from "./routes/projectRoutes";
import matchingRoutes from "./routes/matchingRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import chatRoutes from "./routes/chatRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import auditRoutes from "./routes/auditRoutes";
import documentRoutes from "./routes/documentRoutes";
import reportRoutes from "./routes/reportRoutes";
import adminRoutes from "./routes/adminRoutes";
import masterRoutes from "./routes/masterRoutes";
import organizationRoutes from "./routes/organizationRoutes";
import platformRoutes from "./routes/platformRoutes";
import onboardingRoutes from "./routes/onboardingRoutes";
import csrRequirementRoutes from "./routes/csrRequirementRoutes";
import ngoApplicationRoutes from "./routes/ngoApplicationRoutes";
import companyInterestRoutes from "./routes/companyInterestRoutes";
import agreementRoutes from "./routes/agreementRoutes";
import csrFundRoutes from "./routes/csrFundRoutes";
import progressRoutes from "./routes/progressRoutes";
import completionRoutes from "./routes/completionRoutes";
import csrDashboardRoutes from "./routes/csrDashboardRoutes";
import governmentDepartmentRoutes from "./routes/governmentDepartmentRoutes";
import marketplaceRoutes from "./routes/marketplaceRoutes";
import publicRoutes from "./routes/publicRoutes";
import districtRoutes from "./routes/districtRoutes";
import companyPortalRoutes from "./routes/companyPortalRoutes";
import ngoPortalRoutes from "./routes/ngoPortalRoutes";
import csrLifecycleRoutes from "./routes/csrLifecycleRoutes";

// Middlewares
import { errorHandler } from "./middlewares/errorMiddleware";
import { registerChatSocket } from "./websocket/chatSocket";

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  optionsSuccessStatus: 204
};

app.use((req, res, next) => {
  applyCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Logger middleware - sanitized for security
const SENSITIVE_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/verify-otp"];
app.use((req, res, next) => {
  const isSensitive = SENSITIVE_PATHS.some((path) => req.path.startsWith(path));
  const logMethod = req.method;
  const logPath = isSensitive ? "/api/auth/**" : req.path;
  console.log(`[${new Date().toISOString()}] ${logMethod} ${logPath}`);
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/ngos", ngoRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/org", organizationRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/csr-requirements", csrRequirementRoutes);
app.use("/api/requirements", csrRequirementRoutes);
app.use("/api/government-departments", governmentDepartmentRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/district", districtRoutes);
app.use("/api/company", companyPortalRoutes);
app.use("/api/ngo", ngoPortalRoutes);
app.use("/api", csrLifecycleRoutes);
app.use("/api/ngo-applications", ngoApplicationRoutes);
app.use("/api/company-interests", companyInterestRoutes);
app.use("/api/agreements", agreementRoutes);
app.use("/api/csr-funds", csrFundRoutes);
app.use("/api/progress-reports", progressRoutes);
app.use("/api/completions", completionRoutes);
app.use("/api/csr-dashboard", csrDashboardRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to MahaCSR API Platform Gateway" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Socket.io initialization
const io = new Server(server, {
  cors: corsOptions
});

registerChatSocket(io);

// Server startup
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`MahaCSR Server is running on port ${PORT}`);
  });
}

export default app;
