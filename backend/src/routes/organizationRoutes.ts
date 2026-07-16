import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { checkPermission, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";
import {
  createOrgRole,
  deleteOrgRole,
  inviteOrgUser,
  listOrgRoles,
  listOrgUsers,
  listPermissions,
  updateOrgRole,
  updateOrgUserRole,
  updateOrgUserStatus
} from "../controllers/organizationAdminController";

const router = Router();
const orgAdmin = [
  authenticateToken,
  authorizeRoles([Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN, Role.BENEFICIARY_AGENCY, Role.COMPANY_ADMIN, Role.NGO_ADMIN]),
  resolveTenantContext,
  checkTenantActive
];

router.get("/roles", ...orgAdmin, checkPermission("organization:view"), listOrgRoles);
router.post("/roles", ...orgAdmin, checkPermission("role:create"), createOrgRole);
router.put("/roles/:id", ...orgAdmin, checkPermission("role:update"), updateOrgRole);
router.delete("/roles/:id", ...orgAdmin, checkPermission("role:delete"), deleteOrgRole);
router.get("/permissions", ...orgAdmin, checkPermission("organization:view"), listPermissions);
router.post("/users/invite", ...orgAdmin, checkPermission("user:invite"), inviteOrgUser);
router.get("/users", ...orgAdmin, checkPermission("organization:view"), listOrgUsers);
router.put("/users/:id/role", ...orgAdmin, checkPermission("user:update"), updateOrgUserRole);
router.patch("/users/:id/status", ...orgAdmin, checkPermission("user:update"), updateOrgUserStatus);

export default router;
