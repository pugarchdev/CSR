"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import GovSelect from "@/components/gov/GovSelect";
import GovButton from "@/components/gov/GovButton";
import GovInput from "@/components/gov/GovInput";
import GovTextarea from "@/components/gov/GovTextarea";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import OtpVerification from "@/components/OtpVerification";
import { ListFilter, MapPin, ChevronLeft, ChevronRight, Loader2, HeartHandshake } from "lucide-react";

interface DevelopmentNeed {
  id: string;
  trackingId: string;
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
  const router = useRouter();
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
  const [expressingInterest, setExpressingInterest] = useState<string | null>(null);
  const [selectedNeed, setSelectedNeed] = useState<DevelopmentNeed | null>(null);
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
  const [interestTokens, setInterestTokens] = useState({ mobile: "", email: "" });
  const [interestResult, setInterestResult] = useState("");
  const [isAuthenticatedCorporate, setIsAuthenticatedCorporate] = useState(false);

  const fetchNeeds = async (page: number = 1, district: string = "All Districts") => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        status: "PUBLISHED",
      });

      if (district !== "All Districts") {
        params.append("district", district);
      }

      const response = await apiFetch<any>(`/government-pitches/public?${params}`);

      const rawNeeds = response.needs ?? response.data ?? [];
      setNeeds(rawNeeds.map((need: any) => ({
        id: need.id,
        trackingId: need.trackingId ?? need.pitchReferenceId,
        district: need.district,
        taluka: need.taluka,
        village: need.exactLocation,
        csrRequirement: need.csrRequirement,
        estimatedCost: Number(need.estimatedCost ?? 0),
        department: need.department,
        officeName: need.officeName,
        publishedAt: need.publishedAt ?? need.createdAt,
        interestedCompaniesCount: need.interestedCompaniesCount ?? need._count?.interests ?? 0,
      })));
      setPagination(response.pagination ?? {
        page,
        limit: ITEMS_PER_PAGE,
        total: rawNeeds.length,
        totalPages: rawNeeds.length > 0 ? 1 : 0,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load public development needs");
      setNeeds([]);
      setPagination({
        page: 1,
        limit: ITEMS_PER_PAGE,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeeds(1, selectedDistrict);

    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (["COMPANY_ADMIN", "COMPANY_MEMBER", "CORPORATE_USER", "CORPORATE_PARTNER"].includes(userData.role)) {
            setIsAuthenticatedCorporate(true);
            const name = userData.organization?.name || userData.companyName || userData.name || "";
            const cin = userData.organization?.cin || userData.company?.cin || userData.cin || "";
            const email = userData.email || "";
            
            setInterestForm((prev) => ({
              ...prev,
              companyName: name,
              mca21Cin: cin,
              email: email,
              contactPersonName: userData.contactPersonName || userData.name || prev.contactPersonName,
              mobile: userData.mobile || prev.mobile,
            }));
            setInterestTokens({ mobile: "authenticated", email: "authenticated" });
          }
        } catch (e) {
          console.error("Error parsing user data", e);
        }
      }
    }
  }, []);

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    fetchNeeds(1, district);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchNeeds(page, selectedDistrict);
    }
  };

  const handleExpressInterest = async () => {
    if (!selectedNeed) return;
    const messageWordCount = interestForm.messageToGovernment.trim().split(/\s+/).filter(Boolean).length;
    if (messageWordCount > 100) {
      alert(`Message to Government is optional, max 100 words. Current: ${messageWordCount} words.`);
      return;
    }
    try {
      setExpressingInterest(selectedNeed.id);
      const response = await apiFetch<any>(`/government-pitches/public/${selectedNeed.id}/interests`, {
        method: "POST",
        body: JSON.stringify({
          ...interestForm,
          indicativeBudget: Number(interestForm.indicativeBudget),
          mobileVerificationToken: interestTokens.mobile,
          emailVerificationToken: interestTokens.email,
        }),
      });
      setInterestResult(response.interest?.interestTrackingId ?? response.data?.interest?.interestTrackingId ?? "Submitted");
      fetchNeeds(pagination.page, selectedDistrict);
    } catch (err: any) {
      alert(err.message || "Failed to express interest. Please try again.");
    } finally {
      setExpressingInterest(null);
    }
  };

  const truncateText = (text: string, maxWords: number): string => {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isInterestSubmitDisabled =
    !selectedNeed ||
    expressingInterest === selectedNeed.id ||
    !interestTokens.mobile ||
    !interestTokens.email ||
    !interestForm.companyName ||
    !interestForm.mca21Cin ||
    !interestForm.contactPersonName ||
    !interestForm.contactPersonDesignation ||
    !interestForm.indicativeBudget ||
    !interestForm.declarationAccepted;

  return (
    <GovPortalLayout>
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">
            Home / Public Development Needs (Live)
          </div>
          <h1 className="gov-page-title flex items-center gap-3">
            <HeartHandshake size={28} className="text-[#d97706]" />
            Public Development Needs (Live)
          </h1>
          <p className="gov-page-description">
            Government pitches approved and made public — open for any corporate to fund.
          </p>
        </div>

        {/* Filters */}
        <GovCard className="mb-6">
          <GovCardBody>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2 text-[#12325a] font-bold">
                <ListFilter size={18} />
                <span>Filter by District:</span>
              </div>
              <GovSelect
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full sm:w-64"
              >
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </GovSelect>
              <div className="text-sm text-slate-500 ml-auto">
                Showing {needs.length} of {pagination.total} needs
              </div>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Error */}
        {error && (
          <GovAlert variant="danger" className="mb-6">
            {error}
          </GovAlert>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={40} className="animate-spin text-[#12325a]" />
          </div>
        )}

        {/* Grid */}
        {!loading && needs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {needs.map((need) => (
                <GovCard key={need.id} className="flex flex-col">
                  <GovCardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <GovCardTitle className="text-base flex items-center gap-2">
                          <MapPin size={16} className="text-[#d97706]" />
                          {need.district}
                        </GovCardTitle>
                        <p className="text-xs text-slate-500 mt-1">
                          {need.taluka}
                          {need.village && `, ${need.village}`}
                        </p>
                      </div>
                      <GovStatusBadge variant="success">Open</GovStatusBadge>
                    </div>
                  </GovCardHeader>
                  <GovCardBody className="flex-1 flex flex-col">
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-1">Department</p>
                      <p className="text-sm font-medium">{need.department}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-1">Office</p>
                      <p className="text-sm">{need.officeName}</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-1">Requirement</p>
                      <p className="text-sm text-slate-700 line-clamp-3">
                        {truncateText(need.csrRequirement, 25)}
                      </p>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Estimated Cost</p>
                          <p className="text-lg font-bold text-[#12325a]">
                            {formatCurrency(need.estimatedCost)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Interested</p>
                          <p className="text-sm font-medium">{need.interestedCompaniesCount} companies</p>
                        </div>
                      </div>

                      <GovButton
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          setSelectedNeed(need);
                          setInterestResult("");
                          setInterestTokens({ mobile: "", email: "" });
                        }}
                        disabled={expressingInterest === need.id}
                      >
                        {expressingInterest === need.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "I am Interested"
                        )}
                      </GovButton>
                    </div>
                  </GovCardBody>
                </GovCard>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current, and neighbors
                      return (
                        page === 1 ||
                        page === pagination.totalPages ||
                        Math.abs(page - pagination.page) <= 1
                      );
                    })
                    .reduce((acc: (number | string)[], page, index, arr) => {
                      if (index > 0 && page !== arr[index - 1] + 1) {
                        acc.push("...");
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((page, index) =>
                      typeof page === "string" ? (
                        <span key={`ellipsis-${index}`} className="px-3 py-2 text-slate-400">
                          {page}
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`min-w-[40px] h-10 px-3 rounded font-medium transition-colors ${
                            page === pagination.page
                              ? "bg-[#12325a] text-white"
                              : "border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && needs.length === 0 && !error && (
          <GovCard className="text-center py-16">
            <GovCardBody>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartHandshake size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-[#12325a] mb-2">
                No development needs found
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {selectedDistrict !== "All Districts"
                  ? `No published needs available in ${selectedDistrict}. Try selecting a different district.`
                  : "There are currently no published development needs. Please check back later."}
              </p>
              {selectedDistrict !== "All Districts" && (
                <GovButton
                  variant="secondary"
                  className="mt-4"
                  onClick={() => handleDistrictChange("All Districts")}
                >
                  View All Districts
                </GovButton>
              )}
            </GovCardBody>
          </GovCard>
        )}

        {selectedNeed && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15, 23, 42, 0.55)",
              padding: 16,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="interest-modal-title"
              style={{
                width: "min(860px, 100%)",
                maxHeight: "calc(100vh - 48px)",
                background: "#fff",
                border: "1px solid var(--gov-border)",
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.28)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid var(--gov-border)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div>
                  <h2 id="interest-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--gov-primary-dark)" }}>
                    I am Interested
                  </h2>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--gov-text-muted)" }}>
                    Pitch Reference ID: <strong style={{ color: "var(--gov-text)" }}>{selectedNeed.trackingId}</strong>
                  </p>
                </div>
                <GovButton type="button" variant="muted" onClick={() => setSelectedNeed(null)} style={{ minHeight: 34, padding: "6px 12px" }}>
                  Close
                </GovButton>
              </div>

              {interestResult ? (
                <div style={{ padding: 22 }}>
                  <GovAlert variant="success">
                    Interest submitted successfully. Tracking ID: {interestResult}. You can track it from `/track`.
                  </GovAlert>
                </div>
              ) : (
                <>
                  <div style={{ padding: 22, overflowY: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                      <GovInput label="Pitch Reference ID" value={selectedNeed.trackingId} disabled />
                      <GovInput label="Company Name" required value={interestForm.companyName} onChange={(e) => setInterestForm({ ...interestForm, companyName: e.target.value })} />
                      <GovInput label="MCA21 CIN" required value={interestForm.mca21Cin} onChange={(e) => setInterestForm({ ...interestForm, mca21Cin: e.target.value.toUpperCase() })} />
                      <GovInput label="Contact Person" required value={interestForm.contactPersonName} onChange={(e) => setInterestForm({ ...interestForm, contactPersonName: e.target.value })} />
                      <GovInput label="Contact Person & Designation" required value={interestForm.contactPersonDesignation} onChange={(e) => setInterestForm({ ...interestForm, contactPersonDesignation: e.target.value })} />
                      <div>
                        <GovInput label="Mobile Number" required value={interestForm.mobile} onChange={(e) => {
                          setInterestForm({ ...interestForm, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) });
                          if (!isAuthenticatedCorporate) setInterestTokens({ ...interestTokens, mobile: "" });
                        }} />
                        {!isAuthenticatedCorporate && (
                          <OtpVerification purpose="CORPORATE_INTEREST" channel="MOBILE" target={interestForm.mobile} onVerified={(token) => setInterestTokens({ ...interestTokens, mobile: token })} />
                        )}
                      </div>
                      <div>
                        <GovInput label="Email" type="email" required value={interestForm.email} onChange={(e) => {
                          setInterestForm({ ...interestForm, email: e.target.value });
                          if (!isAuthenticatedCorporate) setInterestTokens({ ...interestTokens, email: "" });
                        }} />
                        {!isAuthenticatedCorporate && (
                          <OtpVerification purpose="CORPORATE_INTEREST" channel="EMAIL" target={interestForm.email} onVerified={(token) => setInterestTokens({ ...interestTokens, email: token })} />
                        )}
                      </div>
                      <GovInput label="Indicative Budget" type="number" required value={interestForm.indicativeBudget} onChange={(e) => setInterestForm({ ...interestForm, indicativeBudget: e.target.value })} />
                      <GovSelect label="Preferred Start Timeline" value={interestForm.preferredStartTimeline} onChange={(e) => setInterestForm({ ...interestForm, preferredStartTimeline: e.target.value })}>
                        <option value="THIS_QUARTER">This quarter</option>
                        <option value="NEXT_QUARTER">Next quarter</option>
                        <option value="THIS_FY">This FY</option>
                      </GovSelect>
                      <GovSelect label="Implementation Mode" value={interestForm.implementationMode} onChange={(e) => setInterestForm({ ...interestForm, implementationMode: e.target.value })}>
                        <option value="SELF">Self</option>
                        <option value="OWN_FOUNDATION">Own Foundation</option>
                        <option value="NGO_PARTNER">NGO Partner</option>
                      </GovSelect>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <GovTextarea
                          label="Message to Government"
                          rows={4}
                          value={interestForm.messageToGovernment}
                          onChange={(e) => setInterestForm({ ...interestForm, messageToGovernment: e.target.value })}
                          help="Optional, max 100 words"
                          style={{ minHeight: 110 }}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      borderTop: "1px solid var(--gov-border)",
                      background: "var(--gov-surface-muted)",
                      padding: "14px 22px",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.45, color: "var(--gov-text)", minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={interestForm.declarationAccepted}
                        onChange={(e) => setInterestForm({ ...interestForm, declarationAccepted: e.target.checked })}
                        style={{ marginTop: 2, flex: "0 0 auto" }}
                      />
                      <span>Genuine interest; authorise State CSR Cell to contact.</span>
                    </label>
                    <GovButton
                      type="button"
                      disabled={isInterestSubmitDisabled}
                      onClick={handleExpressInterest}
                      style={{ minWidth: 150 }}
                    >
                      {expressingInterest === selectedNeed.id ? "Submitting..." : "Submit Interest"}
                    </GovButton>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}
