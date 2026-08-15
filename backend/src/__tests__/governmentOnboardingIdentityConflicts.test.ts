import { registerMainGovernmentOrganization, requestGovernmentOnboardingOtp } from "../controllers/governmentOnboardingController";
import prisma from "../config/db";
import { sendOtp, verifyOtp } from "../services/otpService";

jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    user: { findFirst: jest.fn() },
    organization: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  },
}));

jest.mock("../services/otpService", () => ({
  OtpSendLimitError: class OtpSendLimitError extends Error {},
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock("../services/emailService", () => ({ sendUserInvitationEmail: jest.fn() }));
jest.mock("bcryptjs", () => ({ __esModule: true, default: { hash: jest.fn().mockResolvedValue("password-hash") } }));

const mockFindFirst = prisma.user.findFirst as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;
const mockSendOtp = sendOtp as jest.Mock;
const mockVerifyOtp = verifyOtp as jest.Mock;

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
}

function registrationBody(overrides: Record<string, unknown> = {}) {
  return {
    governmentType: "COLLECTORATE",
    organizationName: "Collector Office Pune",
    district: "Pune",
    address: "Pune",
    head: { name: "Head Officer", email: "head@gov.in", mobile: "9876543210" },
    nodal: { name: "Nodal Officer", email: "nodal@gov.in", mobile: "9876543211", designation: "Nodal Officer" },
    otp: "123456",
    ...overrides,
  };
}

describe("Government onboarding identity conflict handling", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects an existing Head email before sending an OTP", async () => {
    mockFindFirst.mockResolvedValue({ id: "existing-user" });
    const res = response();

    await requestGovernmentOnboardingOtp({ body: { headEmail: "head@gov.in" } } as any, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("rejects a duplicate mobile before consuming the OTP", async () => {
    mockFindFirst.mockResolvedValue({ email: "existing@gov.in", mobile: "9876543210" });
    const res = response();

    await registerMainGovernmentOrganization({ body: registrationBody() } as any, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("already linked") }));
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects the same mobile for Head and Nodal Officer before querying or consuming the OTP", async () => {
    const body = registrationBody();
    body.nodal.mobile = body.head.mobile;
    const res = response();

    await registerMainGovernmentOrganization({ body } as any, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("converts a transaction-level mobile race into a safe conflict response", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockVerifyOtp.mockResolvedValue({ verificationToken: "verified" });
    mockTransaction.mockRejectedValue({ code: "P2002", meta: { target: ["mobile"] } });
    const res = response();
    const next = jest.fn();

    await registerMainGovernmentOrganization({ body: registrationBody() } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.not.stringContaining("prisma.user.create") }));
    expect(next).not.toHaveBeenCalled();
  });

  it("converts an expired transaction into a retryable response without leaking Prisma details", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockVerifyOtp.mockResolvedValue({ verificationToken: "verified" });
    mockTransaction.mockRejectedValue({ code: "P2028", meta: { error: "Transaction already closed: expired transaction timeout" } });
    const res = response();
    const next = jest.fn();

    await registerMainGovernmentOrganization({ body: registrationBody() } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining("press Verify again") });
    expect(next).not.toHaveBeenCalled();
  });
});
