import { Router } from "express";
import { z } from "zod";
import { Role } from "../types/role";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkPermission, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import { createAdminUser, getAdminOverview, listUsers, updateUserRole, runSlaEscalations, getSlaStatistics } from "../controllers/adminController";
import { validateRequest } from "../middlewares/validationMiddleware";
import {
  approveRequirement,
  getVerificationQueue,
  publishRequirement,
  rejectRequirement,
  requestRequirementClarification
} from "../controllers/csrRequirementController";
import { approveCompanyInterest, listCompanyInterestsForAdmin } from "../controllers/companyInterestController";
import {
  approveOrganization,
  getOrganizationById,
  listOrganizations,
  listPendingOrganizations,
  rejectOrganization,
  requestClarification,
  suspendOrganization
} from "../controllers/organizationAdminController";
import {
  getConvergenceOverview,
  getConvergenceReport,
  getFundMonitoringSummary,
  listPitchInterests
} from "../controllers/adminConvergenceController";

const router = Router();

const requireSuperAdmin = [authenticateToken, authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN]), resolveTenantContext, checkTenantActive];

const adminManageableRoles = [
  "SUPER_ADMIN",
  "DISTRICT_ADMIN",
  "BENEFICIARY_AGENCY",
  "COMPANY_ADMIN",
  "COMPANY_MEMBER",
  "NGO_ADMIN",
  "NGO_MEMBER",
  "PORTAL_ADMIN",
  "CSR_ADMIN",
  "ANALYST_REVIEWER",
  "COMPLIANCE_REVIEWER",
  "FINANCE_USER",
  "APPROVER",
  "AUDITOR",
  "AUTHORIZED_SIGNATORY",
  "CSR_RELATIONSHIP_MANAGER",
  "JOINT_SECRETARY",
  "PLANNING_SECRETARY",
  "DISTRICT_NODAL_OFFICER",
  "STATE_CSR_CELL",
  "CORPORATE_USER",
  "IMPLEMENTING_AGENCY_USER",
  "GOVERNMENT_OFFICER"
] as const;

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(adminManageableRoles),
    assignedDistrict: z.string().optional(),
    accountStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional()
  })
});

const roleSchema = z.object({
  body: z.object({
    role: z.preprocess((val) => (val === "" ? null : val), z.enum(adminManageableRoles).nullable()).optional(),
    assignedDistrict: z.string().optional(),
    accountStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional()
  })
});

const requireStateCell = [authenticateToken, authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.DISTRICT_ADMIN]), resolveTenantContext, checkTenantActive];

router.get("/overview", ...requireSuperAdmin, getAdminOverview);
router.get("/users", ...requireSuperAdmin, listUsers);
router.post("/users", ...requireSuperAdmin, validateRequest(createUserSchema), createAdminUser);
router.patch("/users/:id/role", ...requireSuperAdmin, validateRequest(roleSchema), updateUserRole);
router.get("/organizations", ...requireStateCell, checkPermission("organization:view"), listOrganizations);
router.get("/organizations/pending", ...requireStateCell, checkPermission("organization:view"), listPendingOrganizations);
router.get("/organizations/:id", ...requireStateCell, checkPermission("organization:view"), getOrganizationById);
router.post("/organizations/:id/approve", ...requireStateCell, checkPermission("organization:approve"), approveOrganization);
router.post("/organizations/:id/reject", ...requireStateCell, checkPermission("organization:approve"), rejectOrganization);
router.post("/organizations/:id/request-clarification", ...requireStateCell, checkPermission("organization:approve"), requestClarification);
router.post("/organizations/:id/suspend", ...requireStateCell, checkPermission("organization:suspend"), suspendOrganization);
router.get("/onboarding/pending", ...requireStateCell, checkPermission("organization:view"), listPendingOrganizations);
router.get("/onboarding/:id", ...requireStateCell, checkPermission("organization:view"), getOrganizationById);
router.post("/onboarding/:id/approve", ...requireStateCell, checkPermission("organization:approve"), approveOrganization);
router.post("/onboarding/:id/reject", ...requireStateCell, checkPermission("organization:approve"), rejectOrganization);
router.post("/onboarding/:id/request-clarification", ...requireStateCell, checkPermission("organization:approve"), requestClarification);
router.post("/onboarding/:id/suspend", ...requireStateCell, checkPermission("organization:suspend"), suspendOrganization);
router.get("/requirements/pending", ...requireStateCell, checkPermission("requirement:view"), getVerificationQueue);
router.post("/requirements/:id/approve", ...requireStateCell, checkPermission("requirement:approve"), approveRequirement);
router.post("/requirements/:id/reject", ...requireStateCell, checkPermission("requirement:approve"), rejectRequirement);
router.post("/requirements/:id/request-clarification", ...requireStateCell, checkPermission("requirement:approve"), requestRequirementClarification);
router.post("/requirements/:id/publish", ...requireStateCell, checkPermission("requirement:publish"), publishRequirement);
router.get("/company-interests", ...requireStateCell, listCompanyInterestsForAdmin);
router.post("/company-interests/:id/approve", ...requireStateCell, checkPermission("interest:approve"), approveCompanyInterest);

// Convergence-model admin views
router.get("/pitch-interests", ...requireStateCell, checkPermission("interest:view"), listPitchInterests);
router.get("/fund-monitoring", ...requireStateCell, checkPermission("fund:view"), getFundMonitoringSummary);
router.get("/convergence-overview", ...requireStateCell, getConvergenceOverview);
router.get("/convergence-report", ...requireStateCell, checkPermission("report:view"), getConvergenceReport);

// SLA escalation monitoring & manual sweep trigger
router.get("/sla/statistics", ...requireSuperAdmin, getSlaStatistics);
router.post("/sla/run-escalations", ...requireSuperAdmin, runSlaEscalations);

export default router;
