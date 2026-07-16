import { Router } from "express";
import {
  getOrCreateDraftApplication,
  saveDraft,
  submitApplication,
  getApplicationStatus,
  respondToQuery
} from "../controllers/onboardingController";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";
import { checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import {
  deleteOnboardingDocument,
  getCompanyOnboardingProfile,
  getDepartmentOnboardingProfile,
  getOnboardingProfile,
  getOnboardingStatus,
  listOnboardingDocuments,
  submitCompanyOnboarding,
  submitDepartmentOnboarding,
  submitOnboarding,
  updateCompanyCompliance,
  updateCompanyOnboardingProfile,
  updateCompanyPreferences,
  updateDepartmentAuthorization,
  updateDepartmentJurisdiction,
  updateDepartmentNodalOfficer,
  updateDepartmentOnboardingProfile,
  updateDepartmentPermissions,
  updateOnboardingProfile,
  uploadOnboardingDocument
} from "../controllers/organizationAdminController";

const router = Router();

/**
 * NGO Onboarding Routes
 * All routes require authentication
 * NGO users can manage their own applications
 */

const organizationOnboardingAccess = [
  authenticateToken,
  authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.BENEFICIARY_AGENCY, Role.COMPANY_ADMIN, Role.COMPANY_MEMBER, Role.CORPORATE_USER, Role.NGO_ADMIN, Role.NGO_MEMBER]),
  resolveTenantContext,
  checkTenantActive
];

router.get("/status", ...organizationOnboardingAccess, getOnboardingStatus);
router.get("/profile", ...organizationOnboardingAccess, getOnboardingProfile);
router.put("/profile", ...organizationOnboardingAccess, updateOnboardingProfile);
router.post("/documents", ...organizationOnboardingAccess, uploadOnboardingDocument);
router.get("/documents", ...organizationOnboardingAccess, listOnboardingDocuments);
router.delete("/documents/:id", ...organizationOnboardingAccess, deleteOnboardingDocument);
router.post("/submit", ...organizationOnboardingAccess, submitOnboarding);

router.get("/company/profile", ...organizationOnboardingAccess, getCompanyOnboardingProfile);
router.put("/company/profile", ...organizationOnboardingAccess, updateCompanyOnboardingProfile);
router.put("/company/compliance", ...organizationOnboardingAccess, updateCompanyCompliance);
router.put("/company/preferences", ...organizationOnboardingAccess, updateCompanyPreferences);
router.post("/company/submit", ...organizationOnboardingAccess, submitCompanyOnboarding);

router.get("/department/profile", ...organizationOnboardingAccess, getDepartmentOnboardingProfile);
router.put("/department/profile", ...organizationOnboardingAccess, updateDepartmentOnboardingProfile);
router.put("/department/nodal-officer", ...organizationOnboardingAccess, updateDepartmentNodalOfficer);
router.put("/department/authorization", ...organizationOnboardingAccess, updateDepartmentAuthorization);
router.put("/department/jurisdiction", ...organizationOnboardingAccess, updateDepartmentJurisdiction);
router.put("/department/permissions", ...organizationOnboardingAccess, updateDepartmentPermissions);
router.post("/department/submit", ...organizationOnboardingAccess, submitDepartmentOnboarding);

// Get or create draft application
router.get(
  "/application",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY, Role.NGO_MEMBER]),
  getOrCreateDraftApplication
);

// Save draft (any step)
router.post(
  "/application/draft",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY]),
  saveDraft
);

// Submit application for review
router.post(
  "/application/submit",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY]),
  submitApplication
);

// Get application status and timeline
router.get(
  "/application/status",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY, Role.NGO_MEMBER]),
  getApplicationStatus
);

// Respond to query
router.post(
  "/queries/:queryId/respond",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.AUTHORIZED_SIGNATORY]),
  respondToQuery
);

export default router;

// Made with Bob
