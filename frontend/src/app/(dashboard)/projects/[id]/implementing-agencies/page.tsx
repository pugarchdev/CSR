"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Building2,
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  ShieldCheck,
  Send
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface AgencyAssignment {
  id: string;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  agencyOrganizationId: string;
}

export default function ProjectImplementingAgenciesPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [agencies, setAgencies] = useState<AgencyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    officialRegNo: "",
    contactPersonName: "",
    contactEmail: "",
    mobile: ""
  });

  const fetchAgencies = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/implementing-agencies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load implementing agencies");
      setAgencies(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load implementing agencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchAgencies();
  }, [projectId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contactEmail) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/convergence-projects/${projectId}/implementing-agencies/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite implementing agency");

      setSuccess(`Implementing Agency ${formData.name} invited successfully.`);
      setFormData({ name: "", officialRegNo: "", contactPersonName: "", contactEmail: "", mobile: "" });
      fetchAgencies();
    } catch (err: any) {
      setError(err.message || "Invitation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
          <Users size={16} />
          <span>Corporate & Execution Partner Management</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Project Implementing Agencies (IA)</h1>
        <p className="text-slate-500 text-xs mt-1">
          Assign independent Implementing Agency organizations (NGOs, Trusts, Foundations) to execute project deliverables with project-scoped sub-logins.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Invite Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm lg:col-span-1 text-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-900" />
            <span>Invite Implementing Agency</span>
          </h3>

          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Agency Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. ABC Foundation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Reg No / DARPAN ID</label>
              <input
                type="text"
                placeholder="e.g. ABC-IA-001"
                value={formData.officialRegNo}
                onChange={(e) => setFormData({ ...formData, officialRegNo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Person Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={formData.contactPersonName}
                onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. john.doe@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="text"
                placeholder="e.g. 1234567890"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span>Send Agency Invitation</span>
            </button>
          </form>
        </div>

        {/* Right Column — Agency List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm lg:col-span-2 text-xs">
          <h3 className="text-base font-bold text-slate-900">Assigned Implementing Agencies</h3>

          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-900 mx-auto mb-2" />
              <span>Loading implementing agencies...</span>
            </div>
          ) : agencies.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-400 font-semibold">
              No implementing agencies assigned to this project yet.
            </div>
          ) : (
            <div className="space-y-3">
              {agencies.map((agency) => (
                <div key={agency.id} className="p-4 rounded-xl border border-slate-200 flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Agency ID: {agency.agencyOrganizationId}</div>
                    <div className="text-slate-500 text-xs mt-0.5">Invited: {new Date(agency.invitedAt).toLocaleDateString()}</div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                    {agency.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
