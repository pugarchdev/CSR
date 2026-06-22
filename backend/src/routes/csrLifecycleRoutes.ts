import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkFeatureEnabled, checkOrganizationApproved, checkPermission, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import {
  confirmAssetHandover,
  convertRequirementToProject,
  createFundRelease,
  createProjectInspection,
  listCsrProjects,
  submitUtilizationCertificate,
  upsertImpactMetric,
  verifyUtilizationCertificate
} from "../controllers/csrLifecycleController";

const router = Router();
const operationalContext = [resolveTenantContext, checkTenantActive];
const projectReadAccess = [
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.DISTRICT_ADMIN, Role.BENEFICIARY_AGENCY, Role.COMPANY_ADMIN, Role.COMPANY_MEMBER, Role.NGO_ADMIN, Role.NGO_MEMBER]),
  ...operationalContext,
  checkFeatureEnabled("enableCSRMarketplace"),
  checkPermission("project:view")
];

router.get("/projects", ...projectReadAccess, listCsrProjects);
router.get("/department/projects", ...projectReadAccess, listCsrProjects);
router.get("/company/projects", ...projectReadAccess, listCsrProjects);
router.get("/ngo/assigned-projects", ...projectReadAccess, listCsrProjects);
router.get("/district/projects", ...projectReadAccess, listCsrProjects);

router.post(
  "/admin/projects/convert-from-requirement",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.DISTRICT_ADMIN]),
  ...operationalContext,
  checkFeatureEnabled("enableCSRMarketplace"),
  checkPermission("project:create"),
  convertRequirementToProject
);

router.post(
  "/projects/:projectId/fund-releases",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.FINANCE_USER]),
  ...operationalContext,
  checkFeatureEnabled("enableFundDisbursement"),
  checkPermission("fund:release"),
  createFundRelease
);

router.post(
  "/ngo/fund-releases/:id/utilization-certificate",
  authenticateToken,
  authorizeRoles([Role.NGO_ADMIN, Role.NGO_MEMBER]),
  ...operationalContext,
  checkFeatureEnabled("enableFundDisbursement"),
  checkOrganizationApproved,
  checkPermission("fund:verify-utilization"),
  submitUtilizationCertificate
);

router.post(
  "/admin/utilization-certificates/:id/verify",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.DISTRICT_ADMIN, Role.FINANCE_USER]),
  ...operationalContext,
  checkFeatureEnabled("enableFundDisbursement"),
  checkPermission("fund:verify-utilization"),
  verifyUtilizationCertificate
);

router.post(
  "/projects/:projectId/confirm-handover",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.BENEFICIARY_AGENCY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  ...operationalContext,
  checkOrganizationApproved,
  checkPermission("project:update"),
  confirmAssetHandover
);

router.post(
  "/district/projects/:id/inspection",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.DISTRICT_ADMIN, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  ...operationalContext,
  checkFeatureEnabled("enableMilestoneMonitoring"),
  checkPermission("milestone:verify"),
  createProjectInspection
);

router.post(
  "/projects/:projectId/impact-metrics",
  authenticateToken,
  authorizeRoles([Role.MASTER_ADMIN, Role.NGO_ADMIN, Role.NGO_MEMBER, Role.BENEFICIARY_AGENCY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  ...operationalContext,
  checkFeatureEnabled("enableMilestoneMonitoring"),
  checkOrganizationApproved,
  checkPermission("project:update"),
  upsertImpactMetric
);

export default router;
