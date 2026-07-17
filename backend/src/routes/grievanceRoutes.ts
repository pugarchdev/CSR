import { Router } from "express";
import { Role } from "../types/role";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { z } from "zod";
import prisma from "../config/db";
import { generateGrievanceTrackingId } from "../services/trackingIdService";
import { sendGrievanceAcknowledgement } from "../services/notificationService";

const router = Router();

// Validation Schemas
const raiseGrievanceSchema = z.object({
  body: z.object({
    convergenceProjectId: z.string().uuid("Valid project ID required"),
    issueTitle: z.string().min(5, "Title must be at least 5 characters").max(200, "Title too long"),
    issueDescription: z.string().min(20, "Description must be at least 20 characters"),
    raisedByType: z.enum(["CORPORATE", "IMPLEMENTING_AGENCY", "GOVERNMENT_OFFICER"]),
    attachmentUrls: z.array(z.string().url()).optional(),
    declarationAccepted: z.boolean().optional()
  })
});

const respondGrievanceSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid grievance ID")
  }),
  body: z.object({
    responseText: z.string().min(10, "Response must be at least 10 characters"),
    actionTaken: z.string().optional(),
    status: z.enum(["ACKNOWLEDGED", "LEVEL_1_RESOLVED", "LEVEL_2_RESOLVED"]).optional()
  })
});

const escalateGrievanceSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid grievance ID")
  }),
  body: z.object({
    escalationReason: z.string().min(10, "Escalation reason required"),
    escalateTo: z.enum(["STATE_CSR_CELL", "JOINT_SECRETARY"])
  })
});

const closeGrievanceSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid grievance ID")
  }),
  body: z.object({
    closureReason: z.string().min(10, "Closure reason required"),
    resolutionSummary: z.string().min(20, "Resolution summary required")
  })
});

// All authenticated users can access grievance routes
const grievanceAccess = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.DISTRICT_ADMIN,
    Role.BENEFICIARY_AGENCY,
    Role.COMPANY_ADMIN,
    Role.COMPANY_MEMBER,
    Role.NGO_ADMIN,
    Role.NGO_MEMBER,
    Role.CSR_RELATIONSHIP_MANAGER,
    Role.JOINT_SECRETARY,
    Role.PLANNING_SECRETARY,
    Role.DISTRICT_NODAL_OFFICER,
    Role.STATE_CSR_CELL,
    Role.CORPORATE_USER,
    Role.IMPLEMENTING_AGENCY_USER,
    Role.GOVERNMENT_OFFICER
  ])
];

// Nodal Officer, State CSR Cell, Joint Secretary can respond
const respondAccess = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.DISTRICT_ADMIN,
    Role.DISTRICT_NODAL_OFFICER,
    Role.STATE_CSR_CELL,
    Role.JOINT_SECRETARY
  ])
];

// Nodal Officer can escalate to State CSR Cell
// State CSR Cell can escalate to Joint Secretary
const escalateAccess = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.DISTRICT_NODAL_OFFICER,
    Role.STATE_CSR_CELL,
    Role.JOINT_SECRETARY
  ])
];

// Only Joint Secretary, State CSR Cell, and Admin can close
const closeAccess = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.STATE_CSR_CELL,
    Role.JOINT_SECRETARY
  ])
];

const raiseGrievance = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  if (!req.body.declarationAccepted) return res.status(422).json({ error: "Declaration is required" });
  const project = await prisma.convergenceProject.findUnique({
    where: { id: req.body.convergenceProjectId },
    include: { nodalOfficerUser: true },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  const grievanceId = await generateGrievanceTrackingId();
  const grievance = await prisma.grievance.create({
    data: {
      grievanceId,
      convergenceProjectId: project.id,
      raisedByUserId: user.id,
      raisedByType: req.body.raisedByType,
      issueTitle: req.body.issueTitle,
      issueDescription: req.body.issueDescription,
      level1DueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      assignedNodalOfficerId: project.nodalOfficerUserId,
      actionLogs: {
        create: {
          actorUserId: user.id,
          action: "RAISED",
          note: `Grievance raised. Attachments: ${(req.body.attachmentUrls || []).join(", ") || "None"}`,
        },
      },
    },
    include: { convergenceProject: true, actionLogs: true },
  });
  await sendGrievanceAcknowledgement({
    trackingId: grievanceId,
    userId: user.id,
    title: "Grievance acknowledged",
    message: `Your grievance ${grievanceId} has been assigned to the District Nodal Officer. Level 1 due date is ${grievance.level1DueAt?.toLocaleDateString("en-IN")}.`,
  });
  res.status(201).json({ success: true, data: grievance });
});

const getMyGrievances = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const where: any = {};
  if (user.role === Role.DISTRICT_NODAL_OFFICER) where.assignedNodalOfficerId = user.id;
  else if (user.role === Role.STATE_CSR_CELL) where.status = { in: ["ESCALATED_TO_STATE_CELL"] };
  else if ([Role.JOINT_SECRETARY, Role.PLANNING_SECRETARY].includes(user.role)) where.status = { in: ["ESCALATED_TO_JS_SECRETARY"] };
  else where.raisedByUserId = user.id;
  const grievances = await prisma.grievance.findMany({
    where,
    include: { convergenceProject: true, raisedByUser: { select: { email: true, role: true } }, actionLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: grievances });
});

