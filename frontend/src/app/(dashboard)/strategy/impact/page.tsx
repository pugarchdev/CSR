"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface ImpactResponse {
  success: boolean;
  data: {
    overallIndex: string;
    indicators: Array<{
      id: string;
      title: string;
      category: string;
      baseline: string;
      target: string;
      current: string;
      status: string;
      projectsCount: number;
    }>;
  };
}

export default function ImpactIndicatorsPage() {
  const { data: response } = useApiQuery<ImpactResponse>(
    ["strategy", "impact"],
    "/strategy/impact"
  );

  const impactData = response?.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Planning Secretary Strategy
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Impact Analytics
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            State Policy Impact & SDG Progress
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Progress tracking against Maharashtra Sustainable Development Goals and key policy outcome indicators
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-right">
            <span className="text-[10px] font-bold uppercase text-emerald-800">Statewide Realization Index</span>
            <p className="font-mono text-xl font-extrabold text-emerald-900">{impactData?.overallIndex || "84.2%"}</p>
          </div>
        </div>
      </div>

      {/* Impact Indicators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(impactData?.indicators || []).map((ind) => (
          <div
            key={ind.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200/80">
                  {ind.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={11} /> {ind.status.replace(/_/g, " ")}
                </span>
              </div>

              <h3 className="mt-2.5 text-sm font-extrabold text-slate-900 leading-snug">{ind.title}</h3>
              <p className="mt-1 text-[11px] text-slate-500 font-medium">Linked to {ind.projectsCount} Active Projects</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Baseline:</span>
                <span className="font-mono font-bold text-slate-700">{ind.baseline}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Target:</span>
                <span className="font-mono font-bold text-blue-900">{ind.target}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="text-emerald-700 font-bold">Current Achieved:</span>
                <span className="font-mono font-extrabold text-emerald-800">{ind.current}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
