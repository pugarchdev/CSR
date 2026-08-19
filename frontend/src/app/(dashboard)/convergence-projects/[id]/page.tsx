"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";

import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Loader } from "@/components/ui/Loader";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import {
  FileText, ArrowLeft, FileCheck, ExternalLink, AlertCircle, Layers,
  UserCheck, UserPlus, ShieldAlert, Key, Send, CheckCircle2, X, Loader2,
  Building2, Mail, Phone, RefreshCw, User
} from "lucide-react";

interface Milestone {
  id: string;
  name: string;
  description: string | null;
  completionCriteria?: string | null;
  targetAmount?: number | string;
  dueDate?: string | null;
  workType: string;
  status: string;
  fundsUtilized: number | string;
  geoTaggedPhotoUrls: string[];
  verifiedByNodalOfficerId: string | null;
  verifiedAt: string | null;
  verifiedByNodalOfficer?: { email: string };
  utilizationCertificates?: UC[];
}

interface UC {
  id: string;
  certificateDocumentUrl: string;
  amountUtilized: number | string;
  verificationStatus: string;
  remarks: string | null;
  uploadedAt: string;
  verifiedAt: string | null;
  uploadedByUser?: { email: string };
  verifiedByNodalOfficer?: { email: string };
}

interface Grievance {
  id: string;
  grievanceId: string;
  issueTitle: string;
  status: string;
  createdAt: string;
}

interface ProjectDetail {
  id: string;
  projectId: string;
  title: string;
  district: string;
  taluka: string;
  location: string;
  sector: string;
  corporateName: string;
  approvedBudget: number | string;
  utilizedAmount: number | string;
  physicalProgressPercent: number;
  financialProgressPercent: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  nodalOfficerUserId?: string | null;
  nodalOfficerUser?: {
    id?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    designation?: string;
    mobile?: string;
    userOfficerProfile?: {
      fullName?: string;
      designation?: string;
      mobile?: string;
      department?: string;
    };
  };
  organization?: {
    id: string;
    name: string;
    district?: string;
  };
  implementingAgencyUser?: { email: string };
  mou?: { id: string; mouReferenceId: string; status: string; governmentParty: string; corporateParty: string; implementingAgency: string; signedDocumentUrl: string | null };
  milestones?: Milestone[];
  utilizationCertificates?: UC[];
  grievances?: Grievance[];
}

