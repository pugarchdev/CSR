"use client";

import React from "react";
import { PieChart, TrendingUp, Layers, ArrowUpRight, BarChart3 } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface SectorResponse {
  success: boolean;
  data: {
    totalCommitted: number;
    sectors: Array<{
      name: string;
      targetPct: number;
      actualPct: number;
      variancePct: number;
      committedAmount: number;
      projectCount: number;
      beneficiaries: number;
      color: string;
    }>;
  };
}

export default function SectorAnalyticsPage() {
  const { data: response, isLoading } = useApiQuery<SectorResponse>(
    ["strategy", "sectors"],
    "/strategy/sectors"
  );

  const formatCr = (val: number) => `₹${(Number(val || 0) / 10000000).toFixed(2)} Cr`;
  const sectorData = response?.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Planning Secretary Strategy
            </span>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
              Sector Funding Gaps
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Sector Allocation & Priority CSR Focus Areas
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Funding concentration analysis, government priority targets, and sector allocation variance across Maharashtra
          </p>
        </div>
      </div>

      {/* Sector Target vs Actual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(sectorData?.sectors || []).map((sec, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">{sec.name}</h3>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${sec.variancePct >= 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                {sec.variancePct >= 0 ? `+${sec.variancePct}% Over Target` : `${sec.variancePct}% Target Gap`}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span>Government Target: <strong>{sec.targetPct}%</strong></span>
                <span>Current Realized: <strong className="text-slate-900">{sec.actualPct}%</strong></span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(sec.actualPct, 100)}%`, backgroundColor: sec.color }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Funding</span>
                <p className="font-mono text-xs font-bold text-slate-900">{formatCr(sec.committedAmount)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Projects</span>
                <p className="font-mono text-xs font-bold text-slate-900">{sec.projectCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Citizens</span>
                <p className="font-mono text-xs font-bold text-slate-900">{(sec.beneficiaries || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
