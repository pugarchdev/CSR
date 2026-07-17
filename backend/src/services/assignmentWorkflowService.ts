import prisma from "../config/db";
import { auditLog, notifyByRole } from "./notificationService";
import { dispatchNotification } from "./notificationOrchestrator";
import {
  ensureWorkflowInstance,
  getInstanceForEntity,
  transitionByStageName
} from "./workflowEngineService";
import { getSystemUserId } from "./systemUserService";
import { findActiveNodalOfficer, resolveEntityContext } from "./assignmentService";
import { calculateDueDate, createSLAEscalation } from "./slaEscalationService";
import { SLAStage } from "@prisma/client";
import { Role } from "../types/role";

export const CSR_LIFECYCLE_WORKFLOW = "CSR_PROJECT_LIFECYCLE";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export interface JsApprovalTriggerInput {
  entityType: "CORPORATE_ENQUIRY" | "GOVERNMENT_PITCH";
  entityId: string;
  approvedById: string;
  remarks?: string | null;
  ipAddress?: string;
}

/**
 * Step 1 of the assignment workflow — fired automatically when the Joint
 * Secretary approves a project. Resolves the district, finds the active
 * District CSR Nodal Officer, notifies them (dashboard + email + SMS stub),
 * starts the SLA clock, and records workflow history + audit entries.
 *
 * If no nodal officer is mapped to the district, the workflow stays at
 * NODAL_OFFICER_ASSIGNMENT (that IS the pending state) and org admins + JS
 * are notified; creation of a DistrictNodalMapping auto-resumes it.
 *
 * Legacy status enums (CorporateEnquiryStatus etc.) remain the source of
 * truth for existing controllers; the workflow instance dual-tracks stage
 * for new dashboards. All failures here are logged, never thrown, so the
 * approval that triggered us can never be rolled back by notification infra.
 */
export async function onProjectApprovedByJS(input: JsApprovalTriggerInput): Promise<void> {
  const systemUserId = await getSystemUserId();
  const context = await resolveEntityContext(input.entityType, input.entityId);

  // 1. Ensure a workflow instance exists at JS_APPROVAL, then advance it
  const instanceId = await ensureWorkflowInstance(
    CSR_LIFECYCLE_WORKFLOW,
    input.entityId,
    input.entityType,
    "JS_APPROVAL"
  );
  await transitionByStageName(
    instanceId,
    "NODAL_OFFICER_ASSIGNMENT",
    systemUserId,
    `Approved by Joint Secretary${input.remarks ? `: ${input.remarks}` : ""}`
  );

  await auditLog(
    input.approvedById,
    "ASSIGNMENT_STARTED",
    {
      entityType: input.entityType,
      entityId: input.entityId,
      reference: context.reference,
      district: context.district,
      workflowStage: "NODAL_OFFICER_ASSIGNMENT"
    },
    input.ipAddress
  );

  // 2. Find the active nodal officer for the district
  const nodalOfficer = await findActiveNodalOfficer(context.district);

  if (nodalOfficer) {
    await notifyNodalOfficerForAssignment({
      nodalOfficerId: nodalOfficer.id,
      entityType: input.entityType,
      entityId: input.entityId,
      district: context.district,
      title: context.title,
      reference: context.reference
    });
    return;
  }

  // 3. No nodal officer mapped — escalate to admins, stay at stage
  await auditLog(
    undefined,
    "NODAL_ASSIGNMENT_PENDING",
    {
      entityType: input.entityType,
      entityId: input.entityId,
      reference: context.reference,
      district: context.district,
      reason: "NO_ACTIVE_NODAL_OFFICER",
      workflowStage: "NODAL_OFFICER_ASSIGNMENT"
    },
    input.ipAddress
  );

  await createSLAEscalation({
    entityType: input.entityType as any,
    entityId: input.entityId,
    stage: SLAStage.NODAL_ASSIGNMENT,
    responsibleUserId: input.approvedById,
    dueAt: calculateDueDate(SLAStage.NODAL_ASSIGNMENT)
  }).catch((error) => console.error("[AssignmentWorkflow] SLA escalation creation failed:", error));

  const message = `Approved project ${context.reference} (${context.district}) has no active District CSR Nodal Officer. Map an officer to district "${context.district}" to resume assignment.`;
  await Promise.allSettled([
    notifyByRole(Role.SUPER_ADMIN, "Nodal Officer Mapping Required", message),
    notifyByRole(Role.PORTAL_ADMIN, "Nodal Officer Mapping Required", message)
  ]);
}

interface NotifyNodalInput {
  nodalOfficerId: string;
  entityType: string;
  entityId: string;
  district: string;
  title: string;
  reference: string;
}

/**
 * Send Notification 1 (Nodal Officer: "Project Approved - Field Officer
 * Assignment Required") with the secure Assign Officer button, and start
 * the FIELD_OFFICER_ASSIGNMENT SLA clock.
 */
