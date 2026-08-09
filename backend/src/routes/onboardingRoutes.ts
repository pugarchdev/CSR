import { Router } from "express";
import {
  getOrCreateDraftApplication,
  submitApplication,
  getApplicationStatus,
  respondToQuery
} from "../controllers/onboardingController";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  deleteOnboardingDocument,
  getCompanyOnboardingProfile,
  getDepartmentOnboardingProfile,
  getOnboardingProfile,
  getOnboardingStatus,
  listOnboardingDocuments,
  reapplyOnboarding,
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
  uploadOnboardingDocument,
  listSubDepartments,
  createSubDepartment,
  updateSubDepartment,
  deleteSubDepartment
} from "../controllers/organizationAdminController";

const router = Router();

router.use(authenticateToken);

router.get("/draft", getOrCreateDraftApplication);
router.post("/submit", submitApplication);
router.get("/status", getApplicationStatus);
router.post("/queries/:id/respond", respondToQuery);
router.post("/reapply", reapplyOnboarding);

router.get("/profile", getOnboardingProfile);
router.patch("/profile", updateOnboardingProfile);
router.get("/company", getCompanyOnboardingProfile);
router.get("/company/profile", getCompanyOnboardingProfile);
router.put("/company/profile", updateCompanyOnboardingProfile);
router.patch("/company", updateCompanyOnboardingProfile);
router.patch("/company/profile", updateCompanyOnboardingProfile);
router.patch("/company/compliance", updateCompanyCompliance);
router.patch("/company/preferences", updateCompanyPreferences);
router.post("/company/submit", submitCompanyOnboarding);

router.get("/department", getDepartmentOnboardingProfile);
router.get("/department/profile", getDepartmentOnboardingProfile);
router.put("/department/profile", updateDepartmentOnboardingProfile);
router.patch("/department", updateDepartmentOnboardingProfile);
router.patch("/department/profile", updateDepartmentOnboardingProfile);
router.patch("/department/nodal", updateDepartmentNodalOfficer);
router.patch("/department/authorization", updateDepartmentAuthorization);
router.patch("/department/jurisdiction", updateDepartmentJurisdiction);
router.patch("/department/permissions", updateDepartmentPermissions);
router.post("/department/submit", submitDepartmentOnboarding);

router.get("/sub-departments", listSubDepartments);
router.post("/sub-departments", createSubDepartment);
router.put("/sub-departments/:id", updateSubDepartment);
router.delete("/sub-departments/:id", deleteSubDepartment);

router.get("/documents", listOnboardingDocuments);
router.post("/documents", uploadOnboardingDocument);
router.delete("/documents/:id", deleteOnboardingDocument);
router.post("/complete", submitOnboarding);

export default router;
