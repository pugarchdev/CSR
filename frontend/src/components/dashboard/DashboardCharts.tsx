"use client";

import React from "react";
import { BarChart3, PieChart, TrendingUp, Layers, Users, Building2 } from "lucide-react";

interface DashboardChartsProps {
  charts?: any;
  userRoleId?: number;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ charts, userRoleId }) => {
  // If no specific chart data is supplied, show appropriate role-scoped visualizations
  return (
    <section aria-labelledby="charts-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-800">
          <BarChart3 size={15} />
        </div>
        <h2 id="charts-heading" className="font-heading text-xs font-extrabold uppercase tracking-wider text-slate-900">
          Operational Analytics & Distribution
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: CSR Workflow Pipeline Funnel */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-teal-50 p-1.5 text-teal-700">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">CSR Lifecycle Progression</h3>
                <p className="text-[10px] font-medium text-slate-400">Intake to Ground Execution Funnel</p>
              </div>
            </div>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200/80">
              Active Funnel
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              { stage: "1. Intake & Expressed Interest", count: 48, pct: 100, color: "bg-blue-600" },
              { stage: "2. RM 13-Point Feasibility Check", count: 34, pct: 71, color: "bg-indigo-600" },
              { stage: "3. JS State Decision & Approval", count: 26, pct: 54, color: "bg-purple-600" },
              { stage: "4. District & DNO Assignment", count: 20, pct: 42, color: "bg-amber-600" },
              { stage: "5. Ground Execution & Milestone Verification", count: 16, pct: 33, color: "bg-emerald-600" },
            ].map((step, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-700">{step.stage}</span>
                  <span className="font-mono font-bold text-slate-900">{step.count} Cases ({step.pct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${step.color} transition-all duration-500`} style={{ width: `${step.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Priority Sector Allocation or RM Workload */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">State Priority Sector Allocation</h3>
                <p className="text-[10px] font-medium text-slate-400">CSR Focus & Funding Distribution</p>
              </div>
            </div>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-200/80">
              ₹48.50 Cr Total
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              { sector: "Healthcare & Tribal Nutrition", amount: "₹15.5 Cr", pct: 32, color: "bg-emerald-500" },
              { sector: "Education & Digital Classrooms", amount: "₹13.1 Cr", pct: 27, color: "bg-blue-500" },
              { sector: "Rural Water Security & Check Dams", amount: "₹8.7 Cr", pct: 18, color: "bg-cyan-500" },
              { sector: "Skill Development & Livelihoods", amount: "₹6.3 Cr", pct: 13, color: "bg-amber-500" },
              { sector: "Environment & Solar Micro-Grids", amount: "₹4.9 Cr", pct: 10, color: "bg-purple-500" },
            ].map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-700">{s.sector}</span>
                  <span className="font-mono font-bold text-slate-900">{s.amount} ({s.pct}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${s.color} transition-all duration-500`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
