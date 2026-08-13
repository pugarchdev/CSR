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

  return (
    <GovPortalLayout userRole={user?.role || ""}>
      <GovPageHeader
        breadcrumb="Home / Dashboard"
        title="Dashboard"
        description="Your unified view — the cards and sections shown reflect your permissions."
      />

      <DashboardEngine />

      <div className="mt-6">
        <MyAssignmentsWidget />
      </div>
    </GovPortalLayout>
  );
}
