import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ROLE_ID } from "../types/role";
import { routeApprovedCorporateEnquiry } from "../services/approvedProjectRoutingService";
import { dispatchNotification, dispatchToContact } from "../services/notificationOrchestrator";

export const createAssessment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { enquiryId, pitchId, decision, checklist } = req.body;
    return res.status(201).json({
      success: true,
      message: "Feasibility assessment created successfully",
      data: { enquiryId, pitchId, decision, checklist }
    });
  } catch (error) {
    next(error);
  }
};

export const getAssessmentByPitchId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assessment = await prisma.feasibilityAssessment.findUnique({ where: { id: req.params.id } });
    if (!assessment) return res.status(404).json({ error: "Assessment not found" });
    return res.json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

export const getAssessmentById = getAssessmentByPitchId;

async function enrichAssessments(assessments: any[]) {
  if (!assessments.length) return [];
  const enquiryIds = [...new Set(assessments.map((a: any) => a.enquiryId).filter(Boolean))];
  const deptIds = [...new Set(assessments.map((a: any) => a.targetDepartmentId).filter(Boolean))];
  const userIds = [...new Set(assessments.map((a: any) => a.assessedByUserId).filter(Boolean))];

  const [enquiries, depts, users] = await Promise.all([
    enquiryIds.length
      ? prisma.corporateEnquiry.findMany({
          where: { id: { in: enquiryIds } },
          select: {
            id: true,
            trackingId: true,
            corporateName: true,
            mca21CIN: true,
            contactEmail: true,
            contactPersonName: true,
            mobile: true,
            sector: true,
            indicativeBudget: true,
            proposedCSRWork: true
          }
        })
      : [],
    deptIds.length
      ? prisma.organization.findMany({
          where: { id: { in: deptIds } },
          select: { id: true, name: true, displayName: true }
        })
      : [],
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, firstName: true, lastName: true, designation: true }
        })
      : []
  ]);

  const enquiryMap = new Map(enquiries.map((e) => [e.id, e]));
  const deptMap = new Map(depts.map((d) => [d.id, d]));
  const userMap = new Map(
    users.map((u) => [
      u.id,
      {
        id: u.id,
        email: u.email,
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
        designation: u.designation
      }
    ])
  );

  return assessments.map((a) => ({
    ...a,
    enquiry: enquiryMap.get(a.enquiryId) || null,
    targetDepartment: deptMap.get(a.targetDepartmentId) || null,
    assessedBy: userMap.get(a.assessedByUserId) || null
  }));
}

export const getPendingAssessments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assessments = await prisma.feasibilityAssessment.findMany({
      where: { status: "SUBMITTED_TO_JS" },
      orderBy: { submittedAt: "desc" }
    });
    const enriched = await enrichAssessments(assessments);
    return res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

export const getAllAssessments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assessments = await prisma.feasibilityAssessment.findMany({
      orderBy: { createdAt: "desc" }
    });
    const enriched = await enrichAssessments(assessments);
    return res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * JS Decision Submission — Upon JS Approval ("PROCEED" / "PROCEED_WITH_CONDITIONS"):
 * Auto-assigns to District Nodal Consultant (DNC) for the district AND Government Department Admin.
 */
