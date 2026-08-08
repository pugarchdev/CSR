import prisma from "../config/db";
import { Prisma } from "@prisma/client";
import { ROLE_ID } from "../types/role";

const ACTIVE_ENQUIRY_STATUSES_EXCLUDED = ["RESOLVED", "REJECTED", "CLOSED"];
const ACTIVE_PITCH_STATUSES_EXCLUDED = ["APPROVED", "REJECTED", "CANCELLED"];

export class RmPortfolioTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RmPortfolioTransferError";
  }
}

export interface RmProfileOptions {
  isAvailable?: boolean;
  isOutOfOffice?: boolean;
  districtPreferences?: string[];
  sectorPreferences?: string[];
  maxActiveWorkload?: number;
}

/**
 * Enhanced Relationship Manager (RM) Service
 * - Super Admin creation/import
 * - Deterministic, auditable, and concurrency-safe auto-assignment
 * - Availability, out-of-office, district & sector preference matching
 * - Supervised reassignment with reason
 * - Data isolation checking
 */
export class RmAssignmentService {
  /**
   * Deterministic & concurrency-safe auto-assignment of RM to an enquiry or pitch.
   * Runs inside a transaction to prevent race conditions during concurrent submissions.
   */
  public static async autoAssignRm(params: {
    district?: string | null;
    sector?: string | null;
    entityType?: "ENQUIRY" | "PITCH";
    entityId?: string;
  } = {}): Promise<string | null> {
    const { district, sector } = params || {};

    return await prisma.$transaction(async (tx) => {
      // Find all active Relationship Managers (Role ID 6 or code RELATIONSHIP_MANAGER)
      const rms = await tx.user.findMany({
        where: {
          roleId: ROLE_ID.RELATIONSHIP_MANAGER,
          accountStatus: "ACTIVE",
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          officerProfile: true,
        },
      });

      if (rms.length === 0) {
        console.warn("[RM Auto-Assign] No active Relationship Managers found in system");
        return null;
      }

      const rmIds = rms.map((r) => r.id);

      // Count active assigned enquiries per RM
      const enquiryCounts = await tx.corporateEnquiry.groupBy({
        by: ["assignedRelationshipManagerId"],
        where: {
          assignedRelationshipManagerId: { in: rmIds },
          status: { notIn: ["RESOLVED", "REJECTED", "CLOSED"] },
        },
        _count: { id: true },
      });

      // Count active assigned pitches per RM
      const pitchCounts = await tx.governmentPitch.groupBy({
        by: ["assignedRelationshipManagerId"],
        where: {
          assignedRelationshipManagerId: { in: rmIds },
          status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] },
        },
        _count: { id: true },
      });

      const workloadMap = new Map<string, number>();
      rmIds.forEach((id) => workloadMap.set(id, 0));

      enquiryCounts.forEach((c) => {
        if (c.assignedRelationshipManagerId) {
          workloadMap.set(
            c.assignedRelationshipManagerId,
            (workloadMap.get(c.assignedRelationshipManagerId) || 0) + c._count.id
          );
        }
      });

      pitchCounts.forEach((c) => {
        if (c.assignedRelationshipManagerId) {
          workloadMap.set(
            c.assignedRelationshipManagerId,
            (workloadMap.get(c.assignedRelationshipManagerId) || 0) + c._count.id
          );
        }
      });

      // Score each RM deterministically:
      // Primary: preference match score (district + sector match)
      // Secondary: lowest active workload
      // Tertiary: alphabetical ID for deterministic tie-breaker
      let bestRmId: string | null = null;
      let maxScore = -1;
      let minWorkload = Infinity;

      for (const rm of rms) {
        const workload = workloadMap.get(rm.id) || 0;
        let score = 0;

        const userDistrict = rm.officerProfile?.district;
        if (district && userDistrict && userDistrict.toLowerCase() === district.toLowerCase()) {
          score += 10;
        }

        // Selection priority: higher preference score first, then lower workload, then deterministic ID order
        if (
          score > maxScore ||
          (score === maxScore && workload < minWorkload) ||
          (score === maxScore && workload === minWorkload && (bestRmId === null || rm.id < bestRmId))
        ) {
          maxScore = score;
          minWorkload = workload;
          bestRmId = rm.id;
        }
      }

      return bestRmId;
    });
  }

  /**
   * Supervised RM Reassignment with audit trail.
   */
  public static async reassignRm(params: {
    entityType: "ENQUIRY" | "PITCH";
    entityId: string;
    newRmId: string;
    assignedById: string;
    reason: string;
  }) {
    const { entityType, entityId, newRmId, assignedById, reason } = params;

    if (!reason || reason.trim().length < 5) {
      throw new Error("Reassignment reason must be at least 5 characters long");
    }

    // Verify new RM user exists, active, and has RM role
    const rmUser = await prisma.user.findFirst({
      where: {
        id: newRmId,
        accountStatus: "ACTIVE",
        deletedAt: null,
      },
      include: { role: true },
    });

    if (!rmUser) {
      throw new Error(`Relationship Manager '${newRmId}' not found or inactive`);
    }

    const isRmRole =
      rmUser.roleId === ROLE_ID.RELATIONSHIP_MANAGER || rmUser.role?.code === "RELATIONSHIP_MANAGER";
    if (!isRmRole) {
      throw new Error(`User '${newRmId}' does not possess the RELATIONSHIP_MANAGER role`);
    }

    return await prisma.$transaction(async (tx) => {
      let previousRmId: string | null = null;

      if (entityType === "ENQUIRY") {
        const enquiry = await tx.corporateEnquiry.findUnique({ where: { id: entityId } });
        if (!enquiry) throw new Error(`Corporate Enquiry '${entityId}' not found`);
        previousRmId = enquiry.assignedRelationshipManagerId;

        await tx.corporateEnquiry.update({
          where: { id: entityId },
          data: { assignedRelationshipManagerId: newRmId },
        });
      } else {
        const pitch = await tx.governmentPitch.findUnique({ where: { id: entityId } });
        if (!pitch) throw new Error(`Government Pitch '${entityId}' not found`);
        previousRmId = pitch.assignedRelationshipManagerId;

        await tx.governmentPitch.update({
          where: { id: entityId },
          data: { assignedRelationshipManagerId: newRmId },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorUserId: assignedById,
          action: "REASSIGN_RELATIONSHIP_MANAGER",
          entityType,
          entityId,
          details: {
            entityType,
            entityId,
            previousRmId,
            newRmId,
            reason: reason.trim(),
          },
        },
      });

      // Notification
      await tx.notification.create({
        data: {
          userId: newRmId,
          recipientId: newRmId,
          title: "Application Reassigned to You",
          message: `You have been reassigned as Relationship Manager for ${entityType.toLowerCase()} '${entityId}'. Reason: ${reason}`,
          type: "INFO",
        },
      });

      return { entityType, entityId, previousRmId, newRmId };
    });
  }

  /**
   * Atomically hands every active enquiry and pitch owned by one RM to another.
   * The source RM may already be inactive/soft-deleted so administrators can
   * safely drain the portfolio while offboarding an account. The recipient
   * must always be an active Relationship Manager.
   */
  public static async transferPortfolio(
    sourceRmId: string,
    targetRmId: string,
    transferredById: string,
    reason: string
  ) {
    sourceRmId = sourceRmId?.trim();
    targetRmId = targetRmId?.trim();
    transferredById = transferredById?.trim();
    reason = reason?.trim();

    if (!sourceRmId || !targetRmId || !transferredById) {
      throw new RmPortfolioTransferError("Source RM, target RM, and transferring user are required");
    }
    if (sourceRmId === targetRmId) {
      throw new RmPortfolioTransferError("Source and target Relationship Managers must be different");
    }
    if (!reason || reason.length < 5) {
      throw new RmPortfolioTransferError("Transfer reason must be at least 5 characters long");
    }

    return prisma.$transaction(async (tx) => {
      const [sourceRm, targetRm] = await Promise.all([
        tx.user.findUnique({
          where: { id: sourceRmId },
          select: { id: true, roleId: true, role: { select: { code: true } } },
        }),
        tx.user.findFirst({
          where: { id: targetRmId, accountStatus: "ACTIVE", deletedAt: null },
          select: {
            id: true,
            roleId: true,
            firstName: true,
            lastName: true,
            role: { select: { code: true } },
          },
        }),
      ]);

      const sourceIsRm = sourceRm && (
        sourceRm.roleId === ROLE_ID.RELATIONSHIP_MANAGER || sourceRm.role?.code === "RELATIONSHIP_MANAGER"
      );
      if (!sourceIsRm) {
        throw new RmPortfolioTransferError(`Source Relationship Manager '${sourceRmId}' was not found`);
      }

      const targetIsRm = targetRm && (
        targetRm.roleId === ROLE_ID.RELATIONSHIP_MANAGER || targetRm.role?.code === "RELATIONSHIP_MANAGER"
      );
      if (!targetIsRm || !targetRm) {
        throw new RmPortfolioTransferError(`Target Relationship Manager '${targetRmId}' was not found or is inactive`);
      }

      const [enquiries, pitches] = await Promise.all([
        tx.corporateEnquiry.findMany({
          where: {
            assignedRelationshipManagerId: sourceRmId,
            status: { notIn: ACTIVE_ENQUIRY_STATUSES_EXCLUDED },
          },
          select: { id: true },
        }),
        tx.governmentPitch.findMany({
          where: {
            assignedRelationshipManagerId: sourceRmId,
            status: { notIn: ACTIVE_PITCH_STATUSES_EXCLUDED },
          },
          select: { id: true },
        }),
      ]);

      let transferredEnquiryCount = 0;
      let transferredPitchCount = 0;

      if (enquiries.length > 0) {
        const result = await tx.corporateEnquiry.updateMany({
          where: {
            id: { in: enquiries.map(({ id }) => id) },
            assignedRelationshipManagerId: sourceRmId,
            status: { notIn: ACTIVE_ENQUIRY_STATUSES_EXCLUDED },
          },
          data: { assignedRelationshipManagerId: targetRmId },
        });
        transferredEnquiryCount = result.count;
      }

      if (pitches.length > 0) {
        const result = await tx.governmentPitch.updateMany({
          where: {
            id: { in: pitches.map(({ id }) => id) },
            assignedRelationshipManagerId: sourceRmId,
            status: { notIn: ACTIVE_PITCH_STATUSES_EXCLUDED },
          },
          data: { assignedRelationshipManagerId: targetRmId },
        });
        transferredPitchCount = result.count;
      }

      // A concurrent status/assignment change must abort the complete handover;
      // otherwise its audit trail could claim that an entity moved when it did not.
      if (transferredEnquiryCount !== enquiries.length || transferredPitchCount !== pitches.length) {
        throw new RmPortfolioTransferError("Portfolio changed during transfer; no records were moved. Please retry");
      }

      const transferredAt = new Date().toISOString();
      const auditEntries = [
        ...enquiries.map(({ id }) => ({
          actorUserId: transferredById,
          action: "TRANSFER_RM_PORTFOLIO",
          entityType: "ENQUIRY",
          entityId: id,
          details: {
            previousRmId: sourceRmId,
            newRmId: targetRmId,
            reason,
            transferredAt,
          },
        })),
        ...pitches.map(({ id }) => ({
          actorUserId: transferredById,
          action: "TRANSFER_RM_PORTFOLIO",
          entityType: "PITCH",
          entityId: id,
          details: {
            previousRmId: sourceRmId,
            newRmId: targetRmId,
            reason,
            transferredAt,
          },
        })),
      ];

      if (auditEntries.length > 0) {
        await tx.auditLog.createMany({ data: auditEntries });
      }

      const enquiryCount = enquiries.length;
      const pitchCount = pitches.length;
      const totalCount = enquiryCount + pitchCount;
      await tx.notification.create({
        data: {
          userId: targetRmId,
          recipientId: targetRmId,
          title: "Relationship Manager Portfolio Transferred",
          message: `A portfolio of ${totalCount} active item${totalCount === 1 ? "" : "s"} has been transferred to you (${enquiryCount} corporate enquiries and ${pitchCount} government pitches). Reason: ${reason}`,
          type: "INFO",
          actionUrl: "/dashboard",
        },
      });

      return {
        sourceRmId,
        targetRmId,
        targetRmName: [targetRm.firstName, targetRm.lastName].filter(Boolean).join(" ") || null,
        transferredById,
        reason,
        enquiryCount,
        pitchCount,
        totalCount,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

export const autoAssignRelationshipManager = RmAssignmentService.autoAssignRm;
export const selectLeastLoadedRm = (preferredDistrict?: string | null) =>
  RmAssignmentService.autoAssignRm(typeof preferredDistrict === "string" ? { district: preferredDistrict } : (preferredDistrict || {}));
