import { Router } from "express";
import { Role } from "../types/role";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getDashboardStats,
  getPendingEnquiries,
  getPendingPitches,
  submitFeasibilityAssessment,
  getAssessmentById,
  getRMEnquiryById,
  addRMEnquiryInteraction,
  sendEnquiryEmail,
  scheduleEnquiryMeeting,
  getRMEscalations,
  getCorporateInterests,
  updateCorporateInterest,
  verifyGovernmentPitch,
  getRMAssessments
} from "../controllers/relationshipManagerController";

const router = Router();

// RM Dashboard routes
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.JOINT_SECRETARY, Role.STATE_CSR_CELL]),
  asyncHandler(getDashboardStats)
);

// Pending enquiries
router.get(
  "/enquiries",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.JOINT_SECRETARY, Role.STATE_CSR_CELL]),
  asyncHandler(getPendingEnquiries)
);

// Enquiry detail for RM assessment workflow
router.get(
  "/enquiries/:id",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.JOINT_SECRETARY, Role.STATE_CSR_CELL]),
  asyncHandler(getRMEnquiryById)
);

// Log RM interaction / first contact
router.post(
  "/enquiries/:id/interactions",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(addRMEnquiryInteraction)
);

// Send Email to Corporate
router.post(
  "/enquiries/:id/send-email",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(sendEnquiryEmail)
);

// Schedule Meeting with Corporate
router.post(
  "/enquiries/:id/schedule-meeting",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(scheduleEnquiryMeeting)
);

// Pending pitch verifications
router.get(
  "/pitches",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.JOINT_SECRETARY, Role.STATE_CSR_CELL]),
  asyncHandler(getPendingPitches)
);

// Verify government pitch
router.post(
  "/pitches/:id/verify",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(verifyGovernmentPitch)
);

// Submit feasibility assessment for an enquiry
router.post(
  "/enquiries/:id/assessment",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(submitFeasibilityAssessment)
);

// Get assessment details
router.get(
  "/assessments/:id",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.JOINT_SECRETARY]),
  asyncHandler(getAssessmentById)
);

// Get corporate interest responses
router.get(
  "/interests",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getCorporateInterests)
);

// Update corporate interest response
router.patch(
  "/interests/:id",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(updateCorporateInterest)
);

// Get SLA escalations
router.get(
  "/escalations",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getRMEscalations)
);

// Get my assessments
router.get(
  "/assessments",
  authenticateToken,
  authorizeRoles([Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN]),
  asyncHandler(getRMAssessments)
);

export default router;
