import prisma from "../config/db";
import { notify } from "./notificationService";
import { resolveUserPermission } from "./permissionService";
import { getSystemUserId, isSystemUser } from "./systemUserService";

export interface TransitionPayload {
  instanceId: string;
  toStageId: string;
  userId: string;
  remarks?: string;
  entityData?: Record<string, any>; // Used to validate WorkflowConditions
}

/**
 * Initialize a new workflow instance for a given entity (Enquiry, Pitch, Project).
 */
export async function createWorkflowInstance(
  definitionName: string,
  entityId: string,
  entityType: string,
  initialStageName?: string,
): Promise<string> {
  // Find definition
  const definition = await prisma.workflowDefinition.findFirst({
    where: { name: definitionName, isActive: true },
    include: { stages: { orderBy: { displayOrder: "asc" } } }
  });

  if (!definition || definition.stages.length === 0) {
    throw new Error(`Workflow definition "${definitionName}" not found or has no stages`);
  }

  const initialStage = initialStageName
    ? definition.stages.find((s) => s.name === initialStageName)
    : definition.stages[0];
  if (!initialStage) {
    throw new Error(`Workflow stage "${initialStageName}" not found in definition "${definitionName}"`);
  }

  const systemUserId = await getSystemUserId();

  const instance = await prisma.workflowInstance.create({
    data: {
      definitionId: definition.id,
      currentStageId: initialStage.id,
      entityId,
      entityType,
      status: "ACTIVE",
    }
  });

  // Log initial history
  await prisma.workflowHistory.create({
    data: {
      instanceId: instance.id,
      toStageId: initialStage.id,
      actionPerformedByUserId: systemUserId,
      remarks: `Workflow initialized at stage: ${initialStage.name}`,
    }
  });

  // Execute assignment/notification rules for initial stage (non-fatal)
  await executeStageRules(instance.id, initialStage.id).catch((error) => {
    console.error("[Workflow] Stage rule execution failed (non-fatal):", error);
  });

  return instance.id;
}

/**
 * Find the active workflow instance tracking an entity, if any.
 */
export async function getInstanceForEntity(entityId: string, entityType: string) {
  return prisma.workflowInstance.findFirst({
    where: { entityId, entityType, status: "ACTIVE" },
    include: { currentStage: true, definition: true },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Find-or-create the workflow instance for an entity at a given stage.
 * Used to lazily attach workflow tracking to entities created before the
 * engine was wired up.
 */
export async function ensureWorkflowInstance(
  definitionName: string,
  entityId: string,
  entityType: string,
  currentStageName: string,
): Promise<string> {
  const existing = await getInstanceForEntity(entityId, entityType);
  if (existing) return existing.id;
  return createWorkflowInstance(definitionName, entityId, entityType, currentStageName);
}

/**
 * Transition an instance by target stage NAME (callers know names, not stage ids).
 */
export async function transitionByStageName(
  instanceId: string,
  toStageName: string,
  userId: string,
  remarks?: string,
  entityData?: Record<string, any>,
): Promise<void> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: instanceId },
    include: { definition: { include: { stages: true } } }
  });
  if (!instance) throw new Error("Workflow instance not found");

  const toStage = instance.definition.stages.find((s) => s.name === toStageName);
  if (!toStage) throw new Error(`Workflow stage "${toStageName}" not found`);

  await transitionWorkflow({ instanceId, toStageId: toStage.id, userId, remarks, entityData });
}

/**
 * Execute stage transition checks, update current stage, log history, and trigger rules.
 */
