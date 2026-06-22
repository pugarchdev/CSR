import { Router } from "express";
import {
  expressInterest,
  getMyInterests,
  getInterestsForRequirement,
  selectNGO,
  updateInterestStatus,
  listCompanyInterestsForAdmin
} from "../controllers/companyInterestController";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkFeatureEnabled, checkOrganizationApproved, checkPermission, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import { Role } from "@prisma/client";

const router = Router();
const companyTransaction = [
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_MEMBER, Role.SUPER_ADMIN]),
  resolveTenantContext,
  checkTenantActive,
  checkFeatureEnabled("enableCompanyInterest"),
  checkOrganizationApproved
];

router.post("/", ...companyTransaction, checkPermission("interest:create"), expressInterest);
router.get("/my", ...companyTransaction, checkPermission("interest:view"), getMyInterests);
router.get(
  "/list",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.DISTRICT_ADMIN, Role.BENEFICIARY_AGENCY]),
  resolveTenantContext,
  checkTenantActive,
  checkFeatureEnabled("enableCompanyInterest"),
  checkPermission("interest:view"),
  listCompanyInterestsForAdmin
);
router.get(
  "/requirement/:requirementId",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.DISTRICT_ADMIN, Role.BENEFICIARY_AGENCY]),
  resolveTenantContext,
  checkTenantActive,
  checkFeatureEnabled("enableCompanyInterest"),
  checkPermission("interest:view"),
  getInterestsForRequirement
);
router.post("/:id/select-ngo", ...companyTransaction, checkFeatureEnabled("enableNGOSelection"), checkPermission("interest:approve"), selectNGO);
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  resolveTenantContext,
  checkTenantActive,
  checkFeatureEnabled("enableCompanyInterest"),
  checkPermission("interest:approve"),
  updateInterestStatus
);

export default router;
