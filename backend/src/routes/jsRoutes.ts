import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  getJSDashboard,
  getJSEscalations,
  handleEscalationAction,
  getJSGovernmentPitches,
} from "../controllers/jsDashboardController";
import {
  getPendingAssessments,
  getAssessmentById,
  submitJSDecision,
  appointNodalOfficer,
  getNodalAppointments,
  getNodalAppointmentById,
  getNodalOfficers,
} from "../controllers/feasibilityAssessmentController";

const router = Router();

// JS Dashboard
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getJSDashboard)
);

// JS Assessments List
router.get(
  "/assessments",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getPendingAssessments)
);

// JS Assessment Detail
router.get(
  "/assessments/:id",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.CSR_RELATIONSHIP_MANAGER, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getAssessmentById)
);

// Submit JS Decision
router.post(
  "/assessments/:id/decision",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(submitJSDecision)
);

// Appoint Nodal Officer
router.post(
  "/assessments/:id/nodal-officer",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(appointNodalOfficer)
);

// Nodal Officer Appointments List
router.get(
  "/nodal-appointments",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getNodalAppointments)
);

// Nodal Officer Appointment Detail
router.get(
  "/nodal-appointments/:id",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getNodalAppointmentById)
);

// JS Escalations
router.get(
  "/escalations",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getJSEscalations)
);

// Handle Escalation Action
router.post(
  "/escalations/:id/action",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(handleEscalationAction)
);

// Nodal Officers List for Dropdown
router.get(
  "/nodal-officers",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getNodalOfficers)
);

// Government Pitches pending JS approval List
router.get(
  "/government-pitches",
  authenticateToken,
  authorizeRoles([Role.JOINT_SECRETARY, Role.SUPER_ADMIN, Role.PORTAL_ADMIN, Role.CSR_ADMIN]),
  asyncHandler(getJSGovernmentPitches)
);

export default router;