export async function transitionWorkflow(payload: TransitionPayload): Promise<void> {
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: payload.instanceId },
    include: { currentStage: true }
  });

  if (!instance || instance.status !== "ACTIVE") {
    throw new Error("Workflow instance not found or inactive");
  }

  if (instance.currentStageId === payload.toStageId) {
    return; // Idempotent: already at target stage
  }

  // 1. Find the target transition configuration
  const transition = await prisma.workflowTransition.findFirst({
    where: {
      fromStageId: instance.currentStageId,
      toStageId: payload.toStageId
    },
    include: {
      requiredPermission: true,
      conditions: true
    }
  });

  if (!transition) {
    throw new Error("Invalid stage transition requested");
  }

  // 2. Validate user permission (system user bypasses)
  if (!(await isSystemUser(payload.userId))) {
    const hasPermission = await resolveUserPermission(payload.userId, transition.requiredPermission.key);
    if (!hasPermission) {
      throw new Error(`User lacks required permission: ${transition.requiredPermission.key}`);
    }
  }

  // 3. Evaluate conditional routing gates (WorkflowCondition)
  if (transition.conditions.length > 0 && payload.entityData) {
    for (const cond of transition.conditions) {
      const value = payload.entityData[cond.field];
      const match = evaluateCondition(value, cond.operator, cond.value);
      if (!match) {
        throw new Error(`Workflow transition condition not met: ${cond.field} ${cond.operator} ${cond.value}`);
      }
    }
  }

  // 4. Perform database updates in a single transaction
  await prisma.$transaction(async (tx) => {
    await tx.workflowInstance.update({
      where: { id: instance.id },
      data: { currentStageId: payload.toStageId }
    });

    await tx.workflowHistory.create({
      data: {
        instanceId: instance.id,
        fromStageId: instance.currentStageId,
        toStageId: payload.toStageId,
        actionPerformedByUserId: payload.userId,
        remarks: payload.remarks || null,
      }
    });
  });

  // 5. Trigger rules for the new stage (non-fatal: a notification failure
  // must never roll back or mask a committed transition)
  await executeStageRules(instance.id, payload.toStageId).catch((error) => {
    console.error("[Workflow] Stage rule execution failed (non-fatal):", error);
  });
}

/**
 * Evaluate stage notification and assignment strategies dynamically.
 */
async function executeStageRules(instanceId: string, stageId: string): Promise<void> {
  const [rules, assignmentRules, instance] = await Promise.all([
    prisma.workflowRule.findMany({
      where: { stageId },
      include: { requiredPermission: true, template: true }
    }),
    prisma.workflowAssignmentRule.findMany({
      where: { stageId },
      include: { requiredPermission: true }
    }),
    prisma.workflowInstance.findUnique({
      where: { id: instanceId }
    })
  ]);

  if (!instance) return;

  // Process notifications (WorkflowRule)
  for (const rule of rules) {
    if (rule.actionType === "NOTIFY" && rule.requiredPermission) {
      // Find all users in tenant who have this permission
      const eligibleUsers = await findEligibleUsersByPermission(rule.requiredPermission.key);
      for (const user of eligibleUsers) {
        await notify(user.id, `Workflow Update: ${rule.template?.name || "Notification"}`, rule.template?.subject || "Stage Change Alert");
      }
    }
  }

  // Process assignments (WorkflowAssignmentRule)
  for (const assignment of assignmentRules) {
    const eligibleUsers = await findEligibleUsersByPermission(assignment.requiredPermission.key);
    if (eligibleUsers.length > 0) {
      if (assignment.strategy === "ROUND_ROBIN") {
        // Execute round robin assignment
        const nextUser = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
        await assignEntityToUser(instance.entityId, instance.entityType, nextUser.id);
      }
    }
  }
}

/**
 * Helper to find all users with a specific permission key.
 */
async function findEligibleUsersByPermission(permissionKey: string) {
  return prisma.user.findMany({
    where: {
      accountStatus: "ACTIVE",
      organizationRoles: {
        some: {
          role: {
            rolePermissions: {
              some: {
                permission: { key: permissionKey }
              }
            }
          }
        }
      }
    },
    select: { id: true, email: true }
  });
}

/**
 * Route entity assignments dynamically.
 */
async function assignEntityToUser(entityId: string, entityType: string, userId: string) {
  if (entityType === "ENQUIRY" || entityType === "CORPORATE_ENQUIRY") {
    await prisma.corporateEnquiry.update({
      where: { id: entityId },
      data: { assignedRelationshipManagerId: userId }
    });
  } else if (entityType === "PITCH" || entityType === "GOVERNMENT_PITCH") {
    await prisma.governmentPitch.update({
      where: { id: entityId },
      data: { assignedRelationshipManagerId: userId }
    });
  } else if (entityType === "CONVERGENCE_PROJECT") {
    await prisma.convergenceProject.update({
      where: { id: entityId },
      data: { nodalOfficerUserId: userId }
    });
  }
}

/**
 * Evaluate conditional transition expressions.
 */
function evaluateCondition(value: any, operator: string, targetValue: string): boolean {
  if (operator === "EQUALS") {
    return String(value) === targetValue;
  }
  if (operator === "GREATER_THAN") {
    return Number(value) > Number(targetValue);
  }
  if (operator === "LESS_THAN") {
    return Number(value) < Number(targetValue);
  }
  return false;
}
