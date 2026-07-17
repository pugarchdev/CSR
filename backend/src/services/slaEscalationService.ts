/**
 * SLA Escalation Service
 * 
 * Maharashtra CSR Portal - Convergence Framework
 * 
 * This service manages SLA (Service Level Agreement) tracking and escalation
 * for various processes in the CSR convergence framework. Implements the
 * 5-3-2 escalation rule for government officer responsibilities.
 * 
 * SLA Timelines:
 * - RM_RESPONSE: 5 days (for Relationship Manager to respond)
 * - JS_DECISION: 5 days for report decision / nodal appointment
 * - SECRETARY_ESCALATION: 2 days after JS missed deadline
 * - GOVERNMENT_PITCH_VERIFICATION: 5 days
 * - GRIEVANCE_LEVEL_1: 15 days
 * - GRIEVANCE_LEVEL_2: 30 days
 * - STATIC_HELPDESK: 2 days
 */

import prisma from "../config/db";
import { SLAStage } from "@prisma/client";

/**
 * SLA Timeline Constants (in days)
 */
export const SLA_TIMELINES = {
  /** Relationship Manager has 5 days to respond to corporate enquiry */
  RM_RESPONSE: 5,

  /** Joint Secretary has 5 days for report decision / nodal appointment */
  JS_DECISION: 5,

  /** Joint Secretary has only 3 days when an RM-missed enquiry escalates to them */
  JS_ESCALATED_RESPONSE: 3,

  /** Planning Secretary has 2 days to intervene after JS misses deadline */
  SECRETARY_ESCALATION: 2,
  
  /** Government pitch verification has 5 days */
  GOVERNMENT_PITCH_VERIFICATION: 5,
  
  /** Grievance Level 1 resolution time: 15 days */
  GRIEVANCE_LEVEL_1: 15,
  
  /** Grievance Level 2 resolution time: 30 days after escalation */
  GRIEVANCE_LEVEL_2: 30,
  
  /** Static helpdesk response time: 2 days */
  STATIC_HELPDESK: 2,

  /** Nodal officer must be resolved/notified for an approved project: 2 days */
  NODAL_ASSIGNMENT: 2,

  /** Nodal officer has 3 days to assign a field officer */
  FIELD_OFFICER_ASSIGNMENT: 3,
} as const;

export type SLATimelineKey = keyof typeof SLA_TIMELINES;

/**
 * Entity types that can have SLA escalations
 */
export type EscalationEntityType =
  | "CORPORATE_ENQUIRY"
  | "GOVERNMENT_PITCH"
  | "GRIEVANCE"
  | "PROJECT_MILESTONE"
  | "UTILIZATION_CERTIFICATE"
  | "STATIC_HELPDESK"
  | "CONVERGENCE_PROJECT";

/**
 * Escalation level definitions
 */
export const ESCALATION_LEVELS = {
  LEVEL_1_RM: 1,          // Relationship Manager
  LEVEL_2_JS: 2,          // Joint Secretary
  LEVEL_3_SECRETARY: 3,   // Planning Secretary
  LEVEL_4_MINISTER: 4,    // Minister level (final)
} as const;

/**
 * Interface for creating an SLA escalation record
 */
export interface CreateSLAEscalationInput {
  entityType: EscalationEntityType;
  entityId: string;
  stage: SLAStage;
  responsibleUserId?: string;
  dueAt: Date;
  tenantId?: string;
}

/**
 * Interface for escalation result
 */
export interface EscalationResult {
  success: boolean;
  escalationId?: string;
  message: string;
  escalatedToLevel?: number;
  escalatedToUserId?: string;
}

/**
 * Interface for overdue escalation
 */
export interface OverdueEscalation {
  id: string;
  entityType: string;
  entityId: string;
  stage: SLAStage;
  dueAt: Date;
  daysOverdue: number;
  responsibleUserId?: string;
  escalatedToUserId?: string;
}

/**
 * Calculate due date based on SLA stage and start date
 * 
 * @param stage - The SLA stage
 * @param startDate - The start date (defaults to now)
 * @returns The calculated due date
 */
