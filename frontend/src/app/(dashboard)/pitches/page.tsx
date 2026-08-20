"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useApiQuery } from "@/lib/apiHooks";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { useRouter, useSearchParams } from "next/navigation";
import { invalidateCache } from "@/lib/api";
import {
  Compass,
  Plus,
  Search,
  MapPin,
  Coins,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
  Building,
  RefreshCw,
  ChevronDown,
  ArrowUpDown,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";

interface Pitch {
  id: string;
  refNo: string;
  title: string;
  department: string;
  district: string;
  budgetInr: number;
  status: string;
  submittedDate: string;
  schemeName?: string;
  officialName?: string;
  createdAt: string;
}

// Indian Currency Formatter (Handles Cr, Lakhs, Thousands, and Exact INR)
function formatINR(val?: number | string | null, fallbackZero = "₹0") {
  if (val === null || val === undefined || val === "") return fallbackZero;
  const num = Number(val);
  if (isNaN(num)) return fallbackZero;
  if (num === 0) return "₹0";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num.toLocaleString("en-IN")}`;
}

const getStatusBadgeStyle = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED" || s === "CSR_COMMITTED" || s === "PUBLIC_LISTED") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200/80";
  }
  if (s === "VERIFIED" || s === "UNDER_VERIFICATION") {
    return "bg-blue-50 text-blue-800 border-blue-200/80";
  }
  if (s === "SUBMITTED" || s === "UNDER_REVIEW") {
    return "bg-amber-50 text-amber-800 border-amber-200/80";
  }
  if (s === "REJECTED" || s === "DO_NOT_PROCEED") {
    return "bg-rose-50 text-rose-800 border-rose-200/80";
  }
  return "bg-slate-100 text-slate-700 border-slate-200/80";
};

function PitchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightParam = searchParams?.get("highlight") || searchParams?.get("trackingId") || searchParams?.get("id") || searchParams?.get("search") || "";

  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const storeIsAdmin = useAuthStore((s) => s.isAdmin);
  const activeRoles = (roles || []).length > 0 ? roles : (user?.role ? [user.role] : []);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const isRM = activeRoles.some(r => {
    const s = String(r).toUpperCase();
    return s.includes("RELATIONSHIP_MANAGER") || s.includes("RELATIONSHIP MANAGER") || s === "6";
  });

  const isJS = activeRoles.some(r => {
    const s = String(r).toUpperCase();
    return s.includes("JOINT_SECRETARY") || s.includes("JOINT SECRETARY") || s === "3" || user?.roleId === 3;
  });

  const isSuperAdmin = storeIsAdmin || activeRoles.some(r => {
    const s = String(r).toUpperCase();
    return s.includes("SUPER_ADMIN") || s.includes("SUPERADMIN") || s === "1";
  });

  const isGovOfficer = activeRoles.some(r => {
    const s = String(r).toUpperCase();
    return (
      s.includes("GOVERNMENT") ||
      s.includes("GOV_") ||
      s.includes("DEPT") ||
      s.includes("DISTRICT_NODAL") ||
      s === "7" || s === "4" || s === "5"
    );
  });

  // Pitch creation is reserved for Government Department Officers submitting proposals.
  const canCreatePitch = isGovOfficer && !isSuperAdmin && !isRM;

  const { data: envelope, isLoading, isFetching, error: fetchError, refetch } = useApiQuery<any>(
    [isRM ? "rm-pitches" : "government-pitches"],
    isRM ? "/rm/pitches" : "/government-pitches"
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    invalidateCache("/rm/pitches");
    invalidateCache("/government-pitches");
    const startTime = Date.now();
    try {
      await refetch();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 650 - elapsed);
      setTimeout(() => {
        setIsRefreshing(false);
      }, remaining);
    }
  };

  // Filters State matching Enquiries Page
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDistrict, setFilterDistrict] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");
  const [filterBudget, setFilterBudget] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [viewMode, setViewMode] = useResponsiveViewMode();

  const rawPitches: any[] = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.data)
    ? envelope.data
    : Array.isArray(envelope?.data?.pitches)
    ? envelope.data.pitches
    : Array.isArray(envelope?.pitches)
    ? envelope.pitches
    : [];

  const pitchesList: Pitch[] = useMemo(() => {
    return rawPitches.map((p: any) => {
      const rawBudget = Number(p.budget || p.estimatedOutlay || p.estimatedCost || 0);
      return {
        id: p.id,
        refNo: p.pitchReferenceId || p.refNo || `PITCH-${p.id ? p.id.slice(0, 6) : "2026"}`,
        title: p.title || p.projectName || "Untitled pitch",
        department: p.department || p.departmentName || "Not specified",
        district: Array.isArray(p.districts) && p.districts.length ? p.districts.join(", ") : p.district || "Not specified",
        budgetInr: rawBudget,
        status: p.status || "SUBMITTED",
        submittedDate: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "",
        schemeName: p.schemeName,
        officialName: p.officialName || p.submittedBy?.name,
        createdAt: p.createdAt || new Date().toISOString()
      };
    });
  }, [rawPitches]);

  // Deep-link matching and auto-scroll
  useEffect(() => {
    if (!pitchesList.length) return;
    const target = (highlightParam || "").trim().toLowerCase();
    if (!target) return;

    const match = pitchesList.find(
      (item) =>
        item.id.toLowerCase() === target ||
        item.refNo.toLowerCase() === target ||
        item.title.toLowerCase().includes(target) ||
        item.department.toLowerCase().includes(target)
    );

    if (match) {
      setHighlightedId(match.id);
      setFilterStatus("ALL");
      setFilterDepartment("ALL");
      setFilterDistrict("ALL");
      setFilterBudget("ALL");

      const timer = setTimeout(() => {
        const el = document.getElementById(`pitch-row-${match.id}`) || document.getElementById(`pitch-card-${match.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pitchesList, highlightParam]);

  // Extract unique districts
  const allDistricts = useMemo(() => {
    const set = new Set<string>();
    pitchesList.forEach(p => {
      if (p.district && p.district !== "Not specified") {
        p.district.split(",").forEach(d => {
          const trimmed = d.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [pitchesList]);

  // Extract unique departments
  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    pitchesList.forEach(p => {
      if (p.department && p.department !== "Not specified") {
        set.add(p.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [pitchesList]);

  // Filter & Sort
  const filtered = useMemo(() => {
    const res = pitchesList.filter(item => {
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.refNo.toLowerCase().includes(term) ||
        item.department.toLowerCase().includes(term) ||
        item.district.toLowerCase().includes(term) ||
        (item.schemeName && item.schemeName.toLowerCase().includes(term)) ||
        (item.officialName && item.officialName.toLowerCase().includes(term));

      const matchesStatus =
        filterStatus === "ALL" ||
        item.status === filterStatus ||
        (filterStatus === "APPROVED" && (item.status === "APPROVED" || item.status === "CSR_COMMITTED" || item.status === "PUBLIC_LISTED")) ||
        (filterStatus === "UNDER_REVIEW" && (item.status === "SUBMITTED" || item.status === "UNDER_VERIFICATION"));

      const matchesDistrict =
        filterDistrict === "ALL" ||
        item.district.toLowerCase().includes(filterDistrict.toLowerCase());

      const matchesDepartment =
        filterDepartment === "ALL" ||
        item.department.toLowerCase() === filterDepartment.toLowerCase();

      let matchesBudget = true;
      if (filterBudget === "UNDER_50L") {
        matchesBudget = item.budgetInr < 5000000;
      } else if (filterBudget === "50L_TO_2CR") {
        matchesBudget = item.budgetInr >= 5000000 && item.budgetInr <= 20000000;
      } else if (filterBudget === "2CR_TO_10CR") {
        matchesBudget = item.budgetInr > 20000000 && item.budgetInr <= 100000000;
      } else if (filterBudget === "ABOVE_10CR") {
        matchesBudget = item.budgetInr > 100000000;
      }

      return matchesSearch && matchesStatus && matchesDistrict && matchesDepartment && matchesBudget;
    });

    // Sorting
    return res.sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "OLDEST") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "BUDGET_DESC") {
        return b.budgetInr - a.budgetInr;
      }
      if (sortBy === "BUDGET_ASC") {
        return a.budgetInr - b.budgetInr;
      }
      if (sortBy === "TITLE_ASC") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [pitchesList, search, filterStatus, filterDistrict, filterDepartment, filterBudget, sortBy]);

  const hasActiveFilters = Boolean(
    search.trim() || filterStatus !== "ALL" || filterDistrict !== "ALL" || filterDepartment !== "ALL" || filterBudget !== "ALL" || sortBy !== "NEWEST"
  );

  const resetFilters = () => {
    setSearch("");
    setFilterStatus("ALL");
    setFilterDistrict("ALL");
    setFilterDepartment("ALL");
    setFilterBudget("ALL");
    setSortBy("NEWEST");
  };

  // Metrics
  const totalOutlay = useMemo(() => pitchesList.reduce((acc, curr) => acc + curr.budgetInr, 0), [pitchesList]);
  const approvedCount = useMemo(() => pitchesList.filter(p => p.status === "APPROVED" || p.status === "CSR_COMMITTED" || p.status === "PUBLIC_LISTED").length, [pitchesList]);
  const underReviewCount = useMemo(() => pitchesList.filter(p => p.status === "SUBMITTED" || p.status === "UNDER_VERIFICATION").length, [pitchesList]);

  const { sortedItems: sortedPitches, sortKey: tableSortKey, sortDirection: tableSortDirection, requestSort: requestTableSort } = useTableSort(filtered, {
    customGetters: {
      refNo: (p) => p.refNo,
      title: (p) => `${p.title} ${p.department}`,
      district: (p) => p.district,
      budgetInr: (p) => p.budgetInr,
      status: (p) => p.status,
      submittedDate: (p) => p.submittedDate || p.createdAt,
    }
  });

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title="Government Development Pitches"
          category="Department Pitches"
          description="Statewide directory of departmental proposals seeking corporate partner empanelment and CSR funding alignment."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer group disabled:opacity-60"
                title="Refresh Pitches"
              >
                <RefreshCw
                  size={14}
                  className={`transition-transform duration-300 ${
                    isRefreshing || isFetching
                      ? "animate-spin text-blue-700"
                      : "text-slate-600 group-hover:rotate-45"
                  }`}
                />
                <span>{isRefreshing || isFetching ? "Refreshing..." : "Refresh"}</span>
              </button>
              <Link
                href="/track"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-blue-900 transition-all no-underline"
              >
                <Search size={14} className="text-amber-500" /> Track Pitch Status
              </Link>
              {canCreatePitch && (
                <Link
                  href="/pitches/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 no-underline cursor-pointer"
                >
                  <Plus size={16} />
                  Create Pitch Proposal
                </Link>
              )}
            </div>
          }
        />

        {/* 4 Standard KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Submitted Pitches"
            value={isLoading ? "…" : pitchesList.length}
            icon={Compass}
            index={0}
            colorTheme="blue"
            sublabel="Statewide department pitches"
          />
          <StatCard
            label="Total Outlay Required"
            value={isLoading ? "…" : formatINR(totalOutlay)}
            icon={Coins}
            index={1}
            colorTheme="amber"
            sublabel="Estimated CSR need"
          />
          <StatCard
            label="Committed & Approved"
            value={isLoading ? "…" : approvedCount}
            icon={CheckCircle2}
            index={2}
            colorTheme="emerald"
            sublabel="Ready for MoU signing"
          />
          <StatCard
            label="Under Review"
            value={isLoading ? "…" : underReviewCount}
            icon={Clock}
            index={3}
            colorTheme="purple"
            sublabel="Department review pipeline"
          />
        </StatCardGroup>

        {/* Main Content Register & Filters (Identical to Enquiries Page) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 md:p-5">
          {/* Filter Controls Row */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Input with Clear Button */}
              <div className="relative flex-1 max-w-lg">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, ref ID, department, or district..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-2xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* View Toggle & Reset Button */}
              <div className="flex items-center gap-2 flex-wrap">
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw size={13} />
                    <span>Reset Filters</span>
                  </button>
                )}
                <ViewToggle view={viewMode} onChange={setViewMode} />
              </div>
            </div>

            {/* Secondary Filter Dropdowns Row (Clean 5-column grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer shadow-2xs pr-8"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="APPROVED">Approved / Listed</option>
                  <option value="CSR_COMMITTED">CSR Committed</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Department Filter */}
              <div className="relative">
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer shadow-2xs pr-8"
                >
                  <option value="ALL">All Departments</option>
                  {allDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Budget Range Filter */}
              <div className="relative">
                <select
                  value={filterBudget}
                  onChange={(e) => setFilterBudget(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer shadow-2xs pr-8"
                >
                  <option value="ALL">All Budget Ranges</option>
                  <option value="UNDER_50L">Under ₹50 Lakh</option>
                  <option value="50L_TO_2CR">₹50 Lakh – ₹2 Cr</option>
                  <option value="2CR_TO_10CR">₹2 Cr – ₹10 Cr</option>
                  <option value="ABOVE_10CR">Above ₹10 Cr</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* District Filter */}
              <div className="relative">
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer shadow-2xs pr-8"
                >
                  <option value="ALL">All Districts</option>
                  {allDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Sort Filter */}
              <div className="relative col-span-2 sm:col-span-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer shadow-2xs pr-8"
                >
                  <option value="NEWEST">Sort: Newest First</option>
                  <option value="OLDEST">Sort: Oldest First</option>
                  <option value="BUDGET_DESC">Sort: Outlay High → Low</option>
                  <option value="BUDGET_ASC">Sort: Outlay Low → High</option>
                  <option value="TITLE_ASC">Sort: Title (A-Z)</option>
                </select>
                <ArrowUpDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Active Filter Chips & Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-medium">
                  Showing <strong className="text-slate-900">{filtered.length}</strong> of <strong className="text-slate-900">{pitchesList.length}</strong> proposals
                </span>

                {/* Status Chip */}
                {filterStatus !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200/70">
                    Status: {filterStatus.replace(/_/g, " ")}
                    <button onClick={() => setFilterStatus("ALL")} className="hover:text-blue-950 cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* Department Chip */}
                {filterDepartment !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[11px] font-semibold border border-purple-200/70">
                    Dept: {filterDepartment}
                    <button onClick={() => setFilterDepartment("ALL")} className="hover:text-purple-950 cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* Budget Range Chip */}
                {filterBudget !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200/70">
                    Budget: {filterBudget === "UNDER_50L" ? "< ₹50L" : filterBudget === "50L_TO_2CR" ? "₹50L - ₹2Cr" : filterBudget === "2CR_TO_10CR" ? "₹2Cr - ₹10Cr" : "> ₹10Cr"}
                    <button onClick={() => setFilterBudget("ALL")} className="hover:text-amber-950 cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* District Chip */}
                {filterDistrict !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200/70">
                    District: {filterDistrict}
                    <button onClick={() => setFilterDistrict("ALL")} className="hover:text-emerald-950 cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* Search Term Chip */}
                {search.trim() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                    Query: &quot;{search}&quot;
                    <button onClick={() => setSearch("")} className="hover:text-slate-900 cursor-pointer">
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] font-bold text-blue-900 hover:text-blue-700 underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Data View (Table / Cards / Loading / Error / Empty) */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 size={32} className="animate-spin text-blue-900" />
              <p className="text-xs font-bold">Loading Government Pitches...</p>
            </div>
          ) : fetchError ? (
            <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50 text-center text-xs font-bold text-rose-800">
              Failed to load government pitches directory.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
              <Compass size={36} className="text-slate-300" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">No government pitches found matching your search or filters.</p>
                <p className="text-[11px] text-slate-500">Try adjusting your filters or search keywords to find available proposals.</p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-950 transition-all shadow-xs cursor-pointer"
                >
                  <RotateCcw size={13} />
                  Reset All Filters
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* Grid Card View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {filtered.map((item) => {
                const isHighlighted = highlightedId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    id={`pitch-card-${item.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between group ${
                      isHighlighted
                        ? "border-amber-400 ring-4 ring-amber-400/80 bg-amber-50/70 shadow-lg"
                        : "border-slate-200 bg-white shadow-2xs hover:shadow-md"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Bar: Ref ID & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-extrabold text-purple-950 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          {item.refNo}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusBadgeStyle(item.status)}`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Pitch Title & Department */}
                      <div className="space-y-1.5">
                        <h3
                          className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug line-clamp-2"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                            <Building size={11} className="text-slate-500 shrink-0" />
                            {item.department}
                          </span>
                          {item.district && item.district !== "Not specified" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              {item.district}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Budget Highlight */}
                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Estimated Outlay</span>
                          <span className="text-base font-extrabold font-mono text-slate-900">
                            {formatINR(item.budgetInr)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Submitted</span>
                          <span className="text-xs font-semibold text-slate-600 font-mono flex items-center gap-1">
                            <Calendar size={11} className="text-slate-400" />
                            {item.submittedDate || "Recent"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <Link
                        href={`/pitches/${item.id}`}
                        className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-slate-50 hover:bg-blue-900 hover:text-white py-2 text-xs font-bold text-blue-950 border border-slate-200 hover:border-blue-900 transition-all shadow-2xs"
                      >
                        {isJS ? "Approve / Review Details" : "View Proposal Details"} <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Table / List View */
            <div className="w-full rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden bg-white">
              <table className="w-full block md:table text-left text-xs font-medium text-slate-700 border-collapse">
                <thead className="hidden md:table-header-group bg-slate-50 text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <SortableTh sortKey="refNo" currentSortKey={tableSortKey} currentSortDirection={tableSortDirection} onSort={requestTableSort} className="!px-2.5 lg:!px-3 !py-3 whitespace-nowrap w-[13%]">Tracking ID</SortableTh>
                    <SortableTh sortKey="title" currentSortKey={tableSortKey} currentSortDirection={tableSortDirection} onSort={requestTableSort} className="!px-2.5 lg:!px-3 !py-3 w-[36%]">Pitch Title & Department</SortableTh>
                    <SortableTh sortKey="district" currentSortKey={tableSortKey} currentSortDirection={tableSortDirection} onSort={requestTableSort} className="!px-2.5 lg:!px-3 !py-3 whitespace-nowrap w-[11%]">District</SortableTh>
                    <SortableTh sortKey="budgetInr" currentSortKey={tableSortKey} currentSortDirection={tableSortDirection} onSort={requestTableSort} className="!px-2.5 lg:!px-3 !py-3 whitespace-nowrap w-[12%]">Estimated Outlay</SortableTh>
                    <SortableTh sortKey="status" currentSortKey={tableSortKey} currentSortDirection={tableSortDirection} onSort={requestTableSort} className="!px-2.5 lg:!px-3 !py-3 whitespace-nowrap w-[11%]">Status</SortableTh>
                    <SortableTh sortKey="submittedDate" currentSortKey={tableSortKey} currentSortDirection={tableSortDirection} onSort={requestTableSort} className="!px-2.5 lg:!px-3 !py-3 whitespace-nowrap w-[10%]">Submitted Date</SortableTh>
                    <th className="px-2.5 lg:px-3 py-3 text-right text-[10px] xl:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap w-[7%]">Action</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                  {sortedPitches.map((item) => {
                    const isHighlighted = highlightedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        id={`pitch-row-${item.id}`}
                        className={`block md:table-row mb-4 md:mb-0 border md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none transition-colors overflow-hidden ${
                          isHighlighted
                            ? "bg-amber-50/90 ring-2 ring-amber-400 border-amber-300 shadow-md"
                            : "bg-white border-slate-200 hover:bg-slate-50/80"
                        }`}
                      >
                        <td data-label="Tracking ID" className="flex md:table-cell justify-between items-center px-2.5 lg:px-3 py-2.5 md:py-3 border-b border-slate-100 md:border-none font-mono font-bold text-purple-950 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden whitespace-nowrap">
                          <span className="bg-purple-50 px-1.5 py-0.5 rounded text-[11px] border border-purple-100 text-purple-950">
                            {item.refNo}
                          </span>
                        </td>
                        <td data-label="Pitch Title & Dept" className="flex flex-col md:table-cell justify-start items-start px-2.5 lg:px-3 py-2.5 md:py-3 border-b border-slate-100 md:border-none text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden before:mb-1 text-left min-w-0">
                          <div className="space-y-1 w-full text-left">
                            <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-2 break-words" title={item.title}>
                              {item.title}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-semibold text-slate-700">
                                <Building size={10} className="text-slate-500 shrink-0" />
                                <span className="truncate max-w-[140px] lg:max-w-[180px]">{item.department}</span>
                              </span>
                              {item.schemeName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-medium text-[10px] border border-blue-200/60" title={item.schemeName}>
                                  <Layers size={10} className="text-blue-500 shrink-0" />
                                  <span className="truncate max-w-[120px] lg:max-w-[150px]">{item.schemeName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="District" className="flex md:table-cell justify-between items-center px-2.5 lg:px-3 py-2.5 md:py-3 border-b border-slate-100 md:border-none text-slate-600 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden whitespace-nowrap">
                          <span className="text-slate-700 font-medium flex items-center gap-1 text-xs">
                            <MapPin size={11} className="text-blue-600 shrink-0" />
                            {item.district}
                          </span>
                        </td>
                        <td data-label="Estimated Outlay" className="flex md:table-cell justify-between items-center px-2.5 lg:px-3 py-2.5 md:py-3 border-b border-slate-100 md:border-none font-mono font-bold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden whitespace-nowrap text-xs">
                          {formatINR(item.budgetInr)}
                        </td>
                        <td data-label="Status" className="flex md:table-cell justify-between items-center px-2.5 lg:px-3 py-2.5 md:py-3 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusBadgeStyle(item.status)}`}>
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td data-label="Submitted Date" className="flex md:table-cell justify-between items-center px-2.5 lg:px-3 py-2.5 md:py-3 border-b border-slate-100 md:border-none text-slate-500 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden font-mono whitespace-nowrap text-[11px]">
                          {item.submittedDate || "—"}
                        </td>
                        <td className="block md:table-cell px-2.5 lg:px-3 py-2.5 md:py-3 text-right bg-slate-50/50 md:bg-transparent whitespace-nowrap">
                          <Link
                            href={`/pitches/${item.id}`}
                            className="inline-flex items-center justify-center md:justify-end gap-1 w-full md:w-auto text-xs font-bold text-blue-900 hover:text-blue-700 border border-blue-200 md:border-none bg-white md:bg-transparent rounded-lg py-1.5 md:py-0 transition-colors"
                          >
                            Details <ArrowUpRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </GovPortalLayout>
  );
}

export default function PitchesPage() {
  return (
    <Suspense
      fallback={
        <GovPortalLayout>
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-blue-900" />
            <p className="text-xs font-bold">Loading pitches dashboard...</p>
          </div>
        </GovPortalLayout>
      }
    >
      <PitchesContent />
    </Suspense>
  );
}
