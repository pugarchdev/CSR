"use client";

import React from "react";
import { Landmark, ArrowUpRight, CheckCircle2, TrendingUp, DollarSign, PieChart } from "lucide-react";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

export default function CorporateFundsPage() {
  const formatCr = (val: number) => `₹${(Number(val || 0) / 10000000).toFixed(2)} Cr`;

  const fundSummary = {
    totalCommitted: 35000000,
    totalReleased: 18500000,
    totalUtilized: 14200000,
    utilizationRate: 76.7,
    commitments: [
      { id: "cmt-1", projectCode: "PRJ-2026-001", projectTitle: "Melghat School Solar Electrification", committedAmount: 12500000, releasedAmount: 8000000, utilizedAmount: 7200000, trancheStatus: "TRANCHE_2_RELEASED" },
      { id: "cmt-2", projectCode: "PRJ-2026-004", projectTitle: "Beed Watershed & Check Dam Project", committedAmount: 22500000, releasedAmount: 10500000, utilizedAmount: 7000000, trancheStatus: "TRANCHE_1_RELEASED" }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Corporate Financials
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Section 135 Compliance
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            CSR Funds, Commitments & Tranche Releases
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Financial tracking of committed CSR budgets, disbursed tranches, and verified ground utilization
          </p>
        </div>
      </div>

      {/* Standard 4-Column KPI Cards */}
      <StatCardGroup columns={4}>
        <StatCard
          label="Total Committed"
          value={formatCr(fundSummary.totalCommitted)}
          icon={Landmark}
          index={0}
          colorTheme="blue"
          sublabel="Across active project agreements"
        />
        <StatCard
          label="Funds Released"
          value={formatCr(fundSummary.totalReleased)}
          icon={ArrowUpRight}
          index={1}
          colorTheme="sky"
          sublabel="Disbursed to implementing agencies"
        />
        <StatCard
          label="Verified Utilization"
          value={formatCr(fundSummary.totalUtilized)}
          icon={CheckCircle2}
          index={2}
          colorTheme="emerald"
          sublabel="Supported by invoices & UCs"
        />
        <StatCard
          label="Utilization Rate"
          value={`${fundSummary.utilizationRate}%`}
          icon={PieChart}
          index={3}
          colorTheme="purple"
          sublabel="Of released tranches deployed"
        />
      </StatCardGroup>

      {/* Commitments Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Project Tranche Commitments & Releases
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Project Code & Title</th>
                <th className="px-4 py-3">Total Committed</th>
                <th className="px-4 py-3">Disbursed Tranches</th>
                <th className="px-4 py-3">Ground Utilization</th>
                <th className="px-4 py-3">Tranche Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fundSummary.commitments.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                      {c.projectCode}
                    </span>
                    <p className="font-bold text-slate-900 mt-1">{c.projectTitle}</p>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatCr(c.committedAmount)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-900">{formatCr(c.releasedAmount)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-900">{formatCr(c.utilizedAmount)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      {c.trancheStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
