/**
 * Strict Production Environment Validator
 *
 * Validates that all required security keys, database parameters,
 * and third-party integrations meet minimum production safety criteria.
 */

export interface EnvValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateProductionEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isProduction = process.env.NODE_ENV === "production";

  // Validate JWT Secrets
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    const msg = "JWT_SECRET must be set and at least 32 characters long";
    if (isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    const msg = "JWT_REFRESH_SECRET must be set and at least 32 characters long";
    if (isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  // Validate Database Connection URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    errors.push("DATABASE_URL environment variable is required");
  } else if (isProduction && !dbUrl.includes("sslmode=") && !dbUrl.includes("ssl=")) {
    warnings.push("DATABASE_URL should specify sslmode=require in production");
  }

  // Validate Optional Third-Party Services
  if (isProduction) {
    if (!process.env.REDIS_URL) {
      warnings.push("REDIS_URL is not set; fallback in-memory cache will be used");
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      warnings.push("SMTP configurations missing; email dispatch will operate in log-only mode");
    }
    if (!process.env.CLOUDINARY_URL && (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY)) {
      warnings.push("Cloudinary storage credentials missing; file upload service will require storage configuration");
    }
    if (!process.env.APISETU_API_KEY && !process.env.GST_APISETU_APIKEY && !process.env.GST_API_KEY) {
      warnings.push("APISETU_API_KEY is not configured; live API Setu verification requests will return 401 Unauthorized unless APISETU_ALLOW_FALLBACK=true is set.");
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