async function notifyNodalOfficerForAssignment(input: NotifyNodalInput): Promise<void> {
  const assignUrl = `${FRONTEND_URL}/nodal/assignments/${input.entityType}/${input.entityId}`;

  await dispatchNotification({
    recipientId: input.nodalOfficerId,
    templateName: "NODAL_ASSIGNMENT_REQUIRED",
    variables: {
      projectName: input.title,
      reference: input.reference,
      district: input.district
    },
    actionButtonUrl: assignUrl,
    correlationId: `${input.entityType}:${input.entityId}`,
    notificationType: "NODAL_ASSIGNMENT_REQUIRED"
  }).catch((error) => console.error("[AssignmentWorkflow] Nodal notification failed:", error));

  await createSLAEscalation({
    entityType: input.entityType as any,
    entityId: input.entityId,
    stage: SLAStage.FIELD_OFFICER_ASSIGNMENT,
    responsibleUserId: input.nodalOfficerId,
    dueAt: calculateDueDate(SLAStage.FIELD_OFFICER_ASSIGNMENT)
  }).catch((error) => console.error("[AssignmentWorkflow] SLA escalation creation failed:", error));
}

/**
 * Called when a nodal officer accepts responsibility (opens/acts on the
 * assignment page) or when the legacy appointNodalOfficer path runs —
 * records the NODAL_OFFICER assignment and advances the workflow to
 * FIELD_OFFICER_ASSIGNMENT.
 */
export async function recordNodalOfficerAssignment(params: {
  entityType: string;
  entityId: string;
  nodalOfficerId: string;
  assignedById: string;
  remarks?: string | null;
  ipAddress?: string;
}): Promise<void> {
  const existing = await prisma.projectAssignment.findFirst({
    where: {
      entityType: params.entityType,
      entityId: params.entityId,
      assignmentType: "NODAL_OFFICER",
      status: { in: ["ACTIVE", "PENDING_ACTIVATION"] }
    }
  });

  if (!existing) {
    await prisma.projectAssignment.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        assignmentType: "NODAL_OFFICER",
        assignedById: params.assignedById,
        assignedToId: params.nodalOfficerId,
        status: "ACTIVE",
        remarks: params.remarks || null
      }
    });

    await auditLog(
      params.assignedById,
      "OFFICER_ASSIGNED",
      {
        entityType: params.entityType,
        entityId: params.entityId,
        assignmentType: "NODAL_OFFICER",
        assignedToId: params.nodalOfficerId,
        workflowStage: "NODAL_OFFICER_ASSIGNMENT"
      },
      params.ipAddress
    );
  }

  try {
    const instance = await getInstanceForEntity(params.entityId, params.entityType);
    if (instance && instance.currentStage.name === "NODAL_OFFICER_ASSIGNMENT") {
      await transitionByStageName(
        instance.id,
        "FIELD_OFFICER_ASSIGNMENT",
        params.assignedById,
        "Nodal officer assigned"
      );
    }
  } catch (error) {
    console.error("[AssignmentWorkflow] Workflow transition failed (non-fatal):", error);
  }

  // Resolve the nodal-mapping SLA if one was pending
  await prisma.sLAEscalation.updateMany({
    where: {
      entityType: params.entityType,
      entityId: params.entityId,
      stage: SLAStage.NODAL_ASSIGNMENT,
      isResolved: false
    },
    data: { isResolved: true, resolvedAt: new Date() }
  }).catch(() => {});
}

/**
 * Auto-resume: when a DistrictNodalMapping is created, find every workflow
 * instance parked at NODAL_OFFICER_ASSIGNMENT for that district and send the
 * pending nodal notification.
 */
export async function resumePendingAssignments(district: string, nodalOfficerId: string): Promise<number> {
  const instances = await prisma.workflowInstance.findMany({
    where: { status: "ACTIVE", currentStage: { name: "NODAL_OFFICER_ASSIGNMENT" } },
    select: { id: true, entityId: true, entityType: true }
  });

  let resumed = 0;
  for (const instance of instances) {
    try {
      const context = await resolveEntityContext(instance.entityType, instance.entityId);
      if (context.district !== district) continue;

      const hasNodalAssignment = await prisma.projectAssignment.findFirst({
        where: {
          entityType: instance.entityType,
          entityId: instance.entityId,
          assignmentType: "NODAL_OFFICER",
          status: { in: ["ACTIVE", "PENDING_ACTIVATION"] }
        }
      });
      if (hasNodalAssignment) continue;

      await notifyNodalOfficerForAssignment({
        nodalOfficerId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        district,
        title: context.title,
        reference: context.reference
      });

      // Resolve the pending nodal-mapping escalation
      await prisma.sLAEscalation.updateMany({
        where: {
          entityType: instance.entityType,
          entityId: instance.entityId,
          stage: SLAStage.NODAL_ASSIGNMENT,
          isResolved: false
        },
        data: { isResolved: true, resolvedAt: new Date() }
      });

      resumed += 1;
    } catch (error) {
      console.error(`[AssignmentWorkflow] Resume failed for ${instance.entityType}:${instance.entityId}:`, error);
    }
  }

  return resumed;
}
