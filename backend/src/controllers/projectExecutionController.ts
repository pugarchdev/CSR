import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

// 1 & 2. DNO Acceptance / Request Reassignment
export const acceptDnoAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const updated = await prisma.project.update({
      where: { id },
      data: {
        dnoAssignmentStatus: "ACCEPTED",
        dnoAcceptedAt: new Date(),
        dnoAcceptedById: user?.id,
        nodalOfficerUserId: user?.id || project.nodalOfficerUserId
      }
    });

    return res.json({ success: true, message: "DNO assignment accepted successfully.", data: updated });
  } catch (error) {
    next(error);
  }
};

export const requestDnoReassignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Reassignment reason is required." });
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const updated = await prisma.project.update({
      where: { id },
      data: {
        dnoAssignmentStatus: "REASSIGNMENT_REQUESTED",
        dnoReassignmentReason: reason.trim(),
        nodalOfficerUserId: null
      }
    });

    return res.json({ success: true, message: "DNO reassignment requested.", data: updated });
  } catch (error) {
    next(error);
  }
};

// 3. Project Kickoff
export const completeProjectKickoff = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { kickoffChecklist } = req.body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        kickoffStatus: "COMPLETED",
        kickoffCompletedAt: new Date(),
        kickoffChecklist: kickoffChecklist || {}
      }
    });

    return res.json({ success: true, message: "Project kickoff completed.", data: updated });
  } catch (error) {
    next(error);
  }
};

// 4 & 5. Site & Field Inspection Verification
export const submitSiteVerification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { siteVerificationStatus, inspectionReport } = req.body;

    if (!["VERIFIED", "PARTIALLY_VERIFIED", "NOT_AVAILABLE"].includes(siteVerificationStatus)) {
      return res.status(400).json({ error: "Status must be VERIFIED, PARTIALLY_VERIFIED, or NOT_AVAILABLE." });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        siteVerificationStatus,
        siteInspectionReport: inspectionReport || {}
      }
    });

    return res.json({ success: true, message: "Site inspection verification submitted.", data: updated });
  } catch (error) {
    next(error);
  }
};

// 6 & 7. Implementation Plan
export const submitImplementationPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { planData } = req.body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        implementationPlanStatus: "SUBMITTED",
        implementationPlanData: planData || {}
      }
    });

    return res.json({ success: true, message: "Implementation plan submitted to Department Head.", data: updated });
  } catch (error) {
    next(error);
  }
};

export const approveImplementationPlan = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        implementationPlanStatus: "APPROVED",
        status: "IN_PROGRESS"
      }
    });

    return res.json({ success: true, message: "Implementation plan approved. Project is now ACTIVE.", data: updated });
  } catch (error) {
    next(error);
  }
};

// 10, 11 & 12. Milestone Evidence & DNO Verification
export const submitMilestoneEvidence = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { milestoneId } = req.params;
    const { evidenceUrls, progressRemarks } = req.body;

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        evidenceUrls: evidenceUrls || [],
        progressRemarks: progressRemarks || null,
        submittedAt: new Date(),
        verificationStatus: "PENDING_VERIFICATION"
      }
    });

    return res.json({ success: true, message: "Milestone evidence submitted for DNO verification.", data: updated });
  } catch (error) {
    next(error);
  }
};

export const verifyMilestone = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { milestoneId } = req.params;
    const { action, verificationRemarks } = req.body; // action: VERIFY | REJECT | CHANGES_REQUIRED

    if (!["VERIFY", "REJECT", "CHANGES_REQUIRED"].includes(action)) {
      return res.status(400).json({ error: "Action must be VERIFY, REJECT, or CHANGES_REQUIRED." });
    }

    const newVerificationStatus = action === "VERIFY" ? "VERIFIED" : action === "REJECT" ? "REJECTED" : "CHANGES_REQUIRED";
    const newMilestoneStatus = action === "VERIFY" ? "COMPLETED" : "IN_PROGRESS";

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        verificationStatus: newVerificationStatus,
        verificationRemarks: verificationRemarks || null,
        verifiedAt: action === "VERIFY" ? new Date() : null,
        verifiedByUserId: user?.id,
        status: newMilestoneStatus as any
      }
    });

    return res.json({ success: true, message: `Milestone marked as ${newVerificationStatus}.`, data: updated });
  } catch (error) {
    next(error);
  }
};

// 13 & 14. Issue Management
export const createProjectIssue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, severity, responsibleParty, dueDate } = req.body;

    const issue = await prisma.projectIssue.create({
      data: {
        projectId: id,
        title: title.trim(),
        description: description.trim(),
        severity: severity || "MEDIUM",
        responsibleParty: responsibleParty || "GOVERNMENT_DEPARTMENT",
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "OPEN"
      }
    });

    return res.status(201).json({ success: true, message: "Issue raised successfully.", data: issue });
  } catch (error) {
    next(error);
  }
};

export const updateProjectIssueStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { issueId } = req.params;
    const { status, verificationRemarks } = req.body;

    const updated = await prisma.projectIssue.update({
      where: { id: issueId },
      data: {
        status,
        ...(verificationRemarks ? { verificationRemarks } : {}),
        ...(status === "RESOLVED" || status === "CLOSED" ? { resolvedAt: new Date(), resolvedById: req.user?.id } : {})
      }
    });

    return res.json({ success: true, message: "Issue status updated.", data: updated });
  } catch (error) {
    next(error);
  }
};

// 15. In-App Project Communication Audit Log
export const getProjectCommunications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const logs = await prisma.projectCommunicationLog.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" }
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

export const postProjectCommunication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { message, attachmentUrls } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const log = await prisma.projectCommunicationLog.create({
      data: {
        projectId: id,
        senderUserId: user?.id || "ANONYMOUS",
        senderRole: (user as any)?.designation || "USER",
        message: message.trim(),
        attachmentUrls: attachmentUrls || []
      }
    });

    return res.status(201).json({ success: true, message: "Communication recorded.", data: log });
  } catch (error) {
    next(error);
  }
};

// 19, 20 & 21. Department Acceptance, DNC Review, Completion & Closure
export const submitFinalDepartmentAcceptance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        finalDepartmentAcceptanceAt: new Date(),
        finalDepartmentAcceptedById: user?.id,
        status: "COMPLETED"
      }
    });

    return res.json({ success: true, message: "Department Head final acceptance recorded.", data: updated });
  } catch (error) {
    next(error);
  }
};

// 22 & 23. Post-Completion Impact Monitoring & Archiving
export const submitImpactReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { impactReportData } = req.body;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        impactReportData: impactReportData || {}
      }
    });

    return res.json({ success: true, message: "Post-completion impact report saved.", data: updated });
  } catch (error) {
    next(error);
  }
};

export const archiveProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        archivedAt: new Date()
      }
    });

    return res.json({ success: true, message: "Project archived.", data: updated });
  } catch (error) {
    next(error);
  }
};
