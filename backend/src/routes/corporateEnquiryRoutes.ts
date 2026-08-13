import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { ROLE_ID } from "../types/role";
import { requireApprovedOrganization, requirePermission, requireVerifiedActiveUser } from "../middlewares/accessControlMiddleware";
import {
  submitCorporateEnquiry,
  getEnquiryByTrackingId,
  listCorporateEnquiries,
  assignRelationshipManager,
  recordRmContact,
  convertToConvergenceProject,
  acceptEnquiry,
  getEnquiryById,
  listActiveDepartmentsForEnquiry
} from "../controllers/corporateEnquiryController";

const router = Router();

router.post("/", authenticateToken, requireVerifiedActiveUser, requireApprovedOrganization("CSR_COMPANY"), requirePermission("enquiry:create"), submitCorporateEnquiry);
router.get("/tracking/:trackingId", getEnquiryByTrackingId);
router.get("/departments/active", authenticateToken, requireVerifiedActiveUser, listActiveDepartmentsForEnquiry);
router.get("/", authenticateToken, listCorporateEnquiries);
router.post("/:id/assign-rm", authenticateToken, authorizeRoles([ROLE_ID.JOINT_SECRETARY]), assignRelationshipManager);
router.post("/:id/accept", authenticateToken, acceptEnquiry);
router.post("/:id/record-contact", authenticateToken, recordRmContact);
router.post("/:id/convert", authenticateToken, convertToConvergenceProject);
router.get("/:id", authenticateToken, getEnquiryById);

export default router;
