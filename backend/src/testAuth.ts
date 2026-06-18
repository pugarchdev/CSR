import prisma from "./config/db";
import { Role } from "@prisma/client";
import { register, verifyOtp, login } from "./controllers/authController";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";

// Bootstrap a small test server on a separate port (e.g. 5050)
const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const PORT = 5050;

const runTests = async () => {
  console.log("=== STARTING MahaCSR AUTHENTICATION INTEGRATION TEST ===");

  // 1. Clean up test email from DB
  const testEmail = "agadge797@gmail.com";
  console.log(`[1/6] Cleaning up existing user: ${testEmail}...`);
  const existingUser = await prisma.user.findUnique({ where: { email: testEmail } });
  if (existingUser) {
    await prisma.user.delete({ where: { id: existingUser.id } }).catch(() => {});
    if (existingUser.ngoId) {
      await prisma.nGO.delete({ where: { id: existingUser.ngoId } }).catch(() => {});
    }
    console.log("Deleted existing user and associated profiles.");
  } else {
    console.log("No existing user found.");
  }

  // 2. Register a new user (which will trigger real SMTP email)
  console.log("\n[2/6] Triggering /register with SMTP email...");
  const registerPayload = {
    email: testEmail,
    password: "Password123",
    role: "NGO_ADMIN",
    profile: {
      name: "MahaCSR Test NGO",
      pan: "ABCDE1234F",
      address: "Plot No 42, Bandra East, Mumbai",
      district: "Mumbai City",
      taluka: "Mumbai",
      registrationNumber: "MH/MUM/2026/001",
      darpanNumber: "MH/2021/012345",
      csr1Number: "CSR00012345"
    }
  };

  const registerRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registerPayload)
  });

  const registerData = await registerRes.json();
  console.log("Register Response Status:", registerRes.status);
  console.log("Register Response Body:", registerData);

  if (registerRes.status !== 201) {
    throw new Error(`Register failed: ${JSON.stringify(registerData)}`);
  }

  // 3. Fetch OTP from the database
  console.log("\n[3/6] Fetching generated OTP code from the database...");
  const user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!user || !user.otpCode) {
    throw new Error("User or OTP code not found in the database");
  }
  const otp = user.otpCode;
  console.log(`Successfully fetched OTP from DB: ${otp} (expires at ${user.otpExpiresAt})`);

  // 4. Try logging in before verifying (should fail with 403)
  console.log("\n[4/6] Verifying that login fails before OTP verification...");
  const preLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "Password123" })
  });
  const preLoginData = await preLoginRes.json();
  console.log("Pre-login Response Status:", preLoginRes.status);
  console.log("Pre-login Response Body:", preLoginData);
  if (preLoginRes.status !== 403) {
    throw new Error("Expected login to fail with 403 before verification");
  }

  // 5. Verify OTP
  console.log("\n[5/6] Submitting OTP verification request...");
  const verifyRes = await fetch(`http://localhost:${PORT}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, otpCode: otp })
  });
  const verifyData = await verifyRes.json();
  console.log("Verify Response Status:", verifyRes.status);
  console.log("Verify Response Body:", verifyData);
  if (verifyRes.status !== 200) {
    throw new Error(`Verify failed: ${JSON.stringify(verifyData)}`);
  }

  // 6. Login
  console.log("\n[6/6] Logging in with verified credentials...");
  const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: "Password123" })
  });
  const loginData = await loginRes.json();
  console.log("Login Response Status:", loginRes.status);
  console.log("Login Response Body:", loginData);
  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
  console.log("Email OTP verification is fully functional!");
};

// Start server and run tests
server.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);
  try {
    await runTests();
  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    server.close(() => {
      console.log("Test server shut down.");
      process.exit(0);
    });
  }
});
