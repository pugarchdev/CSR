import prisma from "../config/db";
import { MouStatus, MouSigningType } from "@prisma/client";

export interface InitiateMouPayload {
  projectId: string;
  templateType?: string;
  signingType?: MouSigningType;
  corporateSignatoryId?: string;
  govtSignatoryId?: string;
  iaSignatoryId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  mouRequired?: boolean;
}

export interface UpdateMouDraftPayload {
  title?: string;
  templateType?: string;
  signingType?: MouSigningType;
  pdfDocumentUrl?: string;
  changesSummary?: string;
  status?: MouStatus;
}

export class MouService {
  public static async initiateMou(userId: string, payload: InitiateMouPayload) {
    const project = await prisma.project.findUnique({
      where: { id: payload.projectId },
      select: {
        id: true,
        projectCode: true,
        title: true,
        organizationId: true,
        corporatePartnerId: true,
        implementingAgencyId: true,
        mouRequired: true,
      }
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const existingMou = await prisma.mou.findUnique({
      where: { projectId: payload.projectId }
    });

    if (existingMou) {
      return existingMou;
    }

    const mouNumber = `MOU-${project.projectCode}-${Date.now().toString().slice(-4)}`;

    const newMou = await prisma.$transaction(async (tx) => {
      const created = await tx.mou.create({
        data: {
          projectId: payload.projectId,
          mouNumber,
          title: `Memorandum of Understanding for ${project.title}`,
          templateType: payload.templateType || "STANDARD_GOVT_CORPORATE",
          status: MouStatus.DRAFT,
          signingType: payload.signingType || MouSigningType.DIGITAL,
          mouRequired: payload.mouRequired !== undefined ? payload.mouRequired : project.mouRequired,
          corporateSignatoryId: payload.corporateSignatoryId || null,
          govtSignatoryId: payload.govtSignatoryId || null,
          iaSignatoryId: payload.iaSignatoryId || null,
          effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : null,
          effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : null,
          currentVersion: 1,
          initiatedById: userId,
        }
      });

      await tx.mouVersion.create({
        data: {
          mouId: created.id,
          versionNumber: 1,
          documentUrl: created.pdfDocumentUrl || `/documents/templates/${created.templateType}.pdf`,
          changesSummary: "Initial MoU Draft Created",
          status: MouStatus.DRAFT,
          createdById: userId,
        }
      });

      await tx.project.update({
        where: { id: payload.projectId },
        data: {
          mouStatus: MouStatus.DRAFT,
          mouRequired: created.mouRequired
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "MOU_INITIATED",
          entityType: "MOU",
          entityId: created.id,
          details: { projectId: payload.projectId, mouNumber },
        }
      });

      return created;
    });

    return newMou;
  }

  public static async updateMouDraft(userId: string, mouId: string, payload: UpdateMouDraftPayload) {
    const existing = await prisma.mou.findUnique({
      where: { id: mouId },
      include: { versions: true }
    });

    if (!existing) {
      throw new Error("MoU record not found");
    }

    let nextVersionNumber = existing.currentVersion;
    const isVersionBump = payload.changesSummary && existing.status !== MouStatus.DRAFT;

    if (isVersionBump) {
      nextVersionNumber += 1;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.mou.update({
        where: { id: mouId },
        data: {
          ...(payload.title ? { title: payload.title } : {}),
          ...(payload.templateType ? { templateType: payload.templateType } : {}),
          ...(payload.signingType ? { signingType: payload.signingType } : {}),
          ...(payload.pdfDocumentUrl ? { pdfDocumentUrl: payload.pdfDocumentUrl } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          currentVersion: nextVersionNumber,
        }
      });

      if (isVersionBump || payload.pdfDocumentUrl) {
        await tx.mouVersion.create({
          data: {
            mouId,
            versionNumber: nextVersionNumber,
            documentUrl: payload.pdfDocumentUrl || existing.pdfDocumentUrl || "",
            changesSummary: payload.changesSummary || "MoU updated",
            status: payload.status || existing.status,
            createdById: userId,
          }
        });
      }

      await tx.project.update({
        where: { id: existing.projectId },
        data: {
          mouStatus: payload.status || existing.status,
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "MOU_UPDATED",
          entityType: "MOU",
          entityId: mouId,
          details: { version: nextVersionNumber, status: payload.status },
        }
      });

      return updatedRecord;
    });

    return updated;
  }

  public static async recordSignature(userId: string, mouId: string, signedPdfUrl: string, signingType: MouSigningType) {
    const mou = await prisma.mou.findUnique({ where: { id: mouId } });
    if (!mou) throw new Error("MoU not found");

    const signed = await prisma.$transaction(async (tx) => {
      const updated = await tx.mou.update({
        where: { id: mouId },
        data: {
          status: MouStatus.SIGNED,
          signingType,
          signedPdfUrl,
          signedAt: new Date(),
        }
      });

      await tx.project.update({
        where: { id: mou.projectId },
        data: { mouStatus: MouStatus.SIGNED }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "MOU_SIGNED",
          entityType: "MOU",
          entityId: mouId,
          details: { signingType, signedPdfUrl },
        }
      });

      return updated;
    });

    return signed;
  }

  public static async getMouByProjectId(projectId: string) {
    return prisma.mou.findUnique({
      where: { projectId },
      include: {
        versions: { orderBy: { versionNumber: "desc" } }
      }
    });
  }
}
