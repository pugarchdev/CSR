"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { apiFetch } from "@/lib/api";
import {
  Loader2,
  MapPin,
  Building2,
  Users,
  ImageIcon,
  Search,
  X,
  Filter,
  CheckCircle2,
  Coins,
  Layers,
  Calendar,
  Eye,
  ChevronRight,
  ExternalLink
} from "lucide-react";

interface GalleryProject {
  id: string;
  projectId: string;
  title: string;
  district: string;
  taluka: string;
  location: string;
  sector: string;
  corporate: string;
  amount: number | string;
  utilizedAmount: number | string;
  completedAt: string | null;
  year: number | null;
  beneficiaries: string | null;
  impact: string | null;
  photos: string[];
}

interface GalleryFilters {
  districts: string[];
  sectors: string[];
  corporates: string[];
  years: number[];
}

const fmtCurrency = (value: number | string) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakh`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function CompletedProjectsPage() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [filters, setFilters] = useState<GalleryFilters>({ districts: [], sectors: [], corporates: [], years: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("All");
  const [sector, setSector] = useState("All");
  const [corporate, setCorporate] = useState("All");
  const [year, setYear] = useState("All");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (search.trim()) params.set("search", search.trim());
      if (district !== "All") params.set("district", district);
      if (sector !== "All") params.set("sector", sector);
      if (corporate !== "All") params.set("corporate", corporate);
      if (year !== "All") params.set("year", year);

      const response = await apiFetch<any>(`/public/completed-projects?${params.toString()}`);
      const data = response?.data ?? response;
      setProjects(data.projects ?? []);
      setTotal(data.pagination?.total ?? (data.projects?.length ?? 0));
      if (data.filters) setFilters(data.filters);
    } catch (err: any) {
      setError(err?.message || "Failed to load completed projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [search, district, sector, corporate, year]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const totalBudget = useMemo(
    () => projects.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [projects]
  );

  const hasActiveFilters = search.trim() !== "" || district !== "All" || sector !== "All" || corporate !== "All" || year !== "All";

  const clearAllFilters = () => {
    setSearch("");
    setDistrict("All");
    setSector("All");
    setCorporate("All");
    setYear("All");
  };

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Completed Projects</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Completed Projects Gallery
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200">
                {total} Verified Initiatives
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Permanent, certified public record of corporate-backed CSR development projects successfully delivered across Maharashtra under MCA Section 135 &amp; State CSR Convergence.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <CheckCircle2 size={14} className="text-blue-600" />
              <span>UC &amp; DNO Certified</span>
            </span>
          </div>
        </div>

        {/* 4-Stat Overview Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Completed Projects</span>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {loading ? "…" : total}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Verified on portal</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Outlay</span>
              <Coins size={16} className="text-blue-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {loading ? "…" : fmtCurrency(totalBudget)}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Approved project budgets</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Districts Covered</span>
              <MapPin size={16} className="text-purple-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {filters.districts.length || 36}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Across Maharashtra</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Focus Sectors</span>
              <Layers size={16} className="text-amber-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {filters.sectors.length || 8}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Development sectors</p>
          </div>
        </div>

        {/* Compact Optimized Filter Toolbar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search project title, corporate, district or ID..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* District Filter */}
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <option value="All">All Districts</option>
              {filters.districts.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {/* Sector Filter */}
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <option value="All">All Sectors</option>
              {filters.sectors.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {/* Corporate Filter */}
            <select
              value={corporate}
              onChange={(e) => setCorporate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <option value="All">All Corporates</option>
              {filters.corporates.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <option value="All">All Years</option>
              {filters.years.map((v) => (
                <option key={v} value={String(v)}>{v}</option>
              ))}
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="text-xs font-bold text-slate-500">Loading verified projects gallery...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-bold text-rose-800">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <ImageIcon size={40} className="text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No completed projects match the selected filters</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try resetting your filters or searching with different keywords.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          /* Project Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const photoCount = project.photos?.length || 0;
              const mainPhoto = project.photos?.[0] || null;

              return (
                <div
                  key={project.id}
                  className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Photo Header */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    {mainPhoto ? (
                      <img
                        src={mainPhoto}
                        alt={project.title}
                        onClick={() => setSelectedPhoto(mainPhoto)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-600 gap-1">
                        <ImageIcon size={32} />
                        <span className="text-[10px] font-semibold text-slate-400">Site Evidence Verified</span>
                      </div>
                    )}

                    {/* Top Status & Photo Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        Completed
                      </span>

                      {photoCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold">
                          <ImageIcon size={11} />
                          {photoCount} {photoCount === 1 ? "Photo" : "Photos"}
                        </span>
                      )}
                    </div>

                    {/* Bottom Project ID Pill */}
                    <div className="absolute bottom-2.5 left-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-xs text-white font-mono text-[10px] font-extrabold border border-white/10">
                        {project.projectId}
                      </span>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {project.sector}
                        </span>
                        {project.year && (
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {project.year}
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2" title={project.title}>
                        {project.title}
                      </h3>

                      <div className="space-y-1.5 pt-1 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <MapPin size={13} className="text-blue-600 shrink-0" />
                          <span className="truncate">
                            {project.district}{project.taluka ? `, ${project.taluka}` : ""}{project.location ? ` (${project.location})` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 truncate">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-semibold text-slate-800">{project.corporate}</span>
                        </div>

                        {project.beneficiaries && (
                          <div className="flex items-center gap-2 truncate text-slate-500">
                            <Users size={13} className="text-emerald-600 shrink-0" />
                            <span className="truncate">{project.beneficiaries}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Outlay Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CSR Outlay</span>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {fmtCurrency(project.amount)}
                        </span>
                      </div>

                      {mainPhoto && (
                        <button
                          onClick={() => setSelectedPhoto(mainPhoto)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          <span>View Evidence</span>
                          <Eye size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo Lightbox Modal */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col items-center"
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-950/80 text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors shadow-md"
              >
                <X size={18} />
              </button>
              <img
                src={selectedPhoto}
                alt="Enlarged evidence photo"
                className="max-h-[85vh] w-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        )}

      </div>
    </GovPortalLayout>
  );
}
