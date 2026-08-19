"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, CheckCircle2, Clock, ShieldAlert, Plus, Search,
  ArrowRight, Building2, User, HelpCircle, Layers, Check, Copy,
  FileText, Shield, ChevronRight, Filter, ExternalLink, Loader2
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import GovModal from "@/components/gov/GovModal";
import GovAlert from "@/components/gov/GovAlert";
import { Button } from "@/components/ui/Button";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import { apiFetch, clearApiCache } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface GrievanceItem {
  id: string;
  grievanceCode: string;
  projectId: string;
  issueTitle: string;
  issueDescription: string;
  status: string;
  resolutionText?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    projectCode: string;
    title: string;
    district: string;
    sector: string;
    organization?: { name: string };
    departmentOrganization?: { name: string };
  };
  raisedByUser?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    designation?: string | null;
    role?: { name: string };
  };
  actionLogs?: Array<{
    id: string;
    action: string;
    note: string;
    createdAt: string;
    actorUser?: { email: string; firstName?: string; lastName?: string };
  }>;
}

interface ProjectOption {
  id: string;
  projectCode: string;
  title: string;
  district: string;
  sector: string;
}

const CATEGORY_OPTIONS = [
  { value: "FUND_DELAY", label: "Fund Disbursement / Escrow Tranche Delay" },
  { value: "MILESTONE_APPROVAL", label: "Milestone Inspection / UC Approval Bottleneck" },
  { value: "NOC_CLEARANCE", label: "Land, Site or Inter-Department NOC Pending" },
  { value: "VENDOR_DISPUTE", label: "Contractor / Implementing Agency Dispute" },
  { value: "INFRASTRUCTURE_QUALITY", label: "Infrastructure Quality / Specification Defect" },
  { value: "GENERAL", label: "General Project Implementation Bottleneck" },
];

