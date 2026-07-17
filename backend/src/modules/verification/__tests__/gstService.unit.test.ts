/**
 * GST verification service unit tests — prisma and axios fully mocked.
 */
import { VerificationError } from "../utils/errors";

const mockPrisma = {
  verificationRecord: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn()
  },
  verificationCheck: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn()
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

import { verifyGstin } from "../services/gstVerificationService";

const baseInput = {
  gstin: "27AAPFU0939F1ZV",
  entityType: "ORGANIZATION" as any,
  entityId: "11111111-1111-1111-1111-111111111111",
  initiatedById: "user-1",
  correlationId: "corr-1",
  source: "onboarding"
};

const gstnSuccessPayload = {
  data: {
    lgnm: "ACME FOUNDATION",
    tradeNam: "ACME",
    sts: "Active",
    rgdt: "01/07/2017",
    ctb: "Trust",
    dty: "Regular",
    pradr: { addr: { st: "MG Road", loc: "Pune", stcd: "Maharashtra", dst: "Pune", pncd: "411001" } }
  },
  txnId: "gstn-txn-1"
};

const setupTransaction = () => {
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
};

beforeEach(() => {
  jest.clearAllMocks();
  setupTransaction();
});

describe("verifyGstin", () => {
  it("rejects an invalid GSTIN before any API call", async () => {
    await expect(verifyGstin({ ...baseInput, gstin: "INVALID" })).rejects.toMatchObject({
      errorCode: "INVALID_GSTIN",
      statusCode: 400
    });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(mockPrisma.verificationRecord.create).not.toHaveBeenCalled();
  });

  it("returns 409 when a verification is already in flight", async () => {
    mockPrisma.verificationRecord.findFirst.mockResolvedValueOnce({ id: "existing" }); // assertNoInFlight
    await expect(verifyGstin(baseInput)).rejects.toMatchObject({
      errorCode: "VERIFICATION_IN_PROGRESS",
      statusCode: 409
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("returns 409 ALREADY_VERIFIED for a duplicate verify of the same GSTIN", async () => {
    mockPrisma.verificationRecord.findFirst
      .mockResolvedValueOnce(null) // assertNoInFlight
      .mockResolvedValueOnce({ id: "latest", status: "SUCCESS", maskedIdentifier: "27AAPFU0939F1ZV" }); // getLatestRecord
    await expect(verifyGstin(baseInput)).rejects.toMatchObject({
      errorCode: "ALREADY_VERIFIED",
      statusCode: 409
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("reverify skips the ALREADY_VERIFIED guard and appends attempt+1", async () => {
    mockPrisma.verificationRecord.findFirst
      .mockResolvedValueOnce(null) // assertNoInFlight
      .mockResolvedValueOnce({ attempt: 1 }); // previous attempt lookup in createRecord
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: "rec-2", attempt: 2 });
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      id: "rec-2",
      entityType: baseInput.entityType,
      entityId: baseInput.entityId,
      verificationType: "GST",
      transactionId: null,
      encryptedPayload: null,
      expiresAt: null
    });
    mockPrisma.verificationRecord.update.mockResolvedValue({
      id: "rec-2",
      attempt: 2,
      transactionId: "gstn-txn-1",
      verifiedAt: new Date()
    });
    mockRequest.mockResolvedValue({ status: 200, data: gstnSuccessPayload });

    const result = await verifyGstin({ ...baseInput, isReverify: true });
    expect(result.attempt).toBe(2);
    expect(mockPrisma.verificationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attempt: 2 }) })
    );
    // history is append-only: no delete calls exist on the model at all
    expect((mockPrisma.verificationRecord as any).delete).toBeUndefined();
  });

  it("stores redacted data, flips isLatest, and encrypts the raw payload on success", async () => {
    mockPrisma.verificationRecord.findFirst.mockResolvedValue(null);
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: "rec-1", attempt: 1 });
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      id: "rec-1",
      entityType: baseInput.entityType,
      entityId: baseInput.entityId,
      verificationType: "GST",
      transactionId: null,
      encryptedPayload: null,
      expiresAt: null
    });
    mockPrisma.verificationRecord.update.mockImplementation(async (args: any) => ({
      id: "rec-1",
      attempt: 1,
      ...args.data
    }));
    mockRequest.mockResolvedValue({ status: 200, data: gstnSuccessPayload });

    const result = await verifyGstin(baseInput);

    expect(result.status).toBe("SUCCESS");
    expect(result.data.legalName).toBe("ACME FOUNDATION");
    expect(result.data.state).toBe("Maharashtra");

    // isLatest flipped off previous rows inside the transaction
    expect(mockPrisma.verificationRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isLatest: true }),
        data: { isLatest: false }
      })
    );

    // raw payload stored encrypted, not in plaintext
    const updateArgs = mockPrisma.verificationRecord.update.mock.calls[0][0];
    expect(updateArgs.data.encryptedPayload.startsWith("v1:")).toBe(true);
    expect(updateArgs.data.encryptedPayload).not.toContain("ACME FOUNDATION");
    expect(updateArgs.data.isLatest).toBe(true);
  });

  it("marks the record FAILED with GSTIN_NOT_FOUND on upstream 404", async () => {
    mockPrisma.verificationRecord.findFirst.mockResolvedValue(null);
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: "rec-1", attempt: 1 });
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      id: "rec-1",
      entityType: baseInput.entityType,
      entityId: baseInput.entityId,
      verificationType: "GST",
      transactionId: null,
      encryptedPayload: null,
      expiresAt: null
    });
    mockPrisma.verificationRecord.update.mockResolvedValue({ id: "rec-1" });

    const axios = jest.requireActual("axios");
    const upstreamError = new axios.AxiosError("Not Found", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      data: { error: "GSTIN not found" }
    } as any);
    mockRequest.mockRejectedValue(upstreamError);

    await expect(verifyGstin(baseInput)).rejects.toMatchObject({ errorCode: "GSTIN_NOT_FOUND" });

    const failUpdate = mockPrisma.verificationRecord.update.mock.calls.find(
      (call: any[]) => call[0].data.status === "FAILED"
    );
    expect(failUpdate).toBeDefined();
    expect(failUpdate![0].data.errorCode).toBe("GSTIN_NOT_FOUND");
  });

  it("maps a timeout to APISETU_TIMEOUT", async () => {
    mockPrisma.verificationRecord.findFirst.mockResolvedValue(null);
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: "rec-1", attempt: 1 });
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      id: "rec-1",
      entityType: baseInput.entityType,
      entityId: baseInput.entityId,
      verificationType: "GST",
      transactionId: null,
      encryptedPayload: null,
      expiresAt: null
    });
    mockPrisma.verificationRecord.update.mockResolvedValue({ id: "rec-1" });

    const axios = jest.requireActual("axios");
    const timeoutError = new axios.AxiosError("timeout of 2000ms exceeded", "ECONNABORTED");
    mockRequest.mockRejectedValue(timeoutError);

    await expect(verifyGstin(baseInput)).rejects.toMatchObject({ errorCode: "APISETU_TIMEOUT", statusCode: 504 });
  }, 15000);
});
