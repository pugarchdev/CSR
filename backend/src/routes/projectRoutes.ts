import { Router } from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
} from "../controllers/projectController";
import {
  getProjectNodalCandidates,
  assignProjectNodalOfficer
} from "../controllers/nodalOfficerController";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/authMiddleware";
import { requirePermission } from "../middlewares/accessControlMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/", optionalAuthenticateToken, getProjects);
router.get("/:id/nodal-candidates", authenticateToken, asyncHandler(getProjectNodalCandidates));
router.post("/:id/assign-nodal", authenticateToken, asyncHandler(assignProjectNodalOfficer));
router.get("/:id", optionalAuthenticateToken, getProjectById);
router.post("/", authenticateToken, requirePermission("project:create"), createProject);
router.patch("/:id", authenticateToken, requirePermission("project:update"), updateProject);
router.delete("/:id", authenticateToken, requirePermission("project:close"), deleteProject);

export default router;
