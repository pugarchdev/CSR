import { encryptPayload, decryptPayload, isEncryptionConfigured } from "../utils/crypto";

describe("AES-256-GCM payload encryption", () => {
  it("is configured in the test environment", () => {
    expect(isEncryptionConfigured()).toBe(true);
  });

  it("round-trips a JSON payload", () => {
    const payload = JSON.stringify({ name: "Test", nested: { value: 42 } });
    const encrypted = encryptPayload(payload);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted).not.toContain("Test");
    expect(decryptPayload(encrypted)).toBe(payload);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const a = encryptPayload("same");
    const b = encryptPayload("same");
    expect(a).not.toBe(b);
    expect(decryptPayload(a)).toBe("same");
    expect(decryptPayload(b)).toBe("same");
  });

  it("rejects tampered ciphertext (auth tag)", () => {
    const encrypted = encryptPayload("sensitive");
    const parts = encrypted.split(":");
    const ct = Buffer.from(parts[3], "base64");
    ct[0] = ct[0] ^ 0xff;
    parts[3] = ct.toString("base64");
    expect(() => decryptPayload(parts.join(":"))).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => decryptPayload("not-encrypted")).toThrow("Invalid encrypted payload format");
    expect(() => decryptPayload("v2:a:b:c")).toThrow("Invalid encrypted payload format");
  });

  it("fails clearly when the key is missing", () => {
    const original = process.env.VERIFICATION_ENCRYPTION_KEY;
    process.env.VERIFICATION_ENCRYPTION_KEY = "";
    try {
      expect(isEncryptionConfigured()).toBe(false);
      expect(() => encryptPayload("x")).toThrow("VERIFICATION_ENCRYPTION_KEY is not configured");
    } finally {
      process.env.VERIFICATION_ENCRYPTION_KEY = original;
    }
  });

  it("fails clearly when the key is not 64 hex chars", () => {
    const original = process.env.VERIFICATION_ENCRYPTION_KEY;
    process.env.VERIFICATION_ENCRYPTION_KEY = "tooshort";
    try {
      expect(() => encryptPayload("x")).toThrow("64 hex characters");
    } finally {
      process.env.VERIFICATION_ENCRYPTION_KEY = original;
    }
  });
});
