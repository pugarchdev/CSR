import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkFeatureEnabled, checkOrganizationApproved, checkPermission, checkPublicFeatureEnabled, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import { getCSRRequirementById, getMarketplaceRequirements } from "../controllers/csrRequirementController";
import { expressInterest } from "../controllers/companyInterestController";

const router = Router();

router.get("/requirements", checkPublicFeatureEnabled("enableCSRMarketplace"), getMarketplaceRequirements);
router.get("/requirements/:id", authenticateToken, getCSRRequirementById);
router.post(
  "/requirements/:id/show-interest",
  authenticateToken,
  authorizeRoles([Role.COMPANY_ADMIN, Role.COMPANY_MEMBER, Role.SUPER_ADMIN]),
  resolveTenantContext,
  checkTenantActive,
  checkFeatureEnabled("enableCompanyInterest"),
  checkOrganizationApproved,
  checkPermission("interest:create"),
  (req, _res, next) => {
    req.body = {
      ...req.body,
      csrRequirementId: req.params.id
    };
    next();
  },
  expressInterest
);

export default router;
