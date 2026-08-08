"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import TransferPortfolioModal, { PortfolioTransferResult } from "@/components/rm/TransferPortfolioModal";
import {
  DashboardSummary,
  QUICK_ACTIONS,
  visibleByPermission,
  QuickActionDef,
} from "@/lib/dashboardEngine";
import {
  AlertTriangle, ArrowRight, ShieldAlert, Clock, CheckCircle2,
  FolderKanban, ShieldCheck, FileText, Compass, Building2, Users,
  HeartHandshake, TrendingUp, Sparkles, Activity, Landmark, Coins, Layers, Send, FileCheck,
  Briefcase, BarChart2, Target, Award, Globe, ClipboardCheck, AlertCircle, ArrowRightLeft
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SummaryEnvelope {
  success: boolean;
  data: DashboardSummary;
}

const DEFAULT_KPIS = [
  { key: "totalProjects", label: "Convergence Projects", value: 38 },
  { key: "enquiries", label: "Corporate Enquiries", value: 14 },
  { key: "pitches", label: "Government Pitches", value: 9 },
  { key: "assignments", label: "Active Assignments", value: 6 },
  { key: "totalOrgs", label: "Government & Partner Orgs", value: 42 },
  { key: "totalUsers", label: "Registered Users", value: 186 },
  { key: "pendingApprovals", label: "Pending Approvals", value: 4 },
  { key: "openEscalations", label: "Active Escalations", value: 2 },
];

/** Smooth Count-up Shutter Animation Component */
function AnimatedCounter({ value }: { value: number | string }) {
  const [displayValue, setDisplayValue] = useState<string | number>(0);

  useEffect(() => {
    const strVal = String(value);
    const numericMatch = strVal.match(/[\d.]+/);
    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const targetNum = parseFloat(numericMatch[0]);
    if (isNaN(targetNum) || targetNum === 0) {
      setDisplayValue(strVal);
      return;
    }

    const isFloat = strVal.includes(".");
    const startTime = performance.now();
    const duration = 850;

    let animationFrameId: number;

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = targetNum * easeProgress;

      const formattedVal = isFloat ? currentVal.toFixed(1) : Math.round(currentVal);
      const output = strVal.replace(/[\d.]+/, String(formattedVal));
      setDisplayValue(output);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      }
    };

    animationFrameId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <span>{displayValue}</span>;
}

/** Shimmer Skeleton Loader */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-4 w-28 bg-slate-200/80 rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-32 bg-slate-200/70 rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white/90 via-slate-50/90 to-slate-100/60 p-4 shadow-sm flex flex-col justify-between h-[110px] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-200/90 rounded-md" />
                <div className="w-7 h-7 rounded-lg bg-slate-200/80" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="h-7 w-16 bg-slate-300/80 rounded-lg" />
                <div className="h-4 w-12 bg-emerald-100/80 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white/90 via-slate-50/90 to-slate-100/60 p-4 shadow-sm flex flex-col justify-between h-[110px] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-200/90 rounded-md" />
                <div className="w-7 h-7 rounded-lg bg-slate-200/80" />
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="h-7 w-16 bg-slate-300/80 rounded-lg" />
                <div className="h-4 w-12 bg-emerald-100/80 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface KpiCard3D {
  id: string;
  label: string;
  sublabel: string;
  value: string | number;
  category: "company" | "government" | "my-org" | "platform";
  icon: LucideIcon;
  accent: string;
  badge: string;
  gradient: string;
  bgTint: string;
  borderHover: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconText: string;
  metricColor: string;
  href?: string;
}

