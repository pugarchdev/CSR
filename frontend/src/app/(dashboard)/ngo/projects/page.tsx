"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FolderKanban, MapPin, Building2, CheckCircle2, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface NgoProjectItem {
  id: string;
  projectCode: string;
  title: string;
  sector: string;
  district: string;
  taluka: string;
  corporateSponsor: string;
  approvedBudget: number;
  committedAmount: number;
  status: string;
  milestonesDue: number;
}

export default function NgoProjectsPage() {
  const formatCr = (val: number) => `₹${(Number(val || 0) / 10000000).toFixed(2)} Cr`;

  const projects: NgoProjectItem[] = [
    {
      id: "p-1",
      projectCode: "PRJ-2026-001",
      title: "Melghat School Solar Electrification",
      sector: "Energy & Tribal Education",
      district: "Amravati",
      taluka: "Dharni",
      corporateSponsor: "Tata Power Company Limited",
      approvedBudget: 12500000,
      committedAmount: 12500000,
      status: "IN_PROGRESS",
      milestonesDue: 2
    },
    {
      id: "p-2",
      projectCode: "PRJ-2026-004",
      title: "Beed Watershed & Check Dam Construction",
      sector: "Rural Water Security",
      district: "Beed",
      taluka: "Ashti",
      corporateSponsor: "Mahindra & Mahindra CSR Foundation",
      approvedBudget: 22500000,
      committedAmount: 22500000,
      status: "EXECUTION_STARTED",
      milestonesDue: 1
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              NGO Implementation Desk
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Active Project Engagements
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Assigned Ground Implementation Projects
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Projects assigned to your organization under approved Corporate–NGO memberships
          </p>
        </div>
      </div>

      {/* Projects Grid */}
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
                  {p.status.replace(/_/g, " ")}
                </span>
              </div>

              <h3 className="mt-2.5 text-sm font-extrabold text-slate-950">{p.title}</h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                <MapPin size={11} className="text-slate-400" /> {p.district}, {p.taluka} · {p.sector}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Corporate Sponsor:</span>
                <span className="font-bold text-slate-900">{p.corporateSponsor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approved Budget:</span>
                <span className="font-mono font-bold text-emerald-800">{formatCr(p.approvedBudget)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-semibold">Active Milestones:</span>
                <span className="font-bold text-amber-800">{p.milestonesDue} Deliverables in Progress</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <Link
                href="/ngo/evidence"
                className="text-[11px] font-bold text-slate-600 hover:text-blue-900"
              >
                Upload Photo Evidence
              </Link>
              <Link
                href={`/convergence-projects/${p.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 hover:no-underline"
              >
                <span>Project Workspace</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
