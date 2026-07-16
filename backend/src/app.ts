import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server } from "socket.io";
import helmet from "helmet";
import { assertProductionEnv } from "./config/env";
import { corsOriginDelegate } from "./config/cors";

// Configurations
dotenv.config();
assertProductionEnv();

// LEGACY NGO MARKETPLACE FLOW DISABLED FOR MAHA CSR CONVERGENCE MODEL
// Feature flag to control legacy routes - set to true to re-enable legacy NGO marketplace
const ENABLE_LEGACY_NGO_MARKETPLACE = process.env.ENABLE_LEGACY_NGO_MARKETPLACE === "true";

// Routes - CORE (always enabled)
import authRoutes from "./routes/authRoutes";
import companyRoutes from "./routes/companyRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import auditRoutes from "./routes/auditRoutes";
import documentRoutes from "./routes/documentRoutes";
import reportRoutes from "./routes/reportRoutes";
import adminRoutes from "./routes/adminRoutes";
import organizationRoutes from "./routes/organizationRoutes";
import platformRoutes from "./routes/platformRoutes";
import governmentDepartmentRoutes from "./routes/governmentDepartmentRoutes";
import publicRoutes from "./routes/publicRoutes";
import districtRoutes from "./routes/districtRoutes";
import companyPortalRoutes from "./routes/companyPortalRoutes";
import csrLifecycleRoutes from "./routes/csrLifecycleRoutes";
import otpRoutes from "./routes/otpRoutes";
import trackingRoutes from "./routes/trackingRoutes";
import onboardingRoutes from "./routes/onboardingRoutes";

// LEGACY NGO MARKETPLACE ROUTES - Commented out for MahaCSR Convergence Framework
// These routes are disabled as per the Maharashtra CSR Portal framework
// which replaces NGO-marketplace matchmaking with State-led, District-executed convergence
// import ngoRoutes from "./routes/ngoRoutes"; // LEGACY: NGO marketplace browsing
// import projectRoutes from "./routes/projectRoutes"; // LEGACY: NGO project marketplace
// import matchingRoutes from "./routes/matchingRoutes"; // LEGACY: NGO-company matching
// import chatRoutes from "./routes/chatRoutes"; // LEGACY: NGO-company direct chat (replaced by structured interactions)
// import onboardingRoutes from "./routes/onboardingRoutes"; // LEGACY: NGO onboarding flow
// import ngoApplicationRoutes from "./routes/ngoApplicationRoutes"; // LEGACY: NGO application
// import ngoPortalRoutes from "./routes/ngoPortalRoutes"; // LEGACY: NGO portal
// import marketplaceRoutes from "./routes/marketplaceRoutes"; // LEGACY: Marketplace - replaced by Public Development Needs
// Still required by the department portal (dashboard, requirements, profile) — do not disable
import csrRequirementRoutes from "./routes/csrRequirementRoutes";
import companyInterestRoutes from "./routes/companyInterestRoutes";
// import agreementRoutes from "./routes/agreementRoutes"; // LEGACY: Replaced by StandardMou
// import csrFundRoutes from "./routes/csrFundRoutes"; // LEGACY: Replaced by ConvergenceProject financials
// import progressRoutes from "./routes/progressRoutes"; // LEGACY: Replaced by ProjectDeliverableMilestone
// import completionRoutes from "./routes/completionRoutes"; // LEGACY: Replaced by ConvergenceProject completion
// Still required by the department portal dashboard (/department/dashboard) — do not disable
import csrDashboardRoutes from "./routes/csrDashboardRoutes";

// MAHA CSR CONVERGENCE FRAMEWORK - New Routes
import corporateEnquiryRoutes from "./routes/corporateEnquiryRoutes";
import relationshipManagerRoutes from "./routes/relationshipManagerRoutes";
import feasibilityAssessmentRoutes from "./routes/feasibilityAssessmentRoutes";
import governmentPitchRoutes from "./routes/governmentPitchRoutes";
import nodalOfficerRoutes from "./routes/nodalOfficerRoutes";
import convergenceProjectRoutes from "./routes/convergenceProjectRoutes";
import grievanceRoutes from "./routes/grievanceRoutes";
import jsRoutes from "./routes/jsRoutes";
import implementingAgencyRoutes from "./routes/implementingAgencyRoutes";
import helpdeskRoutes from "./routes/helpdeskRoutes";
import secretaryRoutes from "./routes/secretaryRoutes";

