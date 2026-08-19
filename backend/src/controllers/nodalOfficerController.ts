import { Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { successResponse, notFoundResponse, unauthorizedResponse } from "../utils/apiResponse";
import { Role, ROLE_ID } from "../types/role";
import { sendNodalOfficerAssignmentEmail } from "../services/emailService";
import { dispatchNotification } from "../services/notificationOrchestrator";

export const getDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return unauthorizedResponse(res, "Not authenticated");

    const [totalProjects, totalGrievances] = await Promise.all([
      prisma.project.count({
        where: { nodalOfficerUserId: userId }
      }),
      prisma.grievance.count({
        where: { project: { nodalOfficerUserId: userId } }
      })
    ]);

    return successResponse(res, { totalProjects, totalGrievances }, "Dashboard loaded");
  } catch (error) {
    next(error);
  }
};

export const getAssignedProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { nodalOfficerUserId: req.user?.id },
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, projects, "Projects retrieved");
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { milestones: true, grievances: true, documents: true, utilizationCertificates: true }
    });
    if (!project) return notFoundResponse(res, "Project not found");

    const isSuper = req.user?.role === 1 || req.user?.role === "SUPER_ADMIN" || req.user?.roleId === "1" || Number(req.user?.roleId) === 1;
    if (!isSuper && project.nodalOfficerUserId !== req.user?.id) {
      const explicitAssignment = await prisma.projectAssignment.findFirst({
        where: {
          entityType: "PROJECT",
          entityId: project.id,
          assignedToId: req.user?.id,
          status: "ACTIVE"
        }
      });
      if (!explicitAssignment) {
        return res.status(403).json({ error: "Forbidden: You do not have assignment access to this project" });
      }
    }

    return successResponse(res, project, "Project retrieved");
  } catch (error) {
    next(error);
  }
};

export const updateProjectStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    return successResponse(res, project, "Status updated");
  } catch (error) {
    next(error);
  }
};

export const verifyMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: req.params.id } });
    if (!milestone) return notFoundResponse(res, "Milestone not found");
    const assignment = await prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: milestone.projectId, assignmentType: "DISTRICT_NODAL_OFFICER", assignedToId: req.user!.id, status: "ACTIVE" } });
    if (!assignment) return res.status(403).json({ error: "Only an assigned DNO can verify this milestone." });
    if (milestone.status !== "SUBMITTED_FOR_VERIFICATION") return res.status(409).json({ error: "The milestone must first be submitted for verification." });
    const updated = await prisma.projectMilestone.update({ where: { id: milestone.id }, data: { status: "APPROVED", verifiedAt: new Date(), verifiedByUserId: req.user!.id } });
    return res.json({ success: true, message: "Milestone verified and marked complete.", data: updated });
  } catch (error) { next(error); }
};

export const verifyUC = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const uc = await prisma.utilizationCertificate.findUnique({ where: { id: req.params.id } });
    if (!uc) return notFoundResponse(res, "Utilisation Certificate not found");
    const assignment = await prisma.projectAssignment.findFirst({ where: { entityType: "PROJECT", entityId: uc.projectId, assignmentType: "DISTRICT_NODAL_OFFICER", assignedToId: req.user!.id, status: "ACTIVE" } });
    if (!assignment) return res.status(403).json({ error: "Only an assigned DNO can verify this Utilisation Certificate." });
    const updated = await prisma.utilizationCertificate.update({ where: { id: uc.id }, data: { verificationStatus: "VERIFIED", verifiedByUserId: req.user!.id, verifiedAt: new Date() } });
    return res.json({ success: true, message: "Utilisation Certificate verified.", data: updated });
  } catch (error) { next(error); }
};

export const resolveGrievance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const grievance = await prisma.grievance.update({
      where: { id: req.params.id },
      data: {
        resolutionText: req.body.resolutionText,
        status: "LEVEL_1_RESOLVED"
      }
    });
    return successResponse(res, grievance, "Grievance resolved");
  } catch (error) {
    next(error);
  }
};

