"use client";

import React from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowRight, Bell, Building2, CheckCircle2,
  Clock3, Compass, FileCheck, FileText, FolderKanban, HeartHandshake,
  Landmark, RefreshCcw, ShieldAlert, ShieldCheck, Users, Target,
  TrendingUp, Layers, Award, Sparkles, MapPin
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { DashboardSummary, QUICK_ACTIONS, visibleByPermission } from "@/lib/dashboardEngine";
import { StatCard } from "@/components/ui/StatCard";
import { WorkQueueSection } from "./WorkQueueSection";
import { AlertsSection } from "./AlertsSection";
import { DashboardCharts } from "./DashboardCharts";

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

export default function DashboardEngine() {
  const query = useApiQuery<SummaryEnvelope>(["dashboard", "summary"], "/dashboard/summary", {
    staleTime: 45_000,
    gcTime: 300_000,
  });

  const envelope: any = query.data;
  const summary: any = envelope?.data || (envelope?.kpis ? envelope : undefined);

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError || !summary) {
    return (
      <section className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-6 shadow-xs" role="alert">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-red-200 bg-white p-2.5 text-red-600">
            <AlertCircle size={22} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-red-950">Dashboard metrics currently unavailable</h2>
            <p className="mt-1 text-xs font-medium text-red-700">Live operational data could not be retrieved from the server.</p>
            <button
              onClick={() => query.refetch()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-800"
            >
              <RefreshCcw size={14} />
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

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Active Context Badge */}
      <section className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              <ShieldCheck size={12} />
              {summary.roleCode ? summary.roleCode.replace(/_/g, " ") : "Authorized User"}
            </span>
            {summary.orgName && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                <Building2 size={11} />
                {summary.orgName}
              </span>
            )}
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Executive Operations Workspace
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Live metrics, case queues, and government convergence oversight
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
            <Clock3 size={13} className="text-slate-400" />
            <span>Updated {Number.isNaN(asOf.getTime()) ? "just now" : asOf.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
          <button
            onClick={() => query.refetch()}
            title="Refresh dashboard data"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-blue-900"
          >
            <RefreshCcw size={14} className={query.isFetching ? "animate-spin text-blue-700" : ""} />
          </button>
        </div>
      </section>

      {/* 2. Onboarding Status Banner if pending */}
      {summary.onboardingStatus?.isPending && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/70 to-white p-4 shadow-xs">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-amber-200 bg-white p-2.5 text-amber-700">
              <Landmark size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-amber-950">{summary.onboardingStatus.title}</h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-amber-900/80">{summary.onboardingStatus.message}</p>
              <Link
                href={summary.onboardingStatus.actionUrl}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-amber-800 hover:no-underline"
              >
                <span>{summary.onboardingStatus.actionText}</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Alerts & Exceptions Section */}
      <AlertsSection alerts={alertsList} />

      {/* 4. Primary KPI Cards Grid (4 Columns Desktop, 2 Columns Tablet, 1 Column Mobile) */}
      <section aria-labelledby="primary-kpis-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-800">
              <Target size={15} />
            </div>
            <h2 id="primary-kpis-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Key Performance Indicators ({kpiList.length})
            </h2>
          </div>
        </div>

        {kpiList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <ShieldCheck className="mx-auto text-slate-400" size={32} />
            <p className="mt-3 text-sm font-bold text-slate-800">No KPI metrics assigned for this role scope.</p>
            <p className="mt-1 text-xs text-slate-500">Please select an action from the navigation workspace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
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
                  className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 hover:no-underline transition hover:-translate-y-0.5"
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
                      <p className="truncate text-xs font-bold text-slate-900">{item.action.replace(/_/g, " ")}</p>
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