export default function DashboardEngine() {
  const router = useRouter();
  const user = useAuthStore((s: any) => s.user);
  const roles = useAuthStore((s: any) => s.roles);
  const [guardModalState, setGuardModalState] = useState<"NONE" | "ONBOARDING_INCOMPLETE_DEPT" | "ONBOARDING_INCOMPLETE_CORP" | "APPROVAL_PENDING">("NONE");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState("");

  const handleQuickActionClick = async (e: React.MouseEvent, action: QuickActionDef) => {
    if (action.href === "/pitches/create" || action.href === "/partner/enquiries/new") {
      e.preventDefault();

      try {
        let org = (user as any)?.organization;

        if (user?.organizationId) {
          try {
            const profileRes = await apiFetch<any>("/onboarding/profile");
            org = profileRes?.organization || profileRes?.data?.organization || profileRes?.data || profileRes || org;
          } catch {}
        }

        if (!user?.organizationId || !org) {
          setGuardModalState(action.href === "/pitches/create" ? "ONBOARDING_INCOMPLETE_DEPT" : "ONBOARDING_INCOMPLETE_CORP");
          return;
        }

        const statusUpper = (org.status || org.onboardingStatus || "").toUpperCase();
        const PENDING_APPROVAL_STATUSES = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "CLARIFICATION_REQUIRED", "PENDING_APPROVAL", "DOCUMENTS_SUBMITTED"];

        if (statusUpper === "ACTIVE" || statusUpper === "APPROVED" || Number(user?.roleId || user?.role) === 1) {
          router.push(action.href);
          return;
        } else if (PENDING_APPROVAL_STATUSES.includes(statusUpper)) {
          setGuardModalState("APPROVAL_PENDING");
          return;
        } else {
          setGuardModalState(action.href === "/pitches/create" ? "ONBOARDING_INCOMPLETE_DEPT" : "ONBOARDING_INCOMPLETE_CORP");
          return;
        }
      } catch {
        setGuardModalState(action.href === "/pitches/create" ? "ONBOARDING_INCOMPLETE_DEPT" : "ONBOARDING_INCOMPLETE_CORP");
      }
    }
  };

  const { data: summaryEnvelope, isLoading } = useApiQuery<SummaryEnvelope>(
    ["dashboard", "summary"],
    "/dashboard/summary",
    {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    }
  );

  const rawData: any = (summaryEnvelope as any)?.data || summaryEnvelope;

  const activeRoles = (roles || []).length > 0 ? roles : (user?.role ? [user.role] : []);
  const orgKind = user?.organization?.kind || user?.orgKind || rawData?.orgKind || "";
  const roleIdVal = Number(user?.roleId || user?.roleNumericId || user?.role?.id || (typeof user?.role === "number" ? user?.role : 0));

  const isSuperAdmin = Boolean(
    roleIdVal === 1 ||
    user?.role === "SUPER_ADMIN" ||
    activeRoles.some((r: any) => {
      const code = typeof r === "object" ? r?.code || r?.name || "" : String(r);
      const id = typeof r === "object" ? r?.id : r;
      const s = String(code).toUpperCase();
      return s.includes("SUPER_ADMIN") || s === "1" || Number(id) === 1;
    })
  );

  const isCorporate = !isSuperAdmin && Boolean(
    rawData?.isCompany ||
    orgKind === "CSR_COMPANY" ||
    roleIdVal === 8 ||
    activeRoles.some((r: any) => {
      const id = typeof r === "object" ? r?.id : r;
      const code = typeof r === "object" ? r?.code || r?.name || "" : String(r);
      const s = String(code).toUpperCase();
      return (
        s.includes("COMPANY") ||
        s.includes("CORPORATE") ||
        s.includes("SYSTEM_ROLE_8") ||
        s === "8" ||
        Number(id) === 8
      );
    })
  );

  const isGovernment = !isSuperAdmin && Boolean(
    rawData?.isGovt ||
    orgKind === "GOVERNMENT_DEPARTMENT" ||
    roleIdVal === 7 || roleIdVal === 5 || roleIdVal === 4 || roleIdVal === 3 || roleIdVal === 2 ||
    activeRoles.some((r: any) => {
      const id = typeof r === "object" ? r?.id : r;
      const code = typeof r === "object" ? r?.code || r?.name || "" : String(r);
      const s = String(code).toUpperCase();
      return (
        s.includes("GOVERNMENT") ||
        s.includes("DEPARTMENT") ||
        s.includes("NODAL") ||
        s.includes("OFFICER") ||
        s.includes("SYSTEM_ROLE_7") ||
        s.includes("SYSTEM_ROLE_5") ||
        s.includes("SYSTEM_ROLE_4") ||
        s.includes("SYSTEM_ROLE_3") ||
        s.includes("SYSTEM_ROLE_2") ||
        ["7", "5", "4", "3", "2"].includes(s) ||
        [7, 5, 4, 3, 2].includes(Number(id))
      );
    })
  );

  const isRM = activeRoles.some((r: any) => {
    const s = String(typeof r === "object" ? r?.code || r?.name : r).toUpperCase();
    return s.includes("RELATIONSHIP_MANAGER") || s.includes("RELATIONSHIP MANAGER") || s.includes("SYSTEM_ROLE_6") || roleIdVal === 6 || s === "6";
  });
  const isJS = activeRoles.some((r: any) => {
    const s = String(typeof r === "object" ? r?.code || r?.name : r).toUpperCase();
    return s.includes("JOINT_SECRETARY") || s.includes("JOINT SECRETARY") || s.includes("SYSTEM_ROLE_3") || roleIdVal === 3 || s === "3";
  });
  const isPS = activeRoles.some((r: any) => {
    const s = String(typeof r === "object" ? r?.code || r?.name : r).toUpperCase();
    return s.includes("PLANNING_SECRETARY") || s.includes("PLANNING SECRETARY") || s.includes("SYSTEM_ROLE_2") || roleIdVal === 2 || s === "2";
  });

  const summary: DashboardSummary = {
    generatedAt: rawData?.generatedAt || new Date().toISOString(),
    permissions: rawData?.permissions || {},
    kpis: Array.isArray(rawData?.kpis) && rawData.kpis.length > 0 ? rawData.kpis : DEFAULT_KPIS,
    pendingApprovals: typeof rawData?.pendingApprovals === "number" ? rawData.pendingApprovals : 4,
    openEscalations: typeof rawData?.openEscalations === "number" ? rawData.openEscalations : 2,
    recentActivity: Array.isArray(rawData?.recentActivity) && rawData.recentActivity.length > 0 ? rawData.recentActivity : [
      { id: "act-1", action: "Submitted proposal for Gadchiroli Health ICU", entityType: "Pitch", createdAt: new Date().toISOString(), actorRole: "Department Admin" },
      { id: "act-2", action: "Approved MoU draft for Vidarbha Solar Water Project", entityType: "Project", createdAt: new Date().toISOString(), actorRole: "Joint Secretary" },
      { id: "act-3", action: "Uploaded geotagged inspection photos", entityType: "Inspection", createdAt: new Date().toISOString(), actorRole: "Nodal Officer" }
    ],
    onboardingStatus: rawData?.onboardingStatus || null,
  };

  const rawQuickActions = visibleByPermission(QUICK_ACTIONS, summary);
  const quickActions = rawQuickActions.filter((action) => {
    if (action.key === "onboarding") return true;
    if (isRM && (action.key === "pitches" || action.key === "enquiry_create")) return false;
    if (isCorporate && action.key === "pitches") return false;
    if (isGovernment && action.key === "enquiry_create") return false;
    return true;
  });

  const onboarding = summary.onboardingStatus;

  const handlePortfolioTransferred = (result: PortfolioTransferResult) => {
    setTransferSuccess(
      `Handover complete: ${result.enquiryCount} enquiries and ${result.pitchCount} pitches were transferred to ${result.targetRmName || "the selected RM"}.`
    );
  };

  const getKpiValue = (keys: string[], defaultVal: number | string): number | string => {
    for (const key of keys) {
      if (typeof rawData?.[key] === "number" || typeof rawData?.[key] === "string") {
        return rawData[key];
      }
      const match = summary.kpis?.find(k => k.key === key);
      if (match && typeof match.value !== "undefined") {
        return match.value;
      }
    }
    return defaultVal;
  };

  const orgName = rawData?.orgName || user?.organizationName || "My Organization";

  // ── COMPANY USER: Personalized Company Dashboard ──
  const companyRow1Left: KpiCard3D[] = [
    {
      id: "my-enquiries", label: "My Enquiries", sublabel: "Submitted Corporate Enquiries",
      value: getKpiValue(["companyEnquiries", "enquiries"], 0), category: "my-org", icon: Send, accent: "#0284c7",
      badge: "My Submissions", gradient: "from-blue-500 to-indigo-600",
      bgTint: "from-white via-blue-50/30 to-slate-50/50", borderHover: "hover:border-blue-400/80 hover:shadow-blue-500/10",
      badgeBg: "bg-blue-50/90 border-blue-200/80", badgeText: "text-blue-700",
      iconBg: "bg-blue-100/70 border-blue-200/80", iconText: "text-blue-600", metricColor: "text-blue-950",
      href: "/enquiries",
    },
    {
      id: "my-projects", label: "My Active Projects", sublabel: "Company Convergence Projects",
      value: getKpiValue(["companyProjects", "projects"], 0), category: "my-org", icon: FolderKanban, accent: "#7c3aed",
      badge: "Active", gradient: "from-purple-500 to-indigo-600",
      bgTint: "from-white via-purple-50/30 to-slate-50/50", borderHover: "hover:border-purple-400/80 hover:shadow-purple-500/10",
      badgeBg: "bg-purple-50/90 border-purple-200/80", badgeText: "text-purple-700",
      iconBg: "bg-purple-100/70 border-purple-200/80", iconText: "text-purple-600", metricColor: "text-purple-950",
      href: "/convergence-projects",
    },
  ];
  const companyRow1Right: KpiCard3D[] = [
    {
      id: "my-assignments", label: "My Assignments", sublabel: "Tasks Assigned to Company",
      value: getKpiValue(["activeAssignments", "assignments"], 0), category: "my-org", icon: ClipboardCheck, accent: "#059669",
      badge: "Pending", gradient: "from-emerald-500 to-teal-600",
      bgTint: "from-white via-emerald-50/30 to-slate-50/50", borderHover: "hover:border-emerald-400/80 hover:shadow-emerald-500/10",
      badgeBg: "bg-emerald-50/90 border-emerald-200/80", badgeText: "text-emerald-700",
      iconBg: "bg-emerald-100/70 border-emerald-200/80", iconText: "text-emerald-600", metricColor: "text-emerald-950",
      href: "/assignments",
    },
    {
      id: "my-outlay", label: "CSR Outlay", sublabel: "Indicative Budget Pledged",
      value: rawData?.corporateOutlay ? `\u20B9${rawData.corporateOutlay} Cr` : "\u20B90 Cr", category: "my-org", icon: Coins, accent: "#d97706",
      badge: "Committed", gradient: "from-amber-500 to-orange-600",
      bgTint: "from-white via-amber-50/30 to-slate-50/50", borderHover: "hover:border-amber-400/80 hover:shadow-amber-500/10",
      badgeBg: "bg-amber-50/90 border-amber-200/80", badgeText: "text-amber-800",
      iconBg: "bg-amber-100/70 border-amber-200/80", iconText: "text-amber-600", metricColor: "text-amber-950",
      href: "/enquiries",
    },
  ];
  const companyRow2Left: KpiCard3D[] = [
    {
      id: "platform-projects", label: "Platform Projects", sublabel: "Total Convergence Projects",
      value: getKpiValue(["totalProjects"], 0), category: "platform", icon: ShieldCheck, accent: "#0d9488",
      badge: "Platform-Wide", gradient: "from-teal-500 to-emerald-600",
      bgTint: "from-white via-teal-50/30 to-slate-50/50", borderHover: "hover:border-teal-400/80 hover:shadow-teal-500/10",
      badgeBg: "bg-teal-50/90 border-teal-200/80", badgeText: "text-teal-700",
      iconBg: "bg-teal-100/70 border-teal-200/80", iconText: "text-teal-600", metricColor: "text-teal-950",
      href: "/convergence-projects",
    },
    {
      id: "platform-orgs", label: "Registered Organizations", sublabel: "Government & Partner Orgs",
      value: getKpiValue(["totalOrgs"], 0), category: "platform", icon: Landmark, accent: "#4f46e5",
      badge: "All Orgs", gradient: "from-indigo-500 to-purple-600",
      bgTint: "from-white via-indigo-50/30 to-slate-50/50", borderHover: "hover:border-indigo-400/80 hover:shadow-indigo-500/10",
      badgeBg: "bg-indigo-50/90 border-indigo-200/80", badgeText: "text-indigo-700",
      iconBg: "bg-indigo-100/70 border-indigo-200/80", iconText: "text-indigo-600", metricColor: "text-indigo-950",
      href: "/organization",
    },
  ];
  const companyRow2Right: KpiCard3D[] = [
    {
      id: "platform-pitches", label: "Available Pitches", sublabel: "Government Development Needs",
      value: getKpiValue(["totalPitches", "pitches", "deptPitches"], 0), category: "platform", icon: Compass, accent: "#0284c7",
      badge: "Marketplace", gradient: "from-sky-500 to-blue-600",
      bgTint: "from-white via-sky-50/30 to-slate-50/50", borderHover: "hover:border-sky-400/80 hover:shadow-sky-500/10",
      badgeBg: "bg-sky-50/90 border-sky-200/80", badgeText: "text-sky-700",
      iconBg: "bg-sky-100/70 border-sky-200/80", iconText: "text-sky-600", metricColor: "text-sky-950",
      href: "/pitches",
    },
    {
      id: "my-onboarding", label: "Profile Status", sublabel: "Organization Verification",
      value: rawData?.orgStatus === "ACTIVE" ? "Verified" : (rawData?.orgStatus || "Pending").replace(/_/g, " "),
      category: "my-org", icon: Award,
      accent: rawData?.orgStatus === "ACTIVE" ? "#059669" : "#d97706",
      badge: rawData?.orgStatus === "ACTIVE" ? "Active" : "Pending",
      gradient: rawData?.orgStatus === "ACTIVE" ? "from-emerald-500 to-green-600" : "from-rose-500 to-red-600",
      bgTint: rawData?.orgStatus === "ACTIVE" ? "from-white via-emerald-50/30 to-slate-50/50" : "from-white via-rose-50/30 to-slate-50/50",
      borderHover: rawData?.orgStatus === "ACTIVE" ? "hover:border-emerald-400/80 hover:shadow-emerald-500/10" : "hover:border-rose-400/80 hover:shadow-rose-500/10",
      badgeBg: rawData?.orgStatus === "ACTIVE" ? "bg-emerald-50/90 border-emerald-200/80" : "bg-rose-50/90 border-rose-200/80",
      badgeText: rawData?.orgStatus === "ACTIVE" ? "text-emerald-700" : "text-rose-700",
      iconBg: rawData?.orgStatus === "ACTIVE" ? "bg-emerald-100/70 border-emerald-200/80" : "bg-rose-100/70 border-rose-200/80",
      iconText: rawData?.orgStatus === "ACTIVE" ? "text-emerald-600" : "text-rose-600",
      metricColor: rawData?.orgStatus === "ACTIVE" ? "text-emerald-950" : "text-rose-950",
      href: "/organization/onboarding",
    },
  ];

  // ── GOVERNMENT DEPARTMENT USER: Personalized Department Dashboard ──
  const govtRow1Left: KpiCard3D[] = [
    {
      id: "my-pitches", label: "My Department Pitches", sublabel: "Development Need Proposals",
      value: getKpiValue(["deptPitches", "pitches"], 0), category: "my-org", icon: Compass, accent: "#0284c7",
      badge: "My Pitches", gradient: "from-sky-500 to-blue-600",
      bgTint: "from-white via-sky-50/30 to-slate-50/50", borderHover: "hover:border-sky-400/80 hover:shadow-sky-500/10",
      badgeBg: "bg-sky-50/90 border-sky-200/80", badgeText: "text-sky-700",
      iconBg: "bg-sky-100/70 border-sky-200/80", iconText: "text-sky-600", metricColor: "text-sky-950",
      href: "/pitches",
    },
    {
      id: "received-interests", label: "Received Corporate Interests", sublabel: "Companies Interested in My Pitches",
      value: getKpiValue(["deptInterests", "companyInterests"], 0), category: "my-org", icon: HeartHandshake, accent: "#7c3aed",
      badge: "Received", gradient: "from-purple-500 to-indigo-600",
      bgTint: "from-white via-purple-50/30 to-slate-50/50", borderHover: "hover:border-purple-400/80 hover:shadow-purple-500/10",
      badgeBg: "bg-purple-50/90 border-purple-200/80", badgeText: "text-purple-700",
      iconBg: "bg-purple-100/70 border-purple-200/80", iconText: "text-purple-600", metricColor: "text-purple-950",
      href: "/interests",
    },
  ];
  const govtRow1Right: KpiCard3D[] = [
    {
      id: "my-dept-projects", label: "My Convergence Projects", sublabel: "Department Active Projects",
      value: getKpiValue(["companyProjects", "projects", "totalProjects"], 0), category: "my-org", icon: FolderKanban, accent: "#059669",
      badge: "Active", gradient: "from-emerald-500 to-teal-600",
      bgTint: "from-white via-emerald-50/30 to-slate-50/50", borderHover: "hover:border-emerald-400/80 hover:shadow-emerald-500/10",
      badgeBg: "bg-emerald-50/90 border-emerald-200/80", badgeText: "text-emerald-700",
      iconBg: "bg-emerald-100/70 border-emerald-200/80", iconText: "text-emerald-600", metricColor: "text-emerald-950",
      href: "/convergence-projects",
    },
    {
      id: "my-dept-assignments", label: "My Assignments", sublabel: "Tasks Assigned to Department",
      value: getKpiValue(["activeAssignments", "assignments"], 0), category: "my-org", icon: ClipboardCheck, accent: "#d97706",
      badge: "Pending", gradient: "from-amber-500 to-orange-600",
      bgTint: "from-white via-amber-50/30 to-slate-50/50", borderHover: "hover:border-amber-400/80 hover:shadow-amber-500/10",
      badgeBg: "bg-amber-50/90 border-amber-200/80", badgeText: "text-amber-800",
      iconBg: "bg-amber-100/70 border-amber-200/80", iconText: "text-amber-600", metricColor: "text-amber-950",
      href: "/assignments",
    },
  ];
  const govtRow2Left: KpiCard3D[] = [
    {
      id: "platform-projects-g", label: "Platform Projects", sublabel: "Total Convergence Projects",
      value: getKpiValue(["totalProjects"], 0), category: "platform", icon: ShieldCheck, accent: "#0d9488",
      badge: "Platform-Wide", gradient: "from-teal-500 to-emerald-600",
      bgTint: "from-white via-teal-50/30 to-slate-50/50", borderHover: "hover:border-teal-400/80 hover:shadow-teal-500/10",
      badgeBg: "bg-teal-50/90 border-teal-200/80", badgeText: "text-teal-700",
      iconBg: "bg-teal-100/70 border-teal-200/80", iconText: "text-teal-600", metricColor: "text-teal-950",
      href: "/convergence-projects",
    },
    {
      id: "platform-orgs-g", label: "Registered Organizations", sublabel: "Government & Partner Orgs",
      value: getKpiValue(["totalOrgs"], 0), category: "platform", icon: Landmark, accent: "#4f46e5",
      badge: "All Orgs", gradient: "from-indigo-500 to-purple-600",
      bgTint: "from-white via-indigo-50/30 to-slate-50/50", borderHover: "hover:border-indigo-400/80 hover:shadow-indigo-500/10",
      badgeBg: "bg-indigo-50/90 border-indigo-200/80", badgeText: "text-indigo-700",
      iconBg: "bg-indigo-100/70 border-indigo-200/80", iconText: "text-indigo-600", metricColor: "text-indigo-950",
      href: "/organization",
    },
  ];
  const govtRow2Right: KpiCard3D[] = [
    {
      id: "platform-approvals-g", label: "Pending Approvals", sublabel: "Secretariat Verification Queue",
      value: summary.pendingApprovals ?? 0, category: "platform", icon: CheckCircle2, accent: "#0284c7",
      badge: "Pending Review", gradient: "from-blue-500 to-indigo-600",
      bgTint: "from-white via-blue-50/30 to-slate-50/50", borderHover: "hover:border-blue-400/80 hover:shadow-blue-500/10",
      badgeBg: "bg-blue-50/90 border-blue-200/80", badgeText: "text-blue-700",
      iconBg: "bg-blue-100/70 border-blue-200/80", iconText: "text-blue-600", metricColor: "text-blue-950",
      href: "/admin/onboarding-approvals",
    },
    {
      id: "dept-onboarding", label: "Profile Status", sublabel: "Department Verification",
      value: rawData?.orgStatus === "ACTIVE" ? "Verified" : (rawData?.orgStatus || "Pending").replace(/_/g, " "),
      category: "my-org", icon: Award,
      accent: rawData?.orgStatus === "ACTIVE" ? "#059669" : "#d97706",
      badge: rawData?.orgStatus === "ACTIVE" ? "Active" : "Pending",
      gradient: rawData?.orgStatus === "ACTIVE" ? "from-emerald-500 to-green-600" : "from-rose-500 to-red-600",
      bgTint: rawData?.orgStatus === "ACTIVE" ? "from-white via-emerald-50/30 to-slate-50/50" : "from-white via-rose-50/30 to-slate-50/50",
      borderHover: rawData?.orgStatus === "ACTIVE" ? "hover:border-emerald-400/80 hover:shadow-emerald-500/10" : "hover:border-rose-400/80 hover:shadow-rose-500/10",
      badgeBg: rawData?.orgStatus === "ACTIVE" ? "bg-emerald-50/90 border-emerald-200/80" : "bg-rose-50/90 border-rose-200/80",
      badgeText: rawData?.orgStatus === "ACTIVE" ? "text-emerald-700" : "text-rose-700",
      iconBg: rawData?.orgStatus === "ACTIVE" ? "bg-emerald-100/70 border-emerald-200/80" : "bg-rose-100/70 border-rose-200/80",
      iconText: rawData?.orgStatus === "ACTIVE" ? "text-emerald-600" : "text-rose-600",
      metricColor: rawData?.orgStatus === "ACTIVE" ? "text-emerald-950" : "text-rose-950",
      href: "/organization/onboarding",
    },
  ];

  // ── ADMIN/OVERSIGHT (RM, JS, PS, Super Admin): Platform-Wide Overview ──
  const adminRow1Left: KpiCard3D[] = [
    {
      id: "company-enquiries", label: "Corporate Enquiries", sublabel: "Partnership Expressions",
      value: getKpiValue(["companyEnquiries", "enquiries", "totalEnquiries"], 14), category: "company", icon: Building2, accent: "#0284c7",
      badge: "Corporate Desk", gradient: "from-blue-500 to-indigo-600",
      bgTint: "from-white via-blue-50/30 to-slate-50/50", borderHover: "hover:border-blue-400/80 hover:shadow-blue-500/10",
      badgeBg: "bg-blue-50/90 border-blue-200/80", badgeText: "text-blue-700",
      iconBg: "bg-blue-100/70 border-blue-200/80", iconText: "text-blue-600", metricColor: "text-blue-950",
      href: "/enquiries",
    },
    {
      id: "company-interests", label: "Corporate Interests", sublabel: "Received Intent Forms",
      value: getKpiValue(["companyInterests", "deptInterests"], 28), category: "company", icon: TrendingUp, accent: "#7c3aed",
      badge: "Company Interest", gradient: "from-purple-500 to-indigo-600",
      bgTint: "from-white via-purple-50/30 to-slate-50/50", borderHover: "hover:border-purple-400/80 hover:shadow-purple-500/10",
      badgeBg: "bg-purple-50/90 border-purple-200/80", badgeText: "text-purple-700",
      iconBg: "bg-purple-100/70 border-purple-200/80", iconText: "text-purple-600", metricColor: "text-purple-950",
      href: "/interests",
    },
  ];
  const adminRow1Right: KpiCard3D[] = [
    {
      id: "govt-pitches", label: "Government Pitches", sublabel: "Department Need Proposals",
      value: getKpiValue(["deptPitches", "pitches", "totalPitches"], 9), category: "government", icon: Compass, accent: "#0284c7",
      badge: "State Pitches", gradient: "from-sky-500 to-blue-600",
      bgTint: "from-white via-sky-50/30 to-slate-50/50", borderHover: "hover:border-sky-400/80 hover:shadow-sky-500/10",
      badgeBg: "bg-sky-50/90 border-sky-200/80", badgeText: "text-sky-700",
      iconBg: "bg-sky-100/70 border-sky-200/80", iconText: "text-sky-600", metricColor: "text-sky-950",
      href: "/pitches",
    },
    {
      id: "govt-orgs", label: "Government & Partner Orgs", sublabel: "Departments & Agencies",
      value: getKpiValue(["totalOrgs"], 42), category: "government", icon: Landmark, accent: "#4f46e5",
      badge: "Registered Orgs", gradient: "from-indigo-500 to-purple-600",
      bgTint: "from-white via-indigo-50/30 to-slate-50/50", borderHover: "hover:border-indigo-400/80 hover:shadow-indigo-500/10",
      badgeBg: "bg-indigo-50/90 border-indigo-200/80", badgeText: "text-indigo-700",
      iconBg: "bg-indigo-100/70 border-indigo-200/80", iconText: "text-indigo-600", metricColor: "text-indigo-950",
      href: "/organization",
    },
  ];
  const adminRow2Left: KpiCard3D[] = [
    {
      id: "company-projects", label: "Convergence Projects", sublabel: "Active CSR Initiatives",
      value: getKpiValue(["companyProjects", "totalProjects", "projects"], 38), category: "company", icon: ShieldCheck, accent: "#059669",
      badge: "Funded Projects", gradient: "from-emerald-500 to-teal-600",
      bgTint: "from-white via-emerald-50/30 to-slate-50/50", borderHover: "hover:border-emerald-400/80 hover:shadow-emerald-500/10",
      badgeBg: "bg-emerald-50/90 border-emerald-200/80", badgeText: "text-emerald-700",
      iconBg: "bg-emerald-100/70 border-emerald-200/80", iconText: "text-emerald-600", metricColor: "text-emerald-950",
      href: "/convergence-projects",
    },
    {
      id: "company-outlay", label: "Indicative CSR Outlay", sublabel: "Pledged Outlay Budget",
      value: rawData?.corporateOutlay ? `\u20B9${rawData.corporateOutlay} Cr` : "\u20B9142.5 Cr", category: "company", icon: Coins, accent: "#d97706",
      badge: "Outlay Pledged", gradient: "from-amber-500 to-orange-600",
      bgTint: "from-white via-amber-50/30 to-slate-50/50", borderHover: "hover:border-amber-400/80 hover:shadow-amber-500/10",
      badgeBg: "bg-amber-50/90 border-amber-200/80", badgeText: "text-amber-800",
      iconBg: "bg-amber-100/70 border-amber-200/80", iconText: "text-amber-600", metricColor: "text-amber-950",
      href: "/enquiries",
    },
  ];
  const adminRow2Right: KpiCard3D[] = [
    {
      id: "govt-approvals", label: "Secretariat Approvals", sublabel: "Pending Verification Queue",
      value: summary.pendingApprovals ?? 4, category: "government", icon: CheckCircle2, accent: "#0d9488",
      badge: "Pending Review", gradient: "from-teal-500 to-emerald-600",
      bgTint: "from-white via-teal-50/30 to-slate-50/50", borderHover: "hover:border-teal-400/80 hover:shadow-teal-500/10",
      badgeBg: "bg-teal-50/90 border-teal-200/80", badgeText: "text-teal-700",
      iconBg: "bg-teal-100/70 border-teal-200/80", iconText: "text-teal-600", metricColor: "text-teal-950",
      href: "/decisions",
    },
    {
      id: "govt-escalations", label: "Active Escalations", sublabel: "SLA Monitored Queue",
      value: summary.openEscalations ?? 2, category: "government", icon: ShieldAlert, accent: "#e11d48",
      badge: "SLA Monitored", gradient: "from-rose-500 to-red-600",
      bgTint: "from-white via-rose-50/30 to-slate-50/50", borderHover: "hover:border-rose-400/80 hover:shadow-rose-500/10",
      badgeBg: "bg-rose-50/90 border-rose-200/80", badgeText: "text-rose-700",
      iconBg: "bg-rose-100/70 border-rose-200/80", iconText: "text-rose-600", metricColor: "text-rose-950",
      href: "/escalations",
    },
  ];

  // Choose the correct set based on role
  let r1Left: KpiCard3D[], r1Right: KpiCard3D[], r2Left: KpiCard3D[], r2Right: KpiCard3D[];
  let leftTitle: string, leftSubtitle: string, leftIcon: LucideIcon;
  let rightTitle: string, rightSubtitle: string, rightIcon: LucideIcon;

  if (isCorporate) {
    r1Left = companyRow1Left; r1Right = companyRow1Right;
    r2Left = companyRow2Left; r2Right = companyRow2Right;
    leftTitle = `My Company \u2014 ${orgName}`;
    leftSubtitle = "Your corporate enquiries, projects & CSR metrics";
    leftIcon = Briefcase;
    rightTitle = "Platform Overview";
    rightSubtitle = "MahaCSR platform-wide statistics & marketplace";
    rightIcon = Globe;
  } else if (isGovernment) {
    r1Left = govtRow1Left; r1Right = govtRow1Right;
    r2Left = govtRow2Left; r2Right = govtRow2Right;
    leftTitle = `My Department \u2014 ${orgName}`;
    leftSubtitle = "Your department pitches, interests & project metrics";
    leftIcon = Landmark;
    rightTitle = "Platform Overview";
    rightSubtitle = "MahaCSR platform-wide statistics & approvals";
    rightIcon = Globe;
  } else if (isJS || isPS) {
    r1Left = adminRow1Right; r1Right = adminRow1Left;
    r2Left = adminRow2Right; r2Right = adminRow2Left;
    leftTitle = "Joint Secretary State Secretariat Desk";
    leftSubtitle = "Secretariat approvals, feasibility decision queue & SLA escalations";
    leftIcon = ShieldCheck;
    rightTitle = "Corporate & Industry Portfolio Desk";
    rightSubtitle = "Corporate enquiries, funding outlays & active convergence projects";
    rightIcon = Building2;
  } else if (isRM) {
    r1Left = adminRow1Left; r1Right = adminRow1Right;
    r2Left = adminRow2Left; r2Right = adminRow2Right;
    leftTitle = "Relationship Manager Portfolio Desk";
    leftSubtitle = "Corporate enquiries, interest submissions & feasibility assessments";
    leftIcon = Building2;
    rightTitle = "Government & Department Desk";
    rightSubtitle = "State pitches, approvals & escalations queue";
    rightIcon = Landmark;
  } else {
    r1Left = adminRow1Left; r1Right = adminRow1Right;
    r2Left = adminRow2Left; r2Right = adminRow2Right;
    leftTitle = "Corporate & Company Desk";
    leftSubtitle = "CSR enquiries, interest submissions & funding metrics";
    leftIcon = Building2;
    rightTitle = "Government & Department Desk";
    rightSubtitle = "State pitches, approvals & escalations queue";
    rightIcon = Landmark;
  }

  if (isLoading && !summaryEnvelope) {
    return <DashboardSkeleton />;
  }

  const renderCard = (card: KpiCard3D, delayIdx: number) => {
    const Icon = card.icon;
    const CardComponent = (
      <motion.div
        key={card.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          y: -4, rotateX: 3, rotateY: -3, scale: 1.018,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        transition={{ duration: 0.25, delay: delayIdx * 0.03 }}
        className={`group relative rounded-xl border border-slate-200/90 bg-gradient-to-br ${card.bgTint} p-3.5 shadow-xs hover:shadow-lg ${card.borderHover} transition-all duration-200 cursor-pointer transform-gpu flex flex-col justify-between h-[105px] overflow-hidden`}
        style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      >
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
        <div className="flex items-center justify-between relative z-10 pt-0.5" style={{ transform: "translateZ(8px)" }}>
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-[11px] font-bold text-slate-800 group-hover:text-slate-950 transition-colors truncate">{card.label}</span>
            <span className="text-[9px] text-slate-500 font-medium truncate">{card.sublabel}</span>
          </div>
          <div className={`w-7 h-7 rounded-lg border ${card.iconBg} ${card.iconText} shadow-2xs group-hover:scale-110 transition-all flex items-center justify-center shrink-0`} style={{ transform: "translateZ(14px)" }}>
            <Icon size={14} />
          </div>
        </div>
        <div className="flex items-baseline justify-between relative z-10 mt-1" style={{ transform: "translateZ(14px)" }}>
          <div className={`text-2xl font-black tracking-tight ${card.metricColor} font-heading`}>
            <AnimatedCounter value={card.value} />
          </div>
          <span className={`text-[9px] font-bold ${card.badgeText} ${card.badgeBg} shadow-2xs px-2 py-0.5 rounded-md font-mono transition-all`}>{card.badge}</span>
        </div>
      </motion.div>
    );

    if (card.href) {
      return (
        <Link key={card.id} href={card.href} className="block">
          {CardComponent}
        </Link>
      );
    }
    return CardComponent;
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Alert Banner */}
      {onboarding && onboarding.isPending && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-4 backdrop-blur-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 mt-0.5 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm text-amber-950">{onboarding.title}</h4>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-white border border-amber-300 text-amber-800">
                  {onboarding.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{onboarding.message}</p>
            </div>
          </div>
          <Link
            href={onboarding.actionUrl || "/organization/onboarding"}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-800 text-white shadow-2xs hover:bg-amber-900 transition-all shrink-0"
          >
            {onboarding.actionText || "View Status"}
            <ArrowRight size={13} />
          </Link>
        </motion.div>
      )}

      {/* Quick Action Shortcuts */}
      {transferSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
          {transferSuccess}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
          <Sparkles size={13} className="text-blue-600" /> Quick Actions:
        </span>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.key}
              href={action.href}
              onClick={(e) => handleQuickActionClick(e, action)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-900 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 shadow-2xs group"
            >
              <Icon size={13} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
              <span>{action.label}</span>
            </Link>
          );
        })}
        {isRM && (
          <button
            type="button"
            onClick={() => {
              setTransferSuccess("");
              setTransferModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:border-blue-300 hover:bg-blue-100 transition-all duration-150 shadow-2xs"
          >
            <ArrowRightLeft size={13} />
            <span>Transfer Portfolio</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      {isCorporate || isGovernment ? (
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/70 text-slate-700 font-bold text-xs">
              {React.createElement(leftIcon, { size: 13 })}
            </span>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{leftTitle}</h3>
              <p className="text-[10px] text-slate-500 font-normal">{leftSubtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {renderCard(r1Left[0], 0)}
            {renderCard(r1Left[1], 1)}
            {renderCard(r2Left[0], 2)}
            {renderCard(r2Left[1], 3)}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 space-y-4">
          {/* Section Title Headers */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-5 items-center border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/70 text-slate-700 font-bold text-xs">
                {React.createElement(leftIcon, { size: 13 })}
              </span>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{leftTitle}</h3>
                <p className="text-[10px] text-slate-500 font-normal">{leftSubtitle}</p>
              </div>
            </div>
            <div className="hidden lg:block w-px" />
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/70 text-slate-700 font-bold text-xs">
                {React.createElement(rightIcon, { size: 13 })}
              </span>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">{rightTitle}</h3>
                <p className="text-[10px] text-slate-500 font-normal">{rightSubtitle}</p>
              </div>
            </div>
          </div>

          {/* 8-Card Grid Layout with Smooth Vertical Divider */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-5 items-stretch">
            {/* LEFT SIDE: 4 Cards */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {renderCard(r1Left[0], 0)}
                {renderCard(r1Left[1], 1)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {renderCard(r2Left[0], 2)}
                {renderCard(r2Left[1], 3)}
              </div>
            </div>

            {/* SMOOTH VERTICAL DIVIDER */}
            <div className="hidden lg:flex items-center justify-center relative mx-0.5">
              <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-slate-300 to-transparent rounded-full shadow-[0_0_8px_rgba(148,163,184,0.4)]" />
            </div>

            {/* RIGHT SIDE: 4 Cards */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {renderCard(r1Right[0], 4)}
                {renderCard(r1Right[1], 5)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {renderCard(r2Right[0], 6)}
                {renderCard(r2Right[1], 7)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Work Queue / Approvals */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldCheck size={16} />
                </div>
                <h3 className="font-bold text-xs text-slate-900">
                  {isCorporate ? "My Enquiry Status" : isGovernment ? "My Pitch Approvals" : "Pending Approvals & Verification"}
                </h3>
              </div>
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {summary.pendingApprovals} Pending
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              {isCorporate
                ? "Track the status of your corporate enquiries and project proposals submitted to the CSR Cell."
                : isGovernment
                ? "Track the approval status of your department pitches and development need proposals."
                : "Review organization applications and project proposals waiting for Secretariat sign-off."}
            </p>
          </div>
          <Link
            href={isCorporate ? "/enquiries" : isGovernment ? "/pitches" : "/admin/onboarding-approvals"}
            className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 text-xs font-bold text-slate-700 hover:text-blue-900 transition-all group"
          >
            <span>{isCorporate ? "View My Enquiries" : isGovernment ? "View My Pitches" : "Go to Approvals Queue"}</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Activity size={16} />
                </div>
                <h3 className="font-bold text-xs text-slate-900">
                  {isCorporate || isGovernment ? "My Recent Activity" : "Recent Platform Activity"}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Live Feed</span>
            </div>
            <div className="space-y-2.5">
              {(summary.recentActivity || []).slice(0, 3).map((act: any) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-xs">{act.action}</p>
                    <span className="text-[9px] text-slate-400 font-mono">{act.entityType} &bull; {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/audit-logs"
            className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/70 text-xs font-bold text-slate-700 hover:text-indigo-900 transition-all group mt-3"
          >
            <span>View Full Activity Log</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>

      {/* Onboarding Incomplete Department Modal */}
      <TransferPortfolioModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        sourceRmId={user?.id || ""}
        sourceRmLabel={
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "your account"
        }
        endpoint="/rm/transfer-portfolio"
        onTransferred={handlePortfolioTransferred}
      />

      <Modal
        isOpen={guardModalState === "ONBOARDING_INCOMPLETE_DEPT"}
        onClose={() => setGuardModalState("NONE")}
        title="Onboarding Needs to Be Completed"
      >
        <div className="flex flex-col gap-4 p-2">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-xs font-semibold">
              Your government department onboarding needs to be completed before submitting a government pitch. Please complete your department onboarding first.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setGuardModalState("NONE")}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-blue-900 hover:bg-blue-950 text-white"
              onClick={() => {
                setGuardModalState("NONE");
                router.push("/organization/onboarding/department");
              }}
            >
              Complete Onboarding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Onboarding Incomplete Corporate Modal */}
      <Modal
        isOpen={guardModalState === "ONBOARDING_INCOMPLETE_CORP"}
        onClose={() => setGuardModalState("NONE")}
        title="Onboarding Needs to Be Completed"
      >
        <div className="flex flex-col gap-4 p-2">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-xs font-semibold">
              Your corporate/company onboarding needs to be completed before submitting a CSR enquiry. Please complete your onboarding first.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setGuardModalState("NONE")}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-blue-900 hover:bg-blue-950 text-white"
              onClick={() => {
                setGuardModalState("NONE");
                router.push("/organization/onboarding/company");
              }}
            >
              Complete Onboarding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Superadmin Approval Pending Modal */}
      <Modal
        isOpen={guardModalState === "APPROVAL_PENDING"}
        onClose={() => setGuardModalState("NONE")}
        title="Approval Pending"
      >
        <div className="flex flex-col gap-4 p-2">
          <div className="flex items-center gap-3 text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
            <Clock size={24} className="shrink-0 text-blue-700" />
            <p className="text-xs font-semibold">
              Your onboarding approval is pending from Superadmin. Till then explore the marketplace.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setGuardModalState("NONE")}>
              Close
            </Button>
            <Button
              variant="primary"
              className="bg-blue-900 hover:bg-blue-950 text-white"
              onClick={() => {
                setGuardModalState("NONE");
                router.push("/marketplace");
              }}
            >
              Explore Marketplace
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
