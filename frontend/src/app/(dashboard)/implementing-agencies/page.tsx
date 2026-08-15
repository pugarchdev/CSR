"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, Building2, Plus, Search, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface NgoMembership {
  id: string;
  ngoName: string;
  darpanId: string;
  csr1Number: string;
  contactEmail: string;
  status: "APPROVED" | "PENDING_CORPORATE_REVIEW" | "CLARIFICATION_REQUIRED" | "INVITED";
  activeProjectsCount: number;
  approvedAt: string | null;
}

export default function ImplementingAgenciesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const partnerships: NgoMembership[] = [
    {
      id: "mem-1",
      ngoName: "Savitribai Phule Gramin Vikas Sanstha",
      darpanId: "MH/2021/0289123",
      csr1Number: "CSR00018421",
      contactEmail: "contact@spgvs.org",
      status: "APPROVED",
      activeProjectsCount: 2,
      approvedAt: "12 Jan 2026"
    },
    {
      id: "mem-2",
      ngoName: "Vidarbha Livelihood & Water Foundation",
      darpanId: "MH/2019/0147852",
      csr1Number: "CSR00009542",
      contactEmail: "director@vidarbhafoundation.org",
      status: "APPROVED",
      activeProjectsCount: 1,
      approvedAt: "04 Mar 2026"
    }
  ];

  const filtered = partnerships.filter((p) =>
    p.ngoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.darpanId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Corporate Partner Network
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Approved Implementing Agencies
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Implementing Agency (NGO) Partnerships
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Active Corporate–NGO memberships, NGO Darpan IDs, CSR-1 registrations, and assigned project scopes
          </p>
        </div>

        <Link
          href="/implementing-agencies/invite"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800 hover:no-underline"
        >
          <Plus size={14} />
          <span>Invite / Link NGO</span>
        </Link>
      </div>

      {/* Partnerships Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((ngo) => (
          <div
            key={ngo.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {ngo.darpanId}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={11} /> {ngo.status}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-extrabold text-slate-900">{ngo.ngoName}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{ngo.contactEmail}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">MCA CSR-1 Number:</span>
                <span className="font-mono font-bold text-slate-800">{ngo.csr1Number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Projects:</span>
                <span className="font-bold text-blue-900">{ngo.activeProjectsCount} Projects Assigned</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Partnered since {ngo.approvedAt}</span>
              <Link
                href="/company/projects"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 hover:no-underline"
              >
                <span>View Assigned Projects</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
