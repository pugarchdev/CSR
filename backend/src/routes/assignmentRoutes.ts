import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { resolveTenantContext, checkPermission } from "../middlewares/tenantMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getAssignmentContext,
  searchOfficersHandler,
  getAssignableRolesHandler,
  createAssignment,
  createOfficerAndAssign,
  getMyAssignments,
  getWorkflowStatus,
  createDistrictNodalMapping
} from "../controllers/assignmentController";

const router = Router();

// All assignment routes require authentication + tenant context;
// authorization is permission-based (dynamic RBAC), never hardcoded roles.
router.use(authenticateToken, resolveTenantContext);

// Assignment page context (entity summary + workflow stage + assignments)
router.get(
  "/context/:entityType/:entityId",
  checkPermission("project:assign"),
  asyncHandler(getAssignmentContext)
);

// Option A support — search existing officers
router.get(
  "/officers/search",
  checkPermission("officer:search"),
  asyncHandler(searchOfficersHandler)
);

// Dynamic role dropdown for Option B
router.get(
  "/roles",
  checkPermission("role:assignable_list"),
  asyncHandler(getAssignableRolesHandler)
);

// Option A — assign existing officer
router.post(
  "/",
  checkPermission("project:assign"),
  asyncHandler(createAssignment)
);

// Option B — create new officer + assign + invite
router.post(
  "/officers",
  checkPermission("officer:create"),
  asyncHandler(createOfficerAndAssign)
);

// Logged-in user's own assignments (any authenticated user)
router.get("/mine", asyncHandler(getMyAssignments));

// Workflow stage + history timeline
router.get(
  "/status/:entityType/:entityId",
  checkPermission("workflow:view"),
  asyncHandler(getWorkflowStatus)
);

// Admin: map nodal officer to district (auto-resumes parked workflows)
router.post(
  "/district-nodal-mappings",
  checkPermission("district_mapping:manage"),
  asyncHandler(createDistrictNodalMapping)
);

export default router;
