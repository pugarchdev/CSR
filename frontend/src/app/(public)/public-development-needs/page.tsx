"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { ViewToggle } from "@/components/ui/ViewToggle";
import RequirementDetailsModal from "@/components/marketplace/RequirementDetailsModal";
import { useAuthStore } from "@/store/authStore";
import {
  HeartHandshake, MapPin, Search, Filter, Loader2, Eye, CheckCircle2,
  X, LogIn, UserPlus, Lock, Building2, Coins, ArrowRight, ImageIcon, FileCheck2, ShieldCheck, RefreshCcw,
  ShieldAlert, AlertCircle
} from "lucide-react";

const money = (value: unknown) => {
  const amount = Number(value || 0);
  if (!amount) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

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

export default function PublicDevelopmentNeedsPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needs, setNeeds] = useState<any[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingNeed, setViewingNeed] = useState<any | null>(null);
  const [selectedNeed, setSelectedNeed] = useState<any | null>(null);
  const [loginRequiredNeed, setLoginRequiredNeed] = useState<any | null>(null);
  const [unverifiedOrgNeed, setUnverifiedOrgNeed] = useState<any | null>(null);
  const [interestError, setInterestError] = useState("");
  const [expressingInterest, setExpressingInterest] = useState<string | null>(null);
  const [viewMode, setViewMode] = useResponsiveViewMode();

  const [interestForm, setInterestForm] = useState({
    companyName: "",
    mca21Cin: "",
    contactPersonName: "",
    contactPersonDesignation: "",
    mobile: "",
    email: "",
    indicativeBudget: "",
    preferredStartTimeline: "THIS_QUARTER",
    implementationMode: "SELF",
    messageToGovernment: "",
    declarationAccepted: false,
  });
  const [interestResult, setInterestResult] = useState("");
  const [isAuthenticatedCorporate, setIsAuthenticatedCorporate] = useState(false);
  const [submittedNeedIds, setSubmittedNeedIds] = useState<string[]>([]);

  const fetchNeeds = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch from public requirements endpoint for maximum resilience and data richness
      const res = await fetch(`${API_BASE_URL}/public/requirements`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load public development needs");
      const rawData = body.data ?? body;
      const list = Array.isArray(rawData) ? rawData : rawData.requirements || rawData.items || rawData.pitches || [];
      setNeeds(list);
    } catch (err: any) {
      // Fallback to government pitches endpoint
      try {
        const fallbackRes = await fetch(`${API_BASE_URL}/government-pitches/public`, { cache: "no-store" });
        const fallbackBody = await fallbackRes.json();
        const fallbackList = Array.isArray(fallbackBody) ? fallbackBody : fallbackBody.data || fallbackBody.pitches || [];
        setNeeds(fallbackList);
      } catch (fallbackErr: any) {
        setError(err.message || "Failed to load public development needs");
        setNeeds([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNeeds();

    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("submittedInterestNeedIds") || "[]");
        if (Array.isArray(stored)) setSubmittedNeedIds(stored);
      } catch (e) {
        console.error("Error parsing submitted interests", e);
      }

      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData.organization?.kind === "CSR_COMPANY" || ["COMPANY_ADMIN", "COMPANY_MEMBER", "CORPORATE_USER", "CORPORATE_PARTNER", "CSR_ADMIN"].includes(userData.role)) {
            setIsAuthenticatedCorporate(true);
            setInterestForm((prev) => ({
              ...prev,
              companyName: userData.organization?.name || userData.companyName || userData.name || "",
              mca21Cin: userData.organization?.cin || userData.company?.cin || userData.cin || "",
              email: userData.email || "",
              contactPersonName: userData.contactPersonName || userData.name || prev.contactPersonName,
              mobile: userData.mobile || prev.mobile,
            }));
          }
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }
    }
  }, [fetchNeeds]);

  const districts = useMemo(() => {
    const set = new Set<string>();
    needs.forEach((item) => {
      if (Array.isArray(item.districts)) item.districts.forEach((d: string) => d && set.add(d));
      if (item.district) set.add(item.district);
    });
    return Array.from(set).sort();
  }, [needs]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    needs.forEach((item) => {
      const s = item.sector || item.focusArea || item.category;
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [needs]);

  const filteredNeeds = useMemo(() => {
    return needs.filter((need) => {
      const query = searchTerm.toLowerCase();
      const text = JSON.stringify(need).toLowerCase();
      const matchesSearch = !query || text.includes(query);

      const itemDistricts = Array.isArray(need.districts) && need.districts.length ? need.districts : [need.district].filter(Boolean);
      const matchesDistrict = selectedDistrict === "All Districts" || itemDistricts.includes(selectedDistrict);

      const itemSector = need.sector || need.focusArea || need.category || "";
      const matchesSector = selectedSector === "All Sectors" || itemSector === selectedSector;

      return matchesSearch && matchesDistrict && matchesSector;
    });
  }, [needs, searchTerm, selectedDistrict, selectedSector]);

  const totalEstimatedOutlay = useMemo(() => {
    return needs.reduce((acc, curr) => acc + Number(curr.approvedBudget || curr.budgetRequested || curr.estimatedCost || curr.budget || 0), 0);
  }, [needs]);

  const openInterestDialog = (need: any) => {
    if (!isAuthenticatedCorporate) {
      setLoginRequiredNeed(need);
      return;
    }

    const currentUser = user || (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null);
    const org = currentUser?.organization;
    const orgStatus = org?.status || (currentUser as any)?.orgStatus || (currentUser as any)?.organizationStatus;

    if (org && orgStatus && orgStatus !== "ACTIVE") {
      setUnverifiedOrgNeed(need);
      return;
    }

    setSelectedNeed(need);
    setInterestResult("");
    setInterestError("");
  };

  const handleExpressInterest = async () => {
    if (!selectedNeed) return;
    setInterestError("");
    try {
      setExpressingInterest(selectedNeed.id);
      const budgetVal = Number(interestForm.indicativeBudget || selectedNeed.approvedBudget || selectedNeed.estimatedCost || 0);
      const response = await apiFetch<any>(`/government-pitches/public/${selectedNeed.id}/interests`, {
        method: "POST",
        body: JSON.stringify({
          ...interestForm,
          indicativeBudget: budgetVal,
          declarationAccepted: true
        }),
      });
      setInterestResult(response.interestTrackingId ?? response.id ?? "Submitted");
      setSubmittedNeedIds((prev) => {
        const next = prev.includes(selectedNeed.id) ? prev : [...prev, selectedNeed.id];
        localStorage.setItem("submittedInterestNeedIds", JSON.stringify(next));
        return next;
      });
      fetchNeeds();
    } catch (err: any) {
      const errMsg = err?.message || "Failed to express corporate interest.";
      if (
        errMsg.toLowerCase().includes("not verified") ||
        errMsg.toLowerCase().includes("unverified") ||
        errMsg.toLowerCase().includes("under verification") ||
        errMsg.toLowerCase().includes("onboarding") ||
        err?.status === 403
      ) {
        setSelectedNeed(null);
        setUnverifiedOrgNeed(selectedNeed);
      } else {
        setInterestError(errMsg);
      }
    } finally {
      setExpressingInterest(null);
    }
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
              <span className="text-blue-600 font-extrabold">Opportunities Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Public Development Needs (Live)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Official Government of Maharashtra departmental proposals reviewed for feasibility, verified under MCA Schedule VII, and sanctioned by the Joint Secretary for corporate CSR funding.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Government of Maharashtra</span>
            </span>
          </div>
        </div>

        {/* 4 Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Live Pitches</span>
              <HeartHandshake size={16} className="text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{needs.length}</p>
            <p className="text-[11px] text-slate-500 font-medium">JS Approved &amp; Published</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Approved Outlay</span>
              <Coins size={16} className="text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-900">{money(totalEstimatedOutlay)}</p>
            <p className="text-[11px] text-slate-500 font-medium">Total CSR Capital Required</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Districts</span>
              <MapPin size={16} className="text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {districts.length || (needs.length ? 1 : 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Districts with Active Needs</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Focus Sectors</span>
              <Building2 size={16} className="text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {sectors.length || (needs.length ? 1 : 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Development Themes</p>
          </div>
        </div>

        {/* Compact Single-Row Filter Toolbar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by need title, tracking ID, department, or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* District Filter */}
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer shadow-2xs"
              >
                <option value="All Districts">All Districts ({districts.length})</option>
                {districts.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>

              {/* Sector Filter */}
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer shadow-2xs"
              >
                <option value="All Sectors">All Sectors ({sectors.length})</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>

              <div className="shrink-0">
                <ViewToggle view={viewMode} onChange={setViewMode} />
              </div>

              {(searchTerm || selectedDistrict !== "All Districts" || selectedSector !== "All Sectors") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedDistrict("All Districts");
                    setSelectedSector("All Sectors");
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
            <div>
              Showing <strong className="text-slate-900">{filteredNeeds.length}</strong> of <strong className="text-slate-900">{needs.length}</strong> published needs
            </div>
            <div className="flex items-center gap-1.5 text-blue-700 font-bold">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Government Verified &amp; Ready for CSR Allocation</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="text-xs font-bold text-slate-600">Loading Live Published Pitches...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-xs font-bold text-rose-800 space-y-3">
            <p>{error}</p>
            <button
              onClick={fetchNeeds}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <RefreshCcw size={13} /> Retry
            </button>
          </div>
        ) : filteredNeeds.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-12 text-center shadow-xs space-y-2">
            <HeartHandshake className="mx-auto text-slate-300 mb-2" size={44} />
            <h3 className="text-sm font-extrabold text-slate-800">No Development Needs Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              There are currently no published development needs matching your search query or filter selection.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* ========================================================================= */
          /* GRID VIEW LAYOUT                                                          */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNeeds.map((item, idx) => {
              const itemSector = item.sector || item.focusArea || item.category || "Development";
              const sectorStyle = getSectorBadgeStyle(itemSector);
              const districtNames = Array.isArray(item.districts) && item.districts.length ? item.districts.join(", ") : (item.district || "Maharashtra");
              const deptName = item.organization?.name || item.department?.name || item.department || item.officeName || "Government Department";
              const reqCode = item.trackingId || item.projectCode || item.pitchReferenceId || `GP-MH-2026-${String(idx + 1).padStart(6, "0")}`;
              const title = item.title || item.csrRequirement || "Published Development Requirement";
              const desc = item.description || item.csrRequirement || "Open this opportunity to review its verified scope and supporting details.";
              const budgetVal = item.approvedBudget || item.budgetRequested || item.estimatedCost || item.budget || 0;
              const hasPhotos = Array.isArray(item.geoTaggedPhotos) && item.geoTaggedPhotos.length > 0;
              const hasHodDoc = Boolean(item.hodCertificationDocument);
              const isInterestSubmitted = submittedNeedIds.includes(item.id);

              return (
                <motion.article
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className="group flex flex-col h-full rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden justify-between"
                >
                  {/* Top Line */}
                  <div>
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
                    <div className="my-3 space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setViewingNeed(item)}
                        className="text-left w-full group-hover:text-blue-600 transition-colors"
                      >
                        <h2 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2 break-words">
                          {title}
                        </h2>
                      </button>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 break-words font-medium">
                        {desc}
                      </p>

                      <div className="space-y-1.5 pt-1 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{districtNames}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{deptName}</span>
                        </div>

                        {(hasPhotos || hasHodDoc) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
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
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Area: 2-Column Metrics + Actions */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50/80 p-2.5 border border-slate-100">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Requested Outlay</p>
                        <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {money(budgetVal)}
                        </p>
                      </div>
                      <div className="border-l border-slate-200/80 pl-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Beneficiaries</p>
                        <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {Number(item.beneficiaryCount || 2500).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingNeed(item)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye size={13} className="text-slate-500" />
                        <span>Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openInterestDialog(item)}
                        disabled={isInterestSubmitted}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all shadow-xs ${
                          isInterestSubmitted
                            ? "bg-slate-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                        }`}
                      >
                        <HeartHandshake size={13} />
                        <span>{isInterestSubmitted ? "Interest Sent" : "Express Interest"}</span>
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* LIST VIEW LAYOUT                                                          */
          /* ========================================================================= */
          <div className="flex flex-col gap-3.5">
            {filteredNeeds.map((item, idx) => {
              const itemSector = item.sector || item.focusArea || item.category || "Development";
              const sectorStyle = getSectorBadgeStyle(itemSector);
              const districtNames = Array.isArray(item.districts) && item.districts.length ? item.districts.join(", ") : (item.district || "Maharashtra");
              const deptName = item.organization?.name || item.department?.name || item.department || item.officeName || "Government Department";
              const reqCode = item.trackingId || item.projectCode || item.pitchReferenceId || `GP-MH-2026-${String(idx + 1).padStart(6, "0")}`;
              const title = item.title || item.csrRequirement || "Published Development Requirement";
              const desc = item.description || item.csrRequirement || "Open this opportunity to review its verified scope and supporting details.";
              const budgetVal = item.approvedBudget || item.budgetRequested || item.estimatedCost || item.budget || 0;
              const hasPhotos = Array.isArray(item.geoTaggedPhotos) && item.geoTaggedPhotos.length > 0;
              const hasHodDoc = Boolean(item.hodCertificationDocument);
              const isInterestSubmitted = submittedNeedIds.includes(item.id);

              return (
                <article
                  key={item.id || idx}
                  className="group rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left & Middle: Content & Metadata */}
                    <div className="flex-1 space-y-2 min-w-0">
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

                      <button
                        type="button"
                        onClick={() => setViewingNeed(item)}
                        className="text-left w-full group-hover:text-blue-600 transition-colors"
                      >
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug break-words">
                          {title}
                        </h2>
                      </button>

                      <p className="text-xs text-slate-500 leading-relaxed font-medium break-words line-clamp-2">
                        {desc}
                      </p>

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

                    {/* Right Column: Outlay & Actions */}
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
                            {Number(item.beneficiaryCount || 2500).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setViewingNeed(item)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openInterestDialog(item)}
                          disabled={isInterestSubmitted}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-xs ${
                            isInterestSubmitted
                              ? "bg-slate-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                          }`}
                        >
                          <HeartHandshake size={13} />
                          <span>{isInterestSubmitted ? "Sent" : "Express Interest"}</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Full Requirement Details Modal */}
        {viewingNeed && (
          <RequirementDetailsModal
            item={viewingNeed}
            onClose={() => setViewingNeed(null)}
          />
        )}

        {/* Corporate Login Required Modal */}
        {loginRequiredNeed && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
                <Lock size={26} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Corporate Login Required
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  To submit a corporate expression of interest for this development pitch, please log in with your verified Corporate CSR account.
                </p>
              </div>

              {/* Pitch Summary Box */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-left space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    {loginRequiredNeed.trackingId || loginRequiredNeed.pitchReferenceId || "GP-PITCH"}
                  </span>
                  <span className="font-extrabold text-slate-900">{money(loginRequiredNeed.approvedBudget || loginRequiredNeed.estimatedCost)}</span>
                </div>
                <p className="font-extrabold text-slate-900 line-clamp-1">{loginRequiredNeed.title}</p>
                <p className="text-[11px] text-slate-500 font-medium">{loginRequiredNeed.department} · {loginRequiredNeed.district}</p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/login?next=${encodeURIComponent("/public-development-needs")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 transition-all no-underline"
                >
                  <LogIn size={15} /> Login to Express Interest
                </Link>
                
                <Link
                  href="/organization/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all no-underline"
                >
                  <UserPlus size={15} className="text-blue-600" /> Register Corporate Account
                </Link>

                <button
                  onClick={() => setLoginRequiredNeed(null)}
                  className="mt-1 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Cancel &amp; Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Organization Under Verification Modal */}
        {unverifiedOrgNeed && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 border border-amber-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Organization Verification Pending</h3>
                    <p className="text-xs text-slate-500 font-medium">State CSR Cell Approval Required</p>
                  </div>
                </div>
                <button
                  onClick={() => setUnverifiedOrgNeed(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2 text-xs text-amber-950">
                <p className="font-extrabold text-sm text-amber-900 flex items-center gap-1.5">
                  <Building2 size={16} className="text-amber-800 shrink-0" />
                  {interestForm.companyName || user?.organization?.name || "Your Organization"}
                </p>
                <p className="leading-relaxed text-amber-900/90 font-medium">
                  Your organization account is currently <strong>under verification by the State CSR Cell</strong>.
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  As per Government of Maharashtra CSR regulations, corporate entities must complete onboarding verification before expressing binding interest or funding public pitches.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setUnverifiedOrgNeed(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Close &amp; Dismiss
                </button>
                <Link
                  href="/organization/onboarding/status"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-extrabold text-white hover:bg-blue-700 transition-all shadow-xs"
                >
                  Check Onboarding Status <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Express Interest Modal (For Authenticated Corporate Users) */}
        {selectedNeed && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Express Corporate CSR Interest</h2>
                  <p className="text-xs text-slate-500 font-medium">Pitch ID: {selectedNeed.trackingId || selectedNeed.pitchReferenceId} — {selectedNeed.title}</p>
                </div>
                <button onClick={() => setSelectedNeed(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              {interestError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{interestError}</span>
                </div>
              )}

              {interestResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                  <h3 className="text-base font-extrabold text-emerald-950">Expression of Interest Submitted</h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    Your interest has been recorded in the Maharashtra CSR Setu engine. Your tracking reference is <strong className="font-mono">{interestResult}</strong>.
                  </p>
                  <button
                    onClick={() => setSelectedNeed(null)}
                    className="inline-flex items-center gap-1 px-5 py-2 rounded-xl bg-emerald-800 text-xs font-extrabold text-white hover:bg-emerald-900 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {/* Verified Corporate Linkage Banner */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 flex items-start gap-2.5">
                    <Building2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-950 leading-relaxed font-medium">
                      This submission will be auto-linked with your verified corporate profile (<strong>CIN: {interestForm.mca21Cin || "On Record"}</strong>). Your assigned CSR Relationship Manager will review MCA Schedule VII eligibility, budget adequacy, and contact you for MoU coordination.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Company Name</label>
                      <input
                        type="text"
                        value={interestForm.companyName}
                        onChange={(e) => setInterestForm({ ...interestForm, companyName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600 bg-slate-50 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">MCA21 CIN</label>
                      <input
                        type="text"
                        value={interestForm.mca21Cin}
                        onChange={(e) => setInterestForm({ ...interestForm, mca21Cin: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600 bg-slate-50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={interestForm.contactPersonName}
                        onChange={(e) => setInterestForm({ ...interestForm, contactPersonName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Indicative Budget (₹)</label>
                      <input
                        type="number"
                        placeholder={`e.g. ${selectedNeed.approvedBudget || selectedNeed.estimatedCost}`}
                        value={interestForm.indicativeBudget}
                        onChange={(e) => setInterestForm({ ...interestForm, indicativeBudget: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600 font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Official Email</label>
                      <input
                        type="email"
                        value={interestForm.email || ""}
                        onChange={(e) => setInterestForm({ ...interestForm, email: e.target.value })}
                        placeholder="csr.lead@company.com"
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={interestForm.mobile || ""}
                        onChange={(e) => setInterestForm({ ...interestForm, mobile: e.target.value })}
                        placeholder="10-digit mobile"
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Implementation Remarks / Preference (Optional)</label>
                    <textarea
                      rows={2}
                      value={(interestForm as any).remarks || ""}
                      onChange={(e) => setInterestForm({ ...interestForm, remarks: e.target.value } as any)}
                      placeholder="e.g. CSR Committee pre-approved; targeted for Q3 deployment; preference for direct execution via Zilla Parishad..."
                      className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setSelectedNeed(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExpressInterest}
                      disabled={expressingInterest === selectedNeed.id}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-extrabold text-white transition-all disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      {expressingInterest === selectedNeed.id ? <Loader2 size={14} className="animate-spin" /> : <HeartHandshake size={14} />}
                      Submit Interest
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </GovPortalLayout>
  );
}
