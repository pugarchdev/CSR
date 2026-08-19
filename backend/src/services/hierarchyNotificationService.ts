import prisma from "../config/db";
import { dispatchNotification } from "./notificationOrchestrator";
import { ROLE_ID } from "../types/role";

export interface HierarchyNotifyInput {
  title: string;
  message: string;
  templateName?: string;
  organizationId?: string | null;
  district?: string | null;
  assignedRmId?: string | null;
  targetUserId?: string | null;
  includePortalAdmins?: boolean;
  includeRms?: boolean;
  includeDistrictOfficers?: boolean;
  includeStateOfficers?: boolean;
  includeOrgUsers?: boolean;
  actionButtonUrl?: string;
  variables?: Record<string, string | number | null | undefined>;
}

/**
 * Dispatches both In-App & Email notifications to all relevant hierarchy stakeholders:
 * - Portal Admins & Super Admins
 * - Assigned / System Relationship Managers
 * - District Nodal Officers / Consultants (for entity district)
 * - State Nodal Officers & Secretaries
 * - Organization Users / Applicant
 */
export async function notifyHierarchy(input: HierarchyNotifyInput): Promise<void> {
  try {
    const recipientIds = new Set<string>();

    // 1. Direct Target User (Submitting User / Creator)
    if (input.targetUserId) {
      recipientIds.add(input.targetUserId);
    }

    // 2. Organization Users strictly for the entity's specific organization
    if (input.includeOrgUsers === true && input.organizationId && prisma.user?.findMany) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: input.organizationId, deletedAt: null },
        select: { id: true }
      });
      orgUsers.forEach((u) => recipientIds.add(u.id));
    }

    // 3. Assigned RM ONLY (never broadcast to unrelated RMs)
    if (input.includeRms !== false && input.assignedRmId) {
      recipientIds.add(input.assignedRmId);
    }

    // 4. Designated Joint Secretary / Reviewer
    if (input.includeStateOfficers && prisma.user?.findMany) {
      const jsUsers = await prisma.user.findMany({
        where: {
          OR: [
            { roleId: { in: [ROLE_ID.JOINT_SECRETARY, 3] } },
            { role: { name: { equals: "JOINT_SECRETARY", mode: "insensitive" } } },
            { role: { name: { equals: "Joint Secretary", mode: "insensitive" } } }
          ],
          deletedAt: null
        },
        select: { id: true }
      });
      jsUsers.forEach((u) => recipientIds.add(u.id));
    }

    // 5. District Nodal Officer strictly for the entity's specific district
    if (input.includeDistrictOfficers && input.district && prisma.user?.findMany) {
      const districtOfficers = await prisma.user.findMany({
        where: {
          roleId: { in: [ROLE_ID.DISTRICT_NODAL_OFFICER, ROLE_ID.DISTRICT_NODAL_CONSULTANT, 4, 5] },
          officerProfile: { district: { equals: input.district, mode: "insensitive" } },
          deletedAt: null
        },
        select: { id: true }
      });
      districtOfficers.forEach((u) => recipientIds.add(u.id));
    }

    // 6. Super Admin ONLY if explicitly requested (Strict check, NEVER match generic 'contains Admin')
    if (input.includePortalAdmins === true && prisma.user?.findMany) {
      const superAdmins = await prisma.user.findMany({
        where: {
          roleId: { in: [ROLE_ID.SUPER_ADMIN, 1] },
          deletedAt: null
        },
        select: { id: true }
      });
      superAdmins.forEach((u) => recipientIds.add(u.id));
    }

    const recipientList = Array.from(recipientIds).filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0
    );
    if (recipientList.length === 0) return;

    const templateName = input.templateName || "hierarchy_notification";
    const variables = {
      title: input.title,
      message: input.message,
      ...(input.variables || {})
    };

    const [primaryRecipient, ...ccRecipients] = recipientList;

    await dispatchNotification({
      recipientId: primaryRecipient,
      ccRecipientIds: ccRecipients,
      templateName,
      variables,
      channels: ["IN_APP", "SOCKET", "EMAIL"],
      actionButtonUrl: input.actionButtonUrl,
      notificationType: input.templateName || "HIERARCHY_NOTIFICATION"
    });
  } catch (error) {
    console.error("[HierarchyNotification] Failed to dispatch hierarchy notification:", error);
  }
}
