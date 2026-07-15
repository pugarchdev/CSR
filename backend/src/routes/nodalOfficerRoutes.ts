import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getDashboard,
  getMyProjects,
  updateMilestoneStatus,
  verifyMilestone,
  verifyUC,
  respondToGrievance,
  generateProgressReport,
  getInspections,
  createInspection,
  confirmHandover,
  updateMouStatus,
  listNgoVerificationQueue,
  submitFinalNgoVerification
} from "../controllers/nodalOfficerController";

const router = Router();

// Nodal Officer Dashboard
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getDashboard)
);

// Get my projects
router.get(
  "/projects",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getMyProjects)
);

// Update milestone status
router.patch(
  "/milestones/:id/status",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(updateMilestoneStatus)
);

// Verify milestone
router.post(
  "/milestones/:id/verify",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(verifyMilestone)
);

// Verify UC
router.patch(
  "/utilization-certificates/:id/verify",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(verifyUC)
);

// Get all inspections
router.get(
  "/inspections",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getInspections)
);

// Create new inspection record
router.post(
  "/inspections",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(createInspection)
);

// Confirm project completion & handover
router.post(
  "/projects/:id/handover",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(confirmHandover)
);

// Update standard tripartite MoU status / terms
router.patch(
  "/projects/:id/mou",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(updateMouStatus)
);

// Respond to grievance
router.post(
  "/grievances/:id/respond",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(respondToGrievance)
);

// Generate progress report
router.get(
  "/projects/:id/progress-report",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(generateProgressReport)
);

// NGO Verification Queue
router.get(
  "/ngos/verification-queue",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(listNgoVerificationQueue)
);

router.post(
  "/ngos/:ngoId/final-verification",
  authenticateToken,
  authorizeRoles([Role.DISTRICT_NODAL_OFFICER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(submitFinalNgoVerification)
);

export default router;
