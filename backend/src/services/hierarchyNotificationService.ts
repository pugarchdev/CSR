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

    // 1. Direct Target User
    if (input.targetUserId) {
      recipientIds.add(input.targetUserId);
    }

    // 2. Organization Users
    if (input.includeOrgUsers !== false && input.organizationId && prisma.user?.findMany) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: input.organizationId, deletedAt: null },
        select: { id: true }
      });
      orgUsers.forEach((u) => recipientIds.add(u.id));
    }

    // 3. Assigned RM / All RMs
    if (input.includeRms !== false) {
      if (input.assignedRmId) {
        recipientIds.add(input.assignedRmId);
      }
      if (prisma.user?.findMany) {
        const rms = await prisma.user.findMany({
          where: {
            roleId: ROLE_ID.RELATIONSHIP_MANAGER,
            deletedAt: null
          },
          select: { id: true }
        });
        rms.forEach((u) => recipientIds.add(u.id));
      }
    }

    // 4. Portal Admins & Super Admins / Executive Reviewers
    if (input.includePortalAdmins !== false && prisma.user?.findMany) {
      const admins = await prisma.user.findMany({
        where: {
          OR: [
            { roleId: { in: [ROLE_ID.SUPER_ADMIN, ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY, 1, 2, 3] } },
            { role: { name: { contains: "Admin", mode: "insensitive" } } }
          ],
          deletedAt: null
        },
        select: { id: true }
      });
      admins.forEach((u) => recipientIds.add(u.id));
    }

    // 5. District Nodal Officers (if district provided)
    if (input.includeDistrictOfficers && input.district && prisma.user?.findMany) {
      const districtOfficers = await prisma.user.findMany({
        where: {
          OR: [
            { roleId: { in: [ROLE_ID.DISTRICT_NODAL_OFFICER, ROLE_ID.DISTRICT_NODAL_CONSULTANT, 4, 5] } },
            { officerProfile: { district: { equals: input.district, mode: "insensitive" } } }
          ],
          deletedAt: null
        },
        select: { id: true }
      });
      districtOfficers.forEach((u) => recipientIds.add(u.id));
    }

    // 6. State Nodal Officers / Secretaries
    if (input.includeStateOfficers && prisma.user?.findMany) {
      const stateOfficers = await prisma.user.findMany({
        where: {
          roleId: { in: [ROLE_ID.PLANNING_SECRETARY, ROLE_ID.JOINT_SECRETARY, 2, 3] },
          deletedAt: null
        },
        select: { id: true }
      });
      stateOfficers.forEach((u) => recipientIds.add(u.id));
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
