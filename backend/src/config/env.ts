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
