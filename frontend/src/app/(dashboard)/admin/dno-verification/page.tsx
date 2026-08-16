"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface PendingDnoNomination {
  id: string;
  firstName: string;
  lastName: string;
  officialDesignation: string;
  officialEmail: string;
  officialMobile: string;
  employeeId: string | null;
  scope: string;
  appointmentOrderUrl: string;
  status: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    district: string | null;
  };
  department?: {
    id: string;
    name: string;
  } | null;
}

export default function AdminDnoVerificationPage() {
  const [nominations, setNominations] = useState<PendingDnoNomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [verifyModal, setVerifyModal] = useState<PendingDnoNomination | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [effectiveTo, setEffectiveTo] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPendingNominations = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/dno/pending-verifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pending DNO nominations");
      setNominations(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load nominations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingNominations();
  }, []);

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (!verifyModal) return;
    setVerifyingId(verifyModal.id);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/dno/nominations/${verifyModal.id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          effectiveFrom,
          effectiveTo: effectiveTo || null,
          rejectionReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process verification");

      setSuccess(
        action === "APPROVE"
          ? `DNO ${verifyModal.firstName} ${verifyModal.lastName} verified and activated!`
          : `DNO nomination for ${verifyModal.firstName} ${verifyModal.lastName} rejected.`
      );
      setVerifyModal(null);
      fetchPendingNominations();
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
          <ShieldCheck size={16} />
          <span>Super Admin Governance Portal</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Verify DNO Appointment Orders</h1>
        <p className="text-slate-500 text-xs mt-1">
          Review nominated District Nodal Officers (DNOs), verify appointment documents, set effective date ranges, and activate DNO user accounts.
        </p>
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

      {/* Main Table / Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
          <span className="text-xs font-semibold">Loading pending DNO nominations...</span>
        </div>
      ) : nominations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <UserCheck size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">All DNO Nominations Verified</h3>
          <p className="text-xs text-slate-500">There are no pending DNO appointment orders awaiting Super Admin verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {nominations.map((nom) => (
            <div
              key={nom.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm hover:border-blue-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Clock size={12} /> Pending Verification
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Submitted {new Date(nom.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {nom.firstName} {nom.lastName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600">
                    {nom.officialDesignation} {nom.employeeId ? `(ID: ${nom.employeeId})` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {nom.appointmentOrderUrl && (
                    <a
                      href={nom.appointmentOrderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
                    >
                      <FileText size={14} />
                      <span>Inspect Appointment Order</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setVerifyModal(nom);
                      setEffectiveFrom(new Date().toISOString().split("T")[0]);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <UserCheck size={15} />
                    <span>Verify & Approve</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Organization Details
                  </span>
                  <div className="font-bold text-slate-900">{nom.organization.name}</div>
                  <div className="text-slate-500 font-medium mt-0.5">District: {nom.organization.district || "N/A"}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    DNO Scope & Department
                  </span>
                  <div className="font-bold text-slate-900">
                    {nom.scope === "DEPARTMENT_SPECIFIC" ? "Department-Specific" : "Organization-Wide"}
                  </div>
                  <div className="text-slate-500 font-medium mt-0.5">
                    Dept: {nom.department?.name || "All Departments"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Official Contact
                  </span>
                  <div className="font-bold text-slate-900">{nom.officialEmail}</div>
                  <div className="text-slate-500 font-medium mt-0.5">{nom.officialMobile}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verify DNO Nomination</h3>
                <p className="text-xs text-slate-500">
                  {verifyModal.firstName} {verifyModal.lastName} ({verifyModal.organization.name})
                </p>
              </div>
              <button
                onClick={() => setVerifyModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Effective From *</label>
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rejection Remarks (If rejecting)</label>
                <textarea
                  rows={2}
                  placeholder="Enter reason if rejecting nomination order..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleAction("REJECT")}
                disabled={verifyingId === verifyModal.id}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold transition-all border border-red-200"
              >
                Reject Nomination
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAction("APPROVE")}
                  disabled={verifyingId === verifyModal.id}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  {verifyingId === verifyModal.id && <Loader2 size={14} className="animate-spin" />}
                  <span>Approve & Activate DNO</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
