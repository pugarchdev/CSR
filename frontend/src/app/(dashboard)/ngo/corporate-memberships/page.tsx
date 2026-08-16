"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Clock } from "lucide-react";

interface CorporateMembershipItem {
  id: string;
  corporateName: string;
  contactEmail: string;
  status: "APPROVED" | "INVITED" | "SUSPENDED";
  assignedProjectsCount: number;
  approvedAt: string | null;
}

export default function NgoCorporateMembershipsPage() {
  const memberships: CorporateMembershipItem[] = [
    {
      id: "mem-1",
      corporateName: "Tata Power Company Limited",
      contactEmail: "csr.lead@tatapower.com",
      status: "APPROVED",
      assignedProjectsCount: 2,
      approvedAt: "12 Jan 2026"
    },
    {
      id: "mem-2",
      corporateName: "Mahindra & Mahindra CSR Foundation",
      contactEmail: "csr@mahindra.com",
      status: "APPROVED",
      assignedProjectsCount: 1,
      approvedAt: "08 Feb 2026"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Partnership Governance
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Corporate Memberships
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Corporate Sponsor Memberships & Project Engagements
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Active corporate partnerships, approved engagement agreements, and tenant-isolated project access scopes
          </p>
        </div>
      </div>

      {/* Memberships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memberships.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={11} /> {m.status}
                </span>
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                  <Clock size={12} /> Partner since {m.approvedAt}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-extrabold text-slate-950">{m.corporateName}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{m.contactEmail}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Corporate Context Scope:</span>
                <span className="font-bold text-slate-900">Isolated & Gated</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned CSR Projects:</span>
                <span className="font-bold text-blue-900">{m.assignedProjectsCount} Active Engagements</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <Link
                href="/ngo/projects"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 hover:no-underline"
              >
                <span>Enter Corporate Project Context</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
