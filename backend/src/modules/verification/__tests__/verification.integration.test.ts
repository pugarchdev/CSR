/**
 * Integration tests: full middleware chain (auth → tenant → permission →
 * rate limit → zod validation → controller) via supertest on the mounted
 * verification router. Prisma and axios are mocked.
 */
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

const mockPrisma = {
  tenant: { findUnique: jest.fn() },
  tenantFeature: { findUnique: jest.fn() },
  userOrganizationRole: { findMany: jest.fn().mockResolvedValue([]) },
  verificationRecord: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn()
  },
  verificationCheck: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn(),
  $queryRaw: jest.fn().mockResolvedValue([])
};

jest.mock("../../../config/db", () => ({ __esModule: true, default: mockPrisma }));

const mockRequest = jest.fn();
jest.mock("axios", () => {
  const actual = jest.requireActual("axios");
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      create: jest.fn(() => ({ request: mockRequest })),
      isAxiosError: actual.default.isAxiosError
    },
    isAxiosError: actual.isAxiosError
  };
});

import verificationRoutes from "../index";
import { errorHandler } from "../../../middlewares/errorMiddleware";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/verification", verificationRoutes);
  app.use(errorHandler);
  return app;
};

const token = (payload: Record<string, unknown>) =>
  jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "15m" });

const superAdminToken = token({ id: "admin-1", email: "admin@test.in", role: "SUPER_ADMIN", tenantId: "tenant-1" });
const corporateToken = token({ id: "corp-1", email: "corp@test.in", role: "CORPORATE_USER", tenantId: "tenant-1", companyId: "33333333-3333-3333-3333-333333333333" });
const ngoToken = token({ id: "ngo-1", email: "ngo@test.in", role: "CORPORATE_USER", tenantId: "tenant-1" });

const ENTITY_ID = "44444444-4444-4444-4444-444444444444";
const GSTIN = "27AAPFU0939F1ZV";

const activeTenant = { id: "tenant-1", status: "ACTIVE", isHidden: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.tenant.findUnique.mockResolvedValue(activeTenant);
  mockPrisma.userOrganizationRole.findMany.mockResolvedValue([]);
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
});

const setupSuccessfulGstCall = () => {
  mockPrisma.verificationRecord.findFirst.mockResolvedValue(null);
  mockPrisma.verificationRecord.create.mockResolvedValue({ id: "rec-1", attempt: 1 });
  mockPrisma.verificationRecord.findUnique.mockResolvedValue({
    id: "rec-1",
    entityType: "ORGANIZATION",
    entityId: ENTITY_ID,
    verificationType: "GST",
    transactionId: null,
    encryptedPayload: null,
    expiresAt: null
  });
  mockPrisma.verificationRecord.update.mockImplementation(async (args: any) => ({
    id: "rec-1",
    attempt: 1,
    transactionId: "txn-1",
    verifiedAt: new Date(),
    ...args.data
  }));
  mockRequest.mockResolvedValue({
    status: 200,
    data: { data: { lgnm: "ACME FOUNDATION", sts: "Active" }, txnId: "txn-1" }
  });
};

