"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { ViewToggle } from "@/components/ui/ViewToggle";
import {
  HeartHandshake, MapPin, Search, Filter, Loader2, Eye, CheckCircle2,
  X, LogIn, UserPlus, Lock
} from "lucide-react";

interface DevelopmentNeed {
  id: string;
  trackingId: string;
  title: string;
  district: string;
  taluka: string;
  village?: string;
  csrRequirement: string;
  estimatedCost: number;
  department: string;
  officeName: string;
  publishedAt: string;
  interestedCompaniesCount: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DISTRICTS = [
  "All Districts",
  "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana",
  "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna",
  "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded",
  "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad",
  "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha",
  "Washim", "Yavatmal"
];

const ITEMS_PER_PAGE = 12;

export default function PublicDevelopmentNeedsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needs, setNeeds] = useState<DevelopmentNeed[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 0,
  });
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [searchTerm, setSearchTerm] = useState("");
  const [expressingInterest, setExpressingInterest] = useState<string | null>(null);
  const [selectedNeed, setSelectedNeed] = useState<DevelopmentNeed | null>(null);
  const [viewingNeed, setViewingNeed] = useState<DevelopmentNeed | null>(null);
  const [loginRequiredNeed, setLoginRequiredNeed] = useState<DevelopmentNeed | null>(null);
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

  const fetchNeeds = async (page: number = 1, district: string = "All Districts") => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (district !== "All Districts") {
        params.append("district", district);
      }

      const response = await apiFetch<any>(`/government-pitches/public?${params}`);

      const rawNeeds = Array.isArray(response)
        ? response
        : Array.isArray(response?.needs)
        ? response.needs
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.pitches)
        ? response.pitches
        : [];

      setNeeds(
        rawNeeds.map((need: any) => ({
          id: need.id,
          trackingId: need.trackingId ?? need.pitchReferenceId ?? `GP-${need.id.slice(0, 6)}`,
          title: need.title || need.projectName || "Government Development Proposal",
          district: Array.isArray(need.districts) && need.districts.length > 0 ? need.districts.join(", ") : (need.district || "Maharashtra"),
          taluka: Array.isArray(need.talukas) && need.talukas.length > 0 ? need.talukas.join(", ") : (need.taluka || "—"),
          village: need.exactLocation || need.village || undefined,
          csrRequirement: need.csrRequirement || "Government pitch requirement",
          estimatedCost: Number(need.estimatedCost ?? need.budget ?? 0),
          department: need.department || "Government Department",
          officeName: need.officeName || need.department || "Department Office",
          publishedAt: need.publishedAt ?? need.createdAt,
          interestedCompaniesCount: need.interestedCompaniesCount ?? need._count?.interests ?? 0,
        }))
      );
      setPagination(
        response.pagination ?? {
          page,
          limit: ITEMS_PER_PAGE,
          total: rawNeeds.length,
          totalPages: rawNeeds.length > 0 ? 1 : 0,
        }
      );
    } catch (err: any) {
      setError(err.message || "Failed to load public development needs");
      setNeeds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeeds(1, selectedDistrict);

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
          if (userData.organization?.kind === "CSR_COMPANY" || ["COMPANY_ADMIN", "COMPANY_MEMBER", "CORPORATE_USER", "CORPORATE_PARTNER"].includes(userData.role)) {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    fetchNeeds(1, district);
  };

  const openInterestDialog = (need: DevelopmentNeed) => {
    if (!isAuthenticatedCorporate) {
      setLoginRequiredNeed(need);
      return;
    }
    setSelectedNeed(need);
    setInterestResult("");
  };

  const handleExpressInterest = async () => {
    if (!selectedNeed) return;
    try {
      setExpressingInterest(selectedNeed.id);
      const response = await apiFetch<any>(`/government-pitches/public/${selectedNeed.id}/interests`, {
        method: "POST",
        body: JSON.stringify({
          ...interestForm,
          indicativeBudget: Number(interestForm.indicativeBudget || selectedNeed.estimatedCost),
          declarationAccepted: true
        }),
      });
      setInterestResult(response.interestTrackingId ?? response.id ?? "Submitted");
      setSubmittedNeedIds((prev) => {
        const next = prev.includes(selectedNeed.id) ? prev : [...prev, selectedNeed.id];
        localStorage.setItem("submittedInterestNeedIds", JSON.stringify(next));
        return next;
      });
      fetchNeeds(pagination.page, selectedDistrict);
    } catch (err: any) {
      alert(err.message || "Failed to express corporate interest. Please check budget details.");
    } finally {
      setExpressingInterest(null);
    }
  };

  const filteredNeeds = needs.filter((need) => {
    const query = searchTerm.toLowerCase();
    return (
      need.title.toLowerCase().includes(query) ||
      need.trackingId.toLowerCase().includes(query) ||
      need.department.toLowerCase().includes(query) ||
      need.district.toLowerCase().includes(query) ||
      need.csrRequirement.toLowerCase().includes(query)
    );
  });

  const totalEstimatedOutlay = needs.reduce((acc, curr) => acc + curr.estimatedCost, 0);

  const formatCurrency = (amount: number): string => {
    if (!amount) return "₹0.00";
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakhs`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-screen-2xl flex-col gap-4 px-4 py-4 md:px-6">
        
        {/* Compact Light Portal Header */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold text-blue-950 bg-blue-100/80 px-2.5 py-0.5 rounded-md border border-blue-200">
                  <HeartHandshake size={13} className="text-blue-700" /> STATE CSR MARKETPLACE
                </span>
                <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                  LIVE MARKETPLACE
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Public Development Needs (Live)
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Official Maharashtra departmental proposals sanctioned by Joint Secretary & open for corporate CSR funding.
              </p>
            </div>

            {/* Compact Header Metrics Strip */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Pitches</span>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5">{needs.length} Published</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outlay</span>
                <p className="text-xs font-extrabold text-blue-950 mt-0.5">{formatCurrency(totalEstimatedOutlay)}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-center shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coverage</span>
                <p className="text-xs font-extrabold text-emerald-800 mt-0.5">36 Districts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search title, tracking ID, department, or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {/* Filter Dropdown & View Mode */}
            <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-slate-400" />
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                >
                  {DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>

              <ViewToggle view={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-blue-900" size={32} />
              <span className="text-xs font-bold text-slate-600">Loading Live Published Pitches from Database...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-xs font-bold text-rose-800">
            {error}
          </div>
        ) : filteredNeeds.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <HeartHandshake className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-base font-bold text-slate-800">No Development Needs Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {selectedDistrict !== "All Districts"
                ? `No published development needs found in ${selectedDistrict}. Try selecting a different district.`
                : "There are currently no published development needs matching your search query."}
            </p>
            {selectedDistrict !== "All Districts" && (
              <button
                onClick={() => handleDistrictChange("All Districts")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-950 transition-all"
              >
                Reset District Filter
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNeeds.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="group relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/20 p-4 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md">
                      {item.trackingId}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      LIVE MARKETPLACE
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-extrabold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">{item.department}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin size={13} className="text-blue-600" /> District: {item.district}
                  </p>
                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-3 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-slate-100">
                    {item.csrRequirement}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Outlay</span>
                      <p className="text-sm font-extrabold text-blue-950 font-heading">{formatCurrency(item.estimatedCost)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Corporate Interest</span>
                      <p className="text-xs font-bold text-emerald-700">{item.interestedCompaniesCount} Companies</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingNeed(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Eye size={14} className="text-slate-500" /> Details
                    </button>
                    <button
                      onClick={() => openInterestDialog(item)}
                      disabled={submittedNeedIds.includes(item.id)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-white transition-all shadow-xs ${
                        submittedNeedIds.includes(item.id)
                          ? "bg-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 cursor-pointer"
                      }`}
                    >
                      <HeartHandshake size={14} />
                      {submittedNeedIds.includes(item.id) ? "Interest Sent" : "Express Interest"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List View Table Layout */
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left font-bold text-slate-700">
                  <th className="p-3">Ref ID</th>
                  <th className="p-3">Title & Department</th>
                  <th className="p-3">District</th>
                  <th className="p-3">Estimated Outlay</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNeeds.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-purple-900">
                      <span className="bg-purple-100 px-2.5 py-0.5 rounded-md text-xs">{item.trackingId}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900 line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{item.department}</div>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-blue-600" />
                        {item.district}
                      </span>
                    </td>
                    <td className="p-3 font-extrabold text-blue-950 font-heading">
                      {formatCurrency(item.estimatedCost)}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        LIVE MARKETPLACE
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingNeed(item)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => openInterestDialog(item)}
                          disabled={submittedNeedIds.includes(item.id)}
                          className={`inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-lg text-white transition-colors ${
                            submittedNeedIds.includes(item.id)
                              ? "bg-slate-400 cursor-not-allowed"
                              : "bg-blue-900 hover:bg-blue-950 cursor-pointer"
                          }`}
                        >
                          <HeartHandshake size={13} />
                          {submittedNeedIds.includes(item.id) ? "Sent" : "Interest"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Corporate Login Required Modal */}
        {loginRequiredNeed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100/80 text-blue-900 border border-blue-200">
                <Lock size={26} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Corporate Login Required
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  To submit a corporate expression of interest for this development pitch, please log in with your verified Corporate CSR account.
                </p>
              </div>

              {/* Pitch Summary Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-100 px-2 py-0.5 rounded">
                    {loginRequiredNeed.trackingId}
                  </span>
                  <span className="font-extrabold text-blue-950">{formatCurrency(loginRequiredNeed.estimatedCost)}</span>
                </div>
                <p className="font-extrabold text-slate-900 line-clamp-1">{loginRequiredNeed.title}</p>
                <p className="text-[11px] text-slate-500 font-medium">{loginRequiredNeed.department} · {loginRequiredNeed.district}</p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/login?next=${encodeURIComponent("/public-development-needs")}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all no-underline"
                >
                  <LogIn size={15} /> Login to Express Interest
                </Link>
                
                <Link
                  href="/organization/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-extrabold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all no-underline"
                >
                  <UserPlus size={15} className="text-blue-900" /> Register Corporate Account
                </Link>

                <button
                  onClick={() => setLoginRequiredNeed(null)}
                  className="mt-1 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel & Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {viewingNeed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md">
                    {viewingNeed.trackingId}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-1">{viewingNeed.title}</h2>
                </div>
                <button onClick={() => setViewingNeed(null)} className="text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Department</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{viewingNeed.department}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">District / Taluka</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{viewingNeed.district} ({viewingNeed.taluka})</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Estimated CSR Outlay</span>
                  <p className="font-extrabold text-blue-900 text-sm mt-0.5">{formatCurrency(viewingNeed.estimatedCost)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Office Name</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{viewingNeed.officeName}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">CSR Requirement Scope</span>
                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {viewingNeed.csrRequirement}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setViewingNeed(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const n = viewingNeed;
                    setViewingNeed(null);
                    openInterestDialog(n);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-900 text-xs font-extrabold text-white hover:bg-blue-950"
                >
                  Express Corporate Interest
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Express Interest Modal (For Authenticated Corporate Users) */}
        {selectedNeed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Express Corporate CSR Interest</h2>
                  <p className="text-xs text-slate-500 font-medium">Pitch ID: {selectedNeed.trackingId} — {selectedNeed.title}</p>
                </div>
                <button onClick={() => setSelectedNeed(null)} className="text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>

              {interestResult ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                  <h3 className="text-base font-extrabold text-emerald-950">Expression of Interest Submitted</h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    Your interest has been recorded in the Maharashtra CSR Setu engine. Your tracking reference is <strong className="font-mono">{interestResult}</strong>.
                  </p>
                  <button
                    onClick={() => setSelectedNeed(null)}
                    className="inline-flex items-center gap-1 px-5 py-2 rounded-xl bg-emerald-800 text-xs font-extrabold text-white hover:bg-emerald-900"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Company Name</label>
                      <input
                        type="text"
                        value={interestForm.companyName}
                        onChange={(e) => setInterestForm({ ...interestForm, companyName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">MCA21 CIN</label>
                      <input
                        type="text"
                        value={interestForm.mca21Cin}
                        onChange={(e) => setInterestForm({ ...interestForm, mca21Cin: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={interestForm.contactPersonName}
                        onChange={(e) => setInterestForm({ ...interestForm, contactPersonName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Indicative Budget (₹)</label>
                      <input
                        type="number"
                        placeholder={`e.g. ${selectedNeed.estimatedCost}`}
                        value={interestForm.indicativeBudget}
                        onChange={(e) => setInterestForm({ ...interestForm, indicativeBudget: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setSelectedNeed(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExpressInterest}
                      disabled={expressingInterest === selectedNeed.id}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-900 text-xs font-extrabold text-white hover:bg-blue-950 disabled:opacity-60"
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
