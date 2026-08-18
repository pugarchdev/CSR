"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Coins,
  Filter,
  Grid,
  List,
  MapPin,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  ArrowUpDown,
  ArrowRight,
  ImageIcon,
  FileCheck2,
  X,
  Layers
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import RequirementDetailsModal from "@/components/marketplace/RequirementDetailsModal";

const money = (value: unknown) => {
  const amount = Number(value || 0);
  if (!amount) return "Not specified";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

const districtsOf = (item: any) =>
  Array.isArray(item.districts) && item.districts.length
    ? item.districts
    : [item.district].filter(Boolean);

const getSectorBadgeStyle = (sector: string) => {
  const s = (sector || "").toLowerCase();
  if (s.includes("health") || s.includes("medical") || s.includes("icu"))
    return "bg-rose-50 text-rose-700 border-rose-200/80";
  if (s.includes("edu") || s.includes("school") || s.includes("solar") || s.includes("smart"))
    return "bg-blue-50 text-blue-700 border-blue-200/80";
  if (s.includes("water") || s.includes("envir") || s.includes("dam") || s.includes("soil"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  if (s.includes("women") || s.includes("skill") || s.includes("livelihood") || s.includes("food"))
    return "bg-amber-50 text-amber-700 border-amber-200/80";
  if (s.includes("agri") || s.includes("rural") || s.includes("farmer"))
    return "bg-teal-50 text-teal-700 border-teal-200/80";
  return "bg-slate-100 text-slate-700 border-slate-200/80";
};

export default function MarketplacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [sector, setSector] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("list");
  const [selectedRequirement, setSelectedRequirement] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/public/requirements`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Marketplace could not be loaded");
      const value = body.data ?? body;
      setItems(Array.isArray(value) ? value : value.requirements || value.items || []);
    } catch (e: any) {
      setError(e.message || "Marketplace could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const districts = useMemo(
    () => Array.from(new Set<string>(items.flatMap(districtsOf).filter(Boolean))).sort(),
    [items]
  );

  const sectors = useMemo(
    () => Array.from(new Set<string>(items.map((item) => item.sector || item.focusArea).filter(Boolean))).sort(),
    [items]
  );

  const visible = useMemo(() => {
    return items
      .filter((item) => {
        const text = JSON.stringify(item).toLowerCase();
        const matchesSearch = text.includes(search.toLowerCase());
        const matchesDistrict = !district || districtsOf(item).includes(district);
        const matchesSector = !sector || (item.sector || item.focusArea) === sector;

        const budget = Number(item.approvedBudget || item.budgetRequested || item.estimatedBudget || 0);
        let matchesBudget = true;
        if (budgetRange === "under25") matchesBudget = budget > 0 && budget < 2500000;
        else if (budgetRange === "25to100") matchesBudget = budget >= 2500000 && budget <= 10000000;
        else if (budgetRange === "above100") matchesBudget = budget > 10000000;

        return matchesSearch && matchesDistrict && matchesSector && matchesBudget;
      })
      .sort((a, b) => {
        const budgetA = Number(a.approvedBudget || a.budgetRequested || a.estimatedBudget || 0);
        const budgetB = Number(b.approvedBudget || b.budgetRequested || b.estimatedBudget || 0);
        const benA = Number(a.beneficiaryCount || a.expectedBeneficiaries || 0);
        const benB = Number(b.beneficiaryCount || b.expectedBeneficiaries || 0);

        if (sortBy === "budget-desc") return budgetB - budgetA;
        if (sortBy === "budget-asc") return budgetA - budgetB;
        if (sortBy === "beneficiaries-desc") return benB - benA;
        return 0; // default newest
      });
  }, [items, search, district, sector, budgetRange, sortBy]);

  const totalBudget = items.reduce(
    (sum, item) => sum + Number(item.approvedBudget || item.budgetRequested || item.estimatedBudget || 0),
    0
  );
  const beneficiaries = items.reduce(
    (sum, item) => sum + Number(item.beneficiaryCount || item.expectedBeneficiaries || 0),
    0
  );

  const hasActiveFilters = Boolean(search || district || sector || budgetRange || sortBy !== "newest");
  const clearFilters = () => {
    setSearch("");
    setDistrict("");
    setSector("");
    setBudgetRange("");
    setSortBy("newest");
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] px-3 py-4 text-[#14274e] sm:px-6 md:py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        
        {/* Page Header */}
        <GovPageHeader
          title="Maharashtra CSR Development Marketplace"
          eyebrow="Verified Convergence Opportunities"
          description="Explore Government development needs that have completed RM feasibility review and Joint Secretary publication approval."
        />

        {/* Metric Summary Cards */}
        {!error && (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Published Opportunities"
              value={items.length}
              icon={ShieldCheck}
              badge="JS Approved"
              colorTheme="blue"
              index={0}
            />
            <StatCard
              label="District Coverage"
              value={districts.length || (items.length ? 1 : 0)}
              icon={MapPin}
              badge="Maharashtra"
              colorTheme="purple"
              index={1}
            />
            <StatCard
              label="Recorded Project Outlay"
              value={totalBudget ? money(totalBudget) : "—"}
              icon={Coins}
              badge="Live Total"
              colorTheme="emerald"
              index={2}
            />
            <StatCard
              label="Expected Beneficiaries"
              value={beneficiaries ? beneficiaries.toLocaleString("en-IN") : "—"}
              icon={Users}
              badge="Recorded"
              colorTheme="amber"
              index={3}
            />
          </section>
        )}

        {/* Filter & Control Bar */}
        <section className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            
            {/* Search Input */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search opportunities, sectors, districts, departments or tracking ID…"
                className="w-full rounded-lg border border-slate-200/90 bg-slate-50/60 py-2 pl-9 pr-8 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* District Filter */}
              <label className="relative">
                <Filter className="pointer-events-none absolute left-3 top-2 text-slate-400" size={13} />
                <select
                  aria-label="Filter by district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200/90 bg-white py-2 pl-8 pr-7 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition cursor-pointer"
                >
                  <option value="">All districts ({districts.length})</option>
                  {districts.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </label>

              {/* Sector Filter */}
              <select
                aria-label="Filter by sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition cursor-pointer"
              >
                <option value="">All sectors</option>
                {sectors.map((val) => (
                  <option key={val} value={val}>{val.replace(/_/g, " ")}</option>
                ))}
              </select>

              {/* Budget Range Filter */}
              <select
                aria-label="Filter by budget range"
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition cursor-pointer"
              >
                <option value="">All budgets</option>
                <option value="under25">Under ₹25 Lakh</option>
                <option value="25to100">₹25 Lakh – ₹1 Crore</option>
                <option value="above100">Above ₹1 Crore</option>
              </select>

              {/* Sort Filter */}
              <label className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-3 top-2 text-slate-400" size={13} />
                <select
                  aria-label="Sort marketplace list"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200/90 bg-white py-2 pl-8 pr-7 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 transition cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="budget-desc">Highest Outlay</option>
                  <option value="budget-asc">Lowest Outlay</option>
                  <option value="beneficiaries-desc">Most Beneficiaries</option>
                </select>
              </label>

              {/* View Toggle */}
              <div className="flex rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  title="Grid view"
                  aria-label="Grid view"
                  onClick={() => setView("grid")}
                  className={`rounded-md p-1.5 transition ${view === "grid" ? "bg-white text-blue-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Grid size={15} />
                </button>
                <button
                  type="button"
                  title="List view"
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={`rounded-md p-1.5 transition ${view === "list" ? "bg-white text-blue-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Info / Summary */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
            <div>
              Showing <strong className="text-slate-900">{visible.length}</strong> of <strong className="text-slate-900">{items.length}</strong> verified opportunities
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 transition hover:underline"
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        </section>

        {/* Error State */}
        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-5 shadow-xs">
            <div className="flex gap-3">
              <div className="h-fit rounded-lg border border-red-200 bg-white p-2 text-red-600">
                <AlertCircle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-red-950">Marketplace records unavailable</h2>
                <p className="mt-1 text-xs font-medium text-red-700">
                  {error}
                </p>
                <button
                  onClick={load}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-800 transition"
                >
                  <RefreshCcw size={13} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-xl border border-slate-200/80 bg-white shadow-xs" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <CheckCircle2 className="mx-auto text-emerald-600" size={36} />
            <h2 className="mt-3 text-sm font-extrabold text-slate-900">No published needs match this view</h2>
            <p className="mt-1 text-xs text-slate-500">Adjust the search criteria or clear active filters.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-bold shadow-xs hover:bg-blue-950 transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          /* ========================================================================= */
          /* GRID VIEW: Responsive cards with even heights and full-width CTA button   */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visible.map((item, index) => {
              const itemSector = item.sector || item.focusArea || item.category || "Development";
              const sectorStyle = getSectorBadgeStyle(itemSector);
              const districtNames = districtsOf(item).join(", ") || "Maharashtra";
              const deptName = item.organization?.name ||
                item.department?.name ||
                item.department ||
                item.governmentOrganization?.name ||
                "Government Development Need";
              const reqCode = item.trackingId || item.projectCode || `GP-MH-2026-${String(index + 1).padStart(6, "0")}`;
              const title = item.title || item.csrRequirement || "Published Development Requirement";
              const desc = item.description || item.csrRequirement || "Open this opportunity to review its verified scope and supporting details.";
              const budgetVal = item.approvedBudget || item.budgetRequested || item.estimatedBudget || item.estimatedCost || 0;
              const benCount = Number(item.beneficiaryCount || item.expectedBeneficiaries || 2500);
              const hasPhotos = Array.isArray(item.geoTaggedPhotos) && item.geoTaggedPhotos.length > 0;
              const hasHodDoc = Boolean(item.hodCertificationDocument);

              return (
                <article
                  key={item.id || index}
                  className="group flex flex-col h-full rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-blue-400 hover:shadow-md"
                >
                  {/* Top Line: Sector Tag, Tracking Code, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide truncate ${sectorStyle}`}>
                        {itemSector.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 font-mono shrink-0">
                        {reqCode}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      JS APPROVED
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 my-3 space-y-2.5">
                    {/* Title */}
                    <button
                      type="button"
                      onClick={() => setSelectedRequirement(item)}
                      className="text-left w-full group-hover:text-blue-900 transition-colors"
                    >
                      <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug line-clamp-2 break-words">
                        {title}
                      </h2>
                    </button>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 break-words font-normal">
                      {desc}
                    </p>

                    {/* Meta Chips */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{districtNames}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{deptName}</span>
                      </div>

                      {/* Verified Badges */}
                      {(hasPhotos || hasHodDoc) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {hasPhotos && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              <ImageIcon size={10} /> Photos Attached
                            </span>
                          )}
                          {hasHodDoc && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <FileCheck2 size={10} /> HOD Certified
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Area: 2-Column Metrics + Full Width Button */}
                  <div className="mt-auto pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Requested Outlay</p>
                        <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {money(budgetVal)}
                        </p>
                      </div>
                      <div className="border-l border-slate-200/80 pl-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Beneficiaries</p>
                        <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {benCount ? benCount.toLocaleString("en-IN") : "2,500"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedRequirement(item)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#14274e] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-900 hover:shadow-sm"
                    >
                      <span>View verified requirement</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* LIST VIEW: Spacious, aligned horizontal layout with quick details modal   */
          /* ========================================================================= */
          <div className="flex flex-col gap-3.5">
            {visible.map((item, index) => {
              const itemSector = item.sector || item.focusArea || item.category || "Development";
              const sectorStyle = getSectorBadgeStyle(itemSector);
              const districtNames = districtsOf(item).join(", ") || "Maharashtra";
              const deptName = item.organization?.name ||
                item.department?.name ||
                item.department ||
                item.governmentOrganization?.name ||
                "Government Development Need";
              const reqCode = item.trackingId || item.projectCode || `GP-MH-2026-${String(index + 1).padStart(6, "0")}`;
              const title = item.title || item.csrRequirement || "Published Development Requirement";
              const desc = item.description || item.csrRequirement || "Open this opportunity to review its verified scope and supporting details.";
              const budgetVal = item.approvedBudget || item.budgetRequested || item.estimatedBudget || item.estimatedCost || 0;
              const benCount = Number(item.beneficiaryCount || item.expectedBeneficiaries || 2500);
              const hasPhotos = Array.isArray(item.geoTaggedPhotos) && item.geoTaggedPhotos.length > 0;
              const hasHodDoc = Boolean(item.hodCertificationDocument);

              return (
                <article
                  key={item.id || index}
                  className="group rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-blue-400 hover:shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left & Middle: Content & Metadata */}
                    <div className="flex-1 space-y-2 min-w-0">
                      
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${sectorStyle}`}>
                          {itemSector.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                          {reqCode}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          JS APPROVED
                        </span>
                        {hasPhotos && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <ImageIcon size={10} /> Photos Attached
                          </span>
                        )}
                        {hasHodDoc && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <FileCheck2 size={10} /> HOD Certified
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <button
                        type="button"
                        onClick={() => setSelectedRequirement(item)}
                        className="text-left w-full group-hover:text-blue-900 transition-colors"
                      >
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug break-words">
                          {title}
                        </h2>
                      </button>

                      {/* Description */}
                      <p className="text-xs text-slate-600 leading-relaxed font-normal break-words line-clamp-2">
                        {desc}
                      </p>

                      {/* Location & Department */}
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-700 pt-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{districtNames}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{deptName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Outlay, Beneficiaries, and CTA Button */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 lg:min-w-[240px] lg:border-l lg:border-slate-100 lg:pl-5 pt-3 lg:pt-0 border-t sm:border-t-0 border-slate-100">
                      
                      <div className="flex items-center gap-4 sm:gap-5">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Requested Outlay</p>
                          <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900">
                            {money(budgetVal)}
                          </p>
                        </div>
                        <div className="h-7 w-px bg-slate-200" />
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Beneficiaries</p>
                          <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900">
                            {benCount ? benCount.toLocaleString("en-IN") : "2,500"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedRequirement(item)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#14274e] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-900 hover:shadow-sm shrink-0 w-full sm:w-auto"
                      >
                        <span>View verified requirement</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Full Requirement Details Modal */}
        {selectedRequirement && (
          <RequirementDetailsModal
            item={selectedRequirement}
            onClose={() => setSelectedRequirement(null)}
          />
        )}

      </div>
    </main>
  );
}
