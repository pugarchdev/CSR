const requiredInProduction = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
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
    throw new Error("JWT_SECRET is required in production");
  }
  return secret || "dev_only_mahacsr_access_secret";
};

export const getJwtRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret && isProduction) {
    throw new Error("JWT_REFRESH_SECRET is required in production");
  }
  return secret || "dev_only_mahacsr_refresh_secret";
};

export const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    return origins.split(",").map((origin) => origin.trim()).filter(Boolean);
  }

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://csr-seven.vercel.app"
  ];
};
