import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { assertProductionEnv, getAllowedOrigins } from "./config/env";

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
import onboardingRoutes from "./routes/onboardingRoutes";

// Middlewares
import { errorHandler } from "./middlewares/errorMiddleware";
import { registerChatSocket } from "./websocket/chatSocket";

const app = express();
const server = http.createServer(app);

// CORS setup
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : getAllowedOrigins();

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://csr-seven.vercel.app"
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    const isAllowed = 
      configuredOrigins.includes(origin) ||
      defaultAllowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
      
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS request blocked for origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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
app.use("/api/onboarding", onboardingRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to MahaCSR API Platform Gateway" });
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
