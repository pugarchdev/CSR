import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles, optionalAuthenticateToken } from "../middlewares/authMiddleware";
import {
  submitEnquiry,
  getEnquiryByTrackingId,
  getAllEnquiries,
  getEnquiryById,
  assignRM,
  recordContact,
  getRelationshipManagers
} from "../controllers/corporateEnquiryController";
import { checkPermission, checkTenantActive, resolveTenantContext } from "../middlewares/tenantMiddleware";

const router = Router();

// Public routes (no authentication required, optional token)
router.post("/", optionalAuthenticateToken, submitEnquiry);
router.get("/track/:trackingId", getEnquiryByTrackingId);

// Protected routes - RM, JS, Admin only
const requireStateCellStaff = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.DISTRICT_ADMIN,
    Role.CSR_RELATIONSHIP_MANAGER,
    Role.JOINT_SECRETARY,
    Role.STATE_CSR_CELL,
    Role.PLANNING_SECRETARY
  ]),
  resolveTenantContext,
  checkTenantActive
];

// Protected routes - Admin & assigners only
const requireAdmin = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.STATE_CSR_CELL,
    Role.JOINT_SECRETARY,
    Role.CSR_RELATIONSHIP_MANAGER
  ]),
  resolveTenantContext,
  checkTenantActive
];

// Protected routes - RM only
const requireRM = [
  authenticateToken,
  authorizeRoles([
    Role.CSR_RELATIONSHIP_MANAGER,
    Role.DISTRICT_ADMIN,
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN
  ]),
  resolveTenantContext,
  checkTenantActive
];

// Get all enquiries (RM, JS, Admin only)
router.get("/", ...requireStateCellStaff, checkPermission("enquiry:view"), getAllEnquiries);

// Get list of Relationship Managers (JS, Admin, State Cell only)
router.get("/relationship-managers", ...requireStateCellStaff, checkPermission("enquiry:assign"), getRelationshipManagers);

// Get enquiry by ID (RM, JS, Admin, or assigned to user)
router.get("/:id", ...requireStateCellStaff, checkPermission("enquiry:view"), getEnquiryById);

// Assign RM to enquiry (Admin only)
router.patch("/:id/assign-rm", ...requireAdmin, checkPermission("enquiry:assign"), assignRM);

// Record RM contact (RM only)
router.post("/:id/contact", ...requireRM, checkPermission("enquiry:contact"), recordContact);

export default router;