export default function ConvergenceProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isNodal = user?.role === "DISTRICT_NODAL_OFFICER" || user?.role === "NODAL_OFFICER";
  const canAssignNodal = [1, 2, 3, 7, "SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "GOVERNMENT_OFFICER"].includes(
    user?.roleId || (user?.role as any)
  );

  const [mounted, setMounted] = useState(false);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Nodal Officer Allocation State
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [assignError, setAssignError] = useState("");

  // Create New Nodal Officer Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    designation: "District Nodal Officer",
    email: "",
    mobile: "",
    password: ""
  });
  const [creatingNodal, setCreatingNodal] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ success: boolean; data: ProjectDetail }>(`/convergence-projects/${id}`);
      const raw: any = res?.data || res;
      const milestones = Array.isArray(raw?.milestones) ? raw.milestones : [];
      const approvedBudget = Number(raw?.approvedBudget || 0);
      const utilizedAmount = Number(raw?.utilizedAmount || milestones.reduce((sum: number, milestone: any) => sum + Number(milestone.utilizedAmount || 0), 0));
      const verified = milestones.filter((milestone: any) => milestone.status === "APPROVED").length;
      setProject(raw ? {
        ...raw,
        projectId: raw.projectCode || raw.projectId,
        location: raw.village || [raw.taluka, raw.district].filter(Boolean).join(", "),
        corporateName: raw.mou?.corporateName || "Corporate partner pending MoU",
        physicalProgressPercent: milestones.length ? Math.round((verified / milestones.length) * 100) : 0,
        financialProgressPercent: approvedBudget ? Math.round((utilizedAmount / approvedBudget) * 100) : 0,
        utilizedAmount,
        mou: raw.mou ? {
          ...raw.mou,
          governmentParty: raw.mou.districtDepartmentName || raw.organization?.name || "Government Department",
          corporateParty: raw.mou.corporateName || "Corporate partner",
          implementingAgency: raw.mou.implementingAgencyName || "To be assigned"
        } : undefined,
        milestones: milestones.map((milestone: any) => ({
          ...milestone,
          workType: milestone.workType || "Project deliverable",
          fundsUtilized: milestone.utilizedAmount,
          verifiedByNodalOfficerId: milestone.verifiedByUserId,
          status: milestone.status === "APPROVED" ? "COMPLETED" : milestone.status
        })),
        utilizationCertificates: (Array.isArray(raw.utilizationCertificates) ? raw.utilizationCertificates : []).map((certificate: any) => ({ ...certificate, certificateDocumentUrl: certificate.certificateUrl }))
      } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCandidates = useCallback(async () => {
    if (!id) return;
    setLoadingCandidates(true);
    try {
      const res = await apiFetch<any>(`/nodal/projects/${id}/candidates`);
      const list = res?.data || (Array.isArray(res) ? res : []);
      setCandidates(list);
      if (list.length > 0 && !selectedCandidateId) {
        setSelectedCandidateId(list[0].id);
      }
    } catch (err) {
      console.warn("Failed to load nodal candidates", err);
    } finally {
      setLoadingCandidates(false);
    }
  }, [id, selectedCandidateId]);

  useEffect(() => {
    if (mounted) {
      fetchProject();
      fetchCandidates();
    }
  }, [mounted, fetchProject, fetchCandidates]);

  const handleAssignExisting = async () => {
    if (!selectedCandidateId) {
      setAssignError("Please select a Nodal Officer from the list.");
      return;
    }
    setAssigning(true);
    setAssignMessage("");
    setAssignError("");
    try {
      const res = await apiFetch<any>(`/nodal/projects/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ nodalOfficerUserId: selectedCandidateId })
      });
      setAssignMessage(res?.message || "Nodal Officer assigned successfully. Project status updated to MoU Pending.");
      setIsReassigning(false);
      fetchProject();
      fetchCandidates();
    } catch (err: any) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign nodal officer.");
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.email.trim()) {
      setCreateError("Name and official email are required.");
      return;
    }
    setCreatingNodal(true);
    setCreateError("");
    try {
      const res = await apiFetch<any>(`/nodal/projects/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({
          name: createForm.name.trim(),
          designation: createForm.designation.trim(),
          email: createForm.email.trim(),
          mobile: createForm.mobile.trim(),
          password: createForm.password.trim() || undefined
        })
      });
      setAssignMessage(res?.message || "New Nodal Officer created & assigned. Login credentials dispatched via email.");
      setShowCreateModal(false);
      setIsReassigning(false);
      setCreateForm({ name: "", designation: "District Nodal Officer", email: "", mobile: "", password: "" });
      fetchProject();
      fetchCandidates();
    } catch (err: any) {
      setCreateError(err instanceof Error ? err.message : "Failed to create nodal officer.");
    } finally {
      setCreatingNodal(false);
    }
  };

  if (!mounted) return null;

  const fmtCurrency = (v: number | string) => {
    const num = Number(v);
    if (isNaN(num) || num === 0) return "₹0";
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakhs`;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  if (loading) {
    return (
      <GovPortalLayout>
        <div className="py-20 flex justify-center">
          <Loader label="Loading Project Details from Database..." />
        </div>
      </GovPortalLayout>
    );
  }

  if (error || !project) {
    return (
      <GovPortalLayout>
        <GovPageHeader breadcrumb="Home / Projects / Detail" title="Project Not Found" />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center max-w-lg mx-auto my-8">
          <AlertCircle className="mx-auto text-rose-600 mb-2" size={40} />
          <h3 className="font-bold text-rose-950 text-base">{error || "Project record not found"}</h3>
          <button
            onClick={() => router.push("/convergence-projects")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-900 text-white font-bold text-xs shadow-xs hover:bg-rose-950 transition-all"
          >
            <ArrowLeft size={14} /> Back to Projects Register
          </button>
        </div>
      </GovPortalLayout>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "mou", label: "MoU Details" },
    { id: "milestones", label: `Milestones (${project.milestones?.length || 0})` },
    { id: "uc", label: "Utilisation Certificates" },
    { id: "grievances", label: `Grievances (${project.grievances?.length || 0})` },
  ];

  return (
    <GovPortalLayout>
      <GovPageHeader
        breadcrumb="Home / Projects / Detail"
        title={project.title}
        description={`${project.projectId} — ${project.district}, ${project.sector}`}
        actions={
          <div className="flex items-center gap-3">
            <GovStatusBadge variant={project.status === "COMPLETED" ? "success" : project.status === "IN_PROGRESS" ? "info" : "warning"}>
              {project.status.replace(/_/g, " ")}
            </GovStatusBadge>

            <Link
              href={`/projects/${project.id}/tracking`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-xs transition-all"
            >
              <FileCheck size={15} /> Milestone Tracking
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Nodal Officer Allocation Card */}
        {canAssignNodal && (
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-900 text-white">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-blue-950">District Nodal Officer Allocation</h3>
                  <p className="text-[11px] text-slate-500">
                    Assign an authorized government officer to manage on-ground milestone verifications and MoU execution.
                  </p>
                </div>
              </div>

              {project.nodalOfficerUser && !isReassigning ? (
                <button
                  onClick={() => setIsReassigning(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 bg-white text-blue-900 font-bold text-xs hover:bg-blue-50 transition-all self-start sm:self-auto"
                >
                  <RefreshCw size={13} /> Reassign Officer
                </button>
              ) : null}
            </div>

            {assignMessage && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{assignMessage}</span>
              </div>
            )}

            {assignError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-800">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {project.nodalOfficerUser && !isReassigning ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 p-3.5 rounded-xl border border-blue-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Nodal Officer</span>
                  <span className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5 mt-0.5">
                    <User size={13} className="text-blue-700" />
                    {project.nodalOfficerUser.userOfficerProfile?.fullName ||
                      [project.nodalOfficerUser.firstName, project.nodalOfficerUser.lastName].filter(Boolean).join(" ") ||
                      project.nodalOfficerUser.email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Designation / Department</span>
                  <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Building2 size={13} className="text-blue-700" />
                    {project.nodalOfficerUser.userOfficerProfile?.designation || project.nodalOfficerUser.designation || "District Nodal Officer"} (
                    {project.organization?.name || "Govt Dept"})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Info</span>
                  <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5 mt-0.5 truncate">
                    <Mail size={13} className="text-blue-700 shrink-0" />
                    {project.nodalOfficerUser.email}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Select Existing Nodal Officer in {project.organization?.name || "Department"}:
                    </label>
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => setSelectedCandidateId(e.target.value)}
                      disabled={loadingCandidates || assigning}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    >
                      {loadingCandidates ? (
                        <option value="">Loading officers...</option>
                      ) : candidates.length > 0 ? (
                        candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} — {c.designation} ({c.email})
                          </option>
                        ))
                      ) : (
                        <option value="">No existing Nodal Officers found. Create a new one below.</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-end gap-2 pt-1 sm:pt-0">
                    <button
                      disabled={assigning || !selectedCandidateId || candidates.length === 0}
                      onClick={handleAssignExisting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs shadow-xs transition-all disabled:opacity-50"
                    >
                      {assigning ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                      Assign Selected Officer
                    </button>

                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-300 bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-xs shadow-xs transition-all"
                    >
                      <UserPlus size={14} /> + Create New Nodal Officer
                    </button>

                    {isReassigning && (
                      <button
                        onClick={() => setIsReassigning(false)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Approved Budget</span>
            <span className="font-extrabold text-blue-950 text-base mt-1 block">{fmtCurrency(project.approvedBudget)}</span>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Amount Utilised</span>
            <span className="font-extrabold text-emerald-700 text-base mt-1 block">{fmtCurrency(project.utilizedAmount)}</span>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Physical Progress</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-extrabold text-blue-900 text-base">{project.physicalProgressPercent}%</span>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${project.physicalProgressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Nodal Officer</span>
            <span className="font-bold text-slate-800 text-xs mt-1 block truncate">
              {project.nodalOfficerUser?.userOfficerProfile?.fullName || project.nodalOfficerUser?.email?.split("@")[0] || "Pending Assignment"}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Implementing Agency</span>
            <span className="font-bold text-slate-800 text-xs mt-1 block truncate">{project.implementingAgencyUser?.email?.split("@")[0] || "State Agency"}</span>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Corporate Sponsor</span>
            <span className="font-bold text-purple-900 text-xs mt-1 block truncate">{project.corporateName}</span>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-900 text-blue-900 bg-blue-50/50 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div>
          {activeTab === "overview" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <Layers size={15} className="text-blue-700" /> Project Summary & Location Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Development Sector</span>
                  <span className="font-bold text-slate-900 text-sm">{project.sector}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Taluka & District</span>
                  <span className="font-bold text-slate-900 text-sm">{project.taluka}, {project.district}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Exact Site Location</span>
                  <span className="font-semibold text-slate-800">{project.location || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Project Execution Status</span>
                  <span className="font-bold text-blue-900 uppercase">{project.status.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Created Date</span>
                  <span className="font-semibold text-slate-800">{fmtDate(project.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Last Updated Date</span>
                  <span className="font-semibold text-slate-800">{fmtDate(project.updatedAt)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "mou" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText size={15} className="text-indigo-600" /> Tripartite Memorandum of Understanding (MoU)
              </h3>
              {project.mou ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">MoU Reference ID</span>
                    <span className="font-mono font-bold text-indigo-900">{project.mou.mouReferenceId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">MoU Status</span>
                    <span className="font-bold text-emerald-700">{project.mou.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Government Party</span>
                    <span className="font-semibold text-slate-800">{project.mou.governmentParty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Corporate Party</span>
                    <span className="font-semibold text-slate-800">{project.mou.corporateParty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Implementing Agency</span>
                    <span className="font-semibold text-slate-800">{project.mou.implementingAgency}</span>
                  </div>
                  {project.mou.signedDocumentUrl && (
                    <div>
                      <span className="text-slate-400 font-medium block">Signed Document</span>
                      <a
                        href={project.mou.signedDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors"
                      >
                        View Signed MoU <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium py-4">No tripartite MoU record attached yet.</p>
              )}
            </div>
          )}

          {activeTab === "milestones" && (
            <div className="space-y-3">
              {(project.milestones || []).length === 0 ? (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">No milestones defined for this convergence project.</p>
                </div>
              ) : (
                project.milestones?.map((m, idx) => (
                  <div key={m.id} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          #{idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{m.name}</h4>
                        <GovStatusBadge variant={m.status === "COMPLETED" ? "success" : "info"}>
                          {m.status.replace(/_/g, " ")}
                        </GovStatusBadge>
                      </div>
                      {m.description && <p className="text-xs text-slate-500 mt-1">{m.description}</p>}
                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 mt-2">
                        <span>Work Type: {m.workType}</span>
                        <span>Tranche: {fmtCurrency(m.targetAmount || 0)} ({project.approvedBudget ? `${((Number(m.targetAmount || 0) / Number(project.approvedBudget)) * 100).toFixed(1)}%` : "—"})</span>
                        <span>Funds Utilised: {fmtCurrency(m.fundsUtilized)}</span>
                        <span>Timeline: {fmtDate(m.dueDate || null)}</span>
                        <span>Verification: {m.verifiedAt ? "✓ Verified" : "Pending"}</span>
                      </div>
                      {m.completionCriteria && <p className="mt-2 text-xs text-slate-700"><strong>Completion criteria:</strong> {m.completionCriteria}</p>}
                    </div>

                    <Link
                      href={`/projects/${project.id}/tracking`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-blue-900 font-bold text-xs border border-slate-200 transition-colors shrink-0"
                    >
                      Track Progress →
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "uc" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileCheck size={15} className="text-emerald-600" /> Utilisation Certificates (UC)
              </h3>
              {(project.utilizationCertificates || []).length === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-4">No Utilisation Certificates uploaded for this project yet.</p>
              ) : (
                <div className="space-y-3">
                  {project.utilizationCertificates?.map((uc) => (
                    <div key={uc.id} className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">Utilisation Certificate — {fmtCurrency(uc.amountUtilized)}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Uploaded: {fmtDate(uc.uploadedAt)}</div>
                      </div>
                      {uc.certificateDocumentUrl && (
                        <a
                          href={uc.certificateDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors"
                        >
                          View Certificate <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "grievances" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Project Grievances & Queries
              </h3>
              {(project.grievances || []).length === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-4">No grievances or issues reported for this project.</p>
              ) : (
                <div className="space-y-3">
                  {project.grievances?.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="font-mono font-bold text-blue-900">{g.grievanceId}</span>
                        <div className="font-bold text-slate-900 mt-0.5">{g.issueTitle}</div>
                      </div>
                      <GovStatusBadge variant={g.status === "RESOLVED" ? "success" : "warning"}>
                        {g.status}
                      </GovStatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200/80">
          <button
            onClick={() => router.push("/convergence-projects")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors border border-slate-200"
          >
            ← Back to Projects Register
          </button>
        </div>
      </div>

      {/* Modal: Create & Nominate New Nodal Officer */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-900 text-white">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Create New Nodal Officer</h3>
                  <p className="text-xs text-slate-500">Nominate and grant scoped platform credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAndAssign} className="space-y-3.5">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-bold text-rose-700">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shri Rajesh Patil"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Official Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deputy CEO (Water & Sanitation) / Executive Engineer"
                  value={createForm.designation}
                  onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Official Email ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="officer@zp.gov.in"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={createForm.mobile}
                    onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Temporary Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate & email credentials automatically"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  If left blank, a secure 10-character temporary password will be generated and dispatched with the assignment email. The officer will be required to reset their password upon first login.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingNodal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs shadow-xs transition-all disabled:opacity-50"
                >
                  {creatingNodal ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Create, Assign & Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GovPortalLayout>
  );
}