export default function GrievancesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    level1Pending: 0,
    level2Escalated: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "LEVEL_1" | "LEVEL_2" | "RESOLVED">("ALL");

  // Raise Grievance Modal
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [projectsList, setProjectsList] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [customProjectId, setCustomProjectId] = useState("");
  const [issueCategory, setIssueCategory] = useState("FUND_DELAY");
  const [issuePriority, setIssuePriority] = useState("NORMAL");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState<{ trackingCode: string; msg: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const isAuthority = useMemo(() => {
    if (isAdmin) return true;
    const userRoles = roles || (user?.role ? [user.role] : []);
    return userRoles.some((r) =>
      ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_RELATIONSHIP_MANAGER", "RELATIONSHIP_MANAGER", "PORTAL_ADMIN", "STATE_CSR_CELL", "DISTRICT_NODAL", "DISTRICT_DNC", "GOVT_DEPARTMENT", "CSR_ADMIN"].includes(
        String(r).toUpperCase()
      )
    );
  }, [isAdmin, roles, user]);

  const fetchGrievances = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let queryParams = new URLSearchParams();
      if (statusFilter !== "all") queryParams.append("status", statusFilter);
      if (levelFilter !== "ALL") queryParams.append("level", levelFilter);
      if (search.trim()) queryParams.append("search", search.trim());

      const url = `/grievances${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const res = await apiFetch<any>(url);

      if (res?.data?.grievances && Array.isArray(res.data.grievances)) {
        setGrievances(res.data.grievances);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else if (Array.isArray(res?.data)) {
        setGrievances(res.data);
      } else if (Array.isArray(res)) {
        setGrievances(res);
      } else {
        setGrievances([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load grievances");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, levelFilter, search]);

  useEffect(() => {
    fetchGrievances();
  }, [fetchGrievances]);

  // Load Projects for Modal Picker
  const loadProjects = async () => {
    if (projectsList.length > 0) return;
    setProjectsLoading(true);
    try {
      const res = await apiFetch<any>("/convergence-projects");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setProjectsList(
        list.map((p: any) => ({
          id: p.id,
          projectCode: p.projectCode || p.id.slice(0, 8),
          title: p.title || "Untitled Project",
          district: p.district || "Maharashtra",
          sector: p.sector || "General",
        }))
      );
    } catch (err) {
      console.warn("Failed to preload projects list:", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleOpenRaiseModal = () => {
    setShowRaiseModal(true);
    setSubmitSuccess(null);
    setSubmitError("");
    setSelectedProjectId("");
    setCustomProjectId("");
    setIssueTitle("");
    setIssueDescription("");
    setDeclarationAccepted(false);
    loadProjects();
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(null);

    const actualProjectId = selectedProjectId || customProjectId.trim();
    if (!actualProjectId) {
      setSubmitError("Please select or enter the Convergence Project ID");
      return;
    }
    if (issueTitle.trim().length < 5) {
      setSubmitError("Issue title must be at least 5 characters");
      return;
    }
    if (issueDescription.trim().length < 15) {
      setSubmitError("Description must be at least 15 characters");
      return;
    }
    if (!declarationAccepted) {
      setSubmitError("You must accept the accurate information declaration");
      return;
    }

    setSubmitLoading(true);
    try {
      const formattedTitle = `[${issueCategory}] ${issueTitle.trim()} (${issuePriority})`;
      const res = await apiFetch<any>("/grievances", {
        method: "POST",
        body: JSON.stringify({
          projectId: actualProjectId,
          issueTitle: formattedTitle,
          issueDescription: issueDescription.trim(),
        }),
      });

      const resData = res?.data || res;
      const trackingCode = resData?.grievanceCode || "Registered";

      setSubmitSuccess({
        trackingCode,
        msg: res?.message || "Grievance successfully recorded and routed for Level 1 Review.",
      });

      clearApiCache();
      fetchGrievances();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to raise grievance");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        g.grievanceCode.toLowerCase().includes(term) ||
        g.issueTitle.toLowerCase().includes(term) ||
        g.issueDescription.toLowerCase().includes(term) ||
        (g.project?.title && g.project.title.toLowerCase().includes(term)) ||
        (g.project?.projectCode && g.project.projectCode.toLowerCase().includes(term)) ||
        (g.raisedByUser?.email && g.raisedByUser.email.toLowerCase().includes(term))
      );
    });
  }, [grievances, search]);

  const { sortedItems, sortKey, sortDirection, requestSort } = useTableSort(filteredGrievances, {
    customGetters: {
      grievanceCode: (g) => g.grievanceCode,
      issueTitle: (g) => g.issueTitle,
      project: (g) => g.project?.title || g.projectId,
      status: (g) => g.status,
      createdAt: (g) => g.createdAt,
    },
  });

  const getStageBadge = (status: string) => {
    if (status === "CLOSED") {
      return <span className="inline-flex rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">Closed</span>;
    }
    if (status === "LEVEL_2_RESOLVED" || status === "LEVEL_1_RESOLVED") {
      return <span className="inline-flex rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">Resolved</span>;
    }
    if (status.includes("ESCALAT") || status === "LEVEL_2") {
      return <span className="inline-flex rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">Level 2: State Cell / JS</span>;
    }
    return <span className="inline-flex rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">Level 1: District CSR Cell</span>;
  };

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-3 py-5 sm:px-6 sm:py-6 md:px-8 text-slate-900">
        {/* --- PAGE HEADER --- */}
        <GovPageHeader
          title="Grievance Redressal & Dispute Management Portal"
          description="Hierarchical grievance handling across District Nodal Officers, District CSR Cells, Main Organization Heads, and the State CSR Secretariat."
          eyebrow="Government of Maharashtra • CSR Redressal Mechanism"
          actions={
            <Button
              size="sm"
              onClick={handleOpenRaiseModal}
              className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-sm"
            >
              <Plus size={14} className="mr-1.5" />
              Raise New Grievance
            </Button>
          }
        />

        {/* --- 4 STANDARD KPI CARDS --- */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Grievances Logged"
            value={loading ? "…" : stats.total || grievances.length}
            icon={AlertCircle}
            index={0}
            colorTheme="blue"
            sublabel="Logged project & compliance disputes"
          />
          <StatCard
            label="Level 1: District / Org Review"
            value={loading ? "…" : stats.level1Pending}
            icon={Clock}
            index={1}
            colorTheme="amber"
            sublabel="Active with District Nodal / Org Head"
          />
          <StatCard
            label="Level 2: State CSR Cell / JS"
            value={loading ? "…" : stats.level2Escalated}
            icon={ShieldAlert}
            index={2}
            colorTheme="rose"
            sublabel="Escalated for State Secretariat action"
          />
          <StatCard
            label="Resolved & Closed"
            value={loading ? "…" : stats.resolved}
            icon={CheckCircle2}
            index={3}
            colorTheme="emerald"
            sublabel="Formal resolution completed"
          />
        </StatCardGroup>


        {/* --- FILTER & SEARCH TOOLBAR --- */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
            <button
              onClick={() => setLevelFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                levelFilter === "ALL"
                  ? "bg-white text-blue-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Grievances
            </button>
            <button
              onClick={() => setLevelFilter("LEVEL_1")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                levelFilter === "LEVEL_1"
                  ? "bg-white text-blue-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Level 1 (District / Org)
            </button>
            <button
              onClick={() => setLevelFilter("LEVEL_2")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                levelFilter === "LEVEL_2"
                  ? "bg-white text-blue-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Level 2 (State Cell / JS)
            </button>
            <button
              onClick={() => setLevelFilter("RESOLVED")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
                levelFilter === "RESOLVED"
                  ? "bg-white text-blue-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Resolved / Closed
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 md:max-w-md">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by code, title, project, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="RAISED">Raised</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="LEVEL_1_REVIEW">Level 1 Review</option>
              <option value="LEVEL_1_RESOLVED">Level 1 Resolved</option>
              <option value="ESCALATED_TO_STATE_CELL">Escalated to State Cell</option>
              <option value="LEVEL_2_RESOLVED">Level 2 Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* --- MAIN GRIEVANCE TABLE / CARDS CONTAINER --- */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-blue-900" />
              <p className="text-xs font-semibold text-slate-500">Loading grievance redressal queue...</p>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle size={36} className="text-rose-500" />
              <p className="text-sm font-bold text-slate-800">Failed to load grievances</p>
              <p className="text-xs text-slate-500">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchGrievances}>
                Retry
              </Button>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-900">
                <ShieldAlert size={26} />
              </div>
              <p className="text-sm font-bold text-slate-900">No Grievances Found</p>
              <p className="text-xs text-slate-500 max-w-sm">
                {search || statusFilter !== "all" || levelFilter !== "ALL"
                  ? "No records match the selected filter criteria."
                  : "No grievances or disputes logged. If you have any project roadblocks or compliance delays, click 'Raise New Grievance'."}
              </p>
              <Button
                size="sm"
                onClick={handleOpenRaiseModal}
                className="mt-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs"
              >
                <Plus size={13} className="mr-1.5" />
                Raise First Grievance
              </Button>
            </div>
          ) : (
            <>
              {/* --- MOBILE CARDS --- */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {sortedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/grievances/${item.id}`)}
                    className="flex flex-col gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 hover:bg-slate-100/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-900">{item.grievanceCode}</span>
                      {getStageBadge(item.status)}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.issueTitle}</p>
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{item.issueDescription}</p>
                    </div>

                    {item.project && (
                      <div className="p-2 rounded-lg bg-white border border-slate-200/80 text-[11px] text-slate-700">
                        <span className="font-bold text-slate-900">{item.project.projectCode}: </span>
                        {item.project.title} ({item.project.district})
                      </div>
                    )}

                    <div className="flex items-end justify-between border-t border-slate-200/80 pt-2 text-[11px]">
                      <div>
                        <p className="font-semibold text-slate-800">{item.raisedByUser?.email || "Nodal Officer"}</p>
                        <p className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="inline-flex items-center text-xs font-bold text-blue-900">
                        View Details <ChevronRight size={13} className="ml-0.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- DESKTOP TABLE --- */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <SortableTh sortKey="grievanceCode" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                        Grievance Code
                      </SortableTh>
                      <SortableTh sortKey="project" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                        Convergence Project
                      </SortableTh>
                      <SortableTh sortKey="issueTitle" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                        Issue Summary
                      </SortableTh>
                      <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                        Redressal Level & Status
                      </SortableTh>
                      <SortableTh sortKey="createdAt" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                        Date Raised
                      </SortableTh>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sortedItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => router.push(`/grievances/${item.id}`)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-blue-900">
                          {item.grievanceCode}
                        </td>
                        <td className="px-4 py-3.5 max-w-xs">
                          {item.project ? (
                            <div>
                              <p className="font-bold text-slate-900 line-clamp-1">{item.project.title}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {item.project.projectCode} • {item.project.district}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">{item.projectId.slice(0, 8)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 max-w-sm">
                          <p className="font-bold text-slate-900 line-clamp-1">{item.issueTitle}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.issueDescription}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {getStageBadge(item.status)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/grievances/${item.id}`);
                            }}
                            className="text-xs font-bold text-blue-900 border-slate-200 hover:bg-slate-50"
                          >
                            View Case
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* --- RAISE GRIEVANCE MODAL --- */}
        <GovModal
          open={showRaiseModal}
          onClose={() => setShowRaiseModal(false)}
          title="Raise Project Grievance"
          width={600}
        >
          {submitSuccess ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Grievance Successfully Registered</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {submitSuccess.msg}
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between max-w-sm mx-auto">
                <span className="font-mono text-sm font-bold text-blue-900">{submitSuccess.trackingCode}</span>
                <button
                  onClick={() => handleCopy(submitSuccess.trackingCode)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-900"
                >
                  {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedCode ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Assigned to Level 1 (District CSR Cell & Department Head). If unresolved within 15 days, it automatically escalates to Level 2 (State CSR Cell).
              </p>
              <Button
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs"
                onClick={() => setShowRaiseModal(false)}
              >
                Done & Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitGrievance} className="space-y-3.5">
              {submitError && <GovAlert variant="danger">{submitError}</GovAlert>}

              {/* Project Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Linked Convergence Project <span className="text-rose-500">*</span>
                </label>
                {projectsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2 border rounded-xl">
                    <Loader2 size={13} className="animate-spin" /> Loading active projects...
                  </div>
                ) : projectsList.length > 0 ? (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  >
                    <option value="">Select an active Convergence Project</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectCode} — {p.title} ({p.district})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Project UUID or Code"
                    value={customProjectId}
                    onChange={(e) => setCustomProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-mono"
                    required
                  />
                )}
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grievance Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority / Severity
                  </label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  >
                    <option value="NORMAL">Normal (15-day Level 1 SLA)</option>
                    <option value="HIGH">High (Urgent milestone block)</option>
                    <option value="CRITICAL">Critical (Immediate escalation)</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Issue Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Summary of grievance, vendor dispute, or approval bottleneck..."
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Grievance Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide chronological details, officer names, affected milestones, or pending approvals (min 15 characters)..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>

              {/* Declaration Checkbox */}
              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-900 focus:ring-blue-600"
                />
                <span>
                  I declare that the information provided is accurate and pertains to official CSR project execution in accordance with the Maharashtra CSR Governance Framework.
                </span>
              </label>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRaiseModal(false)}
                  disabled={submitLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin mr-1.5" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Grievance"
                  )}
                </Button>
              </div>
            </form>
          )}
        </GovModal>
      </div>
    </GovPortalLayout>
  );
}

