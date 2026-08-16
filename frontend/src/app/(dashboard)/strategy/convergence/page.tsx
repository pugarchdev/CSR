"use client";

import React from "react";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface ConvergenceResponse {
  success: boolean;
  data: {
    projects: Array<{
      id: string;
      projectCode: string;
      title: string;
      sector: string;
      district: string;
      mainOrg: string;
      departmentOrg: string;
      approvedBudget: number;
      committedAmount: number;
      status: string;
      inspectionsCount: number;
      milestonesCount: number;
      startDate: string | null;
      expectedEndDate: string | null;
    }>;
  };
}

export default function ConvergencePage() {
  const { data: response } = useApiQuery<ConvergenceResponse>(
    ["strategy", "convergence"],
    "/strategy/convergence"
  );

  const formatCr = (val: number) => `₹${(Number(val || 0) / 10000000).toFixed(2)} Cr`;
  const projects = response?.data?.projects || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Planning Secretary Strategy
            </span>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
              Inter-Departmental Convergence
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Cross-Department Convergence Framework
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Projects integrating funding from multiple corporate entities and converging across Collectorates, ZP, and line departments
          </p>
        </div>
      </div>

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {p.projectCode}
                </span>
                <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  {p.status}
                </span>
              </div>

              <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">{p.title}</h3>
              <p className="mt-1 text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                <MapPin size={12} className="text-slate-400" /> {p.district} · {p.sector}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Main Government Body:</span>
                <span className="font-bold text-slate-800">{p.mainOrg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Executing Line Dept:</span>
                <span className="font-bold text-blue-900">{p.departmentOrg}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-semibold">Committed CSR Funds:</span>
                <span className="font-mono font-extrabold text-emerald-800">{formatCr(p.committedAmount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] font-medium text-slate-500">
                {p.milestonesCount} Milestones · {p.inspectionsCount} Inspections
              </span>
              <Link
                href={`/convergence-projects/${p.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 hover:no-underline"
              >
                <span>Project Workspace</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
