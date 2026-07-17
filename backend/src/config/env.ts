const requiredInProduction = [
  "DATABASE_URL"
];

export const isProduction = process.env.NODE_ENV === "production";

export const assertProductionEnv = () => {
  if (!isProduction) return;

  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
};

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && isProduction) {
    console.warn("[WARNING] JWT_SECRET is not set in production. Falling back to default signing key.");
  }
  return secret || "dev_only_mahacsr_access_secret";
};

export const getJwtRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret && isProduction) {
    console.warn("[WARNING] JWT_REFRESH_SECRET is not set in production. Falling back to default refresh key.");
  }
  return secret || "dev_only_mahacsr_refresh_secret";
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
  return {
    baseUrl: process.env.APISETU_BASE_URL || "https://apisetu.gov.in/partner/api",
    requestTimeoutMs: Number(process.env.APISETU_REQUEST_TIMEOUT) || 10000,
    clientId: process.env.APISETU_CLIENT_ID || "dev_client_id",
    apiKeys: (process.env.APISETU_API_KEY || "dev_api_key").split(",").map(k => k.trim()).filter(Boolean),
    maxRetries: Number(process.env.APISETU_MAX_RETRIES) || 3,
    aadhaarGenerateOtpEndpoint: process.env.APISETU_AADHAAR_GENERATE_OTP_ENDPOINT || "/aadhaar/otp",
    aadhaarVerifyOtpEndpoint: process.env.APISETU_AADHAAR_VERIFY_OTP_ENDPOINT || "/aadhaar/verify",
    gstVerifyEndpoint: process.env.APISETU_GST_VERIFY_ENDPOINT || "/gst/verify"
  };
};

export const getVerificationEncryptionKey = () => {
  return process.env.VERIFICATION_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
};
