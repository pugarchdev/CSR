import { Router } from "express";
import {
  createCSRRequirement,
  updateCSRRequirement,
  getMyRequirements,
  getCSRRequirementById,
  getMarketplaceRequirements,
  getVerificationQueue,
  verifyRequirement,
  submitRequirement,
  approveRequirement,
  rejectRequirement,
  requestRequirementClarification,
  publishRequirement,
  upsertBeneficiaryProfile,
  getMyBeneficiaryProfile,
  addRequirementDocument,
  confirmProjectHandover,
  getDepartmentCompanyInterests
} from "../controllers/csrRequirementController";
import { authenticateToken, authorizeRoles, optionalAuthenticateToken } from "../middlewares/authMiddleware";
import { checkFeatureEnabled, checkOrganizationApproved, checkPermission, checkPublicFeatureEnabled, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import { Role } from "@prisma/client";

const router = Router();
const departmentTransaction = [
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.BENEFICIARY_AGENCY, Role.SUPER_ADMIN]),
  resolveTenantContext,
  checkTenantActive,
  checkFeatureEnabled("enableRequirementCreation"),
  checkOrganizationApproved
];
const departmentRead = [
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.BENEFICIARY_AGENCY, Role.SUPER_ADMIN]),
  resolveTenantContext,
  checkTenantActive,
  checkFeatureEnabled("enableRequirementCreation"),
  checkOrganizationApproved,
  checkPermission("requirement:view")
];
const requirementApproval = [
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.DISTRICT_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  resolveTenantContext,
  checkTenantActive,
  checkPermission("requirement:approve")
];

// Beneficiary Profile
router.post("/profile", authenticateToken, authorizeRoles([Role.MASTER_ADMIN, Role.BENEFICIARY_AGENCY, Role.SUPER_ADMIN]), resolveTenantContext, checkTenantActive, upsertBeneficiaryProfile);
router.get("/profile/me", authenticateToken, authorizeRoles([Role.MASTER_ADMIN, Role.BENEFICIARY_AGENCY, Role.SUPER_ADMIN]), resolveTenantContext, checkTenantActive, getMyBeneficiaryProfile);

// Requirements
router.post("/", ...departmentTransaction, checkPermission("requirement:create"), createCSRRequirement);
router.put("/:id", ...departmentTransaction, checkPermission("requirement:update"), updateCSRRequirement);
router.get("/my", ...departmentRead, getMyRequirements);
router.get("/marketplace", checkPublicFeatureEnabled("enableCSRMarketplace"), getMarketplaceRequirements); // Public or authenticated
router.get("/verification-queue", ...requirementApproval, getVerificationQueue);
router.post("/:id/verify", ...requirementApproval, verifyRequirement);
router.post("/:id/submit", ...departmentTransaction, checkPermission("requirement:submit"), submitRequirement);
router.post("/:id/approve", ...requirementApproval, approveRequirement);
router.post("/:id/reject", ...requirementApproval, rejectRequirement);
router.post("/:id/request-clarification", ...requirementApproval, requestRequirementClarification);
router.post("/:id/publish", ...requirementApproval, checkPermission("requirement:publish"), publishRequirement);
router.get("/:id/company-interests", ...departmentRead, getDepartmentCompanyInterests);
router.post("/:id/confirm-handover", ...departmentTransaction, checkPermission("project:update"), confirmProjectHandover);
router.post("/:requirementId/documents", ...departmentTransaction, checkPermission("requirement:update"), addRequirementDocument);

// Get detail by ID must be after special routes to avoid path collision
router.get("/:id", optionalAuthenticateToken, resolveTenantContext, checkTenantActive, getCSRRequirementById);

export default router;
