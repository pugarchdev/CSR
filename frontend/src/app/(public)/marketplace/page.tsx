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
  Target,
  Users,
  ArrowUpDown,
  ArrowRight
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";

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
        if (sortBy === "beneficiaries-desc") return benB - benA;
        return 0; // default newest/order
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

  return (
    <main className="min-h-screen bg-[#f8fafc] px-3 py-4 text-[#14274e] sm:px-6 md:py-6">
      <div className="mx-auto max-w-7xl">
        <GovPageHeader
          title="Maharashtra CSR Development Marketplace"
          eyebrow="Verified Convergence Opportunities"
          description="Explore Government development needs that have completed RM feasibility review and Joint Secretary publication approval."
        />

        {!error && (
          <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              value={districts.length || 1}
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

        <section className="mt-4 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            {/* Search input */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search opportunities, sectors, districts or departments…"
                className="w-full rounded-lg border border-slate-200/90 bg-slate-50/60 py-2 pl-9 pr-3 text-xs font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <label className="relative">
                <Filter className="pointer-events-none absolute left-3 top-2 text-slate-400" size={13} />
                <select
                  aria-label="Filter by district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200/90 bg-white py-2 pl-8 pr-7 text-xs font-bold text-slate-600 outline-none hover:border-slate-300 transition sm:w-36"
                >
                  <option value="">All districts</option>
                  {districts.map((val) => (
                    <option key={val}>{val}</option>
                  ))}
                </select>
              </label>

              <select
                aria-label="Filter by sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 outline-none hover:border-slate-300 transition sm:w-32"
              >
                <option value="">All sectors</option>
                {sectors.map((val) => (
                  <option key={val}>{val}</option>
                ))}
              </select>

              <select
                aria-label="Filter by budget range"
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                className="rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 outline-none hover:border-slate-300 transition sm:w-36"
              >
                <option value="">All budgets</option>
                <option value="under25">Under ₹25 Lakh</option>
                <option value="25to100">₹25 Lakh - ₹1 Crore</option>
                <option value="above100">Above ₹1 Crore</option>
              </select>

              <label className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-3 top-2 text-slate-400" size={13} />
                <select
                  aria-label="Sort marketplace list"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none rounded-lg border border-slate-200/90 bg-white py-2 pl-8 pr-7 text-xs font-bold text-slate-600 outline-none hover:border-slate-300 transition sm:w-36"
                >
                  <option value="newest">Newest First</option>
                  <option value="budget-desc">Highest Budget</option>
                  <option value="beneficiaries-desc">Most Beneficiaries</option>
                </select>
              </label>

              <div className="flex rounded-lg border border-slate-200/90 bg-slate-100/70 p-0.5">
                <button
                  aria-label="Grid view"
                  onClick={() => setView("grid")}
                  className={`rounded-md p-1.5 transition ${view === "grid" ? "bg-white text-blue-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Grid size={14} />
                </button>
                <button
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={`rounded-md p-1.5 transition ${view === "list" ? "bg-white text-blue-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Showing {visible.length} of {items.length} live opportunities
            </p>
            <Link
              href="/directory"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 hover:no-underline transition"
            >
              <Building2 size={13} />
              Verified organization directory
            </Link>
          </div> */}
        </section>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-5 shadow-xs">
            <div className="flex gap-3">
              <div className="h-fit rounded-lg border border-red-200 bg-white p-2 text-red-600">
                <AlertCircle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-red-950">Marketplace unavailable</h2>
                <p className="mt-1 text-xs font-medium text-red-700">
                  {error}. No demonstration projects have been substituted.
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
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-xl border border-slate-200/80 bg-white shadow-xs" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
            <h2 className="mt-3 text-sm font-extrabold text-slate-900">No published needs match this view</h2>
            <p className="mt-1 text-xs text-slate-500">Adjust the search or filters. Only approved public records are displayed.</p>
          </div>
        ) : (
          <div className={`mt-4 grid gap-3.5 ${view === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
            {visible.map((item, index) => {
              const itemSector = item.sector || item.focusArea || item.category || "Development";
              const sectorStyle = getSectorBadgeStyle(itemSector);
              const districtNames = districtsOf(item).join(", ") || "Maharashtra";
              const deptName = item.organization?.name ||
                item.department?.name ||
                item.governmentOrganization?.name ||
                "Government Development Need";
              const reqCode = item.trackingId || item.projectCode || `MH-CSR-2026-${String(index + 1).padStart(3, "0")}`;
              const title = item.title || item.csrRequirement || "Published Development Requirement";
              const desc = item.description || item.csrRequirement || "Open this opportunity to review its verified scope and supporting details.";
              const budgetVal = item.approvedBudget || item.budgetRequested || item.estimatedBudget;
              const benCount = Number(item.beneficiaryCount || item.expectedBeneficiaries || 0);

              return (
                <article
                  key={item.id || index}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-blue-400/80 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3">
                    {/* Top Row: Sector Pill, Code & Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sectorStyle}`}>
                          {itemSector.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 font-mono">
                          {reqCode}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        JS APPROVED
                      </span>
                    </div>

                    {/* Main Content Area */}
                    <div className="space-y-1.5">
                      <Link href={`/csr-marketplace/${item.id}`} className="hover:no-underline group-hover:text-blue-800 transition-colors">
                        <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-800 transition-colors leading-snug">
                          {title}
                        </h2>
                      </Link>
                      <p className="text-xs font-normal leading-relaxed text-slate-600">
                        {desc}
                      </p>
                    </div>

                    {/* Location & Department Chips (Fully Visible, No Truncation) */}
                    <div className="flex flex-wrap gap-y-1.5 gap-x-4 text-xs font-medium text-slate-700 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{districtNames}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{deptName}</span>
                      </div>
                    </div>

                    {/* Bottom Metrics Bar & CTA Button */}
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 sm:px-4 sm:py-2.5">
                      <div className="flex items-center gap-5">
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
                            {benCount ? benCount.toLocaleString("en-IN") : "—"}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/csr-marketplace/${item.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#14274e] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-900 hover:shadow-xs hover:no-underline shrink-0"
                      >
                        <span>View verified requirement</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
