"use client";

import React from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowRight, Bell, Building2, CheckCircle2,
  Clock3, Compass, FileCheck, FileText, FolderKanban, HeartHandshake,
  Landmark, RefreshCcw, ShieldAlert, ShieldCheck, Users, Target
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { DashboardSummary, QUICK_ACTIONS, visibleByPermission } from "@/lib/dashboardEngine";
import { StatCard } from "@/components/ui/StatCard";
import { WorkQueueSection } from "./WorkQueueSection";
import { AlertsSection } from "./AlertsSection";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/authStore";

const DashboardCharts = dynamic(
  () => import("./DashboardCharts").then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => <div className="h-64 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse" />
  }
);

interface SummaryEnvelope {
  success: boolean;
  data: DashboardSummary & {
    asOf?: string;
    userRoleId?: number;
    roleCode?: string;
    orgName?: string | null;
    orgKind?: string | null;
    governmentLevel?: string | null;
    governmentType?: string | null;
    workQueue?: any[];
    alerts?: any[];
    charts?: any;
  };
}

type Theme = "blue" | "purple" | "emerald" | "amber" | "sky" | "indigo" | "teal" | "rose";

const KPI_VISUALS: Array<{ match: RegExp; icon: LucideIcon; theme: Theme; badge: string }> = [
  { match: /escalat|overdue|stale|reject|critical|block/i, icon: ShieldAlert, theme: "rose", badge: "Critical" },
  { match: /clarif|pending|await|due|unassigned|uncontacted|review/i, icon: Clock3, theme: "amber", badge: "Action" },
  { match: /project|assignment|portfolio|multi/i, icon: FolderKanban, theme: "purple", badge: "Active" },
  { match: /pitch|interest|lead/i, icon: HeartHandshake, theme: "teal", badge: "Pipeline" },
  { match: /enquir|case|assessment|feasibility/i, icon: FileText, theme: "blue", badge: "Workflow" },
  { match: /department|organization|ngo|nodal|dnc|corporate|user/i, icon: Building2, theme: "indigo", badge: "Governance" },
  { match: /fund|budget|commit|release|utiliz/i, icon: Landmark, theme: "emerald", badge: "Financial" },
  { match: /active|approved|public|completed|health|verified/i, icon: CheckCircle2, theme: "emerald", badge: "Current" },
];

function kpiVisual(key: string, label: string, index: number) {
  return KPI_VISUALS.find(item => item.match.test(`${key} ${label}`)) || {
    icon: index % 2 ? Activity : ShieldCheck,
    theme: (["blue", "indigo", "teal", "emerald", "amber", "purple"] as Theme[])[index % 6],
    badge: "Metric",
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-44 rounded-md bg-slate-200" />
          <div className="h-7 w-64 rounded-lg bg-slate-200" />
        </div>
        <div className="h-8 w-36 rounded-lg bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200/80 bg-white shadow-xs" />
        ))}
      </div>
    </div>
  );
}

