"use client";

import React from "react";
import Link from "next/link";
import { Eye, Clock, CheckCircle2, FileCheck2 } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

export default function OversightApprovalsPage() {
  useApiQuery<{ success: boolean; data: any }>(
    ["oversight", "approvals"],
    "/dashboard/summary"
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Planning Secretary Oversight
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              Strategic Read-Only
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Joint Secretary Approvals Oversight
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Turnaround lead-times and administrative decision history across Main Onboardings, Pitches, and 13-Point Feasibility Matrix
          </p>
        </div>
      </div>

      {/* Decision Analytics Summary */}
      <StatCardGroup columns={3}>
        <StatCard
          label="Average JS Turnaround"
          value="4.2 Days"
          icon={Clock}
          index={0}
          colorTheme="blue"
          badge="Within SLA"
          sublabel="Target: 7-Day SLA Threshold"
        />
        <StatCard
          label="Total Decisions (MTD)"
          value="42"
          icon={FileCheck2}
          index={1}
          colorTheme="emerald"
          sublabel="36 Approved · 6 Changes Requested"
        />
        <StatCard
          label="Pending in Queue"
          value="8"
          icon={Clock}
          index={2}
          colorTheme="amber"
          badge="Action Req"
          sublabel="Awaiting Joint Secretary Review"
        />
      </StatCardGroup>

      {/* Approvals Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Recent State CSR Cell Decisions Log
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {[
            { ref: "ONB-GOV-2026-081", title: "Thane Zilla Parishad Health Department", type: "Sub-Department Onboarding", decidedBy: "Joint Secretary, Planning Dept", status: "APPROVED", date: "Yesterday, 4:30 PM", leadTime: "3.2 Days" },
            { ref: "CASE-ENQ-2026-042", title: "Solar Micro-Grids for Melghat Tribal Schools", type: "13-Point Feasibility Assessment", decidedBy: "Joint Secretary, Planning Dept", status: "APPROVED", date: "14 Aug 2026", leadTime: "5.1 Days" },
            { ref: "PTCH-GOV-2026-019", title: "Smart Anganwadi Infrastructure Initiative", type: "Government Pitch Publication", decidedBy: "Joint Secretary, Planning Dept", status: "CHANGES_REQUESTED", date: "12 Aug 2026", leadTime: "2.8 Days" },
            { ref: "CASE-INT-2026-031", title: "Check Dam Construction in Beed District", type: "Corporate Pitch Interest", decidedBy: "Joint Secretary, Planning Dept", status: "APPROVED", date: "10 Aug 2026", leadTime: "4.4 Days" },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition hover:bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                    {item.ref}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">{item.type}</span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    {item.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-500">Decided by {item.decidedBy} · Turnaround: {item.leadTime}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-medium text-slate-400">{item.date}</span>
                <Link
                  href="/decisions"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-900 hover:no-underline"
                >
                  <Eye size={12} />
                  <span>Audit Trail</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