export function calculateDueDate(stage: SLAStage, startDate: Date = new Date()): Date {
  const dueDate = new Date(startDate);
  
  switch (stage) {
    case "RM_RESPONSE":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.RM_RESPONSE);
      break;
    case "JS_DECISION":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.JS_DECISION);
      break;
    case "SECRETARY_ESCALATION":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.SECRETARY_ESCALATION);
      break;
    case "GOVERNMENT_PITCH_VERIFICATION":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.GOVERNMENT_PITCH_VERIFICATION);
      break;
    case "GRIEVANCE_LEVEL_1":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.GRIEVANCE_LEVEL_1);
      break;
    case "GRIEVANCE_LEVEL_2":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.GRIEVANCE_LEVEL_2);
      break;
    case "STATIC_HELPDESK":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.STATIC_HELPDESK);
      break;
    case "NODAL_ASSIGNMENT":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.NODAL_ASSIGNMENT);
      break;
    case "FIELD_OFFICER_ASSIGNMENT":
      dueDate.setDate(dueDate.getDate() + SLA_TIMELINES.FIELD_OFFICER_ASSIGNMENT);
      break;
    default:
      // Default to 5 days for unknown stages
      dueDate.setDate(dueDate.getDate() + 5);
  }
  
  return dueDate;
}

/**
 * Create a new SLA escalation record
 * 
 * Business Logic:
 * - Creates a tracking record for SLA compliance
 * - Sets the due date based on the stage timeline
 * - Assigns responsibility to the appropriate user
 * 
 * @param input - The escalation input data
 * @returns The created escalation record
 */
export async function createSLAEscalation(
  input: CreateSLAEscalationInput
): Promise<ReturnType<typeof prisma.sLAEscalation.create>> {
  try {
    const escalation = await prisma.sLAEscalation.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        stage: input.stage,
        responsibleUserId: input.responsibleUserId,
        dueAt: input.dueAt,
        isResolved: false,
      },
    });

    console.log(`SLA escalation created: ${escalation.id} for ${input.entityType}:${input.entityId}`);
    return escalation;
  } catch (error) {
    console.error("Error creating SLA escalation:", error);
    throw new Error("Failed to create SLA escalation record");
  }
}

/**
 * Check for overdue escalations
 * 
 * Business Logic:
 * - Finds all unresolved escalations past their due date
 * - Calculates days overdue for prioritization
 * - Returns ordered list by severity (most overdue first)
 * 
 * @returns Array of overdue escalations with metadata
 */
