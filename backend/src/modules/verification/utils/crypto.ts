import crypto from "crypto";
import { getVerificationEncryptionKey } from "../../../config/env";

/**
 * AES-256-GCM encryption for sensitive verification payloads at rest.
 * Format: v1:<ivBase64>:<authTagBase64>:<ciphertextBase64>
 * Key: VERIFICATION_ENCRYPTION_KEY env var, 64 hex chars (32 bytes).
 */

const VERSION = "v1";
const IV_LENGTH = 12;

const getKey = (): Buffer => {
  const hexKey = getVerificationEncryptionKey();
  if (!hexKey) {
    throw new Error("VERIFICATION_ENCRYPTION_KEY is not configured");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error("VERIFICATION_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(hexKey, "hex");
};

export const isEncryptionConfigured = (): boolean => {
  const hexKey = getVerificationEncryptionKey();
  return /^[0-9a-fA-F]{64}$/.test(hexKey);
};

export const encryptPayload = (plaintext: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
};

export const decryptPayload = (encrypted: string): string => {
  const parts = encrypted.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Invalid encrypted payload format");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8");
};
