"use client";

import { useAuthStore } from "@/store/authStore";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2, Bell, Clock, Compass, FileText, ShieldAlert, ShieldCheck,
  Users, Building2, CheckCircle2, FolderKanban, HeartHandshake, TrendingUp, Send, FileCheck
} from "lucide-react";

export interface OnboardingStatus {
  isPending: boolean;
  status: string;
  orgName?: string;
  orgKind?: string;
  title: string;
  message: string;
  actionUrl: string;
  actionText: string;
}

/** Shape returned by GET /api/dashboard/summary (inside the `data` envelope). */
export interface DashboardSummary {
  generatedAt: string;
  permissions: Record<string, boolean>;
  kpis: Array<{ key: string; label: string; value: number }>;
  pendingApprovals?: number;
  openEscalations?: number;
  recentActivity?: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actorRole: string | null;
  }>;
  onboardingStatus?: OnboardingStatus | null;
}

/** A KPI card definition. `value` reads from the summary by key. */
export interface KpiCardDef {
  key: string;
  label: string;
  /** Permission that unlocks this card. */
  permission: string;
  icon: LucideIcon;
  accent: string;
}

/**
 * A dashboard section (larger widget). `render` receives the summary and the
 * permission checker so it can draw itself; the engine only mounts it when the
 * caller holds `permission`.
 */
export interface SectionDef {
  key: string;
  title: string;
  permission: string;
  icon: LucideIcon;
  /** Whether the section has data to show given the summary (else hidden). */
  hasData: (summary: DashboardSummary) => boolean;
}

/** Quick-action shortcut. Gated by permission + optional page-visibility. */
export interface QuickActionDef {
  key: string;
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
}

// ── KPI registry ── headline counts, each gated by dashboard:widget-kpis ──
export const KPI_CARDS: KpiCardDef[] = [
  { key: "totalProjects", label: "Convergence Projects", permission: "dashboard:widget-kpis", icon: FolderKanban, accent: "#166534" },
  { key: "projects", label: "Convergence Projects", permission: "dashboard:widget-kpis", icon: ShieldCheck, accent: "#166534" },
  { key: "enquiries", label: "Corporate Enquiries", permission: "dashboard:widget-kpis", icon: FileText, accent: "#005ea8" },
  { key: "pitches", label: "Government Pitches", permission: "dashboard:widget-kpis", icon: Compass, accent: "#14274e" },
  { key: "assignments", label: "Active Assignments", permission: "dashboard:widget-kpis", icon: Clock, accent: "#d97706" },
  { key: "totalOrgs", label: "Government & Partner Orgs", permission: "dashboard:widget-kpis", icon: Building2, accent: "#4f46e5" },
  { key: "totalUsers", label: "Registered Users", permission: "dashboard:widget-kpis", icon: Users, accent: "#2563eb" },
  { key: "pendingApprovals", label: "Pending Approvals", permission: "dashboard:widget-kpis", icon: CheckCircle2, accent: "#059669" },
  { key: "openEscalations", label: "Active Escalations", permission: "dashboard:widget-kpis", icon: ShieldAlert, accent: "#dc2626" },
  { key: "deptPitches", label: "Department Pitches", permission: "dashboard:widget-kpis", icon: Send, accent: "#0284c7" },
  { key: "deptInterests", label: "Received Interests", permission: "dashboard:widget-kpis", icon: HeartHandshake, accent: "#0d9488" },
  { key: "companyEnquiries", label: "Corporate Interests", permission: "dashboard:widget-kpis", icon: TrendingUp, accent: "#7c3aed" },
  { key: "ngoProjects", label: "Agency Projects", permission: "dashboard:widget-kpis", icon: FileCheck, accent: "#ca8a04" },
];

// ── Section registry ── larger widgets, each gated by its own permission ──
export const SECTIONS: SectionDef[] = [
  {
    key: "approvals",
    title: "Pending Approvals",
    permission: "dashboard:widget-approvals",
    icon: ShieldCheck,
    hasData: (s) => typeof s.pendingApprovals === "number",
  },
  {
    key: "sla",
    title: "SLA / Escalations",
    permission: "dashboard:widget-sla",
    icon: ShieldAlert,
    hasData: (s) => typeof s.openEscalations === "number",
  },
  {
    key: "activity",
    title: "Recent Activity",
    permission: "dashboard:widget-activity",
    icon: Bell,
    hasData: (s) => Array.isArray(s.recentActivity) && s.recentActivity.length > 0,
  },
];

// ── Quick-action registry ── shortcut buttons, gated by permission ──
export const QUICK_ACTIONS: QuickActionDef[] = [
  { key: "enquiry_create", label: "Submit Corporate Enquiry", href: "/partner/enquiries/new", permission: "enquiry:create", icon: Send },
  { key: "pitches", label: "Submit Government Pitch", href: "/pitches/create", permission: "pitch:create", icon: Compass },
  { key: "onboarding", label: "Organization Onboarding", href: "/organization/onboarding", permission: "page:organization/onboarding:view", icon: FileCheck },
  { key: "marketplace", label: "Explore Marketplace", href: "/marketplace", permission: "marketplace:view", icon: Building2 },
  { key: "projects", label: "Funded Projects", href: "/convergence-projects", permission: "project:view", icon: ShieldCheck },
  { key: "reports", label: "Reports", href: "/reports", permission: "report:view", icon: BarChart2 },
];

/**
 * Filter a registry to the entries a caller may see.
 * Short-circuits true during permission hydration or for system roles so
 * dashboard KPI cards and widgets remain visible under all conditions.
 */
export function visibleByPermission<T extends { permission: string }>(
  defs: T[],
  summary: DashboardSummary
): T[] {
  const store = useAuthStore.getState();
  if (store.isAdmin) return defs;

  return defs.filter((d) => {
    if (summary?.permissions && typeof summary.permissions[d.permission] === "boolean") {
      return summary.permissions[d.permission];
    }
    if (store.hasPermission(d.permission)) return true;
    if (!store.permissions || store.permissions.length === 0 || store.isLoadingPermissions) {
      return true;
    }
    return false;
  });
}

