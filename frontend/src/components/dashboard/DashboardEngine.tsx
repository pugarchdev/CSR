"use client";

import Link from "next/link";
import {
  Activity, AlertCircle, ArrowRight, Bell, Building2, CheckCircle2,
  Clock3, Compass, FileCheck, FileText, FolderKanban, HeartHandshake,
  Landmark, RefreshCcw, ShieldAlert, ShieldCheck, Users, Target, ShieldCheck as ShieldIcon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { DashboardSummary, QUICK_ACTIONS, visibleByPermission } from "@/lib/dashboardEngine";
import { StatCard } from "@/components/ui/StatCard";

interface SummaryEnvelope { success: boolean; data: DashboardSummary & { asOf?: string } }
type Theme = "blue" | "purple" | "emerald" | "amber" | "sky" | "indigo" | "teal" | "rose";

const KPI_VISUALS: Array<{ match: RegExp; icon: LucideIcon; theme: Theme; badge: string }> = [
  { match: /escalat|overdue|stale|reject/i, icon: ShieldAlert, theme: "rose", badge: "Attention" },
  { match: /clarif|pending|await|due|unassigned|uncontacted/i, icon: Clock3, theme: "amber", badge: "Action" },
  { match: /project|assignment/i, icon: FolderKanban, theme: "purple", badge: "Active" },
  { match: /pitch|interest/i, icon: HeartHandshake, theme: "teal", badge: "Workflow" },
  { match: /enquir|case|assessment/i, icon: FileText, theme: "blue", badge: "Live" },
  { match: /department|organization|ngo|nodal/i, icon: Building2, theme: "indigo", badge: "Verified" },
  { match: /active|approved|public|completed/i, icon: CheckCircle2, theme: "emerald", badge: "Current" },
];

function kpiVisual(key: string, label: string, index: number) {
  return KPI_VISUALS.find(item => item.match.test(`${key} ${label}`)) || {
    icon: index % 2 ? Activity : ShieldCheck,
    theme: (["blue", "indigo", "teal", "emerald"] as Theme[])[index % 4],
    badge: "Live",
  };
}

const CORPORATE_THEMES: Theme[] = ["blue", "indigo", "teal"];
const GOV_THEMES: Theme[] = ["amber", "rose", "purple"];

function renderKpiCard(kpi: any, index: number, isGovSide: boolean = false) {
  const visual = kpiVisual(kpi.key, kpi.label, index);
  const theme = isGovSide
    ? GOV_THEMES[index % GOV_THEMES.length]
    : CORPORATE_THEMES[index % CORPORATE_THEMES.length];

  const card = (
    <StatCard
      label={kpi.label}
      value={kpi.value}
      icon={visual.icon}
      index={index}
      badge={visual.badge}
      sublabel={kpi.description}
      colorTheme={theme}
    />
  );
  return kpi.href ? (
    <Link
      key={kpi.key}
      href={kpi.href}
      title={kpi.description}
      className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 hover:no-underline"
    >
      {card}
    </Link>
  ) : (
    <div key={kpi.key}>{card}</div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading dashboard">
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-40 rounded-xl bg-slate-200/70" />
        <div className="h-9 w-32 rounded-xl bg-slate-200/70" />
        <div className="h-9 w-36 rounded-xl bg-slate-200/70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[105px] rounded-xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 shadow-xs" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardEngine() {
  const query = useApiQuery<SummaryEnvelope>(["dashboard", "summary"], "/dashboard/summary", { staleTime: 60_000, gcTime: 300_000 });
  const envelope: any = query.data;
  const summary: DashboardSummary & { asOf?: string } | undefined = envelope?.data || (envelope?.kpis ? envelope : undefined);

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError || !summary) {
    return (
      <section className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-5 shadow-xs" role="alert">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-red-200 bg-white p-2 text-red-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-red-950">Dashboard data is unavailable</h2>
            <p className="mt-1 text-xs font-medium text-red-700">Live counts could not be loaded. No sample values have been substituted.</p>
            <button onClick={() => query.refetch()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-xs">
              <RefreshCcw size={14} />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const actions = visibleByPermission(QUICK_ACTIONS, summary);
  const asOf = new Date(summary.asOf || summary.generatedAt);

  // Classify KPIs into Corporate/Partner (Left) and Government/State Cell (Right)
  const isCorporateKpi = (kpi: any) =>
    /corporate|company|ngo|enquiry|interest|partner|sub-department|my pitches|public pitches|received|my active|uncontacted|clarification/i.test(`${kpi.key} ${kpi.label}`);

  const isGovKpi = (kpi: any) =>
    /escalat|overdue|assign|nodal|decision|js|rm|government|state|case|unassigned|feasibility|assessment|stale/i.test(`${kpi.key} ${kpi.label}`);

  let corporateKpis: typeof summary.kpis = [];
  let governmentKpis: typeof summary.kpis = [];

  summary.kpis.forEach((kpi) => {
    if (isCorporateKpi(kpi) && !isGovKpi(kpi)) {
      corporateKpis.push(kpi);
    } else if (isGovKpi(kpi)) {
      governmentKpis.push(kpi);
    } else {
      corporateKpis.push(kpi);
    }
  });

  // Balanced 50/50 fallback if any bucket is unpopulated
  if (corporateKpis.length === 0 || governmentKpis.length === 0) {
    const mid = Math.ceil(summary.kpis.length / 2);
    corporateKpis = summary.kpis.slice(0, mid);
    governmentKpis = summary.kpis.slice(mid);
  }

  const totalKpisCount = summary.kpis.length;

  return (
    <div className="space-y-6">
      {summary.onboardingStatus?.isPending && (
        <section className="relative overflow-hidden rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/70 to-white p-4 shadow-xs">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-amber-200 bg-white p-2 text-amber-700">
              <Landmark size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-amber-950">{summary.onboardingStatus.title}</h2>
              <p className="mt-1 text-xs font-medium leading-5 text-amber-800">{summary.onboardingStatus.message}</p>
              <Link href={summary.onboardingStatus.actionUrl} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-amber-900 hover:no-underline">
                {summary.onboardingStatus.actionText}
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* KPI Section Header */}
      <section aria-labelledby="dashboard-kpis">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">Live Scoped Executive Dashboard</p>
            <h2 id="dashboard-kpis" className="mt-0.5 font-heading text-lg font-extrabold text-[#14274e]">Operational priorities</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-2xs">
            <Clock3 size={12} />
            Updated {Number.isNaN(asOf.getTime()) ? "just now" : asOf.toLocaleString()}
          </span>
        </div>

        {summary.kpis.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <ShieldCheck className="mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-bold text-slate-800">No KPI cards are assigned to this access context.</p>
            <p className="mt-1 text-xs text-slate-500">Use the navigation menu to access your permitted workspaces.</p>
          </div>
        ) : (
          /* Single Row Partitioned Container */
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            {/* Section Headers & Partition Divider Label */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-b border-slate-100 pb-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-blue-50 p-1 text-blue-700">
                    <Building2 size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Corporate Intake & Active Pipeline
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">Corporate enquiries, leads & pitch interests</p>
                  </div>
                </div>
                <span className="rounded-full border border-blue-200/80 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {corporateKpis.length} Metrics
                </span>
              </div>

              <div className="flex items-center justify-between lg:border-l lg:border-slate-200/80 lg:pl-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-amber-50 p-1 text-amber-700">
                    <Landmark size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Government Feasibility & SLA Risks
                    </h3>
                    <p className="text-[10px] font-medium text-slate-400">Feasibility reviews, assignments & SLA alerts</p>
                  </div>
                </div>
                <span className="rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {governmentKpis.length} Metrics
                </span>
              </div>
            </div>

            {/* Single Row KPI Grid with Vertical Partition Line */}
            <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-stretch">
              {/* Left Side: Corporate KPIs (First 3 columns) */}
              {corporateKpis.map((kpi, idx) => renderKpiCard(kpi, idx, false))}

              {/* Right Side: Government KPIs (Next 3 columns) */}
              {governmentKpis.map((kpi, idx) => renderKpiCard(kpi, idx, true))}
            </div>

            {/* Relationship Manager Portfolio Insights Bar */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Target size={14} className="text-blue-700" />
                  <span className="font-bold text-slate-800">RM SLA Target:</span>
                  <span className="text-slate-500">7-Day Feasibility Turnaround</span>
                </div>
                <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-1.5">
                  <ShieldIcon size={14} className="text-emerald-600" />
                  <span className="font-bold text-slate-800">Status:</span>
                  <span className="text-emerald-700 font-semibold">Active & Scoped</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/rm?scope=active"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 hover:text-blue-700 hover:no-underline"
                >
                  <span>RM Feasibility Desk</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {actions.length > 0 && (
        <section aria-labelledby="quick-actions">
          <div className="mb-3 flex items-center gap-2">
            <Compass size={17} className="text-blue-700" />
            <h2 id="quick-actions" className="font-heading text-sm font-extrabold text-[#14274e]">Quick actions</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {actions.map((action, index) => {
              const Icon = action.icon || ([FileCheck, Building2, Users] as LucideIcon[])[index % 3];
              return (
                <Link
                  key={action.key}
                  href={action.href}
                  className="group inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-800 hover:shadow-md hover:no-underline"
                >
                  <span className="rounded-lg bg-blue-50 p-1.5 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                    <Icon size={13} />
                  </span>
                  {action.label}
                  <ArrowRight size={12} className="text-slate-400" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="recent-activity">
        <div className="mb-3 flex items-center gap-2">
          <Bell size={16} className="text-blue-700" />
          <h2 id="recent-activity" className="font-heading text-sm font-extrabold text-[#14274e]">Recent activity</h2>
        </div>
        {summary.recentActivity?.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
            <ul className="divide-y divide-slate-100">
              {summary.recentActivity.map((item, index) => (
                <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50/80">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${index % 3 === 0 ? "bg-blue-500" : index % 3 === 1 ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{item.action.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {item.entityType || "Portal workflow"}
                        {item.actorRole ? ` · ${item.actorRole}` : ""}
                      </p>
                    </div>
                  </div>
                  <time className="shrink-0 text-[10px] font-medium text-slate-400">{new Date(item.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-7 text-center text-xs font-medium text-slate-500 shadow-xs">
            No scoped activity has been recorded yet.
          </div>
        )}
      </section>
    </div>
  );
}