export async function checkOverdueEscalations(): Promise<OverdueEscalation[]> {
  try {
    const now = new Date();
    
    const overdueRecords = await prisma.sLAEscalation.findMany({
      where: {
        isResolved: false,
        dueAt: {
          lt: now,
        },
      },
      orderBy: {
        dueAt: "asc",
      },
    });

    return overdueRecords.map((record) => {
      const daysOverdue = Math.floor(
        (now.getTime() - record.dueAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: record.id,
        entityType: record.entityType,
        entityId: record.entityId,
        stage: record.stage,
        dueAt: record.dueAt,
        daysOverdue,
        responsibleUserId: record.responsibleUserId || undefined,
        escalatedToUserId: record.escalatedToUserId || undefined,
      };
    });
  } catch (error) {
    console.error("Error checking overdue escalations:", error);
    throw new Error("Failed to check overdue escalations");
  }
}

/**
 * Resolve an escalation
 * 
 * Business Logic:
 * - Marks the escalation as resolved
 * - Records resolution timestamp
 * - Prevents further escalation actions
 * 
 * @param escalationId - The escalation ID to resolve
 * @returns The updated escalation record
 */
export async function resolveEscalation(
  escalationId: string
): Promise<ReturnType<typeof prisma.sLAEscalation.update>> {
  try {
    const escalation = await prisma.sLAEscalation.update({
      where: { id: escalationId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    console.log(`SLA escalation resolved: ${escalationId}`);
    return escalation;
  } catch (error) {
    console.error("Error resolving escalation:", error);
    throw new Error("Failed to resolve escalation");
  }
}

/**
 * Get the next escalation level based on current stage
 * 
 * @param currentStage - The current SLA stage
 * @returns The next stage or null if at final level
 */
export function getNextEscalationStage(currentStage: SLAStage): SLAStage | null {
  switch (currentStage) {
    case "RM_RESPONSE":
      return "JS_DECISION";
    case "JS_DECISION":
      return "SECRETARY_ESCALATION";
    case "GRIEVANCE_LEVEL_1":
      return "GRIEVANCE_LEVEL_2";
    default:
      return null; // Final escalation level
  }
}

/**
 * Find user by role for escalation
 * 
 * @param role - The role to search for
 * @param district - Optional district filter
 * @returns User ID or null if not found
 */
async function findUserByRole(role: string, district?: string): Promise<string | null> {
  const where: any = { role };
  
  if (district) {
    where.assignedDistrict = district;
  }

  const user = await prisma.user.findFirst({
    where,
    select: { id: true },
  });

  return user?.id || null;
}

/**
 * Escalate to the next level (5-3-2 Rule Implementation)
 * 
 * Business Logic - The 5-3-2 Rule:
 * - Level 1 (RM): 5 days to respond
 * - Level 2 (JS): 3 days to review after RM misses
 * - Level 3 (Secretary): 2 days after JS misses
 * 
 * This implements the Maharashtra Government's escalation matrix for CSR
 * convergence framework compliance.
 * 
 * @param escalationId - The current escalation ID
 * @param district - Optional district for finding appropriate officer
 * @returns Escalation result with success status
 */
export async function escalateToNextLevel(
  escalationId: string,
  district?: string
): Promise<EscalationResult> {
  try {
    // Get current escalation record
    const currentEscalation = await prisma.sLAEscalation.findUnique({
      where: { id: escalationId },
    });

    if (!currentEscalation) {
      return {
        success: false,
        message: "Escalation record not found",
      };
    }

    if (currentEscalation.isResolved) {
      return {
        success: false,
        message: "Escalation already resolved",
      };
    }

    const nextStage = getNextEscalationStage(currentEscalation.stage);

    if (!nextStage) {
      return {
        success: false,
        message: "Already at final escalation level",
      };
    }

    // Determine who to escalate to based on stage
    let targetRole: string | null = null;
    let escalationLevel: number = 0;

    switch (nextStage) {
      case "JS_DECISION":
        targetRole = "JOINT_SECRETARY";
        escalationLevel = ESCALATION_LEVELS.LEVEL_2_JS;
        break;
      case "SECRETARY_ESCALATION":
        targetRole = "PLANNING_SECRETARY";
        escalationLevel = ESCALATION_LEVELS.LEVEL_3_SECRETARY;
        break;
      case "GRIEVANCE_LEVEL_2":
        targetRole = "STATE_CSR_CELL";
        escalationLevel = ESCALATION_LEVELS.LEVEL_3_SECRETARY;
        break;
      default:
        targetRole = null;
    }

    if (!targetRole) {
      return {
        success: false,
        message: "Cannot determine escalation target",
      };
    }

    // Find the appropriate user
    const escalatedToUserId = await findUserByRole(targetRole, district);

    if (!escalatedToUserId) {
      return {
        success: false,
        message: `No user found with role: ${targetRole}`,
      };
    }

    // Calculate new due date. Escalated JS response uses the shorter 3-day
    // window from the PDF SLA table, not the standard 5-day JS_DECISION.
    const newDueAt =
      nextStage === "JS_DECISION" && currentEscalation.stage === "RM_RESPONSE"
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + SLA_TIMELINES.JS_ESCALATED_RESPONSE);
            return d;
          })()
        : calculateDueDate(nextStage);

    // Create new escalation record
    const newEscalation = await prisma.sLAEscalation.create({
      data: {
        entityType: currentEscalation.entityType,
        entityId: currentEscalation.entityId,
        stage: nextStage,
        responsibleUserId: escalatedToUserId,
        dueAt: newDueAt,
        isResolved: false,
      },
    });

    // Mark old escalation as escalated
    await prisma.sLAEscalation.update({
      where: { id: escalationId },
      data: {
        escalatedToUserId,
        escalatedAt: new Date(),
      },
    });

    // Send notification to escalated user
    await prisma.notification.create({
      data: {
        userId: escalatedToUserId,
        title: "SLA Escalation Alert",
        message: `An ${currentEscalation.entityType} has been escalated to you. Stage: ${nextStage}. Due: ${newDueAt.toLocaleDateString()}`,
        type: "IN_APP",
      },
    });

    return {
      success: true,
      escalationId: newEscalation.id,
      message: `Escalated to ${targetRole}`,
      escalatedToLevel: escalationLevel,
      escalatedToUserId,
    };
  } catch (error) {
    console.error("Error escalating to next level:", error);
    return {
      success: false,
      message: "Failed to escalate to next level",
    };
  }
}

/**
 * Get SLA statistics
 * 
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @returns SLA statistics summary
 */
export async function getSLAStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEscalations: number;
  resolvedCount: number;
  overdueCount: number;
  byStage: Record<SLAStage, number>;
  averageResolutionDays: number;
}> {
  try {
    const dateFilter: any = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = startDate;
      if (endDate) dateFilter.createdAt.lte = endDate;
    }

    const [
      totalEscalations,
      resolvedCount,
      overdueCount,
      byStage,
      resolvedEscalations,
    ] = await Promise.all([
      prisma.sLAEscalation.count({ where: dateFilter }),
      prisma.sLAEscalation.count({ where: { ...dateFilter, isResolved: true } }),
      prisma.sLAEscalation.count({
        where: {
          ...dateFilter,
          isResolved: false,
          dueAt: { lt: new Date() },
        },
      }),
      prisma.sLAEscalation.groupBy({
        by: ["stage"],
        where: dateFilter,
        _count: { stage: true },
      }),
      prisma.sLAEscalation.findMany({
        where: { ...dateFilter, isResolved: true },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    // Calculate average resolution days
    let totalDays = 0;
    resolvedEscalations.forEach((esc) => {
      if (esc.resolvedAt) {
        const days = Math.floor(
          (esc.resolvedAt.getTime() - esc.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalDays += days;
      }
    });

    const averageResolutionDays = resolvedCount > 0 ? totalDays / resolvedCount : 0;

    // Convert stage counts to record
    const byStageRecord: Record<SLAStage, number> = {
      RM_RESPONSE: 0,
      JS_DECISION: 0,
      SECRETARY_ESCALATION: 0,
      GOVERNMENT_PITCH_VERIFICATION: 0,
      GRIEVANCE_LEVEL_1: 0,
      GRIEVANCE_LEVEL_2: 0,
      STATIC_HELPDESK: 0,
      NODAL_ASSIGNMENT: 0,
      FIELD_OFFICER_ASSIGNMENT: 0,
    };

    byStage.forEach((group) => {
      byStageRecord[group.stage] = group._count.stage;
    });

    return {
      totalEscalations,
      resolvedCount,
      overdueCount,
      byStage: byStageRecord,
      averageResolutionDays: Math.round(averageResolutionDays * 100) / 100,
    };
  } catch (error) {
    console.error("Error getting SLA statistics:", error);
    throw new Error("Failed to get SLA statistics");
  }
}

/**
 * Service class for SLA escalation operations
 * Provides a consolidated interface for all SLA operations
 */
export class SLAEscalationService {
  /**
   * Create a new escalation record
   */
  static async create(input: CreateSLAEscalationInput) {
    return createSLAEscalation(input);
  }

  /**
   * Check for overdue escalations
   */
  static async checkOverdue(): Promise<OverdueEscalation[]> {
    return checkOverdueEscalations();
  }

  /**
   * Resolve an escalation
   */
  static async resolve(escalationId: string) {
    return resolveEscalation(escalationId);
  }

  /**
   * Escalate to next level
   */
  static async escalate(
    escalationId: string,
    district?: string
  ): Promise<EscalationResult> {
    return escalateToNextLevel(escalationId, district);
  }

  /**
   * Calculate due date for a stage
   */
  static calculateDueDate(stage: SLAStage, startDate?: Date): Date {
    return calculateDueDate(stage, startDate);
  }

  /**
   * Get SLA statistics
   */
  static async getStatistics(startDate?: Date, endDate?: Date) {
    return getSLAStatistics(startDate, endDate);
  }

  /**
   * Auto-escalate overdue items
   * 
   * Business Logic:
   * - Runs periodically to check for overdue escalations
   * - Automatically escalates items past their due date
   * - Returns summary of actions taken
   */
  static async autoEscalate(): Promise<{
    processed: number;
    escalated: number;
    failed: number;
  }> {
    const overdue = await checkOverdueEscalations();
    let escalated = 0;
    let failed = 0;

    for (const item of overdue) {
      // Only escalate if overdue by at least 1 day
      if (item.daysOverdue >= 1) {
        const result = await escalateToNextLevel(item.id);
        if (result.success) {
          escalated++;
        } else {
          failed++;
        }
      }
    }

    return {
      processed: overdue.length,
      escalated,
      failed,
    };
  }
}

export default SLAEscalationService;
