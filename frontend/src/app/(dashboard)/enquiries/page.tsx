"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useApiQuery } from "@/lib/apiHooks";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import {
  Building2, Search, Filter, Mail, Coins, ArrowUpRight, ShieldCheck, Clock, CheckCircle2,
  Plus, Landmark, AlertCircle, Loader2, X, RotateCcw, SlidersHorizontal, MapPin,
  Briefcase, Calendar, ArrowUpDown, Tag, Check, ChevronDown, User
} from "lucide-react";

import { useAuthStore } from "@/store/authStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";

interface Enquiry {
  id: string;
  trackingId: string;
  companyName: string;
  sector: string;
  indicativeBudgetCr: number | null;
  status: string;
  submittedDate: string;
  preferredDistricts?: string[];
  contactPersonName?: string;
  contactEmail?: string;
  proposedCSRWork?: string;
  createdAt?: string;
}

function extractRoleTokens(
  user: any,
  roles: any[],
  roleDetails: any[]
): string[] {
  const tokens = new Set<string>();

  if (user?.role) tokens.add(String(user.role));
  if (user?.roleSlug) tokens.add(String(user.roleSlug));
  if (user?.roleNumericId) tokens.add(String(user.roleNumericId));

  (roles || []).forEach((r) => {
    if (typeof r === "string") tokens.add(r);
    else if (typeof r === "number") tokens.add(String(r));
    else if (r && typeof r === "object") {
      if (r.slug) tokens.add(String(r.slug));
      if (r.name) tokens.add(String(r.name));
      if (r.role) tokens.add(String(r.role));
    }
  });

  (roleDetails || []).forEach((rd) => {
    if (rd?.slug) tokens.add(String(rd.slug));
    if (rd?.name) tokens.add(String(rd.name));
  });

  return Array.from(tokens);
}

function getStatusBadgeStyle(status: string): string {
  const upper = (status || "").toUpperCase();
  if (upper === "APPROVED" || upper === "JS_APPROVED" || upper === "PROCEED" || upper === "CSR_COMMITTED" || upper === "PROCEED_WITH_CONDITIONS") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (upper === "UNDER_ASSESSMENT" || upper === "SUBMITTED_TO_JS" || upper === "IN_REVIEW") {
    return "bg-blue-50 text-blue-800 border-blue-200";
  }
  if (upper === "ASSIGNED") {
    return "bg-indigo-50 text-indigo-800 border-indigo-200";
  }
  if (upper === "UNASSIGNED") {
    return "bg-purple-50 text-purple-800 border-purple-200";
  }
  if (upper === "REJECTED" || upper === "JS_REJECTED" || upper === "DO_NOT_PROCEED" || upper === "CANCELLED") {
    return "bg-rose-50 text-rose-800 border-rose-200";
  }
  return "bg-amber-50 text-amber-800 border-amber-200";
}

