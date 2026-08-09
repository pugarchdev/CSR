import prisma from "../config/db";
import { MilestoneStatus, MilestoneCreatorType } from "@prisma/client";

export interface ProposeMilestoneItem {
  name: string;
  description?: string;
  targetAmount: number;
  dueDate?: string;
  sequenceOrder?: number;
}

export interface SubmitProgressPayload {
  progressRemarks?: string;
  utilizedAmount?: number;
  evidenceFiles?: Array<{
    fileUrl: string;
    title: string;
    description?: string;
    isGeoTagged?: boolean;
    latitude?: number;
    longitude?: number;
  }>;
}

export class MilestoneService {
  public static async proposeMilestones(
    userId: string,
    projectId: string,
    createdByType: MilestoneCreatorType,
    items: ProposeMilestoneItem[]
  ) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    const createdMilestones = await prisma.$transaction(async (tx) => {
      const records = [];
      let seq = 1;

      for (const item of items) {
        const milestone = await tx.projectMilestone.create({
          data: {
            projectId,
            name: item.name,
            description: item.description || null,
            targetAmount: item.targetAmount,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            sequenceOrder: item.sequenceOrder || seq++,
            status: MilestoneStatus.SUBMITTED,
            createdByType,
            createdById: userId,
          }
        });
        records.push(milestone);
      }

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "MILESTONES_PROPOSED",
          entityType: "PROJECT",
          entityId: projectId,
          details: { count: items.length, createdByType },
        }
      });

      return records;
    });

    return createdMilestones;
  }

  public static async approveMilestonePlan(userId: string, projectId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.projectMilestone.updateMany({
        where: { projectId, status: MilestoneStatus.SUBMITTED },
        data: {
          status: MilestoneStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
        }
      });

      await tx.project.update({
        where: { id: projectId },
        data: { implementationPlanStatus: "APPROVED" }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "MILESTONES_PLAN_APPROVED",
          entityType: "PROJECT",
          entityId: projectId,
          details: {}
        }
      });
    });

    return updated;
  }

  public static async submitProgress(userId: string, milestoneId: string, payload: SubmitProgressPayload) {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) throw new Error("Milestone not found");

    const updated = await prisma.$transaction(async (tx) => {
      if (payload.evidenceFiles && payload.evidenceFiles.length > 0) {
        await tx.milestoneEvidence.createMany({
          data: payload.evidenceFiles.map((f) => ({
            milestoneId,
            projectId: milestone.projectId,
            fileUrl: f.fileUrl,
            title: f.title,
            description: f.description || null,
            isGeoTagged: f.isGeoTagged || false,
            latitude: f.latitude || null,
            longitude: f.longitude || null,
            uploadedById: userId,
          }))
        });
      }

      const updatedMilestone = await tx.projectMilestone.update({
        where: { id: milestoneId },
        data: {
          status: MilestoneStatus.SUBMITTED_FOR_VERIFICATION,
          verificationStatus: "PENDING_VERIFICATION",
          progressRemarks: payload.progressRemarks || milestone.progressRemarks,
          ...(payload.utilizedAmount !== undefined ? { utilizedAmount: payload.utilizedAmount } : {}),
          submittedAt: new Date(),
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "MILESTONE_PROGRESS_SUBMITTED",
          entityType: "MILESTONE",
          entityId: milestoneId,
          details: { evidenceCount: payload.evidenceFiles?.length || 0 },
        }
      });

      return updatedMilestone;
    });

    return updated;
  }

  public static async verifyMilestone(
    userId: string,
    milestoneId: string,
    decision: "VERIFIED" | "REJECTED",
    remarks?: string
  ) {
    const milestone = await prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) throw new Error("Milestone not found");

    const isPass = decision === "VERIFIED";

    const updated = await prisma.$transaction(async (tx) => {
      const updatedMilestone = await tx.projectMilestone.update({
        where: { id: milestoneId },
        data: {
          status: isPass ? MilestoneStatus.VERIFIED : MilestoneStatus.REJECTED,
          verificationStatus: isPass ? "VERIFIED" : "REJECTED",
          verificationRemarks: remarks || null,
          verifiedAt: new Date(),
          verifiedByUserId: userId,
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: isPass ? "MILESTONE_VERIFIED" : "MILESTONE_REJECTED",
          entityType: "MILESTONE",
          entityId: milestoneId,
          details: { remarks },
        }
      });

      return updatedMilestone;
    });

    return updated;
  }

  public static async getProjectMilestones(projectId: string) {
    return prisma.projectMilestone.findMany({
      where: { projectId },
      include: {
        evidences: true,
      },
      orderBy: { sequenceOrder: "asc" }
    });
  }
}