export const getProjectGrievances = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const grievances = await prisma.grievance.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, grievances, "Grievances retrieved");
  } catch (error) {
    next(error);
  }
};

export const getCorporateEnquiries = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = Number(req.user?.role || req.user?.roleId);
    const where: any = {};
    if (userRole === Role.DISTRICT_NODAL_OFFICER && req.user?.organizationId) {
      where.organizationId = req.user.organizationId;
    }
    const enquiries = await prisma.corporateEnquiry.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, enquiries, "Enquiries retrieved");
  } catch (error) {
    next(error);
  }
};

export const getGovernmentPitches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = Number(req.user?.role || req.user?.roleId);
    const where: any = {};
    if (userRole === Role.DISTRICT_NODAL_OFFICER && req.user?.organizationId) {
      where.departmentId = req.user.organizationId;
    }
    const pitches = await prisma.governmentPitch.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, pitches, "Pitches retrieved");
  } catch (error) {
    next(error);
  }
};

export const getInspections = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = Number(req.user?.role || req.user?.roleId);
    const where: any = {};
    if (userRole === Role.DISTRICT_NODAL_OFFICER && req.user?.id) {
      where.project = {
        OR: [
          { nodalOfficerUserId: req.user.id },
          {
            projectAssignments: {
              some: {
                assignedToId: req.user.id,
                status: "ACTIVE"
              }
            }
          }
        ]
      };
    }
    const inspections = await prisma.projectInspection.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: "desc" }
    });
    return successResponse(res, inspections, "Inspections retrieved");
  } catch (error) {
    next(error);
  }
};

export const createInspection = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const inspection = await prisma.projectInspection.create({
      data: {
        projectId: req.body.projectId,
        inspectorUserId: req.user!.id,
        remarks: req.body.remarks,
        issuesFound: req.body.issuesFound,
        actionRequired: req.body.actionRequired
      }
    });
    return successResponse(res, inspection, "Inspection created");
  } catch (error) {
    next(error);
  }
};

export const getProjectNodalCandidates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { organization: true }
    });
    if (!project) return notFoundResponse(res, "Project not found");

    const targetOrgId = project.organizationId;
    if (!targetOrgId) {
      return successResponse(res, [], "No organization linked to project");
    }

    const candidates = await prisma.user.findMany({
      where: {
        OR: [
          { organizationId: targetOrgId },
          { roleId: ROLE_ID.DISTRICT_NODAL_OFFICER }
        ],
        accountStatus: "ACTIVE",
        isVerified: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        designation: true,
        roleId: true,
        officerProfile: {
          select: { fullName: true, designation: true, mobile: true, department: true, district: true }
        }
      },
      orderBy: { firstName: "asc" }
    });

    const formatted = candidates.map((c) => ({
      id: c.id,
      name: c.officerProfile?.fullName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email,
      designation: c.officerProfile?.designation || c.designation || "Nodal Officer",
      email: c.email,
      mobile: c.officerProfile?.mobile || c.mobile || "",
      department: c.officerProfile?.department || project.organization?.name || "",
      isCurrentlyAssigned: project.nodalOfficerUserId === c.id
    }));

    return successResponse(res, formatted, "Nodal officer candidates retrieved");
  } catch (error) {
    next(error);
  }
};

