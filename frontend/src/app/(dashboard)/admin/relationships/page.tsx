"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface PendingRelationship {
  id: string;
  status: string;
  requestedAt: string;
  childOrganization: {
    id: string;
    name: string;
    officialIdentifierNumber: string | null;
    district: string | null;
    state: string | null;
    status: string;
  };
  parentOrganization: {
    id: string;
    name: string;
    parentRegistrationCode: string | null;
    district: string | null;
    state: string | null;
  };
}

export default function AdminRelationshipsPage() {
  const [relationships, setRelationships] = useState<PendingRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [verifyModal, setVerifyModal] = useState<PendingRelationship | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchPendingRelationships = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/relationships/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pending relationship claims");
      setRelationships(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load relationship claims");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRelationships();
  }, []);

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (!verifyModal) return;
    setVerifyingId(verifyModal.id);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/relationships/${verifyModal.id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, rejectionReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify relationship claim");

      setSuccess(
        action === "APPROVE"
          ? `${verifyModal.childOrganization.name} linked under ${verifyModal.parentOrganization.name}!`
          : `Relationship claim rejected.`
      );
      setVerifyModal(null);
      fetchPendingRelationships();
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
        <h1 className="text-2xl font-bold text-slate-900">Verify Parent-Child Organization Relationships</h1>
        <p className="text-slate-500 text-xs mt-1">
          Review independent child department registration claims and verify hierarchy linkage to parent government organizations.
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

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
          <span className="text-xs font-semibold">Loading pending relationship claims...</span>
        </div>
      ) : relationships.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <UserCheck size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">All Parent-Child Relationships Verified</h3>
          <p className="text-xs text-slate-500">There are no pending department linkage claims awaiting Super Admin verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm hover:border-blue-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 mb-1">
                    <Clock size={12} /> Claimed {new Date(rel.requestedAt).toLocaleDateString()}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>{rel.childOrganization.name}</span>
                    <span className="text-slate-400 font-normal">→</span>
                    <span className="text-blue-900">{rel.parentOrganization.name}</span>
                  </h3>
                </div>

                <button
                  onClick={() => setVerifyModal(rel)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <UserCheck size={15} />
                  <span>Verify Linkage</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Child Department
                  </span>
                  <div className="font-bold text-slate-900">{rel.childOrganization.name}</div>
                  <div className="text-slate-500 font-medium">District: {rel.childOrganization.district || "MH"}</div>
                  <div className="text-slate-500 font-medium">Code: {rel.childOrganization.officialIdentifierNumber || "N/A"}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                  <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider block">
                    Claimed Parent Organization
                  </span>
                  <div className="font-bold text-blue-950">{rel.parentOrganization.name}</div>
                  <div className="text-blue-900 font-medium">District: {rel.parentOrganization.district || "MH"}</div>
                  <div className="text-blue-900 font-medium">Parent Reference Code: {rel.parentOrganization.parentRegistrationCode || "N/A"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verify Organization Hierarchy Linkage</h3>
                <p className="text-xs text-slate-500">
                  {verifyModal.childOrganization.name} → {verifyModal.parentOrganization.name}
                </p>
              </div>
              <button
                onClick={() => setVerifyModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 leading-relaxed font-medium">
              Approving this relationship will link <strong>{verifyModal.childOrganization.name}</strong> as a verified child department under <strong>{verifyModal.parentOrganization.name}</strong>.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Rejection Remarks (If rejecting claim)</label>
              <textarea
                rows={2}
                placeholder="Reason if rejecting hierarchy relationship..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleAction("REJECT")}
                disabled={verifyingId === verifyModal.id}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold transition-all border border-red-200"
              >
                Reject Linkage
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
                  <span>Approve & Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