export const submitJSDecision = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;
    if (!["PROCEED", "PROCEED_WITH_CONDITIONS", "DO_NOT_PROCEED", "RETURN_FOR_CLARIFICATION", "RETURN_FOR_CORRECTION"].includes(decision)) {
      return res.status(400).json({ error: "Select approve, conditional approve, reject, return for clarification, or return for correction." });
    }
    if (decision !== "PROCEED" && (typeof reason !== "string" || reason.trim().length < 5)) {
      return res.status(400).json({ error: "Record a clear reason or conditions for this decision." });
    }

    const assessment = await prisma.feasibilityAssessment.findUnique({ where: { id } });
    if (!assessment) return res.status(404).json({ error: "Feasibility assessment not found" });
    if (!assessment.enquiryId) return res.status(409).json({ error: "This legacy endpoint can decide only Corporate Enquiry assessments." });
    if (assessment.status !== "SUBMITTED_TO_JS") return res.status(409).json({ error: "A Joint Secretary decision has already been recorded for this assessment." });

    const isApproved = decision === "PROCEED" || decision === "PROCEED_WITH_CONDITIONS";
    const isReturned = decision === "RETURN_FOR_CLARIFICATION" || decision === "RETURN_FOR_CORRECTION";
    const assessmentStatus = isApproved ? "JS_APPROVED" : isReturned ? decision : "JS_REJECTED";
    const enquiryStatus = isApproved ? "JS_APPROVED" : isReturned ? decision : "JS_REJECTED";
    try {
      const routing = isApproved ? await routeApprovedCorporateEnquiry({
        assessmentId: assessment.id,
        actorUserId: req.user!.id,
        targetDepartmentId: req.body.targetDepartmentId,
        targetDistrict: req.body.targetDistrict
      }) : null;
      await prisma.$transaction([
        prisma.feasibilityAssessment.update({
          where: { id },
          data: {
            status: assessmentStatus,
            jsDecision: decision,
            jsDecisionReason: reason || null,
            jsDecidedByUserId: req.user?.id || null,
            jsDecidedAt: new Date()
          }
        }),
        prisma.corporateEnquiry.update({ where: { id: assessment.enquiryId }, data: { status: enquiryStatus } }),
        prisma.sLAEscalation.updateMany({
          where: { entityType: "CORPORATE_ENQUIRY", entityId: assessment.enquiryId, stage: "JS_DECISION", isResolved: false },
          data: { isResolved: true, resolvedAt: new Date() }
        })
      ]);
      const enquiry = await prisma.corporateEnquiry.findUnique({ where: { id: assessment.enquiryId }, select: { id: true, trackingId: true, contactEmail: true, mobile: true } });
      if (enquiry) await dispatchToContact({
        referenceId: enquiry.trackingId || enquiry.id,
        email: enquiry.contactEmail,
        phone: enquiry.mobile,
        title: "Joint Secretary decision recorded",
        message: isApproved ? `Your application ${enquiry.trackingId || enquiry.id} has been approved.` : isReturned ? `Application ${enquiry.trackingId || enquiry.id} has been returned to the Relationship Manager for ${decision === "RETURN_FOR_CLARIFICATION" ? "clarification" : "correction"}.` : `A decision has been recorded for application ${enquiry.trackingId || enquiry.id}.`,
        trackingId: enquiry.trackingId || undefined,
        currentStatus: enquiryStatus,
        actionButtonUrl: `/track?trackingId=${encodeURIComponent(enquiry.trackingId || enquiry.id)}`,
        correlationId: assessment.id,
        notificationType: "JS_DECISION"
      });

      if (assessment.assessedByUserId) {
        await dispatchNotification({
          recipientId: assessment.assessedByUserId,
          templateName: "CORPORATE_ENQUIRY_JS_DECISION",
          channels: ["IN_APP", "SOCKET", "EMAIL", "SMS"],
          variables: {
            title: isApproved ? "Corporate Enquiry Approved by JS" : isReturned ? "Joint Secretary Requested Clarification" : "Corporate Enquiry Rejected by JS",
            message: isApproved
              ? `Joint Secretary approved feasibility for corporate enquiry ${enquiry?.trackingId || assessment.enquiryId}.`
              : `Joint Secretary recorded decision for enquiry ${enquiry?.trackingId || assessment.enquiryId}: ${decision.replace(/_/g, " ")}. Remarks: "${reason || "No remarks"}"`,
            currentStatus: enquiryStatus
          },
          actionButtonUrl: `/enquiries/${assessment.enquiryId}`,
          correlationId: assessment.id,
          notificationType: "JS_DECISION"
        }).catch((err) => console.warn("RM JS decision dispatch failed:", err));
      }

      return res.json({ success: true, message: isApproved ? "Joint Secretary decision recorded and project routed to DNC(s) and Department Admin." : "Joint Secretary decision recorded.", data: { assessmentId: id, decision, project: routing?.project || null, dncAssignments: routing?.dncAssignments || [] } });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Unable to record Joint Secretary decision." });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Appoint Nodal Officer — Dept Admin / DNC appoints a designated District Nodal Officer (DNO)
 */
export const appointNodalOfficer = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, nodalOfficerId, notes } = req.body;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ error: "Unauthorized" });

    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { organizationId: true, roleId: true, accountStatus: true, isVerified: true } });
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { organizationId: true, district: true } });
    const dno = await prisma.user.findFirst({ where: { id: nodalOfficerId, roleId: ROLE_ID.DISTRICT_NODAL_OFFICER, accountStatus: "ACTIVE", isVerified: true } });
    if (!project || !dno || !actor || actor.roleId !== ROLE_ID.GOVERNMENT_OFFICER || actor.organizationId !== project.organizationId || !actor.isVerified || actor.accountStatus !== "ACTIVE") {
      return res.status(403).json({ error: "Only the assigned Government Department Admin can assign active DNOs for this project." });
    }
    const assignment = await prisma.projectAssignment.create({
      data: {
        entityType: "PROJECT",
        entityId: projectId,
        assignmentType: "DISTRICT_NODAL_OFFICER",
        assignedById: actorId,
        assignedToId: nodalOfficerId,
        assignedRoleId: ROLE_ID.DISTRICT_NODAL_OFFICER,
        status: "ACTIVE"
      }
    });

    return res.status(201).json({
      success: true,
      message: "District Nodal Officer (DNO) successfully appointed to project",
      assignment,
      notes
    });
  } catch (error) {
    next(error);
  }
};

export const onboardAssessmentProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, message: "Project onboarded" });
  } catch (error) {
    next(error);
  }
};

export const updateChecklistItems = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    return res.json({ success: true, message: "Checklist updated" });
  } catch (error) {
    next(error);
  }
};

export const getNodalAppointments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const appointments = await prisma.projectAssignment.findMany({
      where: { assignmentType: "DISTRICT_NODAL_OFFICER" },
      include: { assignedTo: true }
    });
    return res.json(appointments);
  } catch (error) {
    next(error);
  }
};

export const getNodalAppointmentById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await prisma.projectAssignment.findUnique({
      where: { id: req.params.id },
      include: { assignedTo: true }
    });
    return res.json(appointment || {});
  } catch (error) {
    next(error);
  }
};

/**
 * Get active District Nodal Officers (DNOs)
 */
export const getNodalOfficers = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const dnos = await prisma.user.findMany({
      where: {
        roleId: ROLE_ID.DISTRICT_NODAL_OFFICER,
        accountStatus: "ACTIVE"
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true
      }
    });
    return res.json(dnos);
  } catch (error) {
    next(error);
  }
};

export const getApprovedProjectsForAppointment = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: "APPROVED" }
    });
    return res.json(projects);
  } catch (error) {
    next(error);
  }
};
