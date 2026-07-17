import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { successResponse, errorResponse, unauthorizedResponse } from "../utils/apiResponse";
import { SLAStage } from "@prisma/client";
import { Role } from "../types/role";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    tenantId?: string | null;
    organizationId?: string | null;
  };
}

export const getSecretaryEscalations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const tenantId = req.user?.tenantId;
    const now = new Date();

    // Fetch all unresolved SLAEscalation records
    const escalations = await prisma.sLAEscalation.findMany({
      where: {
        isResolved: false,
      },
      include: {
        responsibleUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { dueAt: "asc" },
    });

    const mappedEscalations = await Promise.all(
      escalations.map(async (esc) => {
        let title = "Escalation";
        let description = "SLA Breach Action Required";
        let raisedByName = "System SLA Monitor";
        let raisedByRole = "SLA_SYSTEM";

        // Fetch details of referenced entity
        if (esc.entityType === "CORPORATE_ENQUIRY") {
          const ce = await prisma.corporateEnquiry.findUnique({
            where: { id: esc.entityId },
            include: {
              assignedRelationshipManager: {
                select: { id: true, email: true },
              },
            },
          });
          if (ce) {
            title = `Corporate Enquiry - ${ce.companyName}`;
            description = `SLA breach: RM failed to respond within SLA guidelines. Company: ${ce.companyName}. Sector: ${ce.sector || "N/A"}.`;
            if (ce.assignedRelationshipManager) {
              raisedByName = ce.assignedRelationshipManager.email.split("@")[0];
              raisedByRole = "Relationship Manager";
            }
          }
        } else if (esc.entityType === "GOVERNMENT_PITCH") {
          const gp = await prisma.governmentPitch.findUnique({
            where: { id: esc.entityId },
            include: {
              assignedRelationshipManager: {
                select: { id: true, email: true },
              },
            },
          });
          if (gp) {
            title = `Government Pitch - ${gp.department}`;
            description = `SLA breach: RM failed to verify pitch. Department: ${gp.department}. District: ${gp.district || "N/A"}.`;
            if (gp.assignedRelationshipManager) {
              raisedByName = gp.assignedRelationshipManager.email.split("@")[0];
              raisedByRole = "Relationship Manager";
            }
          }
        }

        const daysOverdue = Math.floor(
          (now.getTime() - new Date(esc.dueAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        let type: "RM_MISSED_DEADLINE" | "JS_MISSED_DECISION" | "FINAL_ESCALATION" = "RM_MISSED_DEADLINE";
        if (esc.stage === "SECRETARY_ESCALATION") {
          type = daysOverdue > 2 ? "FINAL_ESCALATION" : "JS_MISSED_DECISION";
        } else if (esc.stage === "RM_RESPONSE") {
          type = "RM_MISSED_DEADLINE";
        } else if (esc.stage === "JS_DECISION") {
          type = "JS_MISSED_DECISION";
        }

        let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
        if (daysOverdue > 7) {
          priority = "URGENT";
        } else if (daysOverdue > 3) {
          priority = "HIGH";
        } else if (daysOverdue > 0) {
          priority = "MEDIUM";
        } else {
          priority = "LOW";
        }

        return {
          id: esc.id,
          type,
          referenceId: esc.entityId,
          referenceType: esc.entityType,
          title,
          description,
          raisedBy: {
            id: esc.responsibleUserId || "system",
            name: raisedByName,
            role: raisedByRole,
          },
          raisedDate: esc.createdAt.toISOString(),
          deadlineDate: esc.dueAt.toISOString(),
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          status: "PENDING",
          priority,
        };
      })
    );

    // Group escalations for Planning Secretary as expected by the frontend structure
    const rmMissedDeadlines = mappedEscalations.filter((esc) => esc.type === "RM_MISSED_DEADLINE");
    const jsMissedDecisions = mappedEscalations.filter((esc) => esc.type === "JS_MISSED_DECISION");
    const finalEscalations = mappedEscalations.filter((esc) => esc.type === "FINAL_ESCALATION");

    return successResponse(
      res,
      {
        rmMissedDeadlines,
        jsMissedDecisions,
        finalEscalations,
      },
      "Secretary escalations retrieved successfully"
    );
  } catch (error) {
    console.error("Error in getSecretaryEscalations:", error);
    return errorResponse(res, "Failed to retrieve escalations", 500);
  }
};

export const resolveSecretaryEscalation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    const { decision, notes } = req.body;

    if (!userId) {
      return unauthorizedResponse(res, "User not authenticated");
    }

    const escalation = await prisma.sLAEscalation.findFirst({
      where: {
        id,
      },
    });

    if (!escalation) {
      return errorResponse(res, "Escalation not found", 404);
    }

    const now = new Date();

    // Update SLAEscalation status to resolved
    await prisma.sLAEscalation.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: now,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: `SECRETARY_ESCALATION_RESOLVED`,
        entityType: "SLAEscalation",
        entityId: id,
        details: {
          decision,
          notes,
          resolvedAt: now,
        },
      },
    });

    return successResponse(res, null, "Escalation resolved successfully");
  } catch (error) {
    console.error("Error in resolveSecretaryEscalation:", error);
    return errorResponse(res, "Failed to resolve escalation", 500);
  }
};