const getGrievanceById = asyncHandler(async (req, res) => {
  const grievance = await prisma.grievance.findFirst({
    where: { OR: [{ id: req.params.id }, { grievanceId: req.params.id }] },
    include: {
      convergenceProject: true,
      raisedByUser: { select: { email: true, role: true } },
      assignedNodalOfficer: { select: { email: true, role: true } },
      assignedStateCellUser: { select: { email: true, role: true } },
      finalAuthorityUser: { select: { email: true, role: true } },
      actionLogs: { include: { actorUser: { select: { email: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!grievance) return res.status(404).json({ error: "Grievance not found" });
  res.json({ success: true, data: grievance });
});

const respondToGrievance = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const status = req.body.status || "LEVEL_1_RESOLVED";
  const grievance = await prisma.grievance.update({
    where: { id: req.params.id },
    data: {
      status,
      resolutionText: req.body.responseText,
      assignedNodalOfficerId: user.role === Role.DISTRICT_NODAL_OFFICER ? user.id : undefined,
      actionLogs: { create: { actorUserId: user.id, action: status, note: req.body.responseText } },
    },
    include: { actionLogs: true, convergenceProject: true },
  });
  res.json({ success: true, data: grievance });
});

const escalateGrievance = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const status = req.body.escalateTo === "JOINT_SECRETARY" ? "ESCALATED_TO_JS_SECRETARY" : "ESCALATED_TO_STATE_CELL";
  const grievance = await prisma.grievance.update({
    where: { id: req.params.id },
    data: {
      status,
      level2DueAt: status === "ESCALATED_TO_STATE_CELL" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
      assignedStateCellUserId: status === "ESCALATED_TO_STATE_CELL" && user.role === Role.STATE_CSR_CELL ? user.id : undefined,
      finalAuthorityUserId: status === "ESCALATED_TO_JS_SECRETARY" ? user.id : undefined,
      actionLogs: { create: { actorUserId: user.id, action: "ESCALATED", note: req.body.escalationReason } },
    },
    include: { actionLogs: true, convergenceProject: true },
  });
  res.json({ success: true, data: grievance });
});

const closeGrievance = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const grievance = await prisma.grievance.update({
    where: { id: req.params.id },
    data: {
      status: "CLOSED",
      resolutionText: req.body.resolutionSummary,
      actionLogs: { create: { actorUserId: user.id, action: "CLOSED", note: req.body.closureReason } },
    },
    include: { actionLogs: true, convergenceProject: true },
  });
  res.json({ success: true, data: grievance });
});

const assignGrievance = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: "User ID is required for assignment" });

  const grievance = await prisma.grievance.findUnique({ where: { id } });
  if (!grievance) return res.status(404).json({ error: "Grievance not found" });

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return res.status(404).json({ error: "Target user not found" });

  const updateData: any = {};
  if (targetUser.role === Role.DISTRICT_NODAL_OFFICER) {
    updateData.assignedNodalOfficerId = userId;
  } else {
    updateData.assignedStateCellUserId = userId;
  }

  const updatedGrievance = await prisma.grievance.update({
    where: { id },
    data: updateData,
    include: {
      assignedNodalOfficer: { select: { id: true, email: true } },
      assignedStateCellUser: { select: { id: true, email: true } }
    }
  });

  await prisma.grievanceActionLog.create({
    data: {
      grievanceId: grievance.id,
      actorUserId: user.id,
      action: "ASSIGNED",
      note: `Grievance assigned to user ${targetUser.email} (${targetUser.role})`
    }
  });

  res.json({ success: true, data: updatedGrievance });
});

const getAssignableUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: {
      role: { in: [Role.DISTRICT_NODAL_OFFICER, Role.STATE_CSR_CELL] },
      accountStatus: "ACTIVE"
    },
    select: { id: true, email: true, role: true, assignedDistrict: true }
  });
  res.json({ success: true, data: users });
});

// Routes

// POST / - Raise a new grievance
// Authorized: Corporate, Implementing Agency, Government Officer, Beneficiary Agency
router.post("/", ...grievanceAccess, validateRequest(raiseGrievanceSchema), raiseGrievance);

// GET /assignable-users - Get list of users who can be assigned a grievance
// Authorized: All authenticated users
router.get("/assignable-users", ...grievanceAccess, getAssignableUsers);

// GET /my - Get grievances raised by the current user
// Authorized: All authenticated users
router.get("/my", ...grievanceAccess, getMyGrievances);

// PATCH /:id/assign - Assign grievance to a user
// Authorized: Nodal Officer, State CSR Cell, Joint Secretary, Admin
router.patch("/:id/assign", ...respondAccess, assignGrievance);

// GET /:id - Get grievance by ID
// Authorized: All authenticated users
router.get("/:id", ...grievanceAccess, getGrievanceById);

// POST /:id/respond - Respond to a grievance
// Authorized: Nodal Officer, State CSR Cell, Joint Secretary, Admin
router.post(
  "/:id/respond",
  ...respondAccess,
  validateRequest(respondGrievanceSchema),
  respondToGrievance
);

// POST /:id/escalate - Escalate a grievance
// Authorized: Nodal Officer (to State), State CSR Cell (to JS), Joint Secretary
router.post(
  "/:id/escalate",
  ...escalateAccess,
  validateRequest(escalateGrievanceSchema),
  escalateGrievance
);

// POST /:id/close - Close a grievance
// Authorized: State CSR Cell, Joint Secretary, Admin
router.post(
  "/:id/close",
  ...closeAccess,
  validateRequest(closeGrievanceSchema),
  closeGrievance
);

export default router;
