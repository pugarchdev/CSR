import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { ROLE_ID } from "../types/role";
import {
  getRMOverview,
  listRMEnquiries,
  getRMEnquiryById,
  listRMPitches,
  getRMPitchById,
  getRMEscalations,
  getCorporateInterests,
  updateCorporateInterest,
  verifyGovernmentPitch,
  requestPitchClarification,
  logEnquiryInteraction,
  submitFeasibilityAssessment,
  getRMFeasibilityAssessment,
  listRMEnquiryInteractions,
  listActiveGovernmentDepartments,
  logPitchInteraction,
  listRMPitchInteractions
} from "../controllers/relationshipManagerController";
import {
  listAvailableRelationshipManagers,
  transferRmPortfolio,
} from "../controllers/rmPortfolioController";

const router = Router();

router.use(authenticateToken);

// Shared handover endpoints. Super Admins may provide sourceRmId; an RM can
// only transfer their own portfolio because the controller derives it from JWT.
router.get(
  "/available",
  authorizeRoles([ROLE_ID.SUPER_ADMIN, ROLE_ID.RELATIONSHIP_MANAGER]),
  listAvailableRelationshipManagers
);
router.post(
  "/transfer-portfolio",
  authorizeRoles([ROLE_ID.SUPER_ADMIN, ROLE_ID.RELATIONSHIP_MANAGER]),
  transferRmPortfolio
);

router.use(
  authorizeRoles([
    ROLE_ID.SUPER_ADMIN,
    ROLE_ID.PLANNING_SECRETARY,
    ROLE_ID.JOINT_SECRETARY,
    ROLE_ID.RELATIONSHIP_MANAGER,
  ])
);

router.get("/overview", getRMOverview);
router.get("/government-departments", listActiveGovernmentDepartments);
router.get("/enquiries", listRMEnquiries);
router.get("/enquiries/:id", getRMEnquiryById);
router.post("/enquiries/:id/interactions", logEnquiryInteraction);
router.get("/enquiries/:id/interactions", listRMEnquiryInteractions);
router.post("/enquiries/:id/feasibility", submitFeasibilityAssessment);
router.get("/enquiries/:id/feasibility", getRMFeasibilityAssessment);

router.get("/pitches", listRMPitches);
router.get("/pitches/:id", getRMPitchById);
router.get("/pitches/:id/interactions", listRMPitchInteractions);
router.post("/pitches/:id/interactions", logPitchInteraction);
router.post("/pitches/:id/clarification", requestPitchClarification);
router.patch("/pitches/:id/verify", verifyGovernmentPitch);

router.get("/escalations", getRMEscalations);
router.get("/interests", getCorporateInterests);
router.patch("/interests/:id", updateCorporateInterest);

export default router;