export const assignProjectNodalOfficer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { nodalOfficerUserId, name, designation, email, mobile, password } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { organization: true }
    });
    if (!project) return notFoundResponse(res, "Project not found");

    let assignedUserId = nodalOfficerUserId;
    let officerEmail = "";
    let officerName = "";
    let rawPasswordToSend: string | undefined = undefined;

    if (assignedUserId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: assignedUserId },
        include: { officerProfile: true }
      });
      if (!existingUser) return notFoundResponse(res, "Selected Nodal Officer not found");
      officerEmail = existingUser.email;
      officerName = existingUser.officerProfile?.fullName || [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ") || existingUser.email;
    } else {
      if (!name || !name.trim()) return res.status(400).json({ error: "Nodal Officer name is required" });
      if (!email || !email.trim()) return res.status(400).json({ error: "Nodal Officer official email is required" });

      const normalizedEmail = email.trim().toLowerCase();
      officerEmail = normalizedEmail;
      officerName = name.trim();

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { officerProfile: true }
      });

      if (existingUser) {
        assignedUserId = existingUser.id;
        officerName = existingUser.officerProfile?.fullName || [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ") || officerName;
      } else {
        const rawPassword = (password && password.trim().length >= 6)
          ? password.trim()
          : crypto.randomBytes(5).toString("hex").toUpperCase();
        rawPasswordToSend = rawPassword;

        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "Nodal";
        const lastName = nameParts.slice(1).join(" ") || designation || "Officer";

        const createdUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: normalizedEmail,
              passwordHash,
              firstName,
              lastName,
              designation: designation?.trim() || "District Nodal Officer",
              mobile: mobile?.trim() || null,
              roleId: ROLE_ID.DISTRICT_NODAL_OFFICER,
              organizationId: project.organizationId,
              accountStatus: "ACTIVE",
              isVerified: true,
              mustResetPassword: true,
              temporaryPasswordExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          });

          await tx.userOfficerProfile.create({
            data: {
              userId: user.id,
              fullName: name.trim(),
              designation: designation?.trim() || "District Nodal Officer",
              department: project.organization?.name || null,
              district: project.district || null,
              taluka: project.taluka || null,
              mobile: mobile?.trim() || null
            }
          });

          return user;
        });

        assignedUserId = createdUser.id;
      }
    }

    // Update project with Nodal Officer and maintain APPROVED status awaiting MoU
    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: {
        nodalOfficerUserId: assignedUserId,
        status: project.status === "SUBMITTED" || project.status === "UNDER_REVIEW" ? "APPROVED" : project.status
      },
      include: { organization: true }
    });

    // Create/update ProjectAssignment audit record
    await prisma.projectAssignment.upsert({
      where: {
        id: `nodal-${project.id}-${assignedUserId}`
      },
      create: {
        id: `nodal-${project.id}-${assignedUserId}`,
        entityType: "PROJECT",
        entityId: project.id,
        assignmentType: "DISTRICT_NODAL_OFFICER",
        assignedById: req.user?.id || "SYSTEM",
        assignedToId: assignedUserId,
        assignedRoleId: ROLE_ID.DISTRICT_NODAL_OFFICER,
        status: "ACTIVE"
      },
      update: {
        status: "ACTIVE"
      }
    });

    // Send project assignment email with credentials
    const assigningUser = req.user ? await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { officerProfile: true }
    }) : null;

    const authorityDesignation = assigningUser?.officerProfile?.designation || assigningUser?.designation || "Department Administrator";
    const authorityName = assigningUser?.officerProfile?.fullName || [assigningUser?.firstName, assigningUser?.lastName].filter(Boolean).join(" ") || "Department Authority";

    await sendNodalOfficerAssignmentEmail({
      to: officerEmail,
      officerName,
      password: rawPasswordToSend,
      isAutogenerated: Boolean(rawPasswordToSend),
      projectCode: project.projectCode,
      projectTitle: project.title,
      authorityName,
      authorityDesignation,
      departmentName: project.organization?.name || "Government Department",
      loginUrl: "/login",
      projectUrl: `/projects/${project.id}`
    }).catch((err: any) => console.warn("[Nodal Email Error]:", err.message));

    // Send In-App Notification
    await dispatchNotification({
      recipientId: assignedUserId,
      templateName: "PROJECT_NODAL_OFFICER_ASSIGNED",
      channels: ["IN_APP", "SOCKET", "EMAIL"],
      variables: {
        title: "Project Assigned to You",
        message: `You have been assigned as Nodal Officer for project ${project.title} (${project.projectCode}). Status: MoU Pending.`,
        currentStatus: updatedProject.status
      },
      actionButtonUrl: `/projects/${project.id}`,
      correlationId: project.id,
      notificationType: "PROJECT_NODAL_ASSIGNED"
    }).catch(() => {});

    return successResponse(res, updatedProject, "Nodal Officer assigned successfully and project moved to MoU Pending");
  } catch (error) {
    next(error);
  }
};
