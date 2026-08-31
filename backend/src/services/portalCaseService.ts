import { GeographicScope, PortalCaseType, Prisma } from "@prisma/client";
import prisma from "../config/db";

type DbClient = any;

const CLOSED_CASE_STATUSES = new Set([
  "APPROVED",
  "JS_APPROVED",
  "JS_REJECTED",
  "REJECTED",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
  "COMPLETED",
]);

export const ACTIVE_CASE_STATUS_EXCLUSIONS = [...CLOSED_CASE_STATUSES];

export interface CreatePortalCaseInput {
  type: PortalCaseType;
  sourceEntityId: string;
  trackingId: string;
  sourcePitchId?: string | null;
  submittingOrganizationId?: string | null;
  submittedByUserId?: string | null;
  targetDistricts?: string[];
  currentStage: string;
  status: string;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

function normalizedDistricts(values: string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function geographicScope(districts: string[]): GeographicScope {
  if (districts.length > 1) return GeographicScope.MULTI_DISTRICT;
  return GeographicScope.SINGLE_DISTRICT;
}

export class PortalCaseService {
  static async createForLegacyEntity(input: CreatePortalCaseInput, db: DbClient = prisma) {
    const districts = normalizedDistricts(input.targetDistricts);
    const existing = await db.portalCase.findUnique({
      where: { type_sourceEntityId: { type: input.type, sourceEntityId: input.sourceEntityId } },
    });
    if (existing) return existing;

    return db.portalCase.create({
      data: {
        trackingId: input.trackingId,
        type: input.type,
        sourceEntityId: input.sourceEntityId,
        sourcePitchId: input.sourcePitchId || null,
        submittingOrganizationId: input.submittingOrganizationId || null,
        submittedByUserId: input.submittedByUserId || null,
        targetDistricts: districts,
        geographicScope: geographicScope(districts),
        currentStage: input.currentStage,
        status: input.status,
        statusHistory: {
          create: {
            version: 1,
            fromStatus: null,
            toStatus: input.status,
            stage: input.currentStage,
            action: "SUBMITTED",
            actorUserId: input.actorUserId || input.submittedByUserId || null,
            metadata: input.metadata,
          },
        },
      },
    });
  }

  static async transition(input: {
    caseId: string;
    toStatus: string;
    stage: string;
    action: string;
    actorUserId?: string | null;
    remarks?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.portalCase.findUnique({ where: { id: input.caseId } });
      if (!current) throw new Error("Tracked case not found");

      const nextVersion = current.version + 1;
      const updated = await tx.portalCase.updateMany({
        where: { id: current.id, version: current.version },
        data: {
          status: input.toStatus,
          currentStage: input.stage,
          version: nextVersion,
          closedAt: CLOSED_CASE_STATUSES.has(input.toStatus) ? new Date() : null,
        },
      });
      if (updated.count !== 1) throw new Error("Case changed concurrently; reload and retry");

      await tx.caseStatusHistory.create({
        data: {
          caseId: current.id,
          version: nextVersion,
          fromStatus: current.status,
          toStatus: input.toStatus,
          stage: input.stage,
          action: input.action,
          actorUserId: input.actorUserId || null,
          remarks: input.remarks || null,
          metadata: input.metadata,
        },
      });
      return tx.portalCase.findUniqueOrThrow({ where: { id: current.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static async addInteraction(input: {
    caseId: string;
    actorUserId: string;
    interactionType: "CALL" | "VIDEO_CALL" | "PHYSICAL_MEETING" | "MESSAGE";
    participants: Array<{ name?: string; userId?: string; organizationId?: string; side?: "CORPORATE" | "GOVERNMENT" | "PORTAL" }>;
    summary: string;
    budgetDiscussion?: string | null;
    notes?: string | null;
    attachmentUrls?: string[];
    occurredAt: Date;
  }) {
    if (input.summary.trim().length < 5) throw new Error("Interaction summary must be at least 5 characters");
    if (!input.participants.length) throw new Error("At least one interaction participant is required");
    if (Number.isNaN(input.occurredAt.getTime())) throw new Error("A valid interaction date/time is required");

    return prisma.$transaction(async (tx) => {
      const trackedCase = await tx.portalCase.findUnique({ where: { id: input.caseId }, select: { id: true, assignedRmId: true } });
      if (!trackedCase) throw new Error("Tracked case not found");

      const interaction = await tx.caseInteraction.create({
        data: {
          caseId: input.caseId,
          actorUserId: input.actorUserId,
          interactionType: input.interactionType,
          participants: input.participants,
          summary: input.summary.trim(),
          budgetDiscussion: input.budgetDiscussion?.trim() || null,
          notes: input.notes?.trim() || null,
          attachmentUrls: (input.attachmentUrls || []).slice(0, 20),
          occurredAt: input.occurredAt,
        },
      });
      await tx.portalCase.update({
        where: { id: input.caseId },
        data: { lastInteractionAt: input.occurredAt },
      });
      // Prisma cannot express COALESCE in a typed update; set first contact only
      // when it is currently absent without overwriting the original timestamp.
      await tx.portalCase.updateMany({
        where: { id: input.caseId, firstContactedAt: null },
        data: { firstContactedAt: input.occurredAt },
      });
      return interaction;
    });
  }

  static async getByLegacyEntity(type: PortalCaseType, sourceEntityId: string) {
    return prisma.portalCase.findUnique({
      where: { type_sourceEntityId: { type, sourceEntityId } },
      include: {
        statusHistory: { orderBy: { version: "asc" } },
        interactions: { orderBy: { occurredAt: "desc" } },
        assessments: { orderBy: { version: "desc" } },
        rmAllocations: { orderBy: { createdAt: "desc" } },
        governmentAssignments: {
          include: { districtAssignments: true, dncLinks: true, events: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
  }

  static async getCase(id: string) {
    return prisma.portalCase.findUnique({
      where: { id },
      include: {
        statusHistory: { orderBy: { version: "asc" } },
        interactions: { orderBy: { occurredAt: "desc" } },
        assessments: { orderBy: { version: "desc" } },
        rmAllocations: { orderBy: { createdAt: "desc" } },
        governmentAssignments: { include: { districtAssignments: true, dncLinks: true, events: { orderBy: { createdAt: "asc" } } } },
      },
    });
  }
}
