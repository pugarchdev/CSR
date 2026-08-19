import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getConvergenceProjects,
  getConvergenceProjectById,
  defineMilestones,
  addSingleMilestone,
  updateMilestoneProgress,
  verifyMilestone,
  uploadUC,
  verifyUC,
  collectorReassignProject,
  getDistrictDepartments
} from "../controllers/convergenceProjectController";

import {
  acceptDnoAssignment,
  requestDnoReassignment,
  completeProjectKickoff,
  submitSiteVerification,
  submitImplementationPlan,
  approveImplementationPlan,
  submitMilestoneEvidence,
  verifyMilestone as verifyMilestoneExecution,
  createProjectIssue,
  updateProjectIssueStatus,
  getProjectCommunications,
  postProjectCommunication,
  submitFinalDepartmentAcceptance,
  submitImpactReport,
  archiveProject
} from "../controllers/projectExecutionController";
import {
  listProjectAgencies,
  inviteImplementingAgency
} from "../controllers/implementingAgencyController";

const router = Router();

router.use(authenticateToken);

router.get("/", asyncHandler(getConvergenceProjects));
router.get("/district-departments", asyncHandler(getDistrictDepartments));
router.get("/:id", asyncHandler(getConvergenceProjectById));
router.post("/:id/milestones", asyncHandler(defineMilestones));
router.post("/:id/milestones/add", asyncHandler(addSingleMilestone));
router.patch("/:id/milestones/:milestoneId/progress", asyncHandler(updateMilestoneProgress));
router.post("/:id/milestones/:milestoneId/verify", asyncHandler(verifyMilestone));
router.post("/:id/utilization-certificates", asyncHandler(uploadUC));
router.patch("/:id/utilization-certificates/:ucId/verify", asyncHandler(verifyUC));

// 23-Step Project Execution Engine Endpoints
router.post("/:id/dno-accept", asyncHandler(acceptDnoAssignment));
router.post("/:id/dno-request-reassignment", asyncHandler(requestDnoReassignment));
router.post("/:id/kickoff", asyncHandler(completeProjectKickoff));
router.post("/:id/site-verification", asyncHandler(submitSiteVerification));
router.post("/:id/implementation-plan", asyncHandler(submitImplementationPlan));
router.post("/:id/approve-implementation-plan", asyncHandler(approveImplementationPlan));
router.post("/:id/milestones/:milestoneId/submit-evidence", asyncHandler(submitMilestoneEvidence));
router.post("/:id/milestones/:milestoneId/dno-verify", asyncHandler(verifyMilestoneExecution));
router.post("/:id/issues", asyncHandler(createProjectIssue));
router.patch("/:id/issues/:issueId", asyncHandler(updateProjectIssueStatus));
router.get("/:id/communications", asyncHandler(getProjectCommunications));
router.post("/:id/communications", asyncHandler(postProjectCommunication));
router.post("/:id/department-accept", asyncHandler(submitFinalDepartmentAcceptance));
router.post("/:id/impact-report", asyncHandler(submitImpactReport));
router.post("/:id/archive", asyncHandler(archiveProject));

// Implementing Agency Endpoints
router.get("/:id/implementing-agencies", asyncHandler(listProjectAgencies));
router.post("/:id/implementing-agencies/invite", asyncHandler(inviteImplementingAgency));

// Collector Project Reassignment (move project between ZP/MNC/Collectorate)
router.post("/:id/collector-reassign", asyncHandler(collectorReassignProject));

export default router;