describe("POST /api/verification/gst/verify", () => {
  it("401s without a token", async () => {
    const res = await request(buildApp())
      .post("/api/verification/gst/verify")
      .send({ gstin: GSTIN, entityType: "ORGANIZATION", entityId: ENTITY_ID });
    expect(res.status).toBe(401);
  });

  it("403s for a role without verification:execute", async () => {
    const res = await request(buildApp())
      .post("/api/verification/gst/verify")
      .set("Authorization", `Bearer ${ngoToken}`)
      .send({ gstin: GSTIN, entityType: "ORGANIZATION", entityId: ENTITY_ID });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("verification:execute");
  });

  it("400s on invalid GSTIN format via zod, without touching the API", async () => {
    const res = await request(buildApp())
      .post("/api/verification/gst/verify")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ gstin: "BADGSTIN", entityType: "ORGANIZATION", entityId: ENTITY_ID });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("verifies successfully, returns envelope + data, echoes X-Request-Id, writes audit", async () => {
    setupSuccessfulGstCall();
    const res = await request(buildApp())
      .post("/api/verification/gst/verify")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ gstin: GSTIN, entityType: "ORGANIZATION", entityId: ENTITY_ID, source: "admin" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("SUCCESS");
    expect(res.body.data.data.legalName).toBe("ACME FOUNDATION");
    expect(res.headers["x-request-id"]).toBeTruthy();

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "VERIFICATION_GST_VERIFY",
          entityType: "VerificationRecord"
        })
      })
    );
  });

  it("allows CORPORATE_USER to verify (static permission map)", async () => {
    setupSuccessfulGstCall();
    const res = await request(buildApp())
      .post("/api/verification/gst/verify")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ gstin: GSTIN, entityType: "COMPANY", entityId: ENTITY_ID });
    expect(res.status).toBe(200);
  });

  it("409s with errorCode ALREADY_VERIFIED on duplicate verify", async () => {
    mockPrisma.verificationRecord.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "latest", status: "SUCCESS", maskedIdentifier: GSTIN });
    const res = await request(buildApp())
      .post("/api/verification/gst/verify")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ gstin: GSTIN, entityType: "ORGANIZATION", entityId: ENTITY_ID });
    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe("ALREADY_VERIFIED");
  });
});

describe("POST /api/verification/gst/reverify", () => {
  it("403s for CORPORATE_USER (cannot override verification results)", async () => {
    const res = await request(buildApp())
      .post("/api/verification/gst/reverify")
      .set("Authorization", `Bearer ${corporateToken}`)
      .send({ gstin: GSTIN, entityType: "COMPANY", entityId: ENTITY_ID, reason: "GST details changed" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("verification:reverify");
  });

  it("400s without a reason", async () => {
    const res = await request(buildApp())
      .post("/api/verification/gst/reverify")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ gstin: GSTIN, entityType: "COMPANY", entityId: ENTITY_ID });
    expect(res.status).toBe(400);
  });

  it("succeeds for SUPER_ADMIN even when already verified", async () => {
    setupSuccessfulGstCall();
    const res = await request(buildApp())
      .post("/api/verification/gst/reverify")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ gstin: GSTIN, entityType: "COMPANY", entityId: ENTITY_ID, reason: "Periodic re-check" });
    expect(res.status).toBe(200);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "VERIFICATION_GST_REVERIFY" })
      })
    );
  });
});

