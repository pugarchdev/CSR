import { Response, NextFunction } from "express";
import prisma from "../config/db";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { computeUserPermissions } from "../services/permissionService";

export const getDashboardSummary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    const userId = req.user?.id;
    const userRole = String(req.user?.role || req.user?.roleSlug || "");
    const rawRole = req.user?.role || req.user?.roleSlug || req.user?.roleId || "";
    const userRoleStr = String(rawRole).toUpperCase();
    const roleIdVal = req.user?.roleId ? String(req.user.roleId) : "";
    const orgId = req.user?.organizationId;

    // Fetch Organization metadata early if orgId is present
    const orgResult = orgId ? await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, kind: true, status: true },
    }).catch(() => null) : null;

    const orgKind = orgResult?.kind || "";

    const isCompany =
      orgKind === "CSR_COMPANY" ||
      userRoleStr.includes("COMPANY") ||
      userRoleStr.includes("CORPORATE") ||
      userRoleStr.includes("CSR") ||
      roleIdVal === "4";

    const isGovt =
      orgKind === "GOVERNMENT_DEPARTMENT" ||
      userRoleStr.includes("GOVERNMENT") ||
      userRoleStr.includes("DEPARTMENT") ||
      userRoleStr.includes("NODAL") ||
      userRoleStr.includes("OFFICER") ||
      roleIdVal === "5" ||
      roleIdVal === "3" ||
      roleIdVal === "2";

    const isNgo =
      orgKind === "NGO" ||
      userRoleStr.includes("NGO");

    // 1. Resolve Permissions dynamically for user & Onboarding Org Status in parallel
    const permissions: Record<string, boolean> = {
      "dashboard:view": true,
      "dashboard:widget-kpis": true,
      "dashboard:widget-workqueue": true,
      "dashboard:widget-sla": true,
      "dashboard:widget-approvals": true,
      "dashboard:widget-charts": true,
      "dashboard:widget-activity": true,
      "dashboard:widget-quick-actions": true,
      "dashboard:analytics-global": true,
    };

    // Parallelize all independent DB reads at once
    const [
      permResult,
      totalProjectsCount,
      totalOrgsCount,
      totalUsersCount,
      pendingApprovalsCount,
      openEscalationsCount,
      totalEnquiriesCount,
      totalPitchesCount,
      activeAssignmentsCount,
      companyEnquiriesCount,
      companyProjectsCount,
      deptPitchesCount,
      ngoProjectsCount,
      auditLogsResult
    ] = await Promise.all([
      userId ? computeUserPermissions({
        userId,
        role: req.user?.role,
        roleId: req.user?.roleId,
        organizationId: orgId,
      }).catch(() => null) : Promise.resolve(null),

      ((prisma as any).convergenceProject?.count() ?? (prisma as any).project?.count() ?? Promise.resolve(0)).catch(() => 0),
      prisma.organization.count().catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.organization.count({ where: { status: "REGISTERED" } }).catch(() => 0),
      prisma.grievance.count({
        where: { status: { in: ["RAISED", "ACKNOWLEDGED", "LEVEL_1_REVIEW", "ESCALATED_TO_STATE_CELL", "ESCALATED_TO_JS_SECRETARY"] } }
      }).catch(() => 0),
      ((prisma as any).corporateEnquiry?.count() ?? Promise.resolve(0)).catch(() => 0),
      ((prisma as any).governmentPitch?.count() ?? (prisma as any).csrRequirement?.count() ?? Promise.resolve(0)).catch(() => 0),

      userId ? ((prisma as any).projectAssignment?.count({ where: { assignedToId: userId } }) ?? (prisma as any).project?.count({ where: { nodalOfficerUserId: userId } }) ?? Promise.resolve(0)).catch(() => 0) : Promise.resolve(0),

      (orgId && isCompany) ? prisma.corporateEnquiry.count({ where: { organizationId: orgId } }).catch(() => 0) : Promise.resolve(null),
      (orgId && isCompany) ? prisma.project.count({ where: { OR: [{ organizationId: orgId }, { corporatePartnerId: orgId }] } }).catch(() => 0) : Promise.resolve(null),
      (orgId && isGovt) ? prisma.governmentPitch.count({ where: { departmentId: orgId } }).catch(() => 0) : Promise.resolve(null),
      (orgId && isNgo) ? prisma.project.count({ where: { OR: [{ organizationId: orgId }, { ngoId: orgId }, { implementingAgencyId: orgId }] } }).catch(() => 0) : Promise.resolve(null),

      ((prisma as any).auditLog?.findMany({ take: 5, orderBy: { createdAt: "desc" } }) ?? Promise.resolve([])).catch(() => [])
    ]);

    if (permResult?.permissions) {
      permResult.permissions.forEach((p) => {
        permissions[p] = true;
      });
    }

    // Process onboarding status
    let onboardingStatus: {
      isPending: boolean;
      status: string;
      orgName?: string;
      orgKind?: string;
      title: string;
      message: string;
      actionUrl: string;
      actionText: string;
    } | null = null;

    if (orgResult && orgResult.status !== "ACTIVE") {
      let title = "Organization Onboarding Pending";
      let message = `Your organization '${orgResult.name}' onboarding status is currently '${orgResult.status.replace(/_/g, " ")}'. Some platform features may be restricted until official verification and approval.`;
      let actionText = "View Onboarding Details";

      if (orgResult.status === "REGISTERED" || orgResult.status === "PROFILE_INCOMPLETE") {
        title = "Action Required: Complete Organization Profile";
        message = `Your profile for '${orgResult.name}' is incomplete. Please complete registration details and upload compliance documents for approval.`;
        actionText = "Complete Profile";
      } else if (orgResult.status === "DOCUMENTS_PENDING") {
        title = "Action Required: Upload Onboarding Documents";
        message = `Please upload the required compliance and verification documents for '${orgResult.name}'.`;
        actionText = "Upload Documents";
      } else if (orgResult.status === "UNDER_VERIFICATION") {
        title = "Onboarding Under Review";
        message = `Your organization '${orgResult.name}' profile and documents are currently under review by the Maharashtra CSR Cell.`;
        actionText = "Check Status";
      } else if (orgResult.status === "CLARIFICATION_REQUIRED") {
        title = "Clarification Requested by CSR Cell";
        message = `The CSR Cell requested additional document clarification for '${orgResult.name}'. Please review and re-submit.`;
        actionText = "Resolve Clarification";
      } else if (orgResult.status === "REJECTED") {
        title = "Onboarding Request Not Approved";
        message = `The onboarding application for '${orgResult.name}' was not approved. Please contact platform support.`;
        actionText = "Contact Support";
      } else if (orgResult.status === "SUSPENDED") {
        title = "Organization Account Suspended";
        message = `The account for '${orgResult.name}' has been temporarily suspended by system administration.`;
        actionText = "Contact Support";
      }

      onboardingStatus = {
        isPending: true,
        status: orgResult.status,
        orgName: orgResult.name,
        orgKind: orgResult.kind,
        title,
        message,
        actionUrl: "/organization/onboarding",
        actionText,
      };
    } else if (!orgId && [ "COMPANY_ADMIN", "GOVERNMENT_OFFICER", "NGO_ADMIN" ].includes(userRole)) {
      onboardingStatus = {
        isPending: true,
        status: "UNLINKED",
        title: "Organization Profile Setup Required",
        message: "Your account is not yet linked to an active organization profile. Please complete organization onboarding.",
        actionUrl: "/organization/onboarding",
        actionText: "Setup Profile",
      };
    }

    const totalProjects = Number(totalProjectsCount) || 0;
    const totalOrgs = Number(totalOrgsCount) || 0;
    const totalUsers = Number(totalUsersCount) || 0;
    const pendingApprovals = Number(pendingApprovalsCount) || 0;
    const openEscalations = Number(openEscalationsCount) || 0;
    const totalEnquiries = Number(totalEnquiriesCount) || 0;
    const totalPitches = Number(totalPitchesCount) || 0;
    const activeAssignments = Number(activeAssignmentsCount) || 0;

    const companyEnquiries = companyEnquiriesCount !== null ? Number(companyEnquiriesCount) : totalEnquiries;
    const companyProjects = companyProjectsCount !== null ? Number(companyProjectsCount) : totalProjects;
    const deptPitches = deptPitchesCount !== null ? Number(deptPitchesCount) : totalPitches;
    const deptInterests = totalEnquiries;
    const ngoProjects = ngoProjectsCount !== null ? Number(ngoProjectsCount) : totalProjects;

    const recentActivity = Array.isArray(auditLogsResult) ? auditLogsResult.map((l: any) => ({
      id: l.id,
      action: l.action || l.event || "Audit Log",
      entityType: l.entityType || l.resource || "System",
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
      actorRole: l.actorRole || l.userRole || null
    })) : [];

    // Build role-specific KPI Cards payload so roles see ONLY their own stats
    let kpis: Array<{ key: string; label: string; value: number }> = [];

    if (isCompany) {
      kpis = [
        { key: "companyEnquiries", label: "Corporate Enquiries / Interests", value: companyEnquiries },
        { key: "projects", label: "Active Convergence Projects", value: companyProjects },
        { key: "assignments", label: "Active Assignments", value: activeAssignments },
        { key: "totalProjects", label: "Platform Convergence Projects", value: totalProjects },
      ];
    } else if (isGovt) {
      kpis = [
        { key: "deptPitches", label: "Department Pitches", value: deptPitches },
        { key: "deptInterests", label: "Received Corporate Interests", value: deptInterests },
        { key: "projects", label: "Convergence Projects", value: totalProjects },
        { key: "assignments", label: "Active Assignments", value: activeAssignments },
      ];
    } else if (isNgo) {
      kpis = [
        { key: "ngoProjects", label: "Agency Assigned Projects", value: ngoProjects },
        { key: "assignments", label: "Pending Deliverables", value: activeAssignments },
        { key: "projects", label: "Convergence Projects", value: totalProjects },
      ];
    } else {
      // State Level Admins & Super Admin
      kpis = [
        { key: "totalProjects", label: "Convergence Projects", value: totalProjects },
        { key: "totalOrgs", label: "Government & Partner Orgs", value: totalOrgs },
        { key: "enquiries", label: "Corporate Enquiries", value: totalEnquiries },
        { key: "pitches", label: "Government Pitches", value: totalPitches },
        { key: "pendingApprovals", label: "Pending Approvals", value: pendingApprovals },
        { key: "openEscalations", label: "Active Escalations", value: openEscalations },
      ];
    }

    const data = {
      generatedAt: new Date().toISOString(),
      permissions,
      kpis,
      pendingApprovals,
      openEscalations,
      recentActivity,
      totalProjects,
      totalOrgs,
      totalUsers,
      onboardingStatus,
      // Org-specific metrics for personalized dashboards
      companyEnquiries,
      companyProjects,
      deptPitches,
      deptInterests,
      ngoProjects,
      activeAssignments,
      totalEnquiries,
      totalPitches,
      // Org metadata for personalized headers
      orgName: orgResult?.name || null,
      orgKind: orgResult?.kind || null,
      orgStatus: orgResult?.status || null,
      userRole,
      isCompany,
      isGovt,
    };

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardWidgets = getDashboardSummary;