function formatRoleName(roleCode: any, userRoleId: any, fallbackRole?: string): string {
  if (roleCode && typeof roleCode === "object") {
    if (typeof roleCode.name === "string" && roleCode.name.trim() && isNaN(Number(roleCode.name))) return roleCode.name;
    if (typeof roleCode.code === "string" && roleCode.code.trim() && isNaN(Number(roleCode.code))) {
      return roleCode.code.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }
  }
  if (typeof roleCode === "string" && isNaN(Number(roleCode)) && roleCode.trim()) {
    return roleCode.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
  const numeric = Number(userRoleId || (typeof roleCode === "number" ? roleCode : (!isNaN(Number(roleCode)) ? Number(roleCode) : 0)));
  const ROLE_MAP: Record<number, string> = {
    1: "Super Admin",
    2: "Planning Secretary",
    3: "Joint Secretary",
    4: "State CSR Cell",
    5: "District Nodal Officer",
    6: "CSR Relationship Manager",
    7: "Implementing Agency",
    8: "Corporate Partner",
    9: "Government Officer",
  };
  if (ROLE_MAP[numeric]) return ROLE_MAP[numeric];
  if (fallbackRole && typeof fallbackRole === "string" && isNaN(Number(fallbackRole))) {
    return fallbackRole.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
  return "Authorized User";
}

export default function DashboardEngine() {
  const storeUser = useAuthStore((s) => s.user);
  const query = useApiQuery<SummaryEnvelope>(["dashboard", "summary"], "/dashboard/summary", {
    staleTime: 45_000,
    gcTime: 300_000,
  });

  const envelope: any = query.data;
  const summary: any = envelope?.data || (envelope?.kpis ? envelope : undefined);

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError || !summary) {
    return (
      <section className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-5 shadow-xs" role="alert">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-red-200 bg-white p-2 text-red-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-red-950 text-sm">Dashboard metrics currently unavailable</h2>
            <p className="mt-0.5 text-xs font-medium text-red-700">Live operational data could not be retrieved from the server.</p>
            <button
              onClick={() => query.refetch()}
              className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-red-800"
            >
              <RefreshCcw size={13} />
              Retry Connection
            </button>
          </div>
        </div>
      </section>
    );
  }

  const actions = visibleByPermission(QUICK_ACTIONS, summary);
  const asOf = new Date(summary.asOf || summary.generatedAt);
  const kpiList = summary.kpis || [];
  const workQueueItems = summary.workQueue || [];
  const alertsList = summary.alerts || [];
  const userRoleId = Number(summary.userRoleId || 0);
  const roleCodeStr = String(summary.roleCode || "");
  const isPartitionedRole = [2, 3, 6].includes(userRoleId) || /PLANNING_SECRETARY|JOINT_SECRETARY|RELATIONSHIP_MANAGER/i.test(roleCodeStr);
  const roleDisplayName = formatRoleName(summary.roleCode, summary.userRoleId, storeUser?.role);

  return (
    <div className="space-y-4">
      {/* 1. Ultra-Clean Single-Row Workspace Header */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-heading text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight">
            Executive Operations Workspace
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-800 border border-blue-200/70">
            <ShieldCheck size={12} className="text-blue-600" />
            {roleDisplayName}
          </span>
          {summary.orgName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
              <Building2 size={11} className="text-slate-500" />
              {summary.orgName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
            <Clock3 size={12} className="text-slate-400" />
            <span>Updated {Number.isNaN(asOf.getTime()) ? "just now" : asOf.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
          <button
            onClick={() => query.refetch()}
            title="Refresh dashboard data"
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-blue-900"
          >
            <RefreshCcw size={13} className={query.isFetching ? "animate-spin text-blue-700" : ""} />
          </button>
        </div>
      </section>

      {/* 2. Onboarding Status Banner if pending */}
      {summary.onboardingStatus?.isPending && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/70 to-white p-3.5 shadow-xs">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-amber-200 bg-white p-2 text-amber-700">
              <Landmark size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-extrabold text-amber-950">{summary.onboardingStatus.title}</h2>
              <p className="mt-0.5 text-xs font-medium leading-relaxed text-amber-900/80">{summary.onboardingStatus.message}</p>
              <Link
                href={summary.onboardingStatus.actionUrl}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-amber-800 hover:no-underline"
              >
                <span>{summary.onboardingStatus.actionText}</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Alerts & Exceptions Section */}
      <AlertsSection alerts={alertsList} />

      {/* 4. Primary KPI Cards Grid */}
      <section aria-labelledby="primary-kpis-heading" className="space-y-2.5">
        {(!isPartitionedRole || kpiList.length < 4) && kpiList.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-800">
                <Target size={13} />
              </div>
              <h2 id="primary-kpis-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-slate-900">
                Key Performance Indicators ({kpiList.length})
              </h2>
            </div>
          </div>
        )}

        {kpiList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <ShieldCheck className="mx-auto text-slate-400" size={32} />
            <p className="mt-3 text-sm font-bold text-slate-800">No KPI metrics assigned for this role scope.</p>
            <p className="mt-1 text-xs text-slate-500">Please select an action from the navigation workspace.</p>
          </div>
        ) : isPartitionedRole && kpiList.length >= 4 ? (
          (() => {
            const half = Math.floor(kpiList.length / 2);
            const finalCorp = kpiList.slice(0, half);
            const finalGov = kpiList.slice(half, half * 2);

            const renderCard = (kpi: any, idx: number) => {
              const visual = kpiVisual(kpi.key, kpi.label, idx);
              const card = (
                <StatCard
                  label={kpi.label}
                  value={kpi.value}
                  icon={visual.icon}
                  index={idx}
                  badge={visual.badge}
                  sublabel={kpi.helperText || kpi.description}
                  colorTheme={visual.theme}
                />
              );

              return kpi.href ? (
                <Link
                  key={kpi.id || kpi.key || idx}
                  href={kpi.href}
                  title={kpi.helperText || kpi.description}
                  className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 hover:no-underline"
                >
                  {card}
                </Link>
              ) : (
                <div key={kpi.id || kpi.key || idx}>{card}</div>
              );
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
                {/* Left Side: Corporate & Industry Desk */}
                <div className="flex flex-col space-y-2.5 lg:pr-6 lg:border-r lg:border-slate-200/90">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-blue-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Corporate & Industry Desk
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 font-mono">
                      {finalCorp.length} Corporate KPIs
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    {finalCorp.map((kpi: any, i: number) => renderCard(kpi, i))}
                  </div>
                </div>

                {/* Right Side: Government & State Operations Desk */}
                <div className="flex flex-col space-y-2.5 lg:pl-1">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Landmark size={13} className="text-emerald-700" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Government & Department Desk
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-mono">
                      {finalGov.length} Government KPIs
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    {finalGov.map((kpi: any, i: number) => renderCard(kpi, i + finalCorp.length))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpiList.map((kpi: any, idx: number) => {
              const visual = kpiVisual(kpi.key, kpi.label, idx);
              const card = (
                <StatCard
                  label={kpi.label}
                  value={kpi.value}
                  icon={visual.icon}
                  index={idx}
                  badge={visual.badge}
                  sublabel={kpi.helperText || kpi.description}
                  colorTheme={visual.theme}
                />
              );

              return kpi.href ? (
                <Link
                  key={kpi.id || kpi.key || idx}
                  href={kpi.href}
                  title={kpi.helperText || kpi.description}
                  className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 hover:no-underline"
                >
                  {card}
                </Link>
              ) : (
                <div key={kpi.id || kpi.key || idx}>{card}</div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Actionable Work Queue Section */}
      <WorkQueueSection items={workQueueItems} />

      {/* 6. Operational Charts & Data Funnels */}
      <DashboardCharts charts={summary.charts} userRoleId={summary.userRoleId} />

      {/* 7. Quick Actions Navigation Shortcuts */}
      {actions.length > 0 && (
        <section aria-labelledby="quick-actions-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-800">
              <Compass size={15} />
            </div>
            <h2 id="quick-actions-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Quick Workspace Actions
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {actions.map((action, index) => {
              const Icon = action.icon || ([FileCheck, Building2, Users] as LucideIcon[])[index % 3];
              return (
                <Link
                  key={action.key}
                  href={action.href}
                  className="group inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-900 hover:shadow-sm hover:no-underline"
                >
                  <span className="rounded-lg bg-blue-50 p-1.5 text-blue-700 transition group-hover:bg-blue-900 group-hover:text-white">
                    <Icon size={14} />
                  </span>
                  {action.label}
                  <ArrowRight size={12} className="text-slate-400 group-hover:text-blue-700 transition" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. Scoped Recent Activity Timeline */}
      <section aria-labelledby="recent-activity-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-800">
            <Bell size={15} />
          </div>
          <h2 id="recent-activity-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-slate-900">
            Recent Activity & Audit Events
          </h2>
        </div>

        {summary.recentActivity?.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            <ul className="divide-y divide-slate-100">
              {summary.recentActivity.map((item: any, index: number) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50/80">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index % 3 === 0 ? "bg-blue-600" : index % 3 === 1 ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {typeof item.action === "string" ? item.action.replace(/_/g, " ") : String(item.action || "Workflow Action")}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {item.entityType || "Portal Workflow"}
                        {item.actorName ? ` · by ${item.actorName}` : ""}
                        {item.actorRole ? ` (${item.actorRole})` : ""}
                      </p>
                    </div>
                  </div>
                  <time className="shrink-0 text-[11px] font-medium text-slate-400">{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-7 text-center text-xs font-medium text-slate-500 shadow-xs">
            No recent workflow activity recorded for this scope.
          </div>
        )}
      </section>
    </div>
  );
}
