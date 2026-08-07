import { Router } from "express";
import {
  getRoles,
  getRoleById,
  getPermissionGroups,
  getPages,
  createRole,
  updateRole,
  deleteRole
} from "../controllers/roleController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { requirePermission, requireAnyPermission } from "../middlewares/accessControlMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.use(authenticateToken);

router.get("/", requireAnyPermission(["role:view", "user:create", "user:update"]), asyncHandler(getRoles));
router.get("/permission-groups", requirePermission("role:view"), asyncHandler(getPermissionGroups));
router.get("/pages", requirePermission("role:view"), asyncHandler(getPages));
router.post("/", requirePermission("role:create"), asyncHandler(createRole));
router.get("/:id", requirePermission("role:view"), asyncHandler(getRoleById));
router.put("/:id", requirePermission("role:configure"), asyncHandler(updateRole));
router.delete("/:id", requirePermission("role:delete"), asyncHandler(deleteRole));

export default router;