describe("GET /api/verification/gst/history/:id", () => {
  it("returns history without encryptedPayload fields", async () => {
    mockPrisma.verificationRecord.findMany.mockResolvedValue([
      {
        id: "rec-2", status: "SUCCESS", attempt: 2, isLatest: true, maskedIdentifier: GSTIN,
        initiatedBy: { id: "admin-1", email: "admin@test.in", role: "SUPER_ADMIN" }
      },
      {
        id: "rec-1", status: "FAILED", attempt: 1, isLatest: false, maskedIdentifier: GSTIN,
        initiatedBy: { id: "admin-1", email: "admin@test.in", role: "SUPER_ADMIN" }
      }
    ]);
    const res = await request(buildApp())
      .get(`/api/verification/gst/history/${ENTITY_ID}?entityType=ORGANIZATION`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toContain("encryptedPayload");
    // select excludes encryptedPayload at the DB layer
    const selectArg = mockPrisma.verificationRecord.findMany.mock.calls[0][0].select;
    expect(selectArg.encryptedPayload).toBeUndefined();
  });
});

describe("Aadhaar endpoints", () => {
  const VALID_AADHAAR = "999999990019";

  it("400s when consent is not given", async () => {
    const res = await request(buildApp())
      .post("/api/verification/aadhaar/generate-otp")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ aadhaarNumber: VALID_AADHAAR, entityType: "NGO", entityId: ENTITY_ID });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.details)).toContain("consent");
  });

  it("generate-otp → verify-otp happy path; responses never contain the full Aadhaar", async () => {
    const VALID_RECORD_ID = "11111111-2222-3333-4444-555555555555";
    mockPrisma.verificationRecord.findFirst.mockResolvedValue(null);
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: VALID_RECORD_ID, attempt: 1 });
    mockPrisma.verificationRecord.update.mockImplementation(async (args: any) => ({ id: VALID_RECORD_ID, ...args.data }));
    mockRequest.mockResolvedValue({ status: 200, data: { txnId: "uidai-txn-1" } });

    const genRes = await request(buildApp())
      .post("/api/verification/aadhaar/generate-otp")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ aadhaarNumber: VALID_AADHAAR, entityType: "NGO", entityId: ENTITY_ID, consent: true, source: "nodal" });

    expect(genRes.status).toBe(200);
    expect(genRes.body.data.maskedAadhaar).toBe("XXXX-XXXX-0019");
    expect(JSON.stringify(genRes.body)).not.toContain(VALID_AADHAAR);

    // verify-otp
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      id: VALID_RECORD_ID,
      verificationType: "AADHAAR",
      entityType: "NGO",
      entityId: ENTITY_ID,
      status: "OTP_SENT",
      maskedIdentifier: "XXXX-XXXX-0019",
      transactionId: "uidai-txn-1",
      initiatedById: "admin-1",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      responseData: null,
      encryptedPayload: null
    });
    mockRequest.mockResolvedValue({
      status: 200,
      data: { kycRes: { UidData: { Poi: { name: "Asha Patil", gender: "F", dob: "01-01-1990" } } } }
    });

    const verRes = await request(buildApp())
      .post("/api/verification/aadhaar/verify-otp")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ recordId: VALID_RECORD_ID, otp: "123456", aadhaarNumber: VALID_AADHAAR });

    expect(verRes.status).toBe(200);
    expect(verRes.body.data.status).toBe("SUCCESS");
    expect(verRes.body.data.data.name).toBe("Asha Patil");
    expect(JSON.stringify(verRes.body)).not.toContain(VALID_AADHAAR);
  });

  it("status endpoint 403s for a non-owner non-admin", async () => {
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      id: "11111111-2222-3333-4444-555555555555",
      verificationType: "AADHAAR",
      initiatedById: "someone-else",
      status: "OTP_SENT",
      maskedIdentifier: "XXXX-XXXX-0019"
    });
    const res = await request(buildApp())
      .get("/api/verification/aadhaar/status/55555555-5555-5555-5555-555555555555")
      .set("Authorization", `Bearer ${corporateToken}`);
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe("RECORD_NOT_OWNED");
  });
});

describe("GET /api/verification/dashboard/stats", () => {
  it("403s for CORPORATE_USER", async () => {
    const res = await request(buildApp())
      .get("/api/verification/dashboard/stats")
      .set("Authorization", `Bearer ${corporateToken}`);
    expect(res.status).toBe(403);
  });

  it("returns aggregated stats for SUPER_ADMIN", async () => {
    mockPrisma.verificationRecord.groupBy.mockResolvedValue([
      { verificationType: "GST", status: "SUCCESS", _count: { _all: 8 } },
      { verificationType: "GST", status: "FAILED", _count: { _all: 2 } },
      { verificationType: "AADHAAR", status: "SUCCESS", _count: { _all: 5 } }
    ]);
    mockPrisma.verificationRecord.aggregate.mockResolvedValue({ _avg: { responseTimeMs: 812.4 } });

    const res = await request(buildApp())
      .get("/api/verification/dashboard/stats")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totals).toEqual({ all: 15, gst: 10, aadhaar: 5, gstVerified: 8, aadhaarVerified: 5 });
    expect(res.body.data.successRate).toBe(86.7);
    expect(res.body.data.avgResponseTimeMs).toBe(812);
  });
});

describe("Rate limiting", () => {
  it("429s after 5 GST verify requests in a minute from one client", async () => {
    const app = buildApp();
    mockPrisma.verificationRecord.findFirst.mockResolvedValue(null);
    mockPrisma.verificationRecord.create.mockRejectedValue(new Error("short-circuit"));

    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/api/verification/gst/verify")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .set("x-test-rate-limit", "gst-verify-limit-test")
        .send({ gstin: GSTIN, entityType: "ORGANIZATION", entityId: ENTITY_ID });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