export default function EnquiriesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const roleDetails = useAuthStore((s) => s.roleDetails);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [modalState, setModalState] = useState<"NONE" | "ONBOARDING_INCOMPLETE" | "APPROVAL_PENDING">("NONE");
  const [checkingStatus, setCheckingStatus] = useState(false);

  const tokens = useMemo(
    () => extractRoleTokens(user, roles, roleDetails),
    [user, roles, roleDetails]
  );

  const isRM = useMemo(() => {
    return tokens.some((t: string) => {
      const upper = t.toUpperCase();
      return (
        upper.includes("RELATIONSHIP") ||
        upper.includes("RM") ||
        upper === "6"
      );
    });
  }, [tokens]);

  const isGovOrAdmin = useMemo(() => {
    return (
      isAdmin ||
      isRM ||
      tokens.some((t: string) => {
        const upper = t.toUpperCase();
        return (
          upper.includes("GOVERNMENT") ||
          upper.includes("GOV") ||
          upper.includes("OFFICER") ||
          upper.includes("JOINT") ||
          upper.includes("SECRETARY") ||
          upper.includes("ADMIN") ||
          upper.includes("SUPER")
        );
      })
    );
  }, [isAdmin, isRM, tokens]);

  const canSubmitEnquiry = useMemo(() => {
    if (hasPermission("enquiry:create")) return true;
    if (isGovOrAdmin) return false;
    return tokens.some((t: string) => {
      const upper = t.toUpperCase();
      return upper.includes("CORPORATE") || upper.includes("COMPANY");
    });
  }, [isGovOrAdmin, hasPermission, tokens]);

  const handleSubmitEnquiryClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setCheckingStatus(true);

    try {
      let org = (user as any)?.organization;
      let profile = (user as any)?.csrCompanyProfile || org?.csrCompanyProfile;

      if (user?.organizationId) {
        try {
          const profileRes = await apiFetch<any>("/onboarding/company");
          org = profileRes?.organization || profileRes?.data?.organization || profileRes || org;
          profile = profileRes?.profile || profileRes?.data?.profile || org?.csrCompanyProfile || profile;
        } catch { }
      }

      if (!org || !user?.organizationId) {
        setModalState("ONBOARDING_INCOMPLETE");
        return;
      }

      const statusUpper = (org.status || org.onboardingStatus || "").toUpperCase();
      const PENDING_APPROVAL_STATUSES = ["SUBMITTED_FOR_REVIEW", "UNDER_VERIFICATION", "CLARIFICATION_REQUIRED", "PENDING_APPROVAL", "DOCUMENTS_SUBMITTED"];

      if (statusUpper === "ACTIVE" || statusUpper === "APPROVED" || Number(user?.roleId || user?.role) === 1) {
        router.push("/enquiries/new");
        return;
      } else if (PENDING_APPROVAL_STATUSES.includes(statusUpper)) {
        setModalState("APPROVAL_PENDING");
        return;
      } else {
        setModalState("ONBOARDING_INCOMPLETE");
        return;
      }
    } catch {
      setModalState("ONBOARDING_INCOMPLETE");
    } finally {
      setCheckingStatus(false);
    }
  };

  const { data: envelope, isLoading, error: fetchError } = useApiQuery<any>(
    [isRM ? "rm-enquiries" : "corporate-enquiries"],
    isRM ? "/rm/enquiries" : "/corporate-enquiries"
  );

  // Filter States
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSector, setFilterSector] = useState("ALL");
  const [filterBudget, setFilterBudget] = useState("ALL");
  const [filterDistrict, setFilterDistrict] = useState("ALL");
  const [sortBy, setSortBy] = useState("NEWEST");
  const [viewMode, setViewMode] = useResponsiveViewMode();

  useEffect(() => {
    if (searchParams.get("action") === "create" && !canSubmitEnquiry) {
      router.replace("/enquiries");
    } else if (searchParams.get("action") === "create" && canSubmitEnquiry) {
      router.replace("/enquiries/new");
    }
  }, [searchParams, router, canSubmitEnquiry]);

  const rawEnquiries = Array.isArray(envelope?.data?.enquiries)
    ? envelope.data.enquiries
    : Array.isArray(envelope?.data)
      ? envelope.data
      : Array.isArray(envelope?.enquiries)
        ? envelope.enquiries
        : Array.isArray(envelope)
          ? envelope
          : [];

  const items: Enquiry[] = useMemo(() => {
    return rawEnquiries.map((e: any) => ({
      id: e.id || e.trackingId,
      trackingId: e.trackingId || `ENQ-${e.id?.slice(0, 6) || "2026"}`,
      companyName: e.corporateName || e.companyName || e.company?.name || "Corporate Partner",
      sector: e.sector || "Not specified",
      indicativeBudgetCr: e.indicativeBudget != null ? Number(e.indicativeBudget) / 10000000 : (e.budget != null ? Number(e.budget) : null),
      status: e.status || "SUBMITTED",
      submittedDate: e.createdAt ? new Date(e.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      preferredDistricts: Array.isArray(e.preferredDistricts) && e.preferredDistricts.length ? e.preferredDistricts : (e.district ? [e.district] : []),
      contactPersonName: e.contactPersonName || e.contactPerson || e.contactName || "",
      contactEmail: e.contactEmail || e.email || "",
      proposedCSRWork: e.proposedCSRWork || e.description || e.scope || "",
      createdAt: e.createdAt || new Date().toISOString(),
    }));
  }, [rawEnquiries]);

  // Extract distinct sectors and districts for dynamic filters
  const allSectors = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.sector && item.sector.trim() && item.sector !== "Not specified") {
        set.add(item.sector.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const allDistricts = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (Array.isArray(item.preferredDistricts)) {
        item.preferredDistricts.forEach((d: string) => {
          if (d && d.trim()) set.add(d.trim());
        });
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Metrics for 4 KPI Cards
  const totalOutlay = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.indicativeBudgetCr || 0), 0);
  }, [items]);

  const underReviewCount = useMemo(() => {
    return items.filter((e) =>
      ["UNDER_ASSESSMENT", "SUBMITTED", "PENDING", "UNASSIGNED", "IN_REVIEW", "SUBMITTED_TO_JS"].includes(e.status)
    ).length;
  }, [items]);

  const approvedAssignedCount = useMemo(() => {
    return items.filter((e) =>
      ["APPROVED", "ASSIGNED", "CSR_COMMITTED", "COMPLETED", "JS_APPROVED", "PROCEED", "PROCEED_WITH_CONDITIONS"].includes(e.status)
    ).length;
  }, [items]);

  // Filter & Sort Logic
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    const matched = items.filter((item) => {
      const matchesSearch =
        !term ||
        item.companyName.toLowerCase().includes(term) ||
        item.trackingId.toLowerCase().includes(term) ||
        item.sector.toLowerCase().includes(term) ||
        (item.contactPersonName && item.contactPersonName.toLowerCase().includes(term)) ||
        (item.preferredDistricts && item.preferredDistricts.some((d) => d.toLowerCase().includes(term))) ||
        (item.proposedCSRWork && item.proposedCSRWork.toLowerCase().includes(term));

      const matchesStatus =
        filterStatus === "ALL" ||
        item.status === filterStatus ||
        (filterStatus === "UNDER_ASSESSMENT" && (item.status === "UNDER_ASSESSMENT" || item.status === "SUBMITTED_TO_JS" || item.status === "IN_REVIEW")) ||
        (filterStatus === "APPROVED" && (item.status === "APPROVED" || item.status === "JS_APPROVED" || item.status === "PROCEED" || item.status === "CSR_COMMITTED")) ||
        (filterStatus === "ASSIGNED" && item.status === "ASSIGNED") ||
        (filterStatus === "UNASSIGNED" && item.status === "UNASSIGNED") ||
        (filterStatus === "REJECTED" && (item.status === "REJECTED" || item.status === "JS_REJECTED" || item.status === "DO_NOT_PROCEED"));

      const matchesSector =
        filterSector === "ALL" || item.sector.toLowerCase() === filterSector.toLowerCase();

      const matchesDistrict =
        filterDistrict === "ALL" ||
        (Array.isArray(item.preferredDistricts) &&
          item.preferredDistricts.some((d) => d.toLowerCase() === filterDistrict.toLowerCase()));

      let matchesBudget = true;
      if (filterBudget !== "ALL") {
        const val = item.indicativeBudgetCr || 0;
        if (filterBudget === "UNDER_50L") {
          matchesBudget = val > 0 && val < 0.5;
        } else if (filterBudget === "50L_TO_2CR") {
          matchesBudget = val >= 0.5 && val <= 2.0;
        } else if (filterBudget === "2CR_TO_10CR") {
          matchesBudget = val > 2.0 && val <= 10.0;
        } else if (filterBudget === "ABOVE_10CR") {
          matchesBudget = val > 10.0;
        }
      }

      return matchesSearch && matchesStatus && matchesSector && matchesDistrict && matchesBudget;
    });

    return matched.sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.createdAt || b.submittedDate).getTime() - new Date(a.createdAt || a.submittedDate).getTime();
      }
      if (sortBy === "OLDEST") {
        return new Date(a.createdAt || a.submittedDate).getTime() - new Date(b.createdAt || b.submittedDate).getTime();
      }
      if (sortBy === "BUDGET_DESC") {
        return (b.indicativeBudgetCr || 0) - (a.indicativeBudgetCr || 0);
      }
      if (sortBy === "BUDGET_ASC") {
        return (a.indicativeBudgetCr || 0) - (b.indicativeBudgetCr || 0);
      }
      if (sortBy === "NAME_ASC") {
        return a.companyName.localeCompare(b.companyName);
      }
      return 0;
    });
  }, [items, search, filterStatus, filterSector, filterDistrict, filterBudget, sortBy]);

  const hasActiveFilters = Boolean(
    search.trim() ||
    filterStatus !== "ALL" ||
    filterSector !== "ALL" ||
    filterDistrict !== "ALL" ||
    filterBudget !== "ALL" ||
    sortBy !== "NEWEST"
  );

  const handleResetFilters = () => {
    setSearch("");
    setFilterStatus("ALL");
    setFilterSector("ALL");
    setFilterDistrict("ALL");
    setFilterBudget("ALL");
    setSortBy("NEWEST");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col gap-4 px-4 py-4 md:px-6">
      {/* Header */}
      <GovPageHeader
        title="Corporate Enquiries & CSR Partnership Register"
        eyebrow="Corporate Desk"
        actions={
          canSubmitEnquiry ? (
            <button
              onClick={handleSubmitEnquiryClick}
              disabled={checkingStatus}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50"
            >
              {checkingStatus ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Submit Corporate Enquiry
            </button>
          ) : null
        }
      />

      {/* Onboarding Incomplete Modal */}
      <Modal
        isOpen={modalState === "ONBOARDING_INCOMPLETE"}
        onClose={() => setModalState("NONE")}
        title="Onboarding Needs to Be Completed"
      >
        <div className="flex flex-col gap-4 p-2">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-xs font-semibold">
              Your corporate/company onboarding needs to be completed before submitting a CSR enquiry. Please complete your onboarding first.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalState("NONE")}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-blue-900 hover:bg-blue-950 text-white"
              onClick={() => {
                setModalState("NONE");
                router.push("/organization/onboarding/company");
              }}
            >
              Complete Onboarding
            </Button>
          </div>
        </div>
      </Modal>

      {/* Superadmin Approval Pending Modal */}
      <Modal
        isOpen={modalState === "APPROVAL_PENDING"}
        onClose={() => setModalState("NONE")}
        title="Approval Pending"
      >
        <div className="flex flex-col gap-4 p-2">
          <div className="flex items-center gap-3 text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
            <Clock size={24} className="shrink-0 text-blue-700" />
            <p className="text-xs font-semibold">
              Your corporate onboarding approval is pending from Superadmin. Till then explore the marketplace.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalState("NONE")}>
              Close
            </Button>
            <Button
              variant="primary"
              className="bg-blue-900 hover:bg-blue-950 text-white"
              onClick={() => {
                setModalState("NONE");
                router.push("/marketplace");
              }}
            >
              Explore Marketplace
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4 Standard KPI Cards */}
      <StatCardGroup columns={4}>
        <StatCard
          label="Total Enquiries"
          value={isLoading ? "…" : items.length}
          icon={Building2}
          index={0}
          colorTheme="blue"
          badge="Corporate Desk"
          sublabel="Received submissions"
        />
        <StatCard
          label="Indicative Outlay"
          value={isLoading ? "…" : `₹${totalOutlay.toFixed(1)} Cr`}
          icon={Coins}
          index={1}
          colorTheme="amber"
          badge="Pledged Budget"
          sublabel="Aggregated outlay"
        />
        <StatCard
          label="Under Review"
          value={isLoading ? "…" : underReviewCount}
          icon={Clock}
          index={2}
          colorTheme="purple"
          badge="Active Queue"
          sublabel="Verification & assessment"
        />
        <StatCard
          label="Approved & Assigned"
          value={isLoading ? "…" : approvedAssignedCount}
          icon={CheckCircle2}
          index={3}
          colorTheme="emerald"
          badge="Empanelled"
          sublabel="Partnership alignment"
        />
      </StatCardGroup>

      {/* Main Content Register & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 md:p-5">
        {/* Filter Controls Row */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input with Clear Button */}
            <div className="relative flex-1 max-w-lg">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by company, tracking ID, sector, contact, or district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-2xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Actions / View Toggle / Reset */}
            <div className="flex items-center gap-2 flex-wrap">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs"
                  title="Reset all filters"
                >
                  <RotateCcw size={13} />
                  <span>Reset Filters</span>
                </button>
              )}
              <ViewToggle view={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* Secondary Filter Dropdowns Row */}
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
                <option value="UNDER_ASSESSMENT">Under Assessment</option>
                <option value="APPROVED">Approved</option>
                <option value="ASSIGNED">Assigned to RM</option>
                <option value="UNASSIGNED">Unassigned</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Sector Filter */}
            <div className="relative">
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer shadow-2xs pr-8"
              >
                <option value="ALL">All Sectors</option>
                {allSectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Outlay / Budget Range Filter */}
            <div className="relative">
              <select
                value={filterBudget}
                onChange={(e) => setFilterBudget(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-none transition-all cursor-pointer shadow-2xs pr-8"
              >
                <option value="ALL">All Budget Ranges</option>
                <option value="UNDER_50L">Under ₹50 Lakh (&lt; ₹0.5 Cr)</option>
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
                <option value="NAME_ASC">Sort: Company (A-Z)</option>
              </select>
              <ArrowUpDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Active Filter Chips & Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{filtered.length}</strong> of <strong className="text-slate-900">{items.length}</strong> enquiries
              </span>

              {/* Status Chip */}
              {filterStatus !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200/70">
                  Status: {filterStatus.replace(/_/g, " ")}
                  <button onClick={() => setFilterStatus("ALL")} className="hover:text-blue-950">
                    <X size={12} />
                  </button>
                </span>
              )}

              {/* Sector Chip */}
              {filterSector !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[11px] font-semibold border border-purple-200/70">
                  Sector: {filterSector}
                  <button onClick={() => setFilterSector("ALL")} className="hover:text-purple-950">
                    <X size={12} />
                  </button>
                </span>
              )}

              {/* Budget Range Chip */}
              {filterBudget !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200/70">
                  Budget: {filterBudget === "UNDER_50L" ? "< ₹50L" : filterBudget === "50L_TO_2CR" ? "₹50L - ₹2Cr" : filterBudget === "2CR_TO_10CR" ? "₹2Cr - ₹10Cr" : "> ₹10Cr"}
                  <button onClick={() => setFilterBudget("ALL")} className="hover:text-amber-950">
                    <X size={12} />
                  </button>
                </span>
              )}

              {/* District Chip */}
              {filterDistrict !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200/70">
                  District: {filterDistrict}
                  <button onClick={() => setFilterDistrict("ALL")} className="hover:text-emerald-950">
                    <X size={12} />
                  </button>
                </span>
              )}

              {/* Search Term Chip */}
              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                  Query: &quot;{search}&quot;
                  <button onClick={() => setSearch("")} className="hover:text-slate-900">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-blue-900 hover:text-blue-700 underline"
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
            <p className="text-xs font-bold">Loading Corporate Enquiries...</p>
          </div>
        ) : fetchError ? (
          <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50 text-center text-xs font-bold text-rose-800">
            Failed to load corporate enquiries register.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
            <Building2 size={36} className="text-slate-300" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700">No corporate enquiries found matching your search or filters.</p>
              <p className="text-[11px] text-slate-500">Try adjusting your filters or search keywords to find what you need.</p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-950 transition-all shadow-xs"
              >
                <RotateCcw size={13} />
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Tracking ID & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-extrabold text-blue-950 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {item.trackingId}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusBadgeStyle(item.status)}`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Company Name & Sector */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-1">
                      {item.companyName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Tag size={11} className="text-slate-400" />
                        {item.sector}
                      </span>
                      {item.preferredDistricts && item.preferredDistricts.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <MapPin size={11} className="text-slate-400" />
                          {item.preferredDistricts.slice(0, 2).join(", ")}
                          {item.preferredDistricts.length > 2 ? ` +${item.preferredDistricts.length - 2}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Budget Highlight */}
                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Indicative Outlay</span>
                      <span className="text-base font-extrabold font-mono text-slate-900">
                        {item.indicativeBudgetCr == null ? "Not specified" : `₹${item.indicativeBudgetCr.toFixed(2)} Cr`}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Submitted</span>
                      <span className="text-xs font-semibold text-slate-600 font-mono flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        {item.submittedDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <Link
                    href={`/enquiries/${item.id}`}
                    className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-slate-50 hover:bg-blue-900 hover:text-white py-2 text-xs font-bold text-blue-950 border border-slate-200 hover:border-blue-900 transition-all shadow-2xs"
                  >
                    View Application Details <ArrowUpRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Table / List View */
          <div className="w-full md:overflow-x-auto md:rounded-2xl md:border md:border-slate-200/80">
            <table className="w-full block md:table text-left text-xs font-medium text-slate-700 border-collapse">
              <thead className="hidden md:table-header-group bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">Tracking ID</th>
                  <th className="px-4 py-3">Corporate / Company</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Preferred District</th>
                  <th className="px-4 py-3">Outlay (₹ Cr)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="block md:table-row mb-4 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors overflow-hidden"
                  >
                    <td data-label="Tracking ID" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-mono font-bold text-blue-950 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-blue-950">
                        {item.trackingId}
                      </span>
                    </td>
                    <td data-label="Company" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-bold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left">
                      <div>
                        <div>{item.companyName}</div>
                        {item.contactPersonName && (
                          <div className="text-[11px] text-slate-400 font-normal hidden md:block">
                            {item.contactPersonName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Sector" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-600 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.sector}
                      </span>
                    </td>
                    <td data-label="District" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-600 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      {item.preferredDistricts && item.preferredDistricts.length > 0 ? (
                        <span className="text-slate-700 font-medium">
                          {item.preferredDistricts.join(", ")}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td data-label="Outlay (₹ Cr)" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none font-mono font-bold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      {item.indicativeBudgetCr == null ? "—" : `₹${item.indicativeBudgetCr.toFixed(2)} Cr`}
                    </td>
                    <td data-label="Status" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusBadgeStyle(item.status)}`}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td data-label="Submitted Date" className="flex md:table-cell justify-between items-center px-4 py-3 md:py-3.5 border-b border-slate-100 md:border-none text-slate-500 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden font-mono">
                      {item.submittedDate}
                    </td>
                    <td className="block md:table-cell px-4 py-3 md:py-3.5 text-right bg-slate-50/50 md:bg-transparent">
                      <Link
                        href={`/enquiries/${item.id}`}
                        className="inline-flex items-center justify-center md:justify-end gap-1 w-full md:w-auto text-xs font-bold text-blue-900 hover:text-blue-700 border border-blue-200 md:border-none bg-white md:bg-transparent rounded-lg py-2 md:py-0 transition-colors"
                      >
                        Details <ArrowUpRight size={14} />
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