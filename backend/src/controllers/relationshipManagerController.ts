import { Response, NextFunction } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import {
  CorporateEnquiryStatus,
  GovernmentPitchStatus,
  Role,
  ChecklistAnswer,
  FeasibilityResult
} from "@prisma/client";
import { notify, notifyByRole, auditLog } from "../services/notificationService";
import { FEASIBILITY_CHECKLIST_TEMPLATE, getFailedCriticalItems } from "../constants/feasibilityChecklist";
import { SLAEscalationService, calculateDueDate } from "../services/slaEscalationService";

// ─── Types ─────────────────────────────────────────────────────────
interface ChecklistItemInput {
  itemNumber: number;
  answer: "YES" | "NO" | "NA";
  remarks?: string;
}

interface FeasibilityAssessmentBody {
  companyName: string;
  cin: string;
  sector: string;
  contactSummary: string;
  proposedLocationDistrict: string;
  indicativeBudget: number;
  developmentNeedAddressed: string;
  dateOfFirstContact: string;
  summaryOfInteraction: string;
  feasibilityResult: "FEASIBLE" | "PROCEED_WITH_CONDITIONS" | "NOT_FEASIBLE";
  recommendation: string;
  suggestedNodalOfficerDomain: string;
  conditionText?: string;
  checklistItems: ChecklistItemInput[];
}

const mapCorporateEnquiryForRM = (enquiry: any) => {
  const district = enquiry.preferredDistricts?.[0] || "Maharashtra";
  const indicativeBudget = enquiry.indicativeBudget ? Number(enquiry.indicativeBudget) : 0;

  return {
    id: enquiry.id,
    trackingId: enquiry.trackingId,
    status: enquiry.status,
    submittedAt: enquiry.submittedAt,
    slaDue: enquiry.firstResponseDueAt || enquiry.submittedAt,
    companyName: enquiry.companyName,
    companyCin: enquiry.mca21Cin,
    sector: enquiry.sector,
    district,
    lastActivity: enquiry.updatedAt,
    contactPerson: enquiry.contactPersonName,
    contactEmail: enquiry.email,
    contactPhone: enquiry.mobile,
    company: {
      id: enquiry.id,
      name: enquiry.companyName,
      cin: enquiry.mca21Cin,
      sector: enquiry.sector,
      pan: "N/A",
      address: district,
      district,
      state: "Maharashtra",
      pincode: "N/A",
      contactPerson: enquiry.contactPersonName,
      contactEmail: enquiry.email,
      contactPhone: enquiry.mobile,
      csrSpendLast3Years: indicativeBudget
    },
    csrFocusAreas: [enquiry.sector].filter(Boolean),
    preferredDistricts: enquiry.preferredDistricts || [],
    budgetRange: { min: indicativeBudget, max: indicativeBudget },
    projectDuration: "As per MoU",
    proposedCsrWork: enquiry.proposedCsrWork,
    timeline: [
      {
        id: `${enquiry.id}-submitted`,
        status: "SUBMITTED",
        timestamp: enquiry.submittedAt,
        notes: "Corporate enquiry submitted and tracking ID generated.",
        userName: enquiry.contactPersonName
      },
      ...(enquiry.firstContactedAt ? [{
        id: `${enquiry.id}-first-contact`,
        status: "RM_CONTACTED",
        timestamp: enquiry.firstContactedAt,
        notes: "Relationship Manager recorded first contact.",
        userName: enquiry.assignedRelationshipManager?.email || "Relationship Manager"
      }] : [])
    ],
    interactions: (enquiry.interactions || []).map((interaction: any) => ({
      id: interaction.id,
      type: interaction.interactionType === "PORTAL_NOTE" ? "OTHER" : interaction.interactionType,
      timestamp: interaction.createdAt,
      summary: interaction.note,
      notes: interaction.note,
      recordedBy: interaction.actorUser?.email || "Portal user"
    })),
    feasibilityChecklist: (enquiry.feasibilityAssessment?.checklistItems || []).map((item: any) => ({
      id: String(item.itemNumber),
      itemNumber: item.itemNumber,
      response: item.answer === "NA" ? "N/A" : item.answer,
      notes: item.remarks || ""
    })),
    rmRecommendation: enquiry.feasibilityAssessment?.recommendation || null,
    rmNotes: enquiry.feasibilityAssessment?.summaryOfInteraction || null,
    jsDecision: enquiry.feasibilityAssessment?.jsDecisionAt
      ? enquiry.feasibilityAssessment.feasibilityResult
      : null,
    jsConditions: enquiry.feasibilityAssessment?.conditionText || null,
    jsDecisionDate: enquiry.feasibilityAssessment?.jsDecisionAt || null,
    feasibilityAssessment: enquiry.feasibilityAssessment || null,
    assignedRelationshipManager: enquiry.assignedRelationshipManager
      ? {
          id: enquiry.assignedRelationshipManager.id,
          email: enquiry.assignedRelationshipManager.email,
        }
      : null,
    assignedRelationshipManagerId: enquiry.assignedRelationshipManagerId || null
  };
};

