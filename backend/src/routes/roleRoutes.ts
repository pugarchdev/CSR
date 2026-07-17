import { Router } from "express";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  cloneRole,
  deleteRole,
  getPermissions,
  getPermissionGroups,
  createPermissionGroup,
  assignUserRoles,
  getUserRoles } from "../controllers/roleController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { checkPermission } from "../middlewares/tenantMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

// Protect all role routes with token authentication
router.use(authenticateToken);

// Permissions listing
router.get("/permissions", checkPermission("permission:view"), asyncHandler(getPermissions));
router.get("/permission-groups", checkPermission("permission:view"), asyncHandler(getPermissionGroups));
router.post("/permission-groups", checkPermission("permission:configure"), asyncHandler(createPermissionGroup));

// Roles CRUD
router.get("/", checkPermission("role:view"), asyncHandler(getRoles));
router.post("/", checkPermission("role:create"), asyncHandler(createRole));
router.get("/:id", checkPermission("role:view"), asyncHandler(getRoleById));
router.put("/:id", checkPermission("role:update"), asyncHandler(updateRole));
router.post("/:id/clone", checkPermission("role:create"), asyncHandler(cloneRole));
router.delete("/:id", checkPermission("role:delete"), asyncHandler(deleteRole));

// User-Role Assignments
router.get("/users/:userId", checkPermission("role:view"), asyncHandler(getUserRoles));
router.post("/users/:userId", checkPermission("role:configure"), asyncHandler(assignUserRoles));

export default router;
