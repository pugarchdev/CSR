import prisma from "../config/db";
import { Prisma } from "@prisma/client";
import { ROLE_ID } from "../types/role";
import { ACTIVE_CASE_STATUS_EXCLUSIONS } from "./portalCaseService";

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
    caseId?: string;
  } = {}): Promise<string | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => {
          const now = new Date();
          const rms = await tx.user.findMany({
            where: {
              roleId: ROLE_ID.RELATIONSHIP_MANAGER,
              accountStatus: "ACTIVE",
              isVerified: true,
              deletedAt: null,
            },
            select: {
              id: true,
              email: true,
              rmProfile: true,
            },
            orderBy: { id: "asc" },
          });

          const availableRms = rms.filter((rm) => {
            const profile = rm.rmProfile;
            if (!profile) return true;
            if (!profile.isAvailable || profile.isOutOfOffice) return false;
            const leaveHasStarted = profile.leaveStartsAt ? profile.leaveStartsAt <= now : false;
            const leaveHasNotEnded = profile.leaveEndsAt ? profile.leaveEndsAt >= now : true;
            return !(leaveHasStarted && leaveHasNotEnded);
          });
          const rmIds = availableRms.map((rm) => rm.id);
          const workloadMap = new Map<string, number>(rmIds.map((id) => [id, 0]));

          if (rmIds.length > 0) {
            const counts = await tx.portalCase.groupBy({
              by: ["assignedRmId"],
              where: {
                assignedRmId: { in: rmIds },
                status: { notIn: ACTIVE_CASE_STATUS_EXCLUSIONS },
              },
              _count: { id: true },
            });
            counts.forEach((count) => {
              if (count.assignedRmId) workloadMap.set(count.assignedRmId, count._count.id);
            });
          }

          const eligibleRms = availableRms.filter((rm) => {
            const max = rm.rmProfile?.maxActiveWorkload;
            return max == null || (workloadMap.get(rm.id) || 0) < max;
          });
          const minWorkload = eligibleRms.length
            ? Math.min(...eligibleRms.map((rm) => workloadMap.get(rm.id) || 0))
            : null;
          const tiedIds = minWorkload == null
            ? []
            : eligibleRms
                .filter((rm) => (workloadMap.get(rm.id) || 0) === minWorkload)
                .map((rm) => rm.id)
                .sort();

          const cursor = await tx.rmAllocationCursor.findUnique({ where: { poolKey: "GLOBAL" } });
          let selectedRmId: string | null = null;
          if (tiedIds.length > 0) {
            const lastIndex = cursor?.lastSelectedUserId ? tiedIds.indexOf(cursor.lastSelectedUserId) : -1;
            if (lastIndex >= 0) {
              selectedRmId = tiedIds[(lastIndex + 1) % tiedIds.length];
            } else if (cursor?.lastSelectedUserId) {
              selectedRmId = tiedIds.find((id) => id > cursor.lastSelectedUserId!) || tiedIds[0];
            } else {
              selectedRmId = tiedIds[0];
            }
            await tx.rmAllocationCursor.upsert({
              where: { poolKey: "GLOBAL" },
              create: { poolKey: "GLOBAL", lastSelectedUserId: selectedRmId, sequence: 1n },
              update: { lastSelectedUserId: selectedRmId, sequence: { increment: 1n } },
            });
          }

          if (params.caseId) {
            const trackedCase = await tx.portalCase.findUnique({ where: { id: params.caseId }, select: { id: true } });
            if (!trackedCase) throw new Error("Tracked case not found for RM allocation");
            await tx.portalCase.update({
              where: { id: params.caseId },
              data: selectedRmId
                ? { assignedRmId: selectedRmId, currentStage: "RM_REVIEW", status: "SUBMITTED" }
                : { assignedRmId: null, currentStage: "RM_ALLOCATION", status: "UNASSIGNED" },
            });
            await tx.rmAllocationEvent.create({
              data: {
                caseId: params.caseId,
                selectedRmId,
                ruleVersion: "lowest-active-workload-round-robin-v1",
                workloadSnapshot: Object.fromEntries([...workloadMap.entries()].map(([id, workload]) => [id, { activeWorkload: workload }])),
                tieCandidateIds: tiedIds,
                cursorBefore: cursor?.lastSelectedUserId || null,
                cursorAfter: selectedRmId,
                outcome: selectedRmId ? "ASSIGNED" : "UNASSIGNED",
              },
            });
          }

          return selectedRmId;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error: any) {
        if (error?.code === "P2034" && attempt < 2) continue;
        throw error;
      }
    }
    return null;
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

      const [enquiries, pitches, cases] = await Promise.all([
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
        tx.portalCase.findMany({ where: { assignedRmId: sourceRmId, status: { notIn: ACTIVE_CASE_STATUS_EXCLUSIONS } }, select: { id: true } }),
      ]);

      let transferredEnquiryCount = 0;
      let transferredPitchCount = 0;
      let transferredCaseCount = 0;

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

      if (cases.length > 0) {
        const result = await tx.portalCase.updateMany({ where: { id: { in: cases.map(({ id }) => id) }, assignedRmId: sourceRmId, status: { notIn: ACTIVE_CASE_STATUS_EXCLUSIONS } }, data: { assignedRmId: targetRmId } });
        transferredCaseCount = result.count;
        await tx.rmAllocationEvent.createMany({ data: cases.map(({ id }) => ({ caseId: id, selectedRmId: targetRmId, ruleVersion: "supervised-transfer-v1", workloadSnapshot: { previousRmId: sourceRmId, newRmId: targetRmId, reason }, tieCandidateIds: [], cursorBefore: null, cursorAfter: null, outcome: "REASSIGNED" })) });
      }

      // A concurrent status/assignment change must abort the complete handover;
      // otherwise its audit trail could claim that an entity moved when it did not.
      if (transferredEnquiryCount !== enquiries.length || transferredPitchCount !== pitches.length || transferredCaseCount !== cases.length) {
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
        ...cases.map(({ id }) => ({ actorUserId: transferredById, action: "TRANSFER_RM_CASE_PORTFOLIO", entityType: "PortalCase", entityId: id, details: { previousRmId: sourceRmId, newRmId: targetRmId, reason, transferredAt } })),
      ];

      if (auditEntries.length > 0) {
        await tx.auditLog.createMany({ data: auditEntries });
      }

      const enquiryCount = enquiries.length;
      const pitchCount = pitches.length;
      const caseCount = cases.length;
      const totalCount = caseCount || enquiryCount + pitchCount;
      await tx.notification.create({
        data: {
          userId: targetRmId,
          recipientId: targetRmId,
          title: "Relationship Manager Portfolio Transferred",
          message: `A portfolio of ${totalCount} active tracked case${totalCount === 1 ? "" : "s"} has been transferred to you. Reason: ${reason}`,
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
        caseCount,
        totalCount,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

export const autoAssignRelationshipManager = RmAssignmentService.autoAssignRm;
export const selectLeastLoadedRm = (preferredDistrict?: string | null) =>
  RmAssignmentService.autoAssignRm(typeof preferredDistrict === "string" ? { district: preferredDistrict } : (preferredDistrict || {}));