// ─── Get Dashboard Stats ──────────────────────────────────────────
export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Only RM, JS, and admins can access dashboard
    const allowedRoles: Role[] = [
      Role.CSR_RELATIONSHIP_MANAGER,
      Role.JOINT_SECRETARY,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
      Role.STATE_CSR_CELL
    ];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Not authorized to access RM dashboard" });
    }

    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    // Build filters for RM-specific data
    const enquiryFilter: any = {};
    const pitchFilter: any = {};
    const assessmentFilter: any = {};

    if (tenantId && userRole !== Role.MASTER_ADMIN) {
      enquiryFilter.tenantId = tenantId;
      pitchFilter.OR = [
        { tenantId: tenantId },
        { tenantId: null }
      ];
      assessmentFilter.tenantId = tenantId;
    }

    // RM sees only their assigned enquiries/pitches
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER) {
      enquiryFilter.assignedRelationshipManagerId = userId;
      pitchFilter.assignedRelationshipManagerId = userId;
      assessmentFilter.relationshipManagerId = userId;
    }

    // Get counts for enquiries
    const [
      totalEnquiries,
      pendingEnquiries,
      contactedEnquiries,
      assessmentPending,
      jsApproved,
      jsRejected,
      completed,
      totalPitches,
      pendingPitches,
      verifiedPitches,
      publicListedPitches,
      totalAssessments,
      pendingAssessments,
      approvedAssessments,
      rejectedAssessments
    ] = await Promise.all([
      // Corporate Enquiries
      prisma.corporateEnquiry.count({ where: enquiryFilter }),
      prisma.corporateEnquiry.count({
        where: {
          ...enquiryFilter,
          status: { in: [CorporateEnquiryStatus.SUBMITTED, CorporateEnquiryStatus.RM_ASSIGNED] }
        }
      }),
      prisma.corporateEnquiry.count({
        where: {
          ...enquiryFilter,
          status: CorporateEnquiryStatus.RM_CONTACTED
        }
      }),
      prisma.corporateEnquiry.count({
        where: {
          ...enquiryFilter,
          status: CorporateEnquiryStatus.ASSESSMENT_PENDING
        }
      }),
      prisma.corporateEnquiry.count({
        where: {
          ...enquiryFilter,
          status: CorporateEnquiryStatus.JS_APPROVED
        }
      }),
      prisma.corporateEnquiry.count({
        where: {
          ...enquiryFilter,
          status: CorporateEnquiryStatus.JS_REJECTED
        }
      }),
      prisma.corporateEnquiry.count({
        where: {
          ...enquiryFilter,
          status: { in: [CorporateEnquiryStatus.COMPLETED, CorporateEnquiryStatus.CLOSED] }
        }
      }),
      // Government Pitches
      prisma.governmentPitch.count({ where: pitchFilter }),
      prisma.governmentPitch.count({
        where: {
          ...pitchFilter,
          status: {
            in: [
              GovernmentPitchStatus.SUBMITTED,
              GovernmentPitchStatus.RM_VERIFICATION_PENDING
            ]
          }
        }
      }),
      prisma.governmentPitch.count({
        where: {
          ...pitchFilter,
          status: GovernmentPitchStatus.RM_VERIFIED
        }
      }),
      prisma.governmentPitch.count({
        where: {
          ...pitchFilter,
            status: GovernmentPitchStatus.JS_APPROVED
        }
      }),
      // Feasibility Assessments
      prisma.feasibilityAssessment.count({ where: assessmentFilter }),
      prisma.feasibilityAssessment.count({
        where: {
          ...assessmentFilter,
          submittedToJsAt: null
        }
      }),
      prisma.feasibilityAssessment.count({
        where: {
          ...assessmentFilter,
          jsDecisionAt: { not: null },
          feasibilityResult: FeasibilityResult.FEASIBLE
        }
      }),
      prisma.feasibilityAssessment.count({
        where: {
          ...assessmentFilter,
          jsDecisionAt: { not: null },
          feasibilityResult: FeasibilityResult.NOT_FEASIBLE
        }
      })
    ]);

    // Calculate average response time (days between submission and first contact)
    const enquiriesWithContact = await prisma.corporateEnquiry.findMany({
      where: {
        ...enquiryFilter,
        firstContactedAt: { not: null }
      },
      select: {
        submittedAt: true,
        firstContactedAt: true
      }
    });

    let avgResponseTimeDays = 0;
    if (enquiriesWithContact.length > 0) {
      const totalDays = enquiriesWithContact.reduce((sum, e) => {
        const diff = new Date(e.firstContactedAt!).getTime() - new Date(e.submittedAt).getTime();
        return sum + (diff / (1000 * 60 * 60 * 24));
      }, 0);
      avgResponseTimeDays = Math.round((totalDays / enquiriesWithContact.length) * 100) / 100;
    }

    // Get pending SLA items (items approaching due date)
    const slaDueSoon = await prisma.sLAEscalation.count({
      where: {
        responsibleUserId: userId,
        isResolved: false,
        dueAt: {
          lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Due in next 2 days
        }
      }
    });

    return res.json({
      corporateEnquiries: {
        total: totalEnquiries,
        pending: pendingEnquiries,
        contacted: contactedEnquiries,
        assessmentPending,
        jsApproved,
        jsRejected,
        completed
      },
      governmentPitches: {
        total: totalPitches,
        pendingVerification: pendingPitches,
        verified: verifiedPitches,
        publicListed: publicListedPitches
      },
      feasibilityAssessments: {
        total: totalAssessments,
        pendingSubmission: pendingAssessments,
        approved: approvedAssessments,
        rejected: rejectedAssessments
      },
      performance: {
        avgResponseTimeDays,
        slaItemsDueSoon: slaDueSoon
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Pending Enquiries ──────────────────────────────────────────
export const getPendingEnquiries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    const allowedRoles: Role[] = [
      Role.CSR_RELATIONSHIP_MANAGER,
      Role.JOINT_SECRETARY,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
      Role.STATE_CSR_CELL
    ];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    const where: any = {};

    if (tenantId && userRole !== Role.MASTER_ADMIN) {
      where.tenantId = tenantId;
    }

    // RM sees only their assigned enquiries or unassigned
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER) {
      where.OR = [
        { assignedRelationshipManagerId: userId },
        { assignedRelationshipManagerId: null }
      ];
    }

    if (req.query.status && typeof req.query.status === "string") {
      where.status = req.query.status;
    }
    if (req.query.district && typeof req.query.district === "string") {
      where.preferredDistricts = { has: req.query.district };
    }
    if (req.query.search && typeof req.query.search === "string") {
      where.OR = [
        { companyName: { contains: req.query.search, mode: "insensitive" } },
        { trackingId: { contains: req.query.search, mode: "insensitive" } },
        { mca21Cin: { contains: req.query.search, mode: "insensitive" } }
      ];
    }

    const [enquiries, total] = await Promise.all([
      prisma.corporateEnquiry.findMany({
        where,
        include: {
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          assignedRelationshipManager: {
            select: { id: true, email: true }
          }
        },
        orderBy: [
          { firstResponseDueAt: "asc" },
          { submittedAt: "desc" }
        ],
        skip,
        take: pageSize
      }),
      prisma.corporateEnquiry.count({ where })
    ]);

    const mapped = enquiries.map(mapCorporateEnquiryForRM);

    return res.json({
      data: mapped,
      enquiries: mapped,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get RM Enquiry Detail ─────────────────────────────────────────
export const getRMEnquiryById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { id } = req.params;
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    const where: any = { id };
    if (tenantId && userRole !== Role.MASTER_ADMIN) where.tenantId = tenantId;
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER) {
      where.OR = [
        { assignedRelationshipManagerId: userId },
        { assignedRelationshipManagerId: null }
      ];
    }

    const enquiry = await prisma.corporateEnquiry.findFirst({
      where,
      include: {
        assignedRelationshipManager: { select: { id: true, email: true } },
        interactions: {
          orderBy: { createdAt: "desc" },
          include: { actorUser: { select: { id: true, email: true } } }
        },
        feasibilityAssessment: {
          include: {
            checklistItems: { orderBy: { itemNumber: "asc" } }
          }
        }
      }
    });

    if (!enquiry) {
      return res.status(404).json({ error: "Enquiry not found or not assigned to you" });
    }

    return res.json(mapCorporateEnquiryForRM(enquiry));
  } catch (error) {
    next(error);
  }
};

// ─── Add RM Enquiry Interaction ────────────────────────────────────
export const addRMEnquiryInteraction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { id } = req.params;
    const { type, summary, notes } = req.body as { type?: string; summary?: string; notes?: string };
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    if (!summary?.trim()) {
      return res.status(400).json({ error: "Interaction summary is required" });
    }

    const where: any = { id };
    if (tenantId && userRole !== Role.MASTER_ADMIN) where.tenantId = tenantId;
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER) where.assignedRelationshipManagerId = userId;

    const enquiry = await prisma.corporateEnquiry.findFirst({ where });
    if (!enquiry) {
      return res.status(404).json({ error: "Enquiry not found or not assigned to you" });
    }

    const interaction = await prisma.corporateEnquiryInteraction.create({
      data: {
        tenantId,
        corporateEnquiryId: id,
        actorUserId: userId,
        interactionType: type === "OTHER" ? "PORTAL_NOTE" : (type || "PORTAL_NOTE"),
        note: notes?.trim() || summary.trim(),
        attachmentUrls: []
      },
      include: { actorUser: { select: { email: true } } }
    });

    await prisma.corporateEnquiry.update({
      where: { id },
      data: {
        firstContactedAt: enquiry.firstContactedAt || new Date(),
        status: enquiry.status === CorporateEnquiryStatus.SUBMITTED || enquiry.status === CorporateEnquiryStatus.RM_ASSIGNED
          ? CorporateEnquiryStatus.RM_CONTACTED
          : enquiry.status
      }
    });

    return res.status(201).json({
      id: interaction.id,
      type: interaction.interactionType,
      timestamp: interaction.createdAt,
      summary: summary.trim(),
      notes: interaction.note,
      recordedBy: interaction.actorUser.email
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Pending Pitches ────────────────────────────────────────────
export const getPendingPitches = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * pageSize;

    const allowedRoles: Role[] = [
      Role.CSR_RELATIONSHIP_MANAGER,
      Role.JOINT_SECRETARY,
      Role.SUPER_ADMIN,
      Role.PORTAL_ADMIN,
      Role.STATE_CSR_CELL,
      Role.PLANNING_SECRETARY,
      Role.CSR_ADMIN,
      Role.DISTRICT_ADMIN,
      Role.MASTER_ADMIN
    ];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    const where: any = {};
    const conditions: any[] = [];

    if (tenantId && userRole !== Role.MASTER_ADMIN) {
      conditions.push({
        OR: [
          { tenantId: tenantId },
          { tenantId: null }
        ]
      });
    }

    // RM sees only their assigned pitches
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER) {
      conditions.push({
        OR: [
          { assignedRelationshipManagerId: userId },
          { assignedRelationshipManagerId: null }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [pitches, total] = await Promise.all([
      prisma.governmentPitch.findMany({
        where,
        include: {
          photos: {
            select: {
              id: true,
              fileUrl: true,
              latitude: true,
              longitude: true
            }
          }
        },
        orderBy: [
          { verificationDueAt: "asc" }
        ],
        skip,
        take: pageSize
      }),
      prisma.governmentPitch.count({ where })
    ]);

    return res.json({
      data: pitches,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Submit Feasibility Assessment ──────────────────────────────────
export const submitFeasibilityAssessment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { id: enquiryId } = req.params;
    const body = req.body as FeasibilityAssessmentBody;

    // Only RM can submit assessments
    if (userRole !== Role.CSR_RELATIONSHIP_MANAGER &&
        userRole !== Role.SUPER_ADMIN &&
        userRole !== Role.PORTAL_ADMIN) {
      return res.status(403).json({ error: "Only Relationship Managers can submit feasibility assessments" });
    }

    // Comprehensive validation for all 13-point checklist items
    const validationErrors: string[] = [];

    if (!body.companyName || !body.companyName.trim()) {
      validationErrors.push("Company name is required");
    }
    if (!body.cin || !body.cin.trim()) {
      validationErrors.push("CIN is required");
    }
    if (!body.sector || !body.sector.trim()) {
      validationErrors.push("Sector is required");
    }
    if (!body.contactSummary || !body.contactSummary.trim()) {
      validationErrors.push("Contact summary is required");
    }
    if (!body.proposedLocationDistrict || !body.proposedLocationDistrict.trim()) {
      validationErrors.push("Proposed location district is required");
    }
    if (!body.indicativeBudget || body.indicativeBudget <= 0) {
      validationErrors.push("Valid indicative budget is required");
    }
    if (!body.developmentNeedAddressed || !body.developmentNeedAddressed.trim()) {
      validationErrors.push("Development need addressed is required");
    }
    if (!body.dateOfFirstContact) {
      validationErrors.push("Date of first contact is required");
    }
    if (!body.summaryOfInteraction || !body.summaryOfInteraction.trim()) {
      validationErrors.push("Summary of interaction is required");
    }
    if (!body.feasibilityResult) {
      validationErrors.push("Feasibility result is required");
    }
    if (!body.recommendation || !body.recommendation.trim()) {
      validationErrors.push("Recommendation is required");
    }
    if (!body.suggestedNodalOfficerDomain || !body.suggestedNodalOfficerDomain.trim()) {
      validationErrors.push("Suggested nodal officer domain is required");
    }

    // Validate 13-point checklist
    if (!body.checklistItems || !Array.isArray(body.checklistItems)) {
      validationErrors.push("13-point checklist items are required");
    } else {
      if (body.checklistItems.length !== 13) {
        validationErrors.push("All 13 checklist items must be provided");
      }

      // Validate each checklist item
      const validAnswers = ["YES", "NO", "NA"];
      for (let i = 0; i < body.checklistItems.length; i++) {
        const item = body.checklistItems[i];
        if (item.itemNumber !== i + 1) {
          validationErrors.push(`Checklist item ${i + 1}: Invalid item number`);
        }
        if (!validAnswers.includes(item.answer)) {
          validationErrors.push(`Checklist item ${i + 1}: Answer must be YES, NO, or NA`);
        }
      }
    }

    const failedCriticalItems = body.checklistItems && body.checklistItems.length === 13
      ? getFailedCriticalItems(body.checklistItems)
      : [];

    if (failedCriticalItems.length > 0 && body.feasibilityResult === "FEASIBLE") {
      validationErrors.push(
        `Critical checklist items ${failedCriticalItems.join(", ")} must be YES for FEASIBLE. Use PROCEED WITH CONDITIONS or NOT FEASIBLE.`
      );
    }
    if (body.feasibilityResult === "PROCEED_WITH_CONDITIONS" && !body.conditionText?.trim()) {
      validationErrors.push("Condition text is required for PROCEED WITH CONDITIONS");
    }
    if (body.feasibilityResult === "NOT_FEASIBLE" && !body.recommendation?.trim()) {
      validationErrors.push("Reason/recommendation is required for NOT FEASIBLE");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors
      });
    }

    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    const enquiryWhere: any = { id: enquiryId };
    if (tenantId) enquiryWhere.tenantId = tenantId;
    if (userRole === Role.CSR_RELATIONSHIP_MANAGER) enquiryWhere.assignedRelationshipManagerId = userId;

    const linkedEnquiry = await prisma.corporateEnquiry.findFirst({
      where: enquiryWhere,
      include: { feasibilityAssessment: { select: { id: true } } }
    });

    if (!linkedEnquiry) {
      return res.status(404).json({ error: "Enquiry not found or not assigned to you" });
    }
    if (linkedEnquiry.feasibilityAssessment) {
      return res.status(409).json({ error: "A feasibility assessment has already been submitted for this enquiry" });
    }

    // Generate report reference
    const year = new Date().getFullYear();
    const lastAssessment = await prisma.feasibilityAssessment.findFirst({
      where: {
        reportReference: { startsWith: `FES-MH-${year}-` }
      },
      orderBy: { createdAt: "desc" }
    });

    let nextNumber = 1;
    if (lastAssessment && lastAssessment.reportReference) {
      const parts = lastAssessment.reportReference.split("-");
      const lastNum = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }
    const reportReference = `FES-MH-${year}-${String(nextNumber).padStart(6, "0")}`;

    // Map answers to ChecklistAnswer enum
    const mapAnswer = (answer: string): ChecklistAnswer => {
      switch (answer) {
        case "YES": return ChecklistAnswer.YES;
        case "NO": return ChecklistAnswer.NO;
        case "NA": return ChecklistAnswer.NA;
        default: return ChecklistAnswer.NA;
      }
    };

    // Create assessment with checklist items
    const assessment = await prisma.feasibilityAssessment.create({
      data: {
        tenantId,
        reportReference,
        relationshipManagerId: userId,
        companyName: body.companyName.trim(),
        cin: body.cin.trim(),
        sector: body.sector.trim(),
        contactSummary: body.contactSummary.trim(),
        proposedLocationDistrict: body.proposedLocationDistrict.trim(),
        indicativeBudget: new Decimal(body.indicativeBudget),
        developmentNeedAddressed: body.developmentNeedAddressed.trim(),
        dateOfFirstContact: new Date(body.dateOfFirstContact),
        summaryOfInteraction: body.summaryOfInteraction.trim(),
        feasibilityResult: body.feasibilityResult as FeasibilityResult,
        recommendation: body.recommendation.trim(),
        suggestedNodalOfficerDomain: body.suggestedNodalOfficerDomain.trim(),
        conditionText: body.conditionText?.trim() || null,
        submittedToJsAt: new Date(),
        corporateEnquiryId: linkedEnquiry.id,
        checklistItems: {
          create: body.checklistItems.map(item => {
            const dimension = FEASIBILITY_CHECKLIST_TEMPLATE.find(d => d.itemNumber === item.itemNumber);
            return {
              tenantId,
              itemNumber: item.itemNumber,
              dimension: dimension?.dimension || "General",
              checkText: dimension?.checkText || `Checklist Item ${item.itemNumber}`,
              isCritical: dimension?.isCritical || false,
              answer: mapAnswer(item.answer),
              remarks: item.remarks?.trim() || null
            };
          })
        }
      },
      include: {
        checklistItems: true
      }
    });

    await prisma.corporateEnquiry.update({
      where: { id: linkedEnquiry.id },
      data: {
        status: CorporateEnquiryStatus.ASSESSMENT_SUBMITTED_TO_JS,
        updatedAt: new Date()
      }
    });

    await SLAEscalationService.create({
      entityType: "CORPORATE_ENQUIRY",
      entityId: linkedEnquiry.id,
      stage: "JS_DECISION",
      dueAt: calculateDueDate("JS_DECISION"),
      tenantId,
    });

    // Notify JS
    await notifyByRole(
      Role.JOINT_SECRETARY,
      "New Feasibility Assessment Submitted",
      `Feasibility assessment '${reportReference}' for ${body.companyName} has been submitted and is pending your decision.`
    );

    await auditLog(userId, "FEASIBILITY_ASSESSMENT_SUBMITTED", {
      assessmentId: assessment.id,
      reportReference,
      companyName: body.companyName,
      feasibilityResult: body.feasibilityResult
    });

    return res.status(201).json({
      message: "Feasibility assessment submitted successfully",
      assessment
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Assessment By ID ─────────────────────────────────────────
export const getAssessmentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const assessment = await prisma.feasibilityAssessment.findUnique({
      where: { id },
      include: {
        checklistItems: {
          orderBy: { itemNumber: "asc" }
        },
        relationshipManager: {
          select: { id: true, email: true, assignedDistrict: true }
        },
        jsDecisionBy: {
          select: { id: true, email: true }
        },
        corporateEnquiry: {
          select: {
            id: true,
            trackingId: true,
            companyName: true,
            status: true
          }
        },
        governmentPitch: {
          select: {
            id: true,
            pitchReferenceId: true,
            district: true,
            status: true
          }
        }
      }
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Access control
    const isRM = assessment.relationshipManagerId === userId;
    const isJS = userRole === Role.JOINT_SECRETARY || userRole === Role.STATE_CSR_CELL;
    const isAdmin = userRole === Role.SUPER_ADMIN || userRole === Role.PORTAL_ADMIN;

    if (!isRM && !isJS && !isAdmin) {
      return res.status(403).json({ error: "You don't have access to this assessment" });
    }

    // Calculate checklist summary
    const checklistSummary = {
      total: assessment.checklistItems.length,
      yes: assessment.checklistItems.filter(i => i.answer === ChecklistAnswer.YES).length,
      no: assessment.checklistItems.filter(i => i.answer === ChecklistAnswer.NO).length,
      na: assessment.checklistItems.filter(i => i.answer === ChecklistAnswer.NA).length,
      criticalPassed: assessment.checklistItems
        .filter(i => i.isCritical && i.answer === ChecklistAnswer.YES).length,
      criticalTotal: assessment.checklistItems.filter(i => i.isCritical).length
    };

    return res.json({
      ...assessment,
      checklistSummary
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get RM SLA Escalations ──────────────────────────────────────────
export const getRMEscalations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    const escalations = await prisma.sLAEscalation.findMany({
      where: {
        responsibleUserId: userId,
        isResolved: false
      },
      orderBy: { dueAt: "asc" }
    });

    return res.json({ success: true, data: escalations });
  } catch (error) {
    next(error);
  }
};
// ─── Get Corporate Pitch Interests ──────────────────────────────────
export const getCorporateInterests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const tenantId = (req as any).tenantContext?.tenantId || req.user!.tenantId || null;

    const interests = await prisma.corporatePitchInterest.findMany({
      where: {
        governmentPitch: {
          assignedRelationshipManagerId: userId
        }
      },
      include: {
        governmentPitch: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: interests });
  } catch (error) {
    next(error);
  }
};

// ─── Update Corporate Pitch Interest Coordination ───────────────────
export const updateCorporateInterest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, coordinationNotes, dialogueInitiated, nodalOfficerRecommended } = req.body;

    const interest = await prisma.corporatePitchInterest.findUnique({
      where: { id }
    });

    if (!interest) {
      return res.status(404).json({ error: "Corporate interest record not found" });
    }

    const updatedInterest = await prisma.corporatePitchInterest.update({
      where: { id },
      data: {
        status: status || undefined,
        coordinationNotes: coordinationNotes !== undefined ? coordinationNotes : undefined,
        dialogueInitiated: dialogueInitiated !== undefined ? dialogueInitiated : undefined,
        nodalOfficerRecommended: nodalOfficerRecommended !== undefined ? nodalOfficerRecommended : undefined,
        updatedAt: new Date()
      }
    });

    await auditLog(userId, "CORPORATE_INTEREST_UPDATED", {
      interestId: id,
      status,
      dialogueInitiated
    });

    return res.json({
      success: true,
      message: "Corporate interest updated successfully",
      data: updatedInterest
    });
  } catch (error) {
    next(error);
  }
};

// ─── Verify Government Pitch ─────────────────────────────────────────
export const verifyGovernmentPitch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !["RM_VERIFIED", "JS_APPROVAL_PENDING", "JS_REJECTED", "PUBLIC_LISTED", "CORPORATE_INTEREST_RECEIVED"].includes(status)) {
      return res.status(400).json({ error: "Invalid verification status" });
    }

    const pitch = await prisma.governmentPitch.findUnique({
      where: { id },
      include: { photos: true }
    });

    if (!pitch) {
      return res.status(404).json({ error: "Government pitch not found" });
    }

    // Rules verification for government pitches
    if (status === "RM_VERIFIED" || status === "JS_APPROVAL_PENDING") {
      if (pitch.photos.length < 2) {
        return res.status(400).json({ error: "Verification requires a minimum of 2 geo-tagged photos" });
      }
      if (!pitch.govtFundDeclaration) {
        return res.status(400).json({ error: "Verification requires confirmation that the work cannot be funded through available government funds" });
      }
      if (pitch.serviceClass === "BELOW_CLASS_2" && !pitch.hodCertificationDocument) {
        return res.status(400).json({ error: "Verification requires Head of Department (HOD) certification for service class below Class-2" });
      }
    }

    const updatedPitch = await prisma.governmentPitch.update({
      where: { id },
      data: {
        status: status as any,
        updatedAt: new Date()
      }
    });

    await auditLog(userId, "GOVERNMENT_PITCH_VERIFIED", {
      pitchId: id,
      status,
      remarks
    });

    return res.json({
      success: true,
      message: "Government pitch verified successfully",
      data: updatedPitch
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get RM Feasibility Assessments ─────────────────────────────────
export const getRMAssessments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const assessments = await prisma.feasibilityAssessment.findMany({
      where: {
        relationshipManagerId: userId
      },
      include: {
        corporateEnquiry: { select: { companyName: true, trackingId: true } },
        governmentPitch: { select: { officialName: true, pitchReferenceId: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ success: true, data: assessments });
  } catch (error) {
    next(error);
  }
};
