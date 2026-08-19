"use client";

/**
 * Unified dashboard — /dashboard.
 *
 * Single permission-driven entry point that replaces the per-role dashboard
 * pages. The DashboardEngine fetches GET /api/dashboard/summary and renders
 * only the widgets/sections the caller's `dashboard:*` permissions unlock;
 * there are no hardcoded role branches here. Legacy per-role dashboard routes
 * redirect into this page (see the redirect shims added in T6).
 */
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import MyAssignmentsWidget from "@/components/assignments/MyAssignmentsWidget";
import DashboardEngine from "@/components/dashboard/DashboardEngine";
import { useAuthStore } from "@/store/authStore";
import "@/styles/gov-theme.css";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const roleId = Number(user?.roleNumericId || user?.roleId || 0);
  const roleCode = String(user?.role || "").toUpperCase();

  // Project assignments are only for field execution roles (District Nodal Officers, DNCs, NGOs)
  const isFieldOrAgencyRole = [4, 5, 9].includes(roleId) || /DISTRICT_NODAL|DNO|DNC|NGO|AGENCY/i.test(roleCode);

  return (
    <GovPortalLayout userRole={user?.role || ""}>
      <DashboardEngine />

      {isFieldOrAgencyRole && (
        <div className="mt-5">
          <MyAssignmentsWidget />
        </div>
      )}
    </GovPortalLayout>
  );
}
