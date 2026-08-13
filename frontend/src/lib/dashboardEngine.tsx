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
  kpis: Array<{ key: string; label: string; value: number; href?: string; description?: string }>;
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
  permission: string;
  icon: LucideIcon;
  accent: string;
}

/** A dashboard section (larger widget). */
export interface SectionDef {
  key: string;
  title: string;
  permission: string;
  icon: LucideIcon;
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

// ── KPI registry ──
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

// ── Section registry ──
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

// ── Quick-action registry ── shortcut buttons, gated by permission & role ──
export const QUICK_ACTIONS: QuickActionDef[] = [
  { key: "onboarding_approvals", label: "Onboarding Approvals", href: "/admin/onboarding-approvals", permission: "dashboard:view", icon: ShieldCheck },
  { key: "case_decisions", label: "Case Decisions Queue", href: "/decisions", permission: "dashboard:view", icon: FileCheck },
  { key: "rm_feasibility", label: "RM Feasibility Desk", href: "/rm?scope=active", permission: "dashboard:view", icon: Compass },
  { key: "enquiry_create", label: "Submit Corporate Enquiry", href: "/partner/enquiries/new", permission: "enquiry:create", icon: Send },
  { key: "pitches", label: "Submit Government Pitch", href: "/pitches/create", permission: "pitch:create", icon: Compass },
  { key: "onboarding", label: "Organization Onboarding", href: "/organization/onboarding", permission: "organization:onboard", icon: FileCheck },
  { key: "marketplace", label: "Explore Marketplace", href: "/marketplace", permission: "marketplace:view", icon: Building2 },
  { key: "projects", label: "Funded Projects", href: "/convergence-projects", permission: "project:view", icon: ShieldCheck },
  { key: "reports", label: "Reports & Analytics", href: "/reports", permission: "report:view", icon: BarChart2 },
];

/**
 * Filter a registry to the entries a caller may see based on role & permissions.
 */
export function visibleByPermission<T extends { permission: string }>(
  defs: T[],
  summary: DashboardSummary
): T[] {
  const store = useAuthStore.getState();
  const user = store.user;

  const roleName = (user?.role || "").toUpperCase();
  const roleSlug = (user?.roleSlug || "").toLowerCase();
  const numericId = user?.roleNumericId;

  // Executive state cell authorities (Super Admin, Joint Secretary, Planning Secretary)
  const isExecutive =
    numericId === 1 ||
    numericId === 2 ||
    numericId === 3 ||
    roleName.includes("SUPER_ADMIN") ||
    roleName.includes("JOINT_SECRETARY") ||
    roleName.includes("PLANNING_SECRETARY") ||
    roleSlug.includes("secretary") ||
    roleSlug.includes("superadmin") ||
    roleSlug.includes("admin") ||
    store.isAdmin;

  // Relationship Manager
  const isRM =
    numericId === 6 ||
    roleName === "CSR_RELATIONSHIP_MANAGER" ||
    roleName === "RM" ||
    roleSlug.includes("relationship") ||
    roleSlug === "rm";

  // Corporate User / Company Admin
  const isCorporate =
    numericId === 8 ||
    roleName.includes("COMPANY") ||
    roleName.includes("CORPORATE") ||
    roleSlug.includes("company") ||
    roleSlug.includes("corporate");

  // Government Officer / Nodal / Department
  const isGovOfficer =
    numericId === 7 ||
    numericId === 4 ||
    numericId === 5 ||
    roleName.includes("GOVERNMENT") ||
    roleName.includes("NODAL") ||
    roleSlug.includes("government");

  return defs.filter((d) => {
    const key = (d as any).key;

    // Executive authorities (Super Admin, Joint Secretary, Planning Secretary)
    if (isExecutive) {
      if (key === "enquiry_create" || key === "pitches" || key === "onboarding" || key === "rm_feasibility") {
        return false;
      }
      if (key === "onboarding_approvals" || key === "case_decisions" || key === "marketplace" || key === "projects" || key === "reports") {
        return true;
      }
    } else {
      // Non-executive users do not see executive approval shortcuts
      if (key === "onboarding_approvals" || key === "case_decisions") return false;
    }

    // Relationship Manager exclusions & inclusions
    if (isRM) {
      if (key === "enquiry_create" || key === "pitches" || key === "onboarding") {
        return false;
      }
      if (key === "rm_feasibility") return true;
    } else {
      if (key === "rm_feasibility") return false;
    }

    // Corporate exclusions
    if (isCorporate) {
      if (key === "pitches") return false;
    }

    // Government Officer exclusions
    if (isGovOfficer) {
      if (key === "enquiry_create") return false;
    }

    if (summary?.permissions && typeof summary.permissions[d.permission] === "boolean") {
      return summary.permissions[d.permission];
    }
    if (store.hasPermission(d.permission)) return true;

    // Fallback permission gate based on role
    if (d.permission === "dashboard:view") return true;
    if (d.permission === "marketplace:view") return true;
    if (d.permission === "project:view") return true;
    if (d.permission === "report:view") return true;

    return false;
  });
}
