import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getDashboard,
  getAssignedProjects,
  getProjectById,
  updateProjectStatus,
  verifyMilestone,
  verifyUC,
  resolveGrievance,
  getProjectGrievances,
  getCorporateEnquiries,
  getGovernmentPitches,
  getInspections,
  createInspection,
  getProjectNodalCandidates,
  assignProjectNodalOfficer
} from "../controllers/nodalOfficerController";

const router = Router();
router.use(authenticateToken);

router.get("/dashboard", asyncHandler(getDashboard));
router.get("/projects", asyncHandler(getAssignedProjects));
router.get("/projects/:id/candidates", asyncHandler(getProjectNodalCandidates));
router.post("/projects/:id/assign", asyncHandler(assignProjectNodalOfficer));
router.get("/projects/:id", asyncHandler(getProjectById));
router.patch("/projects/:id/status", asyncHandler(updateProjectStatus));
router.post("/milestones/:id/verify", asyncHandler(verifyMilestone));
router.patch("/utilization-certificates/:id/verify", asyncHandler(verifyUC));
router.post("/grievances/:id/respond", asyncHandler(resolveGrievance));
router.get("/projects/:projectId/grievances", asyncHandler(getProjectGrievances));
router.get("/corporate-enquiries", asyncHandler(getCorporateEnquiries));
router.get("/government-pitches", asyncHandler(getGovernmentPitches));
router.get("/inspections", asyncHandler(getInspections));
router.post("/inspections", asyncHandler(createInspection));

export default router;
