import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { requirePermission, requireAnyPermission } from "../middlewares/accessControlMiddleware";
import { createAdminUser, getAdminOverview, listUsers, deleteUser, updateUser, importAdminUsers, sendAdminUserInvitation } from "../controllers/adminController";
import { getConvergenceOverview, listPitchInterests } from "../controllers/adminConvergenceController";
import {
  listOrganizations,
  listPendingOrganizations,
  getOrganizationById,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  requestClarification,
  createAdminOrganization
} from "../controllers/organizationAdminController";
import { Role } from "../types/role";
import { getSlaConfiguration, saveSlaConfiguration } from "../controllers/slaAdminController";
import { transferRmPortfolio, allocateUnassignedCases } from "../controllers/rmPortfolioController";
import { listPendingRelationships, verifyRelationship } from "../controllers/relationshipController";
import { transferUserResponsibilities } from "../controllers/responsibilityTransferController";

const router = Router();

router.use(authenticateToken);

router.get("/overview", authorizeRoles([Role.SUPER_ADMIN]), getAdminOverview);
router.get("/convergence/overview", authorizeRoles([Role.SUPER_ADMIN]), getConvergenceOverview);
router.get("/pitch-interests", requirePermission("pitch:view"), listPitchInterests);
router.get("/users", requirePermission("user:view"), listUsers);
router.post("/users", requirePermission("user:create"), createAdminUser);
router.post("/users/import", requirePermission("user:create"), importAdminUsers);
router.post("/users/:id/send-invitation", requirePermission("user:create"), sendAdminUserInvitation);
router.patch("/users/:id", requirePermission("user:update"), updateUser);
router.delete("/users/:id", requirePermission("user:suspend"), deleteUser);
router.post("/users/:id/transfer-responsibilities", requirePermission("user:update"), transferUserResponsibilities);
router.post("/rm/transfer-portfolio", authorizeRoles([Role.SUPER_ADMIN]), transferRmPortfolio);
router.post("/rm/allocate-unassigned", authorizeRoles([Role.SUPER_ADMIN, Role.JOINT_SECRETARY]), allocateUnassignedCases);
router.get("/sla/config", authorizeRoles([Role.SUPER_ADMIN]), getSlaConfiguration);
router.put("/sla/config", authorizeRoles([Role.SUPER_ADMIN]), saveSlaConfiguration);

// Organization management endpoints
router.get("/organizations", requirePermission("organization:view"), listOrganizations);
router.post("/organizations", requireAnyPermission(["organization:manage-users", "organization:create"]), createAdminOrganization);
router.get("/organizations/pending", requirePermission("organization:view"), listPendingOrganizations);
router.get("/organizations/:id", requirePermission("organization:view"), getOrganizationById);
router.post("/organizations/:id/approve", requirePermission("organization:approve"), approveOrganization);
router.post("/organizations/:id/reject", requirePermission("organization:reject"), rejectOrganization);
router.post("/organizations/:id/suspend", requirePermission("organization:suspend"), suspendOrganization);
router.post("/organizations/:id/request-clarification", requireAnyPermission(["organization:update", "organization:approve"]), requestClarification);

import { getRecommendedDepartments, routeEnquiryToDepartment, confirmDepartmentRouting } from "../controllers/enquiryRoutingController";

// Parent-Child relationship verification endpoints
router.get("/relationships/pending", authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN]), listPendingRelationships);
router.post("/relationships/:id/verify", authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN]), verifyRelationship);

// Corporate Enquiry Department Routing endpoints
router.get("/enquiries/:enquiryId/routing-recommendations", authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]), getRecommendedDepartments);
router.post("/enquiries/:enquiryId/route-department", authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]), routeEnquiryToDepartment);
router.post("/enquiries/:enquiryId/confirm-department", authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]), confirmDepartmentRouting);

export default router;
