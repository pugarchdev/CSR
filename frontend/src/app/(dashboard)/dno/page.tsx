"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  UserPlus,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Loader2,
  AlertCircle,
  Sliders
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface DnoNomination {
  id: string;
  firstName: string;
  lastName: string;
  officialDesignation: string;
  officialEmail: string;
  officialMobile: string;
  employeeId: string | null;
  scope: string;
  appointmentOrderUrl: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: string;
  rejectionReason: string | null;
  departmentOrganization?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  createdAt: string;
}

export default function DnoNominationsListPage() {
  const [nominations, setNominations] = useState<DnoNomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [dnoAuthority, setDnoAuthority] = useState("DEPARTMENT");
  const [updatingAuthority, setUpdatingAuthority] = useState(false);

  const fetchNominations = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/dno/nominations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load DNO nominations");
      setNominations(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load DNO nominations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNominations();
  }, []);

  const handleUpdateAuthority = async (newAuthority: string) => {
    setUpdatingAuthority(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/dno/authority`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dnoAuthority: newAuthority })
      });
      if (res.ok) {
        setDnoAuthority(newAuthority);
      }
    } catch (err) {
      console.error("Failed to update DNO authority", err);
    } finally {
      setUpdatingAuthority(false);
    }
  };

  const handleReplace = async (id: string) => {
    if (!confirm("Are you sure you want to mark this DNO for replacement? The officer will be deactivated once confirmed.")) {
      return;
    }
    setReplacingId(id);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/dno/nominations/${id}/replace`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to replace DNO");
      fetchNominations();
    } catch (err: any) {
      alert(err.message || "Replacement failed");
    } finally {
      setReplacingId(null);
    }
  };

  const hasActiveDno = nominations.some((n) => n.status === "ACTIVE");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
            <ShieldCheck size={16} />
            <span>Government Governance Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">District Nodal Officer (DNO) Management</h1>
          <p className="text-slate-500 text-xs mt-1">
            Nominate and manage operational nodal officers responsible for coordinating government CSR project execution.
          </p>
        </div>

        <Link
          href="/dno/nominate"
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <UserPlus size={16} />
          <span>Nominate New DNO</span>
        </Link>
      </div>

      {/* Missing DNO Banner */}
      {!hasActiveDno && !loading && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-950">DNO Required — Department must nominate a District Nodal Officer</div>
              <div className="text-xs text-amber-800 font-medium mt-0.5">
                JS-approved projects require an active DNO for operational coordination and project execution.
              </div>
            </div>
          </div>
          <Link
            href="/dno/nominate"
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all shrink-0"
          >
            Nominate DNO Now
          </Link>
        </div>
      )}

      {/* DNO Appointment Authority Configuration */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <Sliders size={15} className="text-blue-900" />
            <span>Configurable DNO Appointment Authority</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Who has authority to nominate DNOs for projects under this department?
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dnoAuthority}
            onChange={(e) => handleUpdateAuthority(e.target.value)}
            disabled={updatingAuthority}
            className="px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-xs font-bold focus:outline-none"
          >
            <option value="DEPARTMENT">Owning Department (Default)</option>
            <option value="PARENT_ORGANIZATION">Parent Organization Admin</option>
            <option value="SUPER_ADMIN">Super Admin Only</option>
          </select>
          {updatingAuthority && <Loader2 size={14} className="animate-spin text-blue-900" />}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
          <span className="text-xs font-semibold">Loading DNO nominations...</span>
        </div>
      ) : nominations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No DNO Nominated Yet</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
              Nominate an officer to serve as your District Nodal Officer. Upload the appointment order PDF for Super Admin verification.
            </p>
          </div>
          <Link
            href="/dno/nominate"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <UserPlus size={16} />
            <span>Nominate DNO</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nominations.map((nom) => {
            const isDeptSpecific = nom.scope === "DEPARTMENT_SPECIFIC";
            const deptName = nom.departmentOrganization?.name || nom.department?.name || "Organization-Wide";

            return (
              <div
                key={nom.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-amber-300 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {isDeptSpecific ? `Dept: ${deptName}` : "Organization-Wide"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        {nom.firstName} {nom.lastName}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{nom.officialDesignation}</p>
                    </div>

                    {nom.status === "ACTIVE" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> ACTIVE
                      </span>
                    )}
                    {nom.status === "PENDING_VERIFICATION" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock size={12} /> PENDING
                      </span>
                    )}
                    {nom.status === "REJECTED" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        <XCircle size={12} /> REJECTED
                      </span>
                    )}
                    {nom.status === "INACTIVE" && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        INACTIVE
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div><strong className="text-slate-900">Email:</strong> {nom.officialEmail}</div>
                    <div><strong className="text-slate-900">Mobile:</strong> {nom.officialMobile}</div>
                    {nom.employeeId && <div><strong className="text-slate-900">ID:</strong> {nom.employeeId}</div>}

                    {nom.effectiveFrom && (
                      <div className="text-[11px] text-slate-500 pt-1">
                        Effective: {new Date(nom.effectiveFrom).toLocaleDateString()}
                        {nom.effectiveTo ? ` → ${new Date(nom.effectiveTo).toLocaleDateString()}` : " (Present)"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={nom.appointmentOrderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-blue-900 hover:underline"
                  >
                    <FileText size={14} />
                    <span>View Order</span>
                  </a>

                  {nom.status === "ACTIVE" && (
                    <button
                      onClick={() => handleReplace(nom.id)}
                      disabled={replacingId === nom.id}
                      className="flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-all border border-amber-200"
                    >
                      {replacingId === nom.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                      <span>Replace DNO</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
