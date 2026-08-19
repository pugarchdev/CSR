"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Building2,
  ShieldCheck,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Share2,
  UserPlus,
  Clock,
  Plus
} from "lucide-react";
import Link from "next/link";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { MAHARASHTRA_DISTRICTS } from "@/lib/locationData";
import GovModal from "@/components/gov/GovModal";
import { Button } from "@/components/ui/Button";

interface ChildOrganization {
  id: string;
  name: string;
  officialIdentifierNumber: string | null;
  officialOfficeEmail: string | null;
  officialOfficePhone: string | null;
  district: string | null;
  status: string;
  parentRelationshipStatus: string;
  departmentDnoNominations?: {
    id: string;
    firstName: string;
    lastName: string;
    officialDesignation: string;
    officialEmail: string;
    officialMobile: string;
    status: string;
  }[];
}

interface ParentOrgData {
  id: string;
  name: string;
  parentRegistrationCode: string | null;
}

export default function DepartmentManagementPage() {
  const [parentOrg, setParentOrg] = useState<ParentOrgData | null>(null);
  const [childOrganizations, setChildOrganizations] = useState<ChildOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    district: "Nagpur",
    officeAddress: "",
    adminFullName: "",
    adminEmail: "",
    adminDesignation: "",
    adminPhone: ""
  });

  const fetchHierarchy = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/org/children`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load child departments");
      setParentOrg(data.data?.parentOrganization || null);
      setChildOrganizations(data.data?.childOrganizations || []);
    } catch (err: any) {
      setError(err.message || "Failed to load child departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const handleCopyCode = () => {
    if (!parentOrg?.parentRegistrationCode) return;
    navigator.clipboard.writeText(parentOrg.parentRegistrationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateDept = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await apiFetch("/admin/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: deptForm.name.trim(),
          code: deptForm.code.trim() || undefined,
          district: deptForm.district || undefined,
          officeAddress: deptForm.officeAddress.trim() || undefined,
          kind: "GOVERNMENT_DEPARTMENT",
          parentOrganizationId: parentOrg?.id || undefined,
          admin: {
            fullName: deptForm.adminFullName.trim(),
            email: deptForm.adminEmail.trim(),
            designation: deptForm.adminDesignation.trim() || undefined,
            phone: deptForm.adminPhone.trim() || undefined,
          }
        })
      });
      setShowAddModal(false);
      setDeptForm({
        name: "",
        code: "",
        district: "Nagpur",
        officeAddress: "",
        adminFullName: "",
        adminEmail: "",
        adminDesignation: "",
        adminPhone: ""
      });
      await fetchHierarchy();
    } catch (err: any) {
      setError(err.message || "Failed to create sub-department");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
            <Building2 size={16} />
            <span>Organization Hierarchy Architecture</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Verified Child Departments & Administrative Units</h1>
          <p className="text-slate-500 text-xs mt-1">
            Sub-departments (Health, Electrical, Education, etc.) register independently or can be added with an invited Designated Admin Officer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Department</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-slate-200"
          >
            <Share2 size={15} />
            <span>Share Reference Code</span>
          </button>
          <Link
            href="/dno/nominate"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <UserPlus size={15} />
            <span>Nominate DNO</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Code Notice Banner */}
      {parentOrg?.parentRegistrationCode && (
        <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="text-xs text-blue-950 font-medium">
            Your Parent Registration Code is <strong className="font-mono text-blue-900 font-extrabold px-2 py-0.5 rounded bg-white border border-blue-300">{parentOrg.parentRegistrationCode}</strong>. Provide this code to child departments (e.g., Health, Electrical) when they register independently.
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-100/50 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition-all shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-900 mb-2" />
          <span className="text-xs font-semibold">Loading child departments...</span>
        </div>
      ) : childOrganizations.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Child Departments Registered Yet</h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
              Sub-departments (Health Department, Electrical Department, etc.) must register independently on the portal and select <strong className="text-slate-900">{parentOrg?.name || "your organization"}</strong> as their parent entity.
            </p>
          </div>
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Share2 size={16} />
            <span>Invite Department to Register</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {childOrganizations.map((child) => {
            const activeDno = child.departmentDnoNominations && child.departmentDnoNominations.length > 0 ? child.departmentDnoNominations[0] : null;
            const isVerified = child.parentRelationshipStatus === "VERIFIED";

            return (
              <div
                key={child.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 hover:border-blue-300 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-100">
                        {child.officialIdentifierNumber || "GOVT-DEPT"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{child.name}</h3>
                    </div>
                    {isVerified ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> VERIFIED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock size={12} /> PENDING
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs divide-y divide-slate-100">
                    {/* DNO Assignment */}
                    <div className="pt-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                        Department Nodal Officer (DNO)
                      </span>
                      {activeDno ? (
                        <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-amber-600 shrink-0" />
                            <span>{activeDno.firstName} {activeDno.lastName}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                            {activeDno.officialDesignation}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-amber-200/40">
                            <span className="flex items-center gap-1">
                              <Mail size={12} />
                              {activeDno.officialEmail}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 italic">No DNO Nominated</span>
                          <Link
                            href={`/dno/nominate?departmentId=${child.id}`}
                            className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md border border-amber-200 transition-colors"
                          >
                            + Nominate
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Contact: {child.officialOfficeEmail || "N/A"}</span>
                  <Link
                    href={`/dno/nominate?departmentId=${child.id}`}
                    className="text-blue-900 hover:text-amber-600 font-bold"
                  >
                    Manage DNO →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Sharing Parent Registration Code */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Child Department Registration Instructions</h3>
                <p className="text-xs text-slate-500">How sub-departments register under your organization</p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed font-medium">
                Child departments (e.g. Health, Electrical, Education) must register independently on the MahaCSR Setu portal. Share the following Parent Reference Code with them during their registration:
              </p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Parent Reference Code
                </span>
                <div className="font-mono text-lg font-extrabold text-blue-950 tracking-wider">
                  {parentOrg?.parentRegistrationCode || "NMC-NAGPUR-001"}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold transition-all"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copied ? "Copied Code" : "Copy Code"}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold">What happens after child registers?</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The child department completes onboarding and claims relationship with your organization. Super Admin verifies the claim, after which the department appears under your organization structure.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      <GovModal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Sub-Department / Office" width={640}>
        <form onSubmit={handleCreateDept} className="flex flex-col gap-4">
          {/* Top Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">
                Sub-Department / Office Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={deptForm.name}
                onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Health Department / District Office"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-50/50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-800">
                Office Code / Code Reference
              </label>
              <input
                type="text"
                value={deptForm.code}
                onChange={(e) => setDeptForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="e.g. NMC-HLTH"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-50/50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800">
              District <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={deptForm.district}
              onChange={(e) => setDeptForm((prev) => ({ ...prev, district: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-50/50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all cursor-pointer"
            >
              <option value="">Select District</option>
              {MAHARASHTRA_DISTRICTS.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800">
              Office Address
            </label>
            <textarea
              rows={3}
              value={deptForm.officeAddress}
              onChange={(e) => setDeptForm((prev) => ({ ...prev, officeAddress: e.target.value }))}
              placeholder="Enter full office address"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-50/50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all resize-none"
            />
          </div>

          {/* Designated Admin Officer Sub-Card */}
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4.5 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950">
              <UserPlus size={16} className="text-blue-700 shrink-0" />
              <span>Designated Admin Officer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-800">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptForm.adminFullName}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, adminFullName: e.target.value }))}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-800">
                  Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={deptForm.adminEmail}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                  placeholder="admin@gov.in"
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-800">
                  Designation
                </label>
                <input
                  type="text"
                  value={deptForm.adminDesignation}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, adminDesignation: e.target.value }))}
                  placeholder="e.g. Sub-Divisional Officer / Deputy Collector"
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-800">
                  Phone / Mobile Number
                </label>
                <input
                  type="tel"
                  value={deptForm.adminPhone}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, adminPhone: e.target.value }))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto justify-center"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating}
              loading={creating}
              loadingText="Creating & Sending Invitation..."
              className="w-full sm:w-auto justify-center bg-blue-900 hover:bg-blue-950 text-white font-bold"
            >
              Create and Send Invitation
            </Button>
          </div>
        </form>
      </GovModal>
    </div>
  );
}
