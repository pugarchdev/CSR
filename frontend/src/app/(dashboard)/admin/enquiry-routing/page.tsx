"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface RecommendedDept {
  id: string;
  name: string;
  district: string | null;
  state: string | null;
  officialIdentifierNumber?: string | null;
  parentOrganization?: {
    id: string;
    name: string;
  };
  departmentDnoNominations?: {
    id: string;
    firstName: string;
    lastName: string;
    officialDesignation: string;
  }[];
}

export default function AdminEnquiryRoutingPage() {
  const [enquiryId, setEnquiryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [enquiry, setEnquiry] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedDept[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [routingNotes, setRoutingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRecommendations = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/enquiries/${id}/routing-recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load routing recommendations");
      setEnquiry(data.data?.enquiry || null);
      setRecommendations(data.data?.recommendations || []);
    } catch (err: any) {
      setError(err.message || "Failed to load enquiry routing recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteEnquiry = async () => {
    if (!enquiryId || !selectedDeptId) {
      setError("Please select a government department to route this requirement.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("accessToken");
      const selectedDept = recommendations.find((r) => r.id === selectedDeptId);
      const res = await fetch(`${API_BASE_URL}/admin/enquiries/${enquiryId}/route-department`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentOrganizationId: selectedDeptId,
          parentOrganizationId: selectedDept?.parentOrganization?.id || null,
          notes: routingNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to route enquiry");

      setSuccess(`Requirement successfully routed to ${selectedDept?.name}! Pending Joint Secretary final approval.`);
    } catch (err: any) {
      setError(err.message || "Routing failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
          <Building2 size={16} />
          <span>Requirement Classification & Department Routing Engine</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Corporate Enquiry Department Routing</h1>
        <p className="text-slate-500 text-xs mt-1">
          For corporate CSR proposals without an existing government pitch, perform 3-level department routing (System Auto-Match, District DNC Recommendation, or Super Admin Settlement) before Joint Secretary approval.
        </p>
      </div>

      {/* Enquiry Lookup Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Search size={16} className="text-blue-900" />
          <span>Enter Corporate Enquiry ID</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="e.g. ENQ-2026-0042 or ID..."
            value={enquiryId}
            onChange={(e) => setEnquiryId(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            onClick={() => fetchRecommendations(enquiryId)}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            <span>Fetch Recommendations</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {enquiry && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Corporate Enquiry Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm lg:col-span-1">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Corporate Requirement Overview
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Corporate Partner
                </span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{enquiry.corporateName}</div>
                <div className="text-slate-500 font-medium">{enquiry.contactEmail}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Sector
                  </span>
                  <div className="font-bold text-blue-900">{enquiry.sector || "General CSR"}</div>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Preferred District
                  </span>
                  <div className="font-bold text-slate-900">{enquiry.preferredDistricts[0] || enquiry.district || "Nagpur"}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Proposed CSR Work
                </span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  {enquiry.proposedCSRWork || "No detailed description specified."}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Department Routing Status
                </span>
                <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <Clock size={12} /> {enquiry.departmentAssignmentStatus || "PENDING"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column — Recommended Departments & Assignment */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm lg:col-span-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recommended Government Departments</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the government department responsible for owning and executing this CSR requirement.
              </p>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                No matching departments found in district. You can assign to parent local body.
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((dept) => {
                  const isSelected = selectedDeptId === dept.id;
                  const dno = dept.departmentDnoNominations?.[0];

                  return (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDeptId(dept.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-4 ${
                        isSelected
                          ? "border-blue-900 bg-blue-50/70 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{dept.name}</span>
                          {dept.parentOrganization && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              Under {dept.parentOrganization.name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          District: {dept.district || "MH"} | Identifier: {dept.officialIdentifierNumber || "N/A"}
                        </div>

                        {dno ? (
                          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                            <ShieldCheck size={13} /> Active DNO: {dno.firstName} {dno.lastName} ({dno.officialDesignation})
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-1">
                            <HelpCircle size={13} /> DNO Nomination Required upon Approval
                          </div>
                        )}
                      </div>

                      <div className="w-5 h-5 rounded-full border-2 border-blue-900 flex items-center justify-center shrink-0 mt-1">
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department Routing Notes / Justification
              </label>
              <textarea
                rows={2}
                placeholder="Notes for Joint Secretary review..."
                value={routingNotes}
                onChange={(e) => setRoutingNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRouteEnquiry}
                disabled={submitting || !selectedDeptId}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                <span>Route to Department</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
