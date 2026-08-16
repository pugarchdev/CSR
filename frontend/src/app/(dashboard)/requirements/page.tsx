"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useApiQuery } from "@/lib/apiHooks";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { Loader } from "@/components/ui/Loader";
import {
  Plus, Search, Filter, MapPin, Coins, ArrowUpRight, CheckCircle2, FileText, Landmark
} from "lucide-react";

interface Requirement {
  id: string;
  refId: string;
  title: string;
  category: string;
  district: string;
  estimatedCostLakhs: number;
  status: "SUBMITTED" | "APPROVED" | "PUBLISHED";
  date: string;
}

export default function RequirementsPage() {
  const { data: envelope, isLoading } = useApiQuery<any>(
    ["csr-requirements"],
    "/csr-requirements"
  );

  const [viewMode, setViewMode] = useResponsiveViewMode();
  const [search, setSearch] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("ALL");

  const rawReqs: any[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.data)
    ? envelope.data
    : Array.isArray(envelope?.data?.requirements)
    ? envelope.data.requirements
    : Array.isArray(envelope?.requirements)
    ? envelope.requirements
    : [];

  const reqsList: Requirement[] = rawReqs.map((r: any) => ({
    id: r.id,
    refId: r.refId || `REQ-${r.id ? r.id.slice(0, 6) : "001"}`,
    title: r.title || r.projectName || "Department CSR Requirement",
    category: r.category || r.sector || "General Healthcare",
    district: r.district || "Maharashtra",
    estimatedCostLakhs: r.estimatedCost ? Math.round(Number(r.estimatedCost) / 100000) : 0,
    status: r.status || "PUBLISHED",
    date: r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "",
  }));

  const filtered = reqsList.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.refId.toLowerCase().includes(search.toLowerCase()) ||
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesDist = filterDistrict === "ALL" || item.district === filterDistrict;
    return matchesSearch && matchesDist;
  });

  const uniqueDistricts = Array.from(new Set(reqsList.map(r => r.district).filter(Boolean)));
  const totalCost = reqsList.reduce((acc, curr) => acc + curr.estimatedCostLakhs, 0);
  const publishedCount = reqsList.filter(r => r.status === "PUBLISHED" || r.status === "APPROVED").length;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
      <StandardPageHeader
        title="Department CSR Requirements & Needs"
        category="Requirements Hub"
        description="District development requirements published by Government Departments seeking Corporate CSR funding support."
        actions={
          <Link
            href="/requirements/create"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            <Plus size={16} /> Create Requirement
          </Link>
        }
      />

      {/* Standard 4-Column Animated KPI Cards */}
      <StatCardGroup columns={4}>
        <StatCard
          label="Total Requirements"
          value={isLoading ? "…" : reqsList.length}
          icon={FileText}
          index={0}
          colorTheme="blue"
          sublabel="Departmental CSR needs"
        />
        <StatCard
          label="Funding Needed"
          value={isLoading ? "…" : `₹${(totalCost / 100).toFixed(2)} Cr`}
          icon={Coins}
          index={1}
          colorTheme="amber"
          sublabel="Gap funding requirement"
        />
        <StatCard
          label="Published Needs"
          value={isLoading ? "…" : publishedCount}
          icon={CheckCircle2}
          index={2}
          colorTheme="emerald"
          sublabel="Open for CSR pledges"
        />
        <StatCard
          label="Districts Covered"
          value={isLoading ? "…" : uniqueDistricts.length}
          icon={Landmark}
          index={3}
          colorTheme="purple"
          sublabel="Active districts in scope"
        />
      </StatCardGroup>

      {/* Main Content Area */}
      <div className="rounded-2xl border border-white/80 bg-white/90 backdrop-blur-2xl p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search title, ref ID, or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Districts</option>
                {uniqueDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* List / Grid View Toggle Component */}
            <ViewToggle view={viewMode} onChange={setViewMode} />

            <Link
              href="/requirements/create"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
            >
              <Plus size={16} /> Create Requirement
            </Link>
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader label="Loading Department Requirements..." />
          </div>
        ) : reqsList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
            <FileText className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-base font-bold text-slate-800">No Requirements Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no departmental CSR requirements in the database.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="group relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/20 p-5 shadow-sm hover:shadow-xl transition-all duration-300 transform-gpu hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md font-mono">{item.refId}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === "PUBLISHED" || item.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                    <MapPin size={13} className="text-blue-600" /> District: {item.district}
                  </p>
                  <span className="mt-2 inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Cost Estimate</span>
                    <p className="text-sm font-extrabold text-blue-900 font-heading">₹{item.estimatedCostLakhs} Lakhs</p>
                  </div>
                  <Link
                    href="/convergence-projects"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-900 transition-colors"
                  >
                    View Details <ArrowUpRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs overflow-x-auto">
            <table className="gov-table w-full text-xs">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Requirement Title</th>
                  <th>Sector / Category</th>
                  <th>District</th>
                  <th>Estimated Cost</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="font-mono font-bold text-blue-900">{item.refId}</td>
                      <td className="font-bold text-slate-900 max-w-xs truncate">{item.title}</td>
                      <td className="text-slate-600 font-medium">{item.category}</td>
                      <td className="text-slate-700">{item.district}</td>
                      <td className="font-extrabold text-blue-950">₹{item.estimatedCostLakhs} Lakhs</td>
                      <td>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === "PUBLISHED" || item.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          href="/convergence-projects"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          View Details <ArrowUpRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                      No requirements match your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
