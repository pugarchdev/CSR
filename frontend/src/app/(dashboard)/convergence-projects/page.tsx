"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch, invalidateCache } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovModal from "@/components/gov/GovModal";
import { Loader } from "@/components/ui/Loader";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import {
  Layers, Search, MapPin, Building2, Coins, CheckCircle2, Eye, FileText,
  Landmark, ArrowRightLeft, AlertCircle, Check, Loader2, RefreshCw
} from "lucide-react";

interface Project {
  id: string;
  projectId: string;
  title: string;
  company: string;
  implementingAgency: string;
  department: string;
  district: string;
  sector: string;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  governmentType?: string;
  organizationId?: string;
}

const statusOptions = [
  { label: "All Statuses", value: "" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "On Hold", value: "ON_HOLD" },
];

const deptOptions = [
  { label: "All Departments", value: "" },
  { label: "Collectorate", value: "COLLECTORATE" },
  { label: "Zilla Parishad", value: "ZILLA_PARISHAD" },
  { label: "Municipal Corporation", value: "MUNICIPAL_CORPORATION" },
];

function DepartmentBadge({ type }: { type?: string }) {
  if (!type) return null;
  if (type === "COLLECTORATE") {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md">
        <Landmark size={10} className="text-amber-600" /> Collectorate
      </span>
    );
  }
  if (type === "ZILLA_PARISHAD") {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-md">
        <Building2 size={10} className="text-blue-600" /> Zilla Parishad
      </span>
    );
  }
  if (type === "MUNICIPAL_CORPORATION") {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-purple-50 text-purple-800 border border-purple-200/80 px-2 py-0.5 rounded-md">
        <Building2 size={10} className="text-purple-600" /> Municipal Corp
      </span>
    );
  }
  return null;
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const initialDeptParam = searchParams.get("dept");

  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const activeRoles = (roles || []).length > 0 ? roles : (user?.role ? [user.role] : []);
  const isCompany = activeRoles.some(r => {
    const s = String(typeof r === "object" ? (r as any)?.code || (r as any)?.name || (r as any)?.id : r).toUpperCase();
    return s.includes("COMPANY") || s.includes("CORPORATE") || s.includes("SYSTEM_ROLE_8") || s === "8";
  });
  const isCollector = (user as any)?.organization?.governmentType === "COLLECTORATE" ||
    (user as any)?.role === "DISTRICT_COLLECTOR" ||
    ((user as any)?.roleId === 7 && (user as any)?.organization?.governmentType === "COLLECTORATE");

  const companyName = (user as any)?.organization?.name || (user as any)?.companyName || "";

  const { data: apiResponse, isLoading, isFetching, refetch } = useApiQuery<any>(
    ["convergence-projects-list"],
    "/convergence-projects",
    { staleTime: 30 * 1000 }
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    invalidateCache("/convergence-projects");
    const startTime = Date.now();
    try {
      await refetch();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 650 - elapsed);
      setTimeout(() => {
        setIsRefreshing(false);
      }, remaining);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>(() => {
    if (initialDeptParam === "zp") return "ZILLA_PARISHAD";
    if (initialDeptParam === "mnc") return "MUNICIPAL_CORPORATION";
    if (initialDeptParam === "collectorate") return "COLLECTORATE";
    return "";
  });
  const [viewMode, setViewMode] = useResponsiveViewMode();

  // Reassignment Modal State (for Collector)
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [targetOrgId, setTargetOrgId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState("");
  const [reassignSuccess, setReassignSuccess] = useState("");
  const [districtDepartments, setDistrictDepartments] = useState<any[]>([]);

  // Load district departments for Collector reassignment
  useEffect(() => {
    if (isCollector) {
      apiFetch<any[]>("/convergence-projects/district-departments")
        .then((res) => {
          if (Array.isArray(res)) setDistrictDepartments(res);
        })
        .catch(() => {});
    }
  }, [isCollector]);

  const rawProjects: any[] = Array.isArray(apiResponse)
    ? apiResponse
    : Array.isArray(apiResponse?.data)
    ? apiResponse.data
    : Array.isArray(apiResponse?.data?.projects)
    ? apiResponse.data.projects
    : Array.isArray(apiResponse?.projects)
    ? apiResponse.projects
    : [];

  const projectsList: Project[] = rawProjects.map((p: any, index: number) => ({
    id: p.id || String(index + 1),
    projectId: p.projectId || p.projectCode || `PRJ-2026-00${index + 40}`,
    title: p.title || p.projectName || "CSR Convergence Project",
    company: p.corporateName || p.company || p.organization?.name || "Corporate Partner",
    implementingAgency: p.implementingAgency || p.agencyName || "State Implementing Trust",
    department: p.organization?.name || p.department || "Planning Department",
    district: p.district || p.location || "Maharashtra",
    sector: p.sector || "CSR Development",
    budget: p.approvedBudget || p.budget || 0,
    spent: p.utilizedAmount || p.spent || 0,
    startDate: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "2026-01-01",
    endDate: "2026-12-31",
    status: p.status || "IN_PROGRESS",
    progress: p.physicalProgressPercent || p.progress || 0,
    governmentType: p.organization?.governmentType,
    organizationId: p.organizationId || p.organization?.id,
  }));

  const scopedProjects = isCompany && companyName
    ? projectsList.filter((p) =>
        p.company.toLowerCase().includes(companyName.toLowerCase()) ||
        companyName.toLowerCase().includes(p.company.toLowerCase())
      )
    : projectsList;

  const filteredProjects = scopedProjects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.implementingAgency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter ? project.status === statusFilter : true;
    const matchesDept = deptFilter ? project.governmentType === deptFilter : true;

    return matchesSearch && matchesStatus && matchesDept;
  });

  const { sortedItems: sortedProjects, sortKey, sortDirection, requestSort } = useTableSort(filteredProjects, {
    customGetters: {
      projectId: (p) => p.projectId,
      title: (p) => `${p.title} ${p.company}`,
      implementingAgency: (p) => p.implementingAgency,
      district: (p) => p.district,
      sector: (p) => p.sector,
      progress: (p) => p.progress,
      budget: (p) => p.budget,
      status: (p) => p.status,
    }
  });

  const totalOutlay = scopedProjects.reduce((acc, p) => acc + p.budget, 0);
  const formattedOutlay = totalOutlay >= 10000000
    ? `₹${(totalOutlay / 10000000).toFixed(2)} Cr`
    : totalOutlay > 0
    ? `₹${(totalOutlay / 100000).toFixed(1)} Lakhs`
    : "₹0.0 Cr";

  const completedCount = scopedProjects.filter(p => p.status === "COMPLETED").length;
  const inProgressCount = scopedProjects.filter(p => p.status === "IN_PROGRESS").length;

  const handleOpenReassign = (project: Project) => {
    setSelectedProject(project);
    setTargetOrgId("");
    setReassignReason("");
    setReassignError("");
    setReassignSuccess("");
    setReassignModalOpen(true);
  };

  const handleExecuteReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !targetOrgId) {
      setReassignError("Please select a target department organization.");
      return;
    }
    setReassigning(true);
    setReassignError("");
    setReassignSuccess("");
    try {
      await apiFetch(`/convergence-projects/${selectedProject.id}/collector-reassign`, {
        method: "POST",
        body: JSON.stringify({
          targetOrganizationId: targetOrgId,
          reason: reassignReason || "Reassigned by District Collector",
        }),
      });
      setReassignSuccess("Project reassigned successfully!");
      refetch();
      setTimeout(() => {
        setReassignModalOpen(false);
        setSelectedProject(null);
      }, 1500);
    } catch (err: any) {
      setReassignError(err?.message || "Failed to reassign project.");
    } finally {
      setReassigning(false);
    }
  };

  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">
        <StandardPageHeader
          title={isCollector ? `District Convergence Projects — ${(user as any)?.organization?.district || "District"}` : isCompany ? `${companyName || "Corporate"} Funded Projects` : "Convergence Projects Register"}
          category="Projects & Milestones"
          description={isCollector ? `District-wide view of all CSR projects across Collectorate, Zilla Parishad, and Municipal Corporation in ${(user as any)?.organization?.district || "your district"}.` : isCompany ? "Manage and monitor your company's active CSR convergence projects, milestones, and fund utilization." : "Track and manage statewide CSR convergence projects across Maharashtra districts."}
        />

        {/* Standard 4-Column KPI Cards */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Projects"
            value={isLoading ? "…" : scopedProjects.length}
            icon={Layers}
            index={0}
            colorTheme="blue"
            sublabel={isCollector ? "District-wide projects" : "Empaneled CSR projects"}
          />
          <StatCard
            label="Total Outlay Budget"
            value={isLoading ? "…" : formattedOutlay}
            icon={Coins}
            index={1}
            colorTheme="amber"
            sublabel={isCollector ? "District CSR outlay" : "Statewide CSR outlay"}
          />
          <StatCard
            label="Active In Progress"
            value={isLoading ? "…" : inProgressCount}
            icon={CheckCircle2}
            index={2}
            colorTheme="purple"
            sublabel="Under field execution"
          />
          <StatCard
            label="Completed Projects"
            value={isLoading ? "…" : completedCount}
            icon={CheckCircle2}
            index={3}
            colorTheme="emerald"
            sublabel="100% physical completion"
          />
        </StatCardGroup>

        {/* Controls & Filter Bar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search project title, ID, department, corporate, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none transition-all placeholder-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Status Filters */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === opt.value
                        ? "bg-white text-blue-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-slate-500">{filteredProjects.length} Projects</span>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                title="Refresh projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer group disabled:opacity-60"
              >
                <RefreshCw
                  size={13}
                  className={`transition-transform duration-300 ${
                    isRefreshing || isFetching
                      ? "animate-spin text-blue-600"
                      : "text-slate-500 group-hover:rotate-45"
                  }`}
                />
                <span className="hidden sm:inline">{isRefreshing || isFetching ? "Refreshing..." : "Refresh"}</span>
              </button>
              <ViewToggle view={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* Department Filter Pills (Collector or Multi-Department view) */}
          {isCollector && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Landmark size={12} className="text-amber-600" /> Filter Department:
              </span>
              {deptOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeptFilter(opt.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    deptFilter === opt.value
                      ? "bg-blue-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader label="Loading Convergence Projects from Database..." />
          </div>
        ) : scopedProjects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
            <FileText className="mx-auto text-slate-300 mb-3" size={48} />
            <h3 className="text-base font-bold text-slate-800">No Convergence Projects Recorded</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no active CSR convergence projects in the database.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="group relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 p-5 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-4 overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
                      {p.projectId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <DepartmentBadge type={p.governmentType} />
                      <GovStatusBadge variant={p.status === "COMPLETED" ? "success" : p.status === "IN_PROGRESS" ? "info" : "warning"}>
                        {p.status.replace(/_/g, " ")}
                      </GovStatusBadge>
                    </div>
                  </div>
                  <h3 className="mt-3 font-extrabold text-sm text-slate-900 group-hover:text-blue-950 transition-colors line-clamp-2">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                    <Building2 size={13} className="text-blue-600" /> {p.department}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" /> Location: {p.district}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-500">Physical Progress</span>
                      <span className="text-blue-900">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.progress === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="font-extrabold text-blue-950">₹{(p.budget / 100000).toFixed(1)} Lakhs</span>
                    <div className="flex items-center gap-1.5">
                      {isCollector && (
                        <button
                          onClick={() => handleOpenReassign(p)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Reassign to another department"
                        >
                          <ArrowRightLeft size={12} /> Reassign
                        </button>
                      )}
                      <Link
                        href={`/convergence-projects/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye size={14} /> View
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs overflow-x-auto">
            <table className="gov-table w-full text-xs">
              <thead>
                <tr>
                  <SortableTh sortKey="projectId" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Project ID</SortableTh>
                  <SortableTh sortKey="title" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Project Title & Dept</SortableTh>
                  <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Department Type</th>
                  <SortableTh sortKey="implementingAgency" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Agency</SortableTh>
                  <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Location</SortableTh>
                  <SortableTh sortKey="progress" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Progress</SortableTh>
                  <SortableTh sortKey="budget" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Outlay (₹)</SortableTh>
                  <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Status</SortableTh>
                  <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-center text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.length > 0 ? (
                  sortedProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="font-mono font-bold text-blue-900">
                        <Link href={`/convergence-projects/${p.id}`} className="hover:underline">
                          {p.projectId}
                        </Link>
                      </td>
                      <td>
                        <div className="font-bold text-slate-900">{p.title}</div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <Building2 size={11} className="text-blue-700" /> {p.department}
                        </div>
                      </td>
                      <td>
                        <DepartmentBadge type={p.governmentType} />
                      </td>
                      <td className="text-slate-700 font-semibold">{p.implementingAgency}</td>
                      <td>
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <MapPin size={12} className="text-indigo-600" /> {p.district}
                        </span>
                      </td>
                      <td>
                        <div className="w-24">
                          <div className="text-[10px] font-bold text-slate-700 mb-0.5">{p.progress}%</div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.progress === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-extrabold text-blue-950 font-mono">₹{(p.budget / 100000).toFixed(1)}L</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {p.budget > 0 ? ((p.spent / p.budget) * 100).toFixed(0) : 0}% spent
                        </div>
                      </td>
                      <td>
                        <GovStatusBadge variant={p.status === "COMPLETED" ? "success" : p.status === "IN_PROGRESS" ? "info" : "warning"}>
                          {p.status.replace(/_/g, " ")}
                        </GovStatusBadge>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isCollector && (
                            <button
                              onClick={() => handleOpenReassign(p)}
                              className="inline-flex items-center justify-center p-1.5 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              title="Reassign to another department"
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                          )}
                          <Link
                            href={`/convergence-projects/${p.id}`}
                            className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500 font-medium">
                      No convergence projects match your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Collector Reassignment Modal */}
        <GovModal
          open={reassignModalOpen}
          onClose={() => setReassignModalOpen(false)}
          title="Reassign Project Department (District Collector)"
          width={580}
        >
          {selectedProject && (
            <form onSubmit={handleExecuteReassign} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900 text-sm">{selectedProject.title}</div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                    {selectedProject.projectId}
                  </span>
                  <span>Currently assigned: <strong>{selectedProject.department}</strong></span>
                  <DepartmentBadge type={selectedProject.governmentType} />
                </div>
              </div>

              {reassignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2 font-semibold">
                  <AlertCircle size={15} className="shrink-0 text-red-500" />
                  <span>{reassignError}</span>
                </div>
              )}

              {reassignSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-bold">
                  <Check size={15} className="shrink-0 text-emerald-600" />
                  <span>{reassignSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Select Target Government Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                >
                  <option value="">Select target department in {selectedProject.district}...</option>
                  {districtDepartments
                    .filter((d) => d.id !== selectedProject.organizationId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.governmentType === "ZILLA_PARISHAD" ? "Zilla Parishad" : d.governmentType === "MUNICIPAL_CORPORATION" ? "Municipal Corporation" : "Collectorate"})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Only main departments (Collectorate, Zilla Parishad, Municipal Corporation) in the same district are eligible.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Reason for Reassignment <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="E.g., JS assigned to ZP, but project falls within Municipal Corporation municipal limits."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:border-blue-600 focus:outline-none min-h-[80px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning || !targetOrgId}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {reassigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reassigning...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={14} /> Confirm Reassignment
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </GovModal>
      </div>
    </GovPortalLayout>
  );
}
