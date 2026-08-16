"use client";

import { useState } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { useApiQuery } from "@/lib/apiHooks";
import { Flag, CheckCircle2, Clock, ArrowUpRight, Search, Loader2, ShieldCheck } from "lucide-react";

export default function MilestonesPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(["all-milestones"], "/convergence-projects");
  const projects = Array.isArray(envelope?.data) ? envelope.data : Array.isArray(envelope) ? envelope : [];
  const [search, setSearch] = useState("");

  const milestonesList = projects.flatMap((p: any) => {
    const list = Array.isArray(p.milestones) ? p.milestones : [];
    return list.map((m: any) => ({
      ...m,
      projectTitle: p.title || p.name || "CSR Project",
      projectCode: p.projectCode || p.code || p.id?.slice(0, 8),
      district: p.district || "Statewide"
    }));
  });

  const filtered = milestonesList.filter((m: any) => {
    const term = search.toLowerCase();
    return (
      (m.title || "").toLowerCase().includes(term) ||
      (m.projectTitle || "").toLowerCase().includes(term) ||
      (m.projectCode || "").toLowerCase().includes(term)
    );
  });

  const completedCount = milestonesList.filter((m: any) => m.status === "COMPLETED" || m.status === "VERIFIED").length;
  const inProgressCount = milestonesList.filter((m: any) => m.status === "IN_PROGRESS" || m.status === "ACTIVE").length;
  const pendingCount = milestonesList.filter((m: any) => m.status !== "COMPLETED" && m.status !== "VERIFIED" && m.status !== "IN_PROGRESS" && m.status !== "ACTIVE").length;

  return (
    <GovPortalLayout>
      <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="Project Milestones & Verification Register"
          category="Execution Monitoring"
          description="Track milestone deliverables, progress status, field inspection evidence, and fund release triggers across active projects."
        />

        {/* Standard 4-Column KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Milestones"
            value={isLoading ? "…" : milestonesList.length}
            icon={Flag}
            index={0}
            colorTheme="blue"
            sublabel="Configured project targets"
          />
          <StatCard
            label="Completed & Verified"
            value={isLoading ? "…" : completedCount}
            icon={CheckCircle2}
            index={1}
            colorTheme="emerald"
            sublabel="Verified by inspection team"
          />
          <StatCard
            label="Active In Progress"
            value={isLoading ? "…" : inProgressCount}
            icon={Clock}
            index={2}
            colorTheme="purple"
            sublabel="Under physical execution"
          />
          <StatCard
            label="Pending Inspection"
            value={isLoading ? "…" : pendingCount}
            icon={ShieldCheck}
            index={3}
            colorTheme="amber"
            sublabel="Awaiting field verification"
          />
        </StatCardGroup>

        {/* Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by milestone title, project code, or project name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Milestones List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-blue-900" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500 shadow-xs">
            <Flag size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-base font-bold text-slate-800">No project milestones found</p>
            <p className="mt-1 text-xs text-slate-500">Project milestones are automatically tracked when projects are onboarded and assigned.</p>
            <div className="mt-4">
              <Link href="/convergence-projects" className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all">
                Browse Convergence Projects <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((m: any, idx: number) => (
              <div key={m.id || idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-900">{m.projectCode}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${m.status === "COMPLETED" || m.status === "VERIFIED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                      {m.status || "PENDING"}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-extrabold text-slate-900">{m.title || "Milestone Deliverable"}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">Project: {m.projectTitle} ({m.district})</p>
                </div>
                {m.targetDate && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Target Date: {new Date(m.targetDate).toLocaleDateString("en-IN")}</span>
                    <span>Outlay: ₹{m.amount ? (Number(m.amount) / 100000).toFixed(2) + " Lakh" : "N/A"}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </GovPortalLayout>
  );
}
