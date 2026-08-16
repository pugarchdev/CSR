"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  FileText
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

interface Department {
  id: string;
  name: string;
  code: string | null;
}

export default function NominateDnoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDeptId = searchParams.get("departmentId") || "";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    officialDesignation: "",
    officialEmail: "",
    officialMobile: "",
    employeeId: "",
    scope: initialDeptId ? "DEPARTMENT_SPECIFIC" : "ORGANIZATION_WIDE",
    departmentId: initialDeptId,
    appointmentOrderUrl: ""
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDocName, setUploadedDocName] = useState("");

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API_BASE_URL}/org/children`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.data?.childOrganizations) {
          setDepartments(data.data.childOrganizations.map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.officialIdentifierNumber
          })));
        } else {
          // Fallback to /departments if no child orgs
          const res2 = await fetch(`${API_BASE_URL}/departments`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data2 = await res2.json();
          if (res2.ok) setDepartments(data2.data || []);
        }
      } catch (err) {
        console.error("Failed to load departments", err);
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepts();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("accessToken");
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: uploadFormData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload document");

      const fileUrl = data.data?.fileUrl || data.fileUrl || data.url;
      setFormData((prev) => ({ ...prev, appointmentOrderUrl: fileUrl }));
      setUploadedDocName(file.name);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload appointment order document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.officialDesignation.trim()) {
      setErrorMsg("Please fill in all mandatory DNO details (Name and Designation).");
      return;
    }
    if (!formData.officialEmail.trim() || !formData.officialMobile.trim()) {
      setErrorMsg("Please provide Official Email and Mobile Number for the DNO.");
      return;
    }
    if (formData.scope === "DEPARTMENT_SPECIFIC" && !formData.departmentId) {
      setErrorMsg("Please select a Department for department-specific DNO scope.");
      return;
    }
    if (!formData.appointmentOrderUrl) {
      setErrorMsg("DNO Appointment / Nomination Order document is required.");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/dno/nominate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit DNO nomination");

      setSuccessMsg("DNO Nomination submitted successfully! Super Admin will verify the appointment order.");
      setTimeout(() => {
        router.push("/dno");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while submitting DNO nomination.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/dno"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to DNO Nominations</span>
        </Link>
      </div>

      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
          <ShieldCheck size={16} />
          <span>Official Appointment Workflow</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Nominate District / Department Nodal Officer (DNO)</h1>
        <p className="text-slate-500 text-xs mt-1">
          Appoint an official Nodal Officer responsible for project monitoring, milestone verification, and utilization certificates.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
        {/* Section 1: DNO Personal & Official Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold flex items-center justify-center">1</span>
            <span>DNO Personal & Designation Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">DNO First Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">DNO Last Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Doe"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Designation *</label>
              <input
                type="text"
                required
                placeholder="e.g. Deputy Commissioner / Executive Engineer"
                value={formData.officialDesignation}
                onChange={(e) => setFormData({ ...formData, officialDesignation: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Employee / Officer ID</label>
              <input
                type="text"
                placeholder="e.g. GOV-NMC-8842"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. john.doe@example.com"
                value={formData.officialEmail}
                onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Mobile *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 1234567890"
                value={formData.officialMobile}
                onChange={(e) => setFormData({ ...formData, officialMobile: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: DNO Scope & Department */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold flex items-center justify-center">2</span>
            <span>DNO Scope & Jurisdiction</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">DNO Scope *</label>
              <select
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ORGANIZATION_WIDE">Organization-wide (All Departments)</option>
                <option value="DEPARTMENT_SPECIFIC">Department-specific (e.g. Health / Electrical)</option>
              </select>
            </div>

            {formData.scope === "DEPARTMENT_SPECIFIC" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Department *</label>
                {loadingDepts ? (
                  <div className="px-3.5 py-2.5 text-slate-400 font-semibold">Loading departments...</div>
                ) : (
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Choose Department...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} {dept.code ? `(${dept.code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: DNO Appointment / Authorization Document Upload */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold flex items-center justify-center">3</span>
            <span>DNO Appointment / Authorization Order Document *</span>
          </h3>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <p className="text-slate-600 text-xs">
              Upload the official Government Gazette notification, Appointment Order, or Departmental Authorization PDF nominating this officer. Super Admin will verify this document prior to activation.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 rounded-xl font-bold transition-all shadow-sm">
                <Upload size={15} />
                <span>{uploadingDoc ? "Uploading..." : "Upload Appointment Order PDF"}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingDoc}
                />
              </label>

              {uploadedDocName && (
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                  <FileText size={14} />
                  <span className="truncate max-w-xs">{uploadedDocName}</span>
                </div>
              )}
            </div>

            {formData.appointmentOrderUrl && (
              <div className="text-[11px] font-mono text-slate-500 break-all bg-white p-2 rounded-lg border border-slate-200">
                Uploaded Doc: {formData.appointmentOrderUrl}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/dno"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            <span>Submit DNO Nomination</span>
          </button>
        </div>
      </form>
    </div>
  );
}
