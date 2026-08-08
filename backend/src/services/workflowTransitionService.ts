import prisma from "../config/db";
import { EffectivePermissionService } from "./effectivePermissionService";
import { notifyHierarchy } from "./hierarchyNotificationService";

export type WorkflowState =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "PROPOSED"
  | "APPROVED"
  | "REJECTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED";

export interface TransitionRequest {
  entityType: "PITCH" | "REQUIREMENT" | "PROJECT" | "ASSESSMENT";
  entityId: string;
  actorUserId: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  requiredPermission: string;
  requiredScope?: "GLOBAL" | "ORGANIZATION" | "DISTRICT" | "PROJECT";
  reason?: string;
  ipAddress?: string;
  additionalData?: Record<string, any>;
}

export const ALLOWED_STATE_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "VERIFIED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  VERIFIED: ["APPROVED", "REJECTED", "PUBLISHED" as any],
  PROPOSED: ["APPROVED", "REJECTED"],
  APPROVED: ["ASSIGNED", "PUBLISHED" as any],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["CLOSED"],
  REJECTED: [],
  CLOSED: []
};

export class WorkflowTransitionService {
  /**
   * Execute an atomic, audited workflow transition.
   */
  public static async executeTransition(req: TransitionRequest) {
    const {
      entityType,
      entityId,
      actorUserId,
      fromState,
      toState,
      requiredPermission,
      reason,
      ipAddress,
      additionalData
    } = req;

    // 1. Validate State Machine Graph
    const validTargets = ALLOWED_STATE_TRANSITIONS[fromState] || [];
    if (!validTargets.includes(toState)) {
      throw new Error(`Invalid workflow state transition from '${fromState}' to '${toState}' for ${entityType}`);
    }

    // 2. Validate Mandatory Rejection / Override Reason
    if ((toState === "REJECTED" || fromState === "REJECTED") && (!reason || reason.trim().length === 0)) {
      throw new Error("A mandatory explanation/reason is required for rejection or override decisions");
    }

    // 3. Validate Permission & Scope
    const accessPayload = await EffectivePermissionService.getEffectiveAccessPayload(actorUserId);
    if (!accessPayload.isSuperAdmin && !accessPayload.permissions.includes(requiredPermission)) {
      throw new Error(`Forbidden: missing required permission '${requiredPermission}' for workflow transition`);
    }

    // 4. Atomic Execution & Anti-Replay Guard in Prisma Transaction
    let targetOrgId: string | null = null;
    let targetDistrict: string | null = null;
    let entityTitle = `${entityType} ${entityId}`;

    const result = await prisma.$transaction(async (tx) => {
      let currentEntity: any = null;

      if (entityType === "PITCH") {
        currentEntity = await tx.governmentPitch.findUnique({ where: { id: entityId } });
        if (!currentEntity) throw new Error("Pitch entity not found");
        if (currentEntity.status !== fromState) {
          throw new Error(`Replay or state conflict detected: current pitch status is '${currentEntity.status}', expected '${fromState}'`);
        }
        targetOrgId = currentEntity.departmentId || null;
        targetDistrict = Array.isArray(currentEntity.districts) && currentEntity.districts.length > 0 ? currentEntity.districts[0] : null;
        entityTitle = currentEntity.title || entityTitle;

        await tx.governmentPitch.update({
          where: { id: entityId },
          data: {
            status: toState as any,
            ...(reason ? { reviewNotes: reason } : {}),
            ...(additionalData || {})
          }
        });
      } else if (entityType === "REQUIREMENT") {
        currentEntity = await tx.project.findUnique({ where: { id: entityId } });
        if (!currentEntity) throw new Error("Requirement entity not found");
        if (currentEntity.status !== fromState) {
          throw new Error(`Replay or state conflict detected: current requirement status is '${currentEntity.status}', expected '${fromState}'`);
        }
        targetOrgId = currentEntity.organizationId || null;
        targetDistrict = currentEntity.district || null;
        entityTitle = currentEntity.title || entityTitle;

        await tx.project.update({
          where: { id: entityId },
          data: {
            status: toState as any,
            ...(additionalData || {})
          }
        });
      } else if (entityType === "PROJECT") {
        currentEntity = await tx.project.findUnique({ where: { id: entityId } });
        if (!currentEntity) throw new Error("Project entity not found");
        if (currentEntity.status !== fromState) {
          throw new Error(`Replay or state conflict detected: current project status is '${currentEntity.status}', expected '${fromState}'`);
        }
        targetOrgId = currentEntity.organizationId || null;
        targetDistrict = currentEntity.district || null;
        entityTitle = currentEntity.title || entityTitle;

        await tx.project.update({
          where: { id: entityId },
          data: {
            status: toState as any,
            ...(toState === "COMPLETED" ? { completedAt: new Date() } : {}),
            ...(additionalData || {})
          }
        });
      }

      // 5. Audit Record
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: `WORKFLOW_TRANSITION_${fromState}_TO_${toState}`,
          entityType,
          entityId,
          details: {
            fromState,
            toState,
            requiredPermission,
            reason: reason || null,
            additionalData: additionalData || null
          },
          ipAddress: ipAddress || null
        }
      });

      return { success: true, entityId, fromState, toState };
    });

    // 6. Dispatch Notification & Email on status change
    notifyHierarchy({
      title: `Status Change: ${entityType} ${toState.replace(/_/g, " ")}`,
      message: `${entityType} "${entityTitle}" status updated from ${fromState} to ${toState}.${reason ? ` Remarks: ${reason}` : ""}`,
      organizationId: targetOrgId,
      district: targetDistrict,
      includeOrgUsers: true,
      includePortalAdmins: true,
      includeRms: true,
      includeDistrictOfficers: true,
      includeStateOfficers: true,
      actionButtonUrl: `/${entityType.toLowerCase()}s/${entityId}`,
      variables: {
        currentStatus: toState,
        workflowStatus: reason || `Status changed to ${toState}`
      }
    }).catch((err) => console.error("[WorkflowTransition] Notification dispatch failed:", err));

    return result;
  }
}
