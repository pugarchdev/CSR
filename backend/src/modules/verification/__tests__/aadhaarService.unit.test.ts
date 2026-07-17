/**
 * Aadhaar verification service unit tests — prisma and axios fully mocked.
 * Includes the privacy invariant: no persisted or logged value ever contains
 * the full Aadhaar number or the OTP.
 */
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

import { generateOtp, verifyOtp } from "../services/aadhaarVerificationService";

// UIDAI test Aadhaar with valid Verhoeff checksum
const VALID_AADHAAR = "999999990019";
const OTP = "123456";

const baseGenerateInput = {
  aadhaarNumber: VALID_AADHAAR,
  entityType: "NGO" as any,
  entityId: "22222222-2222-2222-2222-222222222222",
  initiatedById: "user-1",
  correlationId: "corr-a1",
  source: "nodal"
};

/** Collect every argument object passed to any prisma mock, as JSON. */
const allPersistedJson = (): string => {
  const calls: unknown[] = [];
  for (const model of Object.values(mockPrisma)) {
    if (typeof model !== "object" || model === null) continue;
    for (const fn of Object.values(model)) {
      if (jest.isMockFunction(fn)) calls.push(...fn.mock.calls);
    }
  }
  return JSON.stringify(calls);
};

const setupTransaction = () => {
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
};

beforeEach(() => {
  jest.clearAllMocks();
  setupTransaction();
});

