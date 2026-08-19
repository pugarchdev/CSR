import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { checkPermission } from "../middlewares/accessControlMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getAssignmentContext,
  searchOfficersHandler,
  getAssignableRolesHandler,
  assignExistingOfficerHandler,
  createAndAssignOfficerHandler,
  getDistrictsHandler,
  configureDistrictDnc,
  assignDnosToProject
} from "../controllers/assignmentController";

import {
  getDncQueue,
  delegateDncProject,
  getEligibleDnos,
  getGovAdminQueue,
  delegateGovOfficerProject,
  getEligibleGovOfficers,
  executeJsApproval,
  reassignRelationshipManager,
} from "../controllers/assignmentWorkflowController";

const router = Router();
router.use(authenticateToken);

router.get("/context/:entityType/:entityId", checkPermission("project:assign"), asyncHandler(getAssignmentContext));
router.get("/officers/search", checkPermission("officer:search"), asyncHandler(searchOfficersHandler));
router.get("/roles", checkPermission("role:assignable_list"), asyncHandler(getAssignableRolesHandler));
router.post("/", checkPermission("project:assign"), asyncHandler(assignExistingOfficerHandler));
router.post("/officers", checkPermission("officer:create"), asyncHandler(createAndAssignOfficerHandler));
router.get("/mine", asyncHandler(getAssignmentContext));
router.get("/status/:entityType/:entityId", checkPermission("workflow:view"), asyncHandler(getAssignmentContext));
router.post("/district-nodal-mappings", checkPermission("district_mapping:manage"), asyncHandler(assignExistingOfficerHandler));
router.get("/districts", checkPermission("project:assign"), asyncHandler(getDistrictsHandler));
router.get("/nodal-consultants", checkPermission("project:assign"), asyncHandler(searchOfficersHandler));
router.post("/appoint-nodal-consultant", checkPermission("project:assign"), asyncHandler(assignExistingOfficerHandler));
router.post("/district-dncs", asyncHandler(configureDistrictDnc));
router.post("/projects/:projectId/dnos", asyncHandler(assignDnosToProject));

// Scoped Assignment Workflows
router.get("/dnc/queue", asyncHandler(getDncQueue));
router.post("/dnc/delegate", asyncHandler(delegateDncProject));
router.post("/dnc/projects/:id/delegate", asyncHandler(delegateDncProject));
router.get("/dnc/eligible-dnos", asyncHandler(getEligibleDnos));

router.get("/gov-admin/queue", asyncHandler(getGovAdminQueue));
router.post("/gov-admin/delegate", asyncHandler(delegateGovOfficerProject));
router.post("/gov-admin/projects/:id/delegate", asyncHandler(delegateGovOfficerProject));
router.get("/gov-admin/eligible-officers", asyncHandler(getEligibleGovOfficers));

router.post("/js-approve/:projectId", checkPermission("project:approve"), asyncHandler(executeJsApproval));
router.post("/rm/reassign", checkPermission("pitch:assign"), asyncHandler(reassignRelationshipManager));

export default router;
