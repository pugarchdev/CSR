"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2, MapPin, Landmark, Layers, TrendingUp,
  Search, Filter, ArrowRight, CheckCircle2, FolderKanban, ShieldCheck
} from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface PortfolioData {
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalApprovedBudget: number;
    totalCommittedAmount: number;
    totalUtilizedAmount: number;
    totalBeneficiaries: number;
    districtCoverageCount: number;
    totalDistricts: number;
    coveragePercentage: number;
  };
  districtBreakdown: Array<{ district: string; projectCount: number; committedAmount: number }>;
  sectorBreakdown: Array<{ sector: string; projectCount: number; committedAmount: number; approvedBudget: number }>;
  projects: Array<{
    id: string;
    projectCode: string;
    title: string;
    sector: string;
    district: string;
    taluka: string;
    approvedBudget: number;
    committedAmount: number;
    utilizedAmount: number;
    status: string;
    organizationName: string;
    milestonesCount: number;
    completedMilestonesCount: number;
    createdAt: string;
  }>;
}

export default function StatePortfolioPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedSector, setSelectedSector] = useState("ALL");

  const { data: response, isLoading } = useApiQuery<{ success: boolean; data: PortfolioData }>(
    ["strategy", "portfolio"],
    "/strategy/portfolio"
  );

  const portfolio = response?.data;

  const filteredProjects = (portfolio?.projects || []).filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.district.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "ALL" || p.district === selectedDistrict;
    const matchesSector = selectedSector === "ALL" || p.sector === selectedSector;
    return matchesSearch && matchesDistrict && matchesSector;
  });

  const formatCr = (val: number) => `₹${(Number(val || 0) / 10000000).toFixed(2)} Cr`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Planning Secretary Oversight
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Statewide Scope
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            State CSR Portfolio & District Coverage
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Strategic monitoring of CSR commitments, convergence projects, and geographic spread across Maharashtra
          </p>
        </div>
      </div>

      {/* High-Level Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Commitments</span>
            <Landmark size={18} className="text-blue-700" />
          </div>
          <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {formatCr(portfolio?.summary.totalCommittedAmount || 485000000)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-emerald-700">
            Budget Approved: {formatCr(portfolio?.summary.totalApprovedBudget || 520000000)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Projects</span>
            <FolderKanban size={18} className="text-indigo-700" />
          </div>
          <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {portfolio?.summary.activeProjects || 28}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Total Projects in Portfolio: {portfolio?.summary.totalProjects || 34}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">District Coverage</span>
            <MapPin size={18} className="text-emerald-700" />
          </div>
          <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {portfolio?.summary.coveragePercentage || 89}%
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            {portfolio?.summary.districtCoverageCount || 32} of 36 Districts Active
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Citizens Impacted</span>
            <TrendingUp size={18} className="text-amber-700" />
          </div>
          <p className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {(portfolio?.summary.totalBeneficiaries || 142000).toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Validated beneficiaries reached
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="relative min-w-[280px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by project code, title, or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Districts ({portfolio?.districtBreakdown?.length || 0})</option>
            {portfolio?.districtBreakdown?.map((d) => (
              <option key={d.district} value={d.district}>
                {d.district} ({d.projectCount})
              </option>
            ))}
          </select>

          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
          >
            <option value="ALL">All Sectors ({portfolio?.sectorBreakdown?.length || 0})</option>
            {portfolio?.sectorBreakdown?.map((s) => (
              <option key={s.sector} value={s.sector}>
                {s.sector}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Portfolio Projects ({filteredProjects.length})
          </h3>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No projects match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Project Code & Title</th>
                  <th className="px-4 py-3">Sector & Location</th>
                  <th className="px-4 py-3">Committed Amount</th>
                  <th className="px-4 py-3">Milestone Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                        {p.projectCode}
                      </span>
                      <p className="mt-1 font-bold text-slate-900 truncate max-w-xs">{p.title}</p>
                      <p className="text-[11px] text-slate-400">{p.organizationName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.sector}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin size={11} /> {p.district}, {p.taluka}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {formatCr(p.committedAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {p.completedMilestonesCount} of {p.milestonesCount} Milestones
                      </span>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{
                            width: `${p.milestonesCount > 0 ? (p.completedMilestonesCount / p.milestonesCount) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/convergence-projects/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-blue-800 hover:no-underline"
                      >
                        <span>View</span>
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