describe("generateOtp", () => {
  it("rejects an Aadhaar number failing the Verhoeff checksum before any API call", async () => {
    await expect(generateOtp({ ...baseGenerateInput, aadhaarNumber: "234123412345" })).rejects.toMatchObject({
      errorCode: "INVALID_AADHAAR",
      statusCode: 400
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("stores only the masked Aadhaar and transitions to OTP_SENT", async () => {
    mockPrisma.verificationRecord.findFirst.mockResolvedValue(null);
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: "rec-a1", attempt: 1 });
    mockPrisma.verificationRecord.update.mockResolvedValue({ id: "rec-a1" });
    mockRequest.mockResolvedValue({ status: 200, data: { txnId: "uidai-txn-1" } });

    const result = await generateOtp(baseGenerateInput);

    expect(result.maskedAadhaar).toBe("XXXX-XXXX-0019");
    expect(result.transactionId).toBe("uidai-txn-1");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // PRIVACY INVARIANT: full Aadhaar number never persisted
    expect(allPersistedJson()).not.toContain(VALID_AADHAAR);

    const createArgs = mockPrisma.verificationRecord.create.mock.calls[0][0];
    expect(createArgs.data.maskedIdentifier).toBe("XXXX-XXXX-0019");
  });

  it("blocks a second OTP request while one is pending", async () => {
    mockPrisma.verificationRecord.findFirst.mockResolvedValue({ id: "pending" });
    await expect(generateOtp(baseGenerateInput)).rejects.toMatchObject({
      errorCode: "VERIFICATION_IN_PROGRESS",
      statusCode: 409
    });
  });
});

describe("verifyOtp", () => {
  const otpSentRecord = {
    id: "rec-a1",
    verificationType: "AADHAAR",
    entityType: "NGO",
    entityId: baseGenerateInput.entityId,
    status: "OTP_SENT",
    maskedIdentifier: "XXXX-XXXX-0019",
    transactionId: "uidai-txn-1",
    initiatedById: "user-1",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    responseData: null,
    encryptedPayload: null
  };

  const verifyInput = {
    recordId: "rec-a1",
    otp: OTP,
    aadhaarNumber: VALID_AADHAAR,
    userId: "user-1",
    isAdmin: false,
    correlationId: "corr-a2"
  };

  it("completes eKYC, stores redacted demographics and encrypted payload, discards photo", async () => {
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({ ...otpSentRecord });
    mockPrisma.verificationRecord.update.mockImplementation(async (args: any) => ({
      id: "rec-a1",
      attempt: 1,
      transactionId: "uidai-txn-1",
      ...args.data
    }));
    mockRequest.mockResolvedValue({
      status: 200,
      data: {
        kycRes: {
          UidData: {
            Poi: { name: "Asha Patil", gender: "F", dob: "01-01-1990" },
            Poa: { state: "Maharashtra", dist: "Mumbai", pc: "400001" },
            Pht: "photobytes"
          }
        }
      }
    });

    const result = await verifyOtp(verifyInput);

    expect(result.status).toBe("SUCCESS");
    expect(result.maskedAadhaar).toBe("XXXX-XXXX-0019");
    expect(result.data.name).toBe("Asha Patil");
    expect(JSON.stringify(result.data)).not.toContain("photobytes");

    // PRIVACY INVARIANT: neither Aadhaar number nor OTP persisted in plaintext
    const persisted = allPersistedJson();
    expect(persisted).not.toContain(VALID_AADHAAR);
    expect(persisted).not.toContain(`"${OTP}"`);
  });

  it("rejects a mismatched Aadhaar number against the stored mask", async () => {
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({ ...otpSentRecord });
    await expect(verifyOtp({ ...verifyInput, aadhaarNumber: "999999990100" })).rejects.toMatchObject({
      errorCode: "INVALID_AADHAAR"
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("rejects when another user tries to verify a record they don't own", async () => {
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({ ...otpSentRecord });
    await expect(verifyOtp({ ...verifyInput, userId: "intruder" })).rejects.toMatchObject({
      errorCode: "RECORD_NOT_OWNED",
      statusCode: 403
    });
  });

  it("marks an expired OTP window as EXPIRED", async () => {
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      ...otpSentRecord,
      expiresAt: new Date(Date.now() - 1000)
    });
    mockPrisma.verificationRecord.update.mockResolvedValue({ id: "rec-a1" });

    await expect(verifyOtp(verifyInput)).rejects.toMatchObject({ errorCode: "OTP_EXPIRED" });

    const expiredUpdate = mockPrisma.verificationRecord.update.mock.calls.find(
      (call: any[]) => call[0].data.status === "EXPIRED"
    );
    expect(expiredUpdate).toBeDefined();
  });

  it("returns attemptsLeft on a wrong OTP and fails hard on the 3rd strike", async () => {
    const axios = jest.requireActual("axios");
    const wrongOtpError = new axios.AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 400,
      data: { errorCode: "OTP_MISMATCH" }
    } as any);

    // Attempt 1
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({ ...otpSentRecord, responseData: null });
    mockPrisma.verificationRecord.update.mockResolvedValue({ id: "rec-a1" });
    mockRequest.mockRejectedValue(wrongOtpError);
    await expect(verifyOtp(verifyInput)).rejects.toMatchObject({
      errorCode: "INVALID_OTP",
      meta: { attemptsLeft: 2 }
    });

    // Attempt 3 (attemptsUsed = 2 already)
    mockPrisma.verificationRecord.findUnique.mockResolvedValue({
      ...otpSentRecord,
      responseData: { otpAttemptsUsed: 2 }
    });
    await expect(verifyOtp(verifyInput)).rejects.toMatchObject({
      errorCode: "OTP_ATTEMPTS_EXCEEDED",
      meta: { attemptsLeft: 0 }
    });

    const failedUpdate = mockPrisma.verificationRecord.update.mock.calls.find(
      (call: any[]) => call[0].data.status === "FAILED"
    );
    expect(failedUpdate![0].data.errorCode).toBe("OTP_ATTEMPTS_EXCEEDED");
  });

  it("404s for an unknown record", async () => {
    mockPrisma.verificationRecord.findUnique.mockResolvedValue(null);
    await expect(verifyOtp(verifyInput)).rejects.toMatchObject({ errorCode: "RECORD_NOT_FOUND", statusCode: 404 });
  });
});