// Middlewares
import { errorHandler } from "./middlewares/errorMiddleware";
import { registerChatSocket } from "./websocket/chatSocket";
import { registerNotificationSocket } from "./websocket/notificationSocket";
import { startSlaScheduler } from "./services/slaSchedulerService";

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: corsOriginDelegate,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Logger middleware - concise and production-ready
// Shows: HTTP method, path, status code, and response time
// Sanitizes sensitive paths for security
const SENSITIVE_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/verify-otp"];
app.use((req, res, next) => {
  const startTime = Date.now();
  const isSensitive = SENSITIVE_PATHS.some((path) => req.path.startsWith(path));
  const logPath = isSensitive ? "/api/auth/**" : req.path;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const statusSymbol = status >= 400 ? "✗" : status >= 300 ? "→" : "✓";
    console.log(`${statusSymbol} ${req.method} ${logPath} ${status} ${duration}ms`);
  });

  next();
});

// ============================================
// API Routes - MahaCSR Convergence Framework
// ============================================

// Core Routes (always active)
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/org", organizationRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/government-departments", governmentDepartmentRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/district", districtRoutes);
app.use("/api/company", companyPortalRoutes);
app.use("/api", csrLifecycleRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/company-interests", companyInterestRoutes);

// Department portal (BENEFICIARY_AGENCY) — dashboard stats, profile, and requirements
app.use("/api/csr-dashboard", csrDashboardRoutes);
app.use("/api/csr-requirements", csrRequirementRoutes);

// MAHA CSR CONVERGENCE FRAMEWORK - New Routes
app.use("/api/corporate-enquiries", corporateEnquiryRoutes);
app.use("/api/rm", relationshipManagerRoutes);
app.use("/api/feasibility", feasibilityAssessmentRoutes);
app.use("/api/government-pitches", governmentPitchRoutes);
app.use("/api/nodal", nodalOfficerRoutes);
app.use("/api/convergence-projects", convergenceProjectRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/js", jsRoutes);
app.use("/api/implementing-agency", implementingAgencyRoutes);
app.use("/api/helpdesk", helpdeskRoutes);
app.use("/api/secretary", secretaryRoutes);

// LEGACY NGO MARKETPLACE ROUTES - DISABLED FOR MAHA CSR CONVERGENCE MODEL
// These routes are commented out as per the Maharashtra CSR Portal framework
// which replaces NGO-marketplace matchmaking with State-led, District-executed convergence
// To re-enable, set ENABLE_LEGACY_NGO_MARKETPLACE=true in environment
if (ENABLE_LEGACY_NGO_MARKETPLACE) {
  // LEGACY: Import and use legacy routes only if explicitly enabled
  // app.use("/api/ngos", ngoRoutes);
  // app.use("/api/projects", projectRoutes);
  // app.use("/api/matching", matchingRoutes);
  // app.use("/api/chats", chatRoutes);
  // app.use("/api/onboarding", onboardingRoutes);
  // app.use("/api/csr-requirements", csrRequirementRoutes);
  // app.use("/api/requirements", csrRequirementRoutes);
  // app.use("/api/marketplace", marketplaceRoutes);
  // app.use("/api/ngo", ngoPortalRoutes);
  // app.use("/api/ngo-applications", ngoApplicationRoutes);
  // app.use("/api/company-interests", companyInterestRoutes);
  // app.use("/api/agreements", agreementRoutes);
  // app.use("/api/csr-funds", csrFundRoutes);
  // app.use("/api/progress-reports", progressRoutes);
  // app.use("/api/completions", completionRoutes);
  // app.use("/api/csr-dashboard", csrDashboardRoutes);
}
// Note: Legacy NGO marketplace flow disabled by default per MahaCSR Convergence Framework

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
// LEGACY: Chat socket disabled for MahaCSR Convergence Framework
// Real-time communication replaced by structured interaction logs
const io = new Server(server, {
  cors: corsOptions
});

// Real-time notification socket for status updates (replaces legacy chat socket).
registerNotificationSocket(io);

// LEGACY: Chat socket only enabled if legacy NGO marketplace is explicitly on.
if (ENABLE_LEGACY_NGO_MARKETPLACE) {
  registerChatSocket(io);
}

// Server startup
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`MahaCSR Server is running on port ${PORT}`);
  });
  // Start the recurring SLA escalation sweep (5-3-2 rule enforcement).
  startSlaScheduler();
}

export default app;
