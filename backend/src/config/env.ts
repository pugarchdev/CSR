/**
 * Centralized environment access + production hardening.
 *
 * In production the security-critical secrets (JWT signing keys and the
 * verification-record encryption key) MUST be set to real, non-default values.
 * A running instance that silently falls back to a committed dev secret is a
 * severe vulnerability, so `assertProductionEnv` throws on startup instead.
 */

const requiredInProduction = [
  "DATABASE_URL"
];

export const isProduction = process.env.NODE_ENV === "production";

// Committed dev fallbacks. Treated as "unset" in production so a leaked
// default can never be used to sign tokens or decrypt verification records.
const DEV_JWT_SECRET = "dev_only_mahacsr_access_secret";
const DEV_JWT_REFRESH_SECRET = "dev_only_mahacsr_refresh_secret";
const DEV_VERIFICATION_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * Secrets that must be present AND non-default in production. Each entry pairs
 * the env var with its forbidden dev default (if any).
 */
const mandatoryProductionSecrets: { key: string; devDefault?: string }[] = [
  { key: "JWT_SECRET", devDefault: DEV_JWT_SECRET },
  { key: "JWT_REFRESH_SECRET", devDefault: DEV_JWT_REFRESH_SECRET },
  { key: "VERIFICATION_ENCRYPTION_KEY", devDefault: DEV_VERIFICATION_ENCRYPTION_KEY }
];

export const assertProductionEnv = () => {
  if (!isProduction) return;

  const problems: string[] = [];

  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      problems.push(`${key} is required in production but is not set`);
    }
  }

  for (const { key, devDefault } of mandatoryProductionSecrets) {
    const value = process.env[key];
    if (!value) {
      problems.push(`${key} is required in production but is not set`);
    } else if (devDefault && value === devDefault) {
      problems.push(`${key} must not use the committed dev default value in production`);
    }
  }

  // VERIFICATION_ENCRYPTION_KEY must be 64 hex chars (32 bytes) for AES-256.
  const encKey = process.env.VERIFICATION_ENCRYPTION_KEY;
  if (encKey && encKey !== DEV_VERIFICATION_ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(encKey)) {
    problems.push("VERIFICATION_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)");
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to start in production with insecure configuration:\n - ${problems.join("\n - ")}`
    );
  }
};

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (isProduction && (!secret || secret === DEV_JWT_SECRET)) {
    // assertProductionEnv should have caught this at startup; throw defensively.
    throw new Error("JWT_SECRET is not securely configured in production");
  }
  return secret || DEV_JWT_SECRET;
};

export const getJwtRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (isProduction && (!secret || secret === DEV_JWT_REFRESH_SECRET)) {
    throw new Error("JWT_REFRESH_SECRET is not securely configured in production");
  }
  return secret || DEV_JWT_REFRESH_SECRET;
};

export const getPrimaryFrontendUrl = () => {
  const defaultProdUrl = "https://csr-seven.vercel.app";
  const rawBase = process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.PORTAL_URL || (isProduction ? defaultProdUrl : "http://localhost:3000");
  return rawBase.split(",")[0].trim().replace(/\/+$/, "");
};

export const getAllowedOrigins = () => {
  const list: string[] = [];

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    list.push(...frontendUrl.split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean));
  }

  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    list.push(...origins.split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean));
  }

  if (list.length > 0) {
    return list;
  }

  return [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://csr-seven.vercel.app",
    "https://pugarch-csr.vercel.app"
  ];
};

export const getApiSetuConfig = () => {
  const apiKeyValue = process.env.APISETU_API_KEY || process.env.GST_APISETU_APIKEY || process.env.GST_API_KEY || "";
  const clientIdValue = process.env.APISETU_CLIENT_ID || process.env.GST_APISETU_CLIENTID || "in.pugarch";
  const rawBase = (process.env.APISETU_BASE_URL || "https://apisetu.gov.in").trim().replace(/\/+$/, "");

  let defaultGstEndpoint = "/partner/api/v2/gstn/taxpayers/{gstin}";
  let defaultAadhaarOtpEndpoint = "/partner/api/v2/aadhaar/otp";
  let defaultAadhaarVerifyEndpoint = "/partner/api/v2/aadhaar/verify";

  if (rawBase.endsWith("/partner/api")) {
    defaultGstEndpoint = "/v2/gstn/taxpayers/{gstin}";
    defaultAadhaarOtpEndpoint = "/v2/aadhaar/otp";
    defaultAadhaarVerifyEndpoint = "/v2/aadhaar/verify";
  }

  return {
    baseUrl: rawBase,
    requestTimeoutMs: Number(process.env.APISETU_REQUEST_TIMEOUT) || 10000,
    clientId: clientIdValue.trim(),
    apiKeys: apiKeyValue.split(",").map(k => k.trim().replace(/^["']|["']$/g, "")).filter(Boolean),
    maxRetries: Number(process.env.APISETU_MAX_RETRIES) || 2,
    aadhaarGenerateOtpEndpoint: process.env.APISETU_AADHAAR_GENERATE_OTP_ENDPOINT || defaultAadhaarOtpEndpoint,
    aadhaarVerifyOtpEndpoint: process.env.APISETU_AADHAAR_VERIFY_OTP_ENDPOINT || defaultAadhaarVerifyEndpoint,
    gstVerifyEndpoint: process.env.APISETU_GST_URL || process.env.APISETU_GST_VERIFY_ENDPOINT || defaultGstEndpoint,
    allowFallback: process.env.APISETU_ALLOW_FALLBACK !== "false"
  };
};

export const getVerificationEncryptionKey = () => {
  const key = process.env.VERIFICATION_ENCRYPTION_KEY;
  if (isProduction && (!key || key === DEV_VERIFICATION_ENCRYPTION_KEY)) {
    throw new Error("VERIFICATION_ENCRYPTION_KEY is not securely configured in production");
  }
  // Never silently encrypt sensitive records with a committed development key.
  // The crypto module will fail closed with a clear configuration error.
  return key || "";
};

/**
 * Shared secret for external cron callers (e.g. Vercel Cron) to trigger the
 * SLA escalation sweep without a user JWT. Required whenever the cron endpoint
 * is used in production.
 */
export const getCronSecret = () => process.env.CRON_SECRET || "";
