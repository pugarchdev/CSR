"use client";

import { useEffect, useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { apiFetch } from "@/lib/api";
import {
  Loader2,
  MapPin,
  Building2,
  Users,
  Search,
  X,
  CheckCircle2,
  Coins,
  Sparkles,
  Award,
  Calendar,
  Layers,
  Eye,
  ImageIcon,
  ShieldCheck,
  Quote
} from "lucide-react";

interface Story {
  id: string;
  projectId: string;
  title: string;
  district: string;
  sector: string;
  corporate: string;
  amount: number | string;
  completedAt: string | null;
  beneficiaries: string | null;
  impact: string | null;
  photo: string | null;
}

const fmtCurrency = (value: number | string) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakh`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function SuccessStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [districtFilter, setDistrictFilter] = useState("All");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<any>("/public/success-stories?limit=24");
        const data = response?.data ?? response;
        if (active) setStories(data.stories ?? []);
      } catch (err: any) {
        if (active) setError(err?.message || "Failed to load success stories");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => {
      if (s.sector) set.add(s.sector);
    });
    return Array.from(set).sort();
  }, [stories]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => {
      if (s.district) set.add(s.district);
    });
    return Array.from(set).sort();
  }, [stories]);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchSearch =
        search.trim() === "" ||
        story.title.toLowerCase().includes(search.toLowerCase()) ||
        story.corporate.toLowerCase().includes(search.toLowerCase()) ||
        story.district.toLowerCase().includes(search.toLowerCase()) ||
        story.projectId.toLowerCase().includes(search.toLowerCase());

      const matchSector = sectorFilter === "All" || story.sector === sectorFilter;
      const matchDistrict = districtFilter === "All" || story.district === districtFilter;

      return matchSearch && matchSector && matchDistrict;
    });
  }, [stories, search, sectorFilter, districtFilter]);

  const totalInvestment = useMemo(
    () => stories.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    [stories]
  );

  const hasActiveFilters = search.trim() !== "" || sectorFilter !== "All" || districtFilter !== "All";

  const clearFilters = () => {
    setSearch("");
    setSectorFilter("All");
    setDistrictFilter("All");
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
              <span className="text-amber-600 font-extrabold">Impact &amp; Case Studies</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Success Stories &amp; Case Studies
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-extrabold border border-amber-200">
                {stories.length} Case Studies
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              Evidence-based showcase of completed CSR convergence projects verified by District Nodal Officers — published upon physical milestone certification and Utilization Certificate (UC) acceptance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              <Award size={14} className="text-amber-600" />
              <span>DNO &amp; UC Certified</span>
            </span>
          </div>
        </div>

        {/* 4-Stat Overview Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Published Stories</span>
              <Sparkles size={16} className="text-amber-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {loading ? "…" : stories.length}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Verified impact records</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">CSR Capital Deployed</span>
              <Coins size={16} className="text-blue-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {loading ? "…" : fmtCurrency(totalInvestment)}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Total project outlays</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Districts Impacted</span>
              <MapPin size={16} className="text-purple-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {districts.length || 36}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Across Maharashtra</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Development Sectors</span>
              <Layers size={16} className="text-emerald-600" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {sectors.length || 6}
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Focus intervention domains</p>
          </div>
        </div>

        {/* Compact Filter Toolbar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search case studies, corporates, districts or Project ID..."
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

            {/* Sector Filter */}
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <option value="All">All Sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* District Filter */}
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <option value="All">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <X size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Stories Listing */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="animate-spin text-amber-600" size={32} />
            <span className="text-xs font-bold text-slate-500">Loading verified case studies...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-bold text-rose-800">
            {error}
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <Sparkles size={40} className="text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No success stories match the selected criteria</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Verified success stories are published as field projects are certified complete by District Nodal Officers.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          /* Stories Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStories.map((story) => (
              <div
                key={story.id}
                className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group justify-between"
              >
                <div>
                  {/* Photo Header */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    {story.photo ? (
                      <img
                        src={story.photo}
                        alt={story.title}
                        onClick={() => setSelectedPhoto(story.photo)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-600 gap-1">
                        <ImageIcon size={32} />
                        <span className="text-[10px] font-semibold text-slate-400">Certified Milestone Evidence</span>
                      </div>
                    )}

                    {/* Top Status Badge */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        DNO Verified
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-xs text-white font-mono text-[10px] font-extrabold border border-white/10">
                        {story.projectId}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {story.sector}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2" title={story.title}>
                      {story.title}
                    </h3>

                    {story.impact && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600 leading-relaxed font-medium line-clamp-3">
                        <Quote size={12} className="text-amber-600 inline mr-1 -mt-1" />
                        {story.impact}
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin size={13} className="text-blue-600 shrink-0" />
                        <span className="truncate">{story.district}</span>
                      </div>

                      <div className="flex items-center gap-2 truncate">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate font-semibold text-slate-800">{story.corporate}</span>
                      </div>

                      {story.beneficiaries && (
                        <div className="flex items-center gap-2 truncate text-slate-500">
                          <Users size={13} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{story.beneficiaries}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Outlay */}
                <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CSR Investment</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {fmtCurrency(story.amount)}
                    </span>
                  </div>

                  {story.photo && (
                    <button
                      onClick={() => setSelectedPhoto(story.photo)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <span>View Photo</span>
                      <Eye size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
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
                alt="Enlarged case study evidence"
                className="max-h-[85vh] w-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        )}

      </div>
    </GovPortalLayout>
  );
}
