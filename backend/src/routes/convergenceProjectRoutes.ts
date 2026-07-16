import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { z } from "zod";
import prisma from "../config/db";
import { sendUcVerificationNotification } from "../services/notificationService";

const router = Router();

// Validation Schemas
const milestoneProgressSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID"),
    milestoneId: z.string().uuid("Invalid milestone ID")
  }),
  body: z.object({
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
    fundsUtilized: z.number().positive().optional(),
    geoTaggedPhotoUrls: z.array(z.string().url()).optional(),
    remarks: z.string().optional()
  })
});

const uploadUCSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID")
  }),
  body: z.object({
    certificateDocumentUrl: z.string().url("Valid certificate URL required"),
    amountUtilized: z.number().positive("Amount must be positive"),
    milestoneId: z.string().uuid().optional(),
    remarks: z.string().optional()
  })
});

const completeProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid project ID")
  }),
  body: z.object({
    finalRemarks: z.string().optional(),
    completionDate: z.string().datetime().optional()
  })
});

// All authenticated users can view projects
const projectReadAccess = [
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

// Nodal Officer and Admin roles can update milestones
const milestoneUpdateAccess = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.DISTRICT_ADMIN,
    Role.DISTRICT_NODAL_OFFICER,
    Role.IMPLEMENTING_AGENCY_USER,
    Role.NGO_ADMIN,
    Role.NGO_MEMBER
  ])
];

// Implementing Agency and NGO roles can upload UC
const ucUploadAccess = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.DISTRICT_NODAL_OFFICER,
    Role.IMPLEMENTING_AGENCY_USER,
    Role.NGO_ADMIN,
    Role.NGO_MEMBER,
    Role.BENEFICIARY_AGENCY
  ])
];

// Admin roles for project completion
const projectCompleteAccess = [
  authenticateToken,
  authorizeRoles([
    Role.SUPER_ADMIN,
    Role.PORTAL_ADMIN,
    Role.CSR_ADMIN,
    Role.DISTRICT_ADMIN,
    Role.JOINT_SECRETARY,
    Role.DISTRICT_NODAL_OFFICER,
    Role.STATE_CSR_CELL
  ])
];

const listProjects = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const where: any = {};
  if (user?.role === Role.DISTRICT_NODAL_OFFICER) where.nodalOfficerUserId = user.id;
  if (user?.role === Role.IMPLEMENTING_AGENCY_USER) where.implementingAgencyUserId = user.id;
  if (user?.role === Role.CORPORATE_USER) {
    // Corporates see only their own projects (direct link or verified enquiry email)
    where.OR = [
      { corporateUserId: user.id },
      ...(user.email ? [{ corporateEnquiry: { email: { equals: user.email, mode: "insensitive" } } }] : []),
    ];
  }
  if (req.query.status) where.status = req.query.status;
  const projects = await prisma.convergenceProject.findMany({
    where,
    include: {
      mou: true,
      nodalOfficerUser: { select: { email: true, role: true } },
      implementingAgencyUser: { select: { email: true, role: true } },
      _count: { select: { milestones: true, utilizationCertificates: true, grievances: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ success: true, data: projects });
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await prisma.convergenceProject.findFirst({
    where: { OR: [{ id: req.params.id }, { projectId: req.params.id }] },
    include: {
      mou: true,
      nodalOfficerUser: { select: { email: true, role: true } },
      implementingAgencyUser: { select: { email: true, role: true } },
      milestones: { include: { utilizationCertificates: true, verifiedByNodalOfficer: { select: { email: true } } }, orderBy: { createdAt: "asc" } },
      utilizationCertificates: { include: { uploadedByUser: { select: { email: true } }, verifiedByNodalOfficer: { select: { email: true } } }, orderBy: { uploadedAt: "desc" } },
      grievances: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ success: true, data: project });
});

const updateMilestoneProgress = asyncHandler(async (req, res) => {
  const milestone = await prisma.projectDeliverableMilestone.update({
    where: { id: req.params.milestoneId },
    data: {
      status: req.body.status,
      fundsUtilized: req.body.fundsUtilized,
      geoTaggedPhotoUrls: req.body.geoTaggedPhotoUrls || undefined,
    },
  });
  const all = await prisma.projectDeliverableMilestone.findMany({ where: { convergenceProjectId: req.params.id } });
  const completed = all.filter((item) => item.status === "COMPLETED").length;
  await prisma.convergenceProject.update({
    where: { id: req.params.id },
    data: { physicalProgressPercent: all.length ? Math.round((completed / all.length) * 100) : 0 },
  });
  res.json({ success: true, data: milestone });
});

const uploadUtilizationCertificate = asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const uc = await prisma.utilizationCertificate.create({
    data: {
      tenantId: user.tenantId,
      convergenceProjectId: req.params.id,
      milestoneId: req.body.milestoneId,
      uploadedByUserId: user.id,
      certificateDocumentUrl: req.body.certificateDocumentUrl,
      amountUtilized: req.body.amountUtilized,
      remarks: req.body.remarks,
      invoiceDocuments: [],
    },
  });
  await sendUcVerificationNotification({
    userId: user.id,
    title: "Utilization Certificate uploaded",
    message: `UC for project ${req.params.id} has been uploaded and is pending nodal verification.`,
  });
  res.status(201).json({ success: true, data: uc });
});

const completeProject = asyncHandler(async (req, res) => {
  const project = await prisma.convergenceProject.update({
    where: { id: req.params.id },
    data: { status: "COMPLETED", physicalProgressPercent: 100 },
  });
  res.json({ success: true, data: project });
});

const generateCompletionReport = asyncHandler(async (req, res) => {
  const project = await prisma.convergenceProject.findUnique({
    where: { id: req.params.id },
    include: { milestones: true, utilizationCertificates: true, grievances: true, mou: true },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ success: true, data: { project, generatedAt: new Date() } });
});

// Routes

// GET / - List all convergence projects (all authenticated users)
router.get("/", ...projectReadAccess, listProjects);

// GET /:id - Get project by ID (all authenticated users)
router.get("/:id", ...projectReadAccess, getProjectById);

// POST /:id/milestones/:milestoneId/progress - Update milestone progress
// Authorized: Nodal Officer, Implementing Agency, NGO, Admin
router.post(
  "/:id/milestones/:milestoneId/progress",
  ...milestoneUpdateAccess,
  validateRequest(milestoneProgressSchema),
  updateMilestoneProgress
);

// POST /:id/uc - Upload Utilization Certificate
// Authorized: Implementing Agency, NGO, Nodal Officer, Admin
router.post(
  "/:id/uc",
  ...ucUploadAccess,
  validateRequest(uploadUCSchema),
  uploadUtilizationCertificate
);

// POST /:id/complete - Complete project
// Authorized: Admin, Joint Secretary, State CSR Cell, Nodal Officer
router.post(
  "/:id/complete",
  ...projectCompleteAccess,
  validateRequest(completeProjectSchema),
  completeProject
);

// GET /:id/completion-report - Generate completion report
// Authorized: Admin, Nodal Officer, Corporate, Implementing Agency
router.get(
  "/:id/completion-report",
  ...projectReadAccess,
  generateCompletionReport
);

export default router;
