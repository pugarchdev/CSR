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
import { useEffect, useState } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import MyAssignmentsWidget from "@/components/assignments/MyAssignmentsWidget";
import DashboardEngine from "@/components/dashboard/DashboardEngine";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { Send, Compass, FileCheck } from "lucide-react";
import "@/styles/gov-theme.css";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);

  const activeRoles = (roles || []).length > 0 ? roles : (user?.role ? [user.role] : []);
  const orgKind = user?.organization?.kind || user?.orgKind || "";
  const roleIdVal = user?.roleId || user?.roleNumericId;

  const isCorporate = Boolean(
    orgKind === "CSR_COMPANY" ||
    roleIdVal === 4 ||
    activeRoles.some((r: any) => {
      const s = String(r).toUpperCase();
      return s.includes("COMPANY") || s.includes("CORPORATE") || s.includes("CSR") || s === "4";
    })
  );

  const isGovernment = Boolean(
    orgKind === "GOVERNMENT_DEPARTMENT" ||
    roleIdVal === 5 || roleIdVal === 3 || roleIdVal === 2 ||
    activeRoles.some((r: any) => {
      const s = String(r).toUpperCase();
      return s.includes("GOVERNMENT") || s.includes("DEPARTMENT") || s.includes("NODAL") || s.includes("OFFICER") || s === "5" || s === "3" || s === "2";
    })
  );

  return (
    <GovPortalLayout userRole={user?.role || ""}>
      <GovPageHeader
        breadcrumb="Home / Dashboard"
        title="Dashboard"
        description="Your unified view — the cards and sections shown reflect your permissions."
      />

      {/* Permission-driven KPIs, sections, and quick actions. */}
      <DashboardEngine />

      {/* Project assignments (field/nodal officers land here after activation). */}
      <div className="mt-6">
        <MyAssignmentsWidget />
      </div>
    </GovPortalLayout>
  );
}
