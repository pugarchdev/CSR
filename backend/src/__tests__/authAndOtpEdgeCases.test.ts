import { sendOtp, verifyOtp, assertOtpVerified } from "../services/otpService";
import bcrypt from "bcryptjs";

jest.mock("../config/db", () => {
  const mockOtpStore: any[] = [];
  return {
    __esModule: true,
    default: {
      otpVerification: {
        count: jest.fn().mockImplementation(async ({ where }) => {
          if (where?.createdAt?.gte) {
            return mockOtpStore.filter(
              (o) => o.identifier === where.identifier && o.createdAt >= where.createdAt.gte
            ).length;
          }
          return mockOtpStore.filter((o) => o.identifier === where?.identifier).length;
        }),
        create: jest.fn().mockImplementation(async ({ data }) => {
          const record = {
            id: `otp-${Date.now()}-${Math.random()}`,
            identifier: data.identifier,
            otpHash: data.otpHash,
            expiresAt: data.expiresAt,
            verified: false,
            attempts: 0,
            createdAt: new Date(),
          };
          mockOtpStore.push(record);
          return record;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          return mockOtpStore
            .filter((o) => {
              if (o.identifier !== where.identifier) return false;
              if (where.verified !== undefined && o.verified !== where.verified) return false;
              if (where.expiresAt?.gt && o.expiresAt <= where.expiresAt.gt) return false;
              return true;
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const item = mockOtpStore.find((o) => o.id === where.id);
          if (item) {
            if (data.attempts?.increment) item.attempts += data.attempts.increment;
            if (data.verified !== undefined) item.verified = data.verified;
          }
          return item;
        }),
      },
    },
    mockOtpStore,
  };
});

describe("Auth & OTP Service Edge Cases Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Target Validation & Normalization", () => {
    it("should reject invalid email formats", async () => {
      await expect(sendOtp("CORPORATE_ENQUIRY", "EMAIL", "invalid-email")).rejects.toThrow(
        "Valid email is required"
      );
    });

    it("should reject invalid mobile number formats", async () => {
      await expect(sendOtp("CORPORATE_ENQUIRY", "MOBILE", "12345")).rejects.toThrow(
        "Valid 10-digit mobile number is required"
      );
      await expect(sendOtp("CORPORATE_ENQUIRY", "MOBILE", "5999999999")).rejects.toThrow(
        "Valid 10-digit mobile number is required"
      );
    });

    it("should normalize email (lowercase, trim) and mobile (digits only)", async () => {
      const emailResult = await sendOtp("CORPORATE_ENQUIRY", "EMAIL", "  TestUser@Example.COM ");
      expect(emailResult.expiresInMinutes).toBe(10);

      const mobileResult = await sendOtp("CORPORATE_ENQUIRY", "MOBILE", "98765-43210");
      expect(mobileResult.expiresInMinutes).toBe(10);
    });
  });

  describe("OTP Expiry & Attempt Lockout Controls", () => {
    it("should reject verification when OTP record is expired", async () => {
      await expect(
        verifyOtp("CORPORATE_ENQUIRY", "EMAIL", "expired@example.com", "123456")
      ).rejects.toThrow("OTP expired or not found");
    });

    it("should fail verification with wrong OTP and increment attempt counter", async () => {
      await sendOtp("CORPORATE_ENQUIRY", "EMAIL", "retry@example.com");

      await expect(
        verifyOtp("CORPORATE_ENQUIRY", "EMAIL", "retry@example.com", "000000")
      ).rejects.toThrow("Invalid OTP.");
    });

    it("should enforce maximum 5 invalid attempts lockout", async () => {
      await sendOtp("CORPORATE_ENQUIRY", "EMAIL", "lockout@example.com");

      const db = require("../config/db").default;
      const record = await db.otpVerification.findFirst({
        where: { identifier: "CORPORATE_ENQUIRY:EMAIL:lockout@example.com" },
      });
      record.attempts = 5;

      await expect(
        verifyOtp("CORPORATE_ENQUIRY", "EMAIL", "lockout@example.com", "123456")
      ).rejects.toThrow("Too many invalid OTP attempts");
    });

    it("should successfully verify with correct OTP and return verification token", async () => {
      await sendOtp("CORPORATE_ENQUIRY", "EMAIL", "success@example.com");

      const res = await verifyOtp("CORPORATE_ENQUIRY", "EMAIL", "success@example.com", "123456");
      expect(res).toHaveProperty("verificationToken");
      expect(typeof res.verificationToken).toBe("string");
      expect(res.verificationToken.length).toBe(64); // 32 hex bytes
    });
  });

  describe("OTP Assertion Enforcement", () => {
    it("should throw error if token is missing", async () => {
      await expect(
        assertOtpVerified("CORPORATE_ENQUIRY", "EMAIL", "test@example.com")
      ).rejects.toThrow("EMAIL OTP verification is required");
    });

    it("should throw error if OTP was never verified", async () => {
      await expect(
        assertOtpVerified("CORPORATE_ENQUIRY", "EMAIL", "unverified@example.com", "fake-token")
      ).rejects.toThrow("OTP verification record expired or missing");
    });

    it("should pass assertion if OTP was successfully verified", async () => {
      await sendOtp("CORPORATE_ENQUIRY", "EMAIL", "passed@example.com");
      const { verificationToken } = await verifyOtp("CORPORATE_ENQUIRY", "EMAIL", "passed@example.com", "123456");

      await expect(
        assertOtpVerified("CORPORATE_ENQUIRY", "EMAIL", "passed@example.com", verificationToken)
      ).resolves.not.toThrow();
    });
  });
});
