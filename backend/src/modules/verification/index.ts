import { Router } from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { authenticateToken, authorizeRoles } from "../../middlewares/authMiddleware";
import { Role } from "../../types/role";
import { correlationIdMiddleware } from "./utils/correlationId";
import { logger } from "./utils/logger";
import gstRoutes from "./routes/gstRoutes";
import aadhaarRoutes from "./routes/aadhaarRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

/**
 * API Setu Verification Module (Government of India).
 *
 * Secure backend proxy for GSTN GSTIN verification and UIDAI Aadhaar OTP eKYC.
 * All API Setu credentials stay server-side; the frontend only ever sees
 * verified, redacted data. Designed so future verifiers (PAN, CIN, UDYAM,
 * DigiLocker) drop in as sibling route/service pairs.
 */

const router = Router();

// Common chain for every verification endpoint.
router.use(correlationIdMiddleware, authenticateToken);

router.use("/gst", gstRoutes);
router.use("/aadhaar", aadhaarRoutes);
router.use("/dashboard", dashboardRoutes);

// OpenAPI docs — admin-only, non-production unless explicitly enabled.
const docsEnabled = process.env.NODE_ENV !== "production" || process.env.ENABLE_API_DOCS === "true";
if (docsEnabled) {
  try {
    const openapiDocument = YAML.load(path.join(__dirname, "openapi.yaml"));
    router.use(
      "/docs",
      authorizeRoles([Role.SUPER_ADMIN]),
      swaggerUi.serve,
      swaggerUi.setup(openapiDocument)
    );
  } catch (err) {
    logger.warn("openapi_docs_unavailable", { error: err instanceof Error ? err.message : String(err) });
  }
}

export default router;
