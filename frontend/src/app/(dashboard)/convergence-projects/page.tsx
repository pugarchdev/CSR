"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { MAHARASHTRA_DISTRICTS } from "@/lib/locationData";
import {
  Layers, Search, MapPin, Building2, Coins, CheckCircle2, Eye, FileText,
  Landmark, ArrowRightLeft, AlertCircle, Check, Loader2, RefreshCw, X,
  Filter, Briefcase, ShieldCheck, Tag, ChevronRight, Sparkles, SlidersHorizontal
} from "lucide-react";

interface Project {
  id: string;
  projectId: string;
  title: string;
  company: string;
  implementingAgency: string;
  department: string;
  district: string;
  taluka?: string;
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
  { label: "Approved", value: "APPROVED" },
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "On Hold", value: "ON_HOLD" },
];

const deptOptions = [
  { label: "All Departments", value: "" },
  { label: "Collectorate", value: "COLLECTORATE" },
  { label: "Zilla Parishad", value: "ZILLA_PARISHAD" },
  { label: "Municipal Corporation", value: "MUNICIPAL_CORPORATION" },
];

const SECTOR_OPTIONS = [
  "All Sectors",
  "Education",
  "Healthcare",
  "Environment & Sustainability",
  "Rural Development",
  "Water & Sanitation",
  "Skill Development",
  "Women & Child Welfare",
  "Infrastructure",
  "General CSR"
];

function DepartmentBadge({ type }: { type?: string }) {
  if (!type) return null;
  if (type === "COLLECTORATE") {
    return (
      <span className="inline-flex items-center gap-1 font-extrabold text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs">
        <Landmark size={11} className="text-amber-700 shrink-0" /> Collectorate
      </span>
    );
  }
  if (type === "ZILLA_PARISHAD") {
    return (
      <span className="inline-flex items-center gap-1 font-extrabold text-[10px] bg-blue-50 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-md shadow-2xs">
        <Building2 size={11} className="text-blue-700 shrink-0" /> Zilla Parishad
      </span>
    );
  }
  if (type === "MUNICIPAL_CORPORATION") {
    return (
      <span className="inline-flex items-center gap-1 font-extrabold text-[10px] bg-purple-50 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-md shadow-2xs">
        <Building2 size={11} className="text-purple-700 shrink-0" /> Municipal Corp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-extrabold text-[10px] bg-slate-50 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-md shadow-2xs">
      <Building2 size={11} className="text-slate-600 shrink-0" /> {type.replace(/_/g, " ")}
    </span>
  );
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const initialDeptParam = searchParams.get("dept");

  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const roleDetails = useAuthStore((s) => s.roleDetails);

  const activeRoles = useMemo(() => {
    const list: string[] = [];
    if (user?.role) list.push(String(user.role).toUpperCase());
    if (user?.roleSlug) list.push(String(user.roleSlug).toUpperCase());
    (roles || []).forEach((r) => {
      if (typeof r === "string") list.push(r.toUpperCase());
      else if (r && typeof r === "object") {
        if ((r as any).slug) list.push(String((r as any).slug).toUpperCase());
        if ((r as any).name) list.push(String((r as any).name).toUpperCase());
      }
    });
    return list;
  }, [user, roles]);

  const isCompany = useMemo(() => {
    return activeRoles.some(r => r.includes("COMPANY") || r.includes("CORPORATE") || r === "8" || r.includes("ROLE_8")) || user?.roleId === 8;
  }, [activeRoles, user]);

  const isStateAdmin = useMemo(() => {
    return activeRoles.some(r =>
      r === "SUPER_ADMIN" ||
      r === "JOINT_SECRETARY" ||
      r === "PLANNING_SECRETARY" ||
      r === "STATE_CSR_CELL" ||
      r === "1" ||
      r === "2" ||
      r === "3"
    ) || [1, 2, 3].includes(user?.roleId as any);
  }, [activeRoles, user]);

  const userOrg = (user as any)?.organization;
  const userGovType = userOrg?.governmentType || (user as any)?.governmentType;
  const userDistrict = userOrg?.district || (user as any)?.district || "";

  const isCollector = useMemo(() => {
    return userGovType === "COLLECTORATE" ||
      activeRoles.some(r => r.includes("COLLECTOR")) ||
      (user?.roleId === 7 && userGovType === "COLLECTORATE");
  }, [userGovType, activeRoles, user]);

  const isZP = useMemo(() => {
    return userGovType === "ZILLA_PARISHAD";
  }, [userGovType]);

  const isMNC = useMemo(() => {
    return userGovType === "MUNICIPAL_CORPORATION";
  }, [userGovType]);

  const isGovtDepartment = useMemo(() => {
    return userGovType || user?.roleId === 7 || activeRoles.some(r => r.includes("GOVERNMENT") || r === "7");
  }, [userGovType, user, activeRoles]);

  const companyName = userOrg?.name || (user as any)?.companyName || "";
  const deptName = userOrg?.name || "";

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
  const [sectorFilter, setSectorFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
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

  const rawProjects: any[] = useMemo(() => {
    if (Array.isArray(apiResponse)) return apiResponse;
    if (Array.isArray(apiResponse?.data)) return apiResponse.data;
    if (Array.isArray(apiResponse?.data?.projects)) return apiResponse.data.projects;
    if (Array.isArray(apiResponse?.projects)) return apiResponse.projects;
    return [];
  }, [apiResponse]);

  const projectsList: Project[] = useMemo(() => {
    return rawProjects.map((p: any, index: number) => ({
      id: p.id || String(index + 1),
      projectId: p.projectId || p.projectCode || `PRJ-MH-2026-${String(index + 10).padStart(4, "0")}`,
      title: p.title || p.projectName || "CSR Convergence Project",
      company: p.corporatePartner?.name || p.approvalSourceEnquiry?.corporateName || p.corporateName || p.company || (isCompany ? companyName : "Corporate Partner"),
      implementingAgency: p.implementingAgency?.name || p.implementingAgency || p.agencyName || "State Implementing Trust",
      department: p.organization?.name || p.department || "Planning Department",
      district: p.district || p.location || "Maharashtra",
      taluka: p.taluka || "",
      sector: p.sector || "General CSR",
      budget: p.approvedBudget || p.budget || 0,
      spent: p.utilizedAmount || (Array.isArray(p.milestones) ? p.milestones.reduce((acc: number, m: any) => acc + Number(m.fundsUtilized || 0), 0) : 0),
      startDate: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "2026-01-01",
      endDate: "2026-12-31",
      status: p.status || "IN_PROGRESS",
      progress: p.physicalProgressPercent || p.progress || 0,
      governmentType: p.organization?.governmentType,
      organizationId: p.organizationId || p.organization?.id,
    }));
  }, [rawProjects, isCompany, companyName]);

  // Dynamic Department Breakdown Counts
  const deptCounts = useMemo(() => {
    return {
      all: projectsList.length,
      collectorate: projectsList.filter(p => p.governmentType === "COLLECTORATE").length,
      zp: projectsList.filter(p => p.governmentType === "ZILLA_PARISHAD").length,
      mnc: projectsList.filter(p => p.governmentType === "MUNICIPAL_CORPORATION").length,
    };
  }, [projectsList]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        project.title.toLowerCase().includes(q) ||
        project.projectId.toLowerCase().includes(q) ||
        project.company.toLowerCase().includes(q) ||
        project.implementingAgency.toLowerCase().includes(q) ||
        project.district.toLowerCase().includes(q) ||
        project.department.toLowerCase().includes(q) ||
        project.sector.toLowerCase().includes(q);

      const matchesStatus = statusFilter ? project.status === statusFilter : true;
      const matchesDept = deptFilter ? project.governmentType === deptFilter : true;
      const matchesSector = sectorFilter && sectorFilter !== "All Sectors"
        ? project.sector.toLowerCase().includes(sectorFilter.toLowerCase())
        : true;
      const matchesDistrict = districtFilter ? project.district.toLowerCase() === districtFilter.toLowerCase() : true;

      return matchesSearch && matchesStatus && matchesDept && matchesSector && matchesDistrict;
    });
  }, [projectsList, searchQuery, statusFilter, deptFilter, sectorFilter, districtFilter]);

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

  const totalOutlay = useMemo(() => {
    return projectsList.reduce((acc, p) => acc + p.budget, 0);
  }, [projectsList]);

  const formattedOutlay = useMemo(() => {
    if (totalOutlay >= 10000000) return `₹${(totalOutlay / 10000000).toFixed(2)} Cr`;
    if (totalOutlay >= 100000) return `₹${(totalOutlay / 100000).toFixed(2)} Lakhs`;
    return `₹${totalOutlay.toLocaleString("en-IN")}`;
  }, [totalOutlay]);

  const completedCount = useMemo(() => projectsList.filter(p => p.status === "COMPLETED").length, [projectsList]);
  const inProgressCount = useMemo(() => projectsList.filter(p => p.status === "IN_PROGRESS").length, [projectsList]);
  const approvedCount = useMemo(() => projectsList.filter(p => p.status === "APPROVED" || p.status === "SUBMITTED").length, [projectsList]);

  const hasActiveFilters = Boolean(searchQuery || statusFilter || deptFilter || (sectorFilter && sectorFilter !== "All Sectors") || districtFilter);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setDeptFilter("");
    setSectorFilter("");
    setDistrictFilter("");
  };

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

  // Header Title and Context Eyebrow
  const pageTitle = isCollector
    ? `District Convergence Projects — ${userDistrict || "District"}`
    : isZP
    ? `Zilla Parishad Projects — ${userDistrict || "District"}`
    : isMNC
    ? `Municipal Corporation Projects — ${userDistrict || "District"}`
    : isCompany
    ? `${companyName || "Corporate"} Funded Projects`
    : isGovtDepartment && deptName
    ? `${deptName} Convergence Projects`
    : "Convergence Projects Register";

  const pageDescription = isCollector
    ? `District-wide view of all approved CSR convergence projects across Collectorate, Zilla Parishad, and Municipal Corporation in ${userDistrict || "your district"}.`
    : isZP
    ? `Active CSR convergence projects assigned to Zilla Parishad, ${userDistrict || "your district"} for execution and milestone monitoring.`
    : isMNC
    ? `Active CSR convergence projects assigned to Municipal Corporation, ${userDistrict || "your district"} for urban civic execution.`
    : isCompany
    ? `Manage and monitor your enterprise's active CSR convergence projects, milestone progress, and financial fund utilization.`
    : isGovtDepartment
    ? `Active CSR convergence projects assigned to your department following Joint Secretary executive sanction.`
    : "Track, inspect, and manage statewide CSR convergence projects across all 36 Maharashtra districts.";

  const scopeBadgeText = isCollector
    ? "District-Wide Oversight (Collectorate)"
    : isZP
    ? "Zilla Parishad Scope"
    : isMNC
    ? "Municipal Corporation Scope"
    : isCompany
    ? "Corporate Partner"
    : isStateAdmin
    ? "Statewide Register"
    : "Department Assigned Scope";

  return (
    <GovPortalLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 text-slate-900">

        {/* ─── Page Header with Scope Badge ─── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-900 text-white shadow-2xs">
              <ShieldCheck size={13} />
              {scopeBadgeText}
            </span>
            {userDistrict && !isStateAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <MapPin size={11} className="text-blue-700" />
                {userDistrict}
              </span>
            )}
          </div>
          <StandardPageHeader
            title={pageTitle}
            category="Projects & Milestones"
            description={pageDescription}
          />
        </div>

        {/* ─── KPI Stat Cards (4-Column Group) ─── */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Assigned Projects"
            value={isLoading ? "…" : projectsList.length}
            icon={Layers}
            index={0}
            colorTheme="blue"
            sublabel={isCollector ? "All district CSR projects" : isZP || isMNC ? "Assigned to your organization" : "Total active register"}
          />
          <StatCard
            label="Total Outlay Budget"
            value={isLoading ? "…" : formattedOutlay}
            icon={Coins}
            index={1}
            colorTheme="amber"
            sublabel={isCollector ? "District CSR commitment" : "Sanctioned project outlay"}
          />
          <StatCard
            label="Active In Execution"
            value={isLoading ? "…" : inProgressCount}
            icon={CheckCircle2}
            index={2}
            colorTheme="purple"
            sublabel="Under field milestone rollout"
          />
          <StatCard
            label="100% Completed"
            value={isLoading ? "…" : completedCount}
            icon={CheckCircle2}
            index={3}
            colorTheme="emerald"
            sublabel="Fully verified & utilized"
          />
        </StatCardGroup>

        {/* ─── Filter & Control Workspace ─── */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          {/* Main Top Row: Search + Status Tabs + Refresh + ViewToggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search project title, ID, corporate partner, department, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-9 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Status Segmented Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 overflow-x-auto shrink-0">
              {statusOptions.map((opt) => {
                const isSelected = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-blue-900 text-white shadow-xs scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Refresh & View Toggle */}
            <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                title="Refresh projects register"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-2xs transition-all cursor-pointer group disabled:opacity-60"
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

          {/* Secondary Filter Row: Department (Collector/State) + Sector + District */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Department Filter Pills (Collectorate or State Admin) */}
              {(isCollector || isStateAdmin) && (
                <div className="flex items-center gap-1.5 bg-amber-50/60 border border-amber-200/80 p-1 rounded-2xl">
                  <span className="text-[11px] font-black text-amber-900 px-2 flex items-center gap-1">
                    <Landmark size={12} className="text-amber-700" /> Dept:
                  </span>
                  {deptOptions.map((opt) => {
                    const isSelected = deptFilter === opt.value;
                    const count = opt.value === ""
                      ? deptCounts.all
                      : opt.value === "COLLECTORATE"
                      ? deptCounts.collectorate
                      : opt.value === "ZILLA_PARISHAD"
                      ? deptCounts.zp
                      : deptCounts.mnc;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDeptFilter(opt.value)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-amber-900 text-white shadow-2xs"
                            : "text-amber-950 hover:bg-amber-100/80"
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isSelected ? "bg-amber-950/40 text-amber-100" : "bg-amber-200/60 text-amber-900"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sector Dropdown Filter */}
              <div className="flex items-center gap-1">
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer shadow-2xs"
                >
                  {SECTOR_OPTIONS.map((sec) => (
                    <option key={sec} value={sec === "All Sectors" ? "" : sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* District Dropdown Filter (for State Admins) */}
              {isStateAdmin && (
                <div className="flex items-center gap-1">
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">All 36 Districts</option>
                    {MAHARASHTRA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d} District
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Results Count & Clear Filters */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 ml-auto">
              <span>Showing <strong className="text-slate-900 font-black">{filteredProjects.length}</strong> of {projectsList.length} Projects</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                >
                  <X size={12} /> Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Projects Display View (Grid / List) ─── */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader label="Loading Assigned Convergence Projects..." />
          </div>
        ) : projectsList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
              <FileText size={28} />
            </div>
            <h3 className="text-base font-black text-slate-900">
              {isZP || isMNC || (isGovtDepartment && !isCollector)
                ? "No Projects Assigned to Your Department Yet"
                : isCollector
                ? `No Active CSR Projects in ${userDistrict || "District"}`
                : "No Convergence Projects Recorded"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {isZP || isMNC || (isGovtDepartment && !isCollector)
                ? "Once a Corporate Enquiry receives Joint Secretary executive sanction and is allocated to your organization, it will appear here for project kickoff and milestone execution."
                : isCollector
                ? `Projects sanctioned by the Joint Secretary for ${userDistrict || "this district"} across Collectorate, ZP, and Municipal Corporation will automatically appear here.`
                : "There are currently no active CSR convergence projects in the platform database."}
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs space-y-3">
            <Filter size={32} className="mx-auto text-slate-400" />
            <h3 className="text-sm font-black text-slate-900">No Projects Match Your Filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query, sector, department, or status filters.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-black hover:bg-blue-950 transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* ─── GRID VIEW (VIBRANT CARDS) ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredProjects.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.25) }}
                className="group relative rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xl hover:border-blue-300 transition-all duration-200 flex flex-col justify-between gap-4 overflow-hidden"
              >
                {/* Top Accent Gradient Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-indigo-700 to-teal-600" />

                {/* Card Header: Project Code + Dept Badge + Status Badge */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-[10.5px] font-black text-blue-950 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                      {p.projectId}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <DepartmentBadge type={p.governmentType} />
                      <GovStatusBadge variant={p.status === "COMPLETED" ? "success" : p.status === "IN_PROGRESS" ? "info" : "warning"}>
                        {p.status.replace(/_/g, " ")}
                      </GovStatusBadge>
                    </div>
                  </div>

                  {/* Project Title */}
                  <Link
                    href={`/convergence-projects/${p.id}`}
                    className="block font-black text-sm text-slate-900 group-hover:text-blue-950 transition-colors line-clamp-2 leading-snug no-underline hover:underline"
                  >
                    {p.title}
                  </Link>

                  {/* Corporate Partner & Department Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold truncate">
                      <Briefcase size={13} className="text-indigo-700 shrink-0" />
                      <span className="truncate">{p.company}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 truncate">
                      <Building2 size={13} className="text-blue-700 shrink-0" />
                      <span className="truncate font-semibold">{p.department}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        {p.district}{p.taluka && p.taluka !== "NA" ? `, ${p.taluka}` : ""}
                      </span>
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] uppercase truncate max-w-[120px]">
                        {p.sector}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Progress Bar + Outlay Budget + Action Buttons */}
                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                  {/* Physical Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-500">Physical Progress</span>
                      <span className={p.progress === 100 ? "text-emerald-700 font-black" : "text-blue-900 font-black"}>
                        {p.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          p.progress === 100
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600"
                        }`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Outlay Budget & Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Outlay Budget</span>
                      <span className="font-black text-blue-950 text-xs font-mono">
                        {p.budget >= 10000000
                          ? `₹${(p.budget / 10000000).toFixed(2)} Cr`
                          : `₹${(p.budget / 100000).toFixed(1)}L`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCollector && (
                        <button
                          type="button"
                          onClick={() => handleOpenReassign(p)}
                          className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                          title="Reassign to another department in district"
                        >
                          <ArrowRightLeft size={12} className="text-amber-700" />
                          <span>Reassign</span>
                        </button>
                      )}
                      <Link
                        href={`/convergence-projects/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-white bg-blue-900 hover:bg-blue-950 px-3.5 py-1.5 rounded-xl shadow-xs transition-all no-underline"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* ─── LIST VIEW (TABLE) ─── */
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm overflow-x-auto">
            <table className="gov-table w-full text-xs">
              <thead>
                <tr>
                  <SortableTh sortKey="projectId" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Project ID</SortableTh>
                  <SortableTh sortKey="title" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Project & Corporate</SortableTh>
                  <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Department</th>
                  <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Sector</th>
                  <SortableTh sortKey="district" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Location</SortableTh>
                  <SortableTh sortKey="progress" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Progress</SortableTh>
                  <SortableTh sortKey="budget" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Outlay (₹)</SortableTh>
                  <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>Status</SortableTh>
                  <th className="px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-center text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="font-mono font-black text-blue-900">
                      <Link href={`/convergence-projects/${p.id}`} className="hover:underline">
                        {p.projectId}
                      </Link>
                    </td>
                    <td>
                      <div className="font-black text-slate-900 max-w-[240px] truncate">{p.title}</div>
                      <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5 truncate">
                        <Briefcase size={11} className="text-indigo-700 shrink-0" />
                        <span className="truncate">{p.company}</span>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <DepartmentBadge type={p.governmentType} />
                        <div className="text-[11px] text-slate-600 font-medium truncate max-w-[160px]">
                          {p.department}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10.5px]">
                        {p.sector}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-slate-800 font-semibold">
                        <MapPin size={12} className="text-blue-700 shrink-0" />
                        {p.district}
                      </span>
                    </td>
                    <td>
                      <div className="w-24 space-y-1">
                        <div className="text-[10px] font-black text-slate-700 flex justify-between">
                          <span>Progress</span>
                          <span className={p.progress === 100 ? "text-emerald-700" : "text-blue-900"}>{p.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.progress === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-black text-blue-950 font-mono">
                        {p.budget >= 10000000
                          ? `₹${(p.budget / 10000000).toFixed(2)} Cr`
                          : `₹${(p.budget / 100000).toFixed(1)}L`}
                      </div>
                    </td>
                    <td>
                      <GovStatusBadge variant={p.status === "COMPLETED" ? "success" : p.status === "IN_PROGRESS" ? "info" : "warning"}>
                        {p.status.replace(/_/g, " ")}
                      </GovStatusBadge>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isCollector && (
                          <button
                            type="button"
                            onClick={() => handleOpenReassign(p)}
                            className="inline-flex items-center justify-center p-1.5 text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                            title="Reassign to another department"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                        )}
                        <Link
                          href={`/convergence-projects/${p.id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-black text-blue-900 hover:text-white bg-blue-50 hover:bg-blue-900 border border-blue-200 hover:border-blue-900 rounded-xl transition-all shadow-2xs"
                          title="View Details"
                        >
                          <Eye size={13} className="mr-1" />
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── District Collector Reassignment Modal ─── */}
        <GovModal
          open={reassignModalOpen}
          onClose={() => setReassignModalOpen(false)}
          title="Reassign Project Department (District Collector)"
          width={580}
        >
          {selectedProject && (
            <form onSubmit={handleExecuteReassign} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-black text-slate-900 text-sm">{selectedProject.title}</div>
                <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                  <span className="font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 text-[10.5px]">
                    {selectedProject.projectId}
                  </span>
                  <span>Currently assigned: <strong>{selectedProject.department}</strong></span>
                  <DepartmentBadge type={selectedProject.governmentType} />
                </div>
              </div>

              {reassignError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center gap-2 font-bold">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{reassignError}</span>
                </div>
              )}

              {reassignSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center gap-2 font-black">
                  <Check size={16} className="shrink-0 text-emerald-600" />
                  <span>{reassignSuccess}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-black text-slate-800">
                  Select Target Government Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
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
                <p className="text-[11px] text-slate-500">
                  Only registered departments (Collectorate, Zilla Parishad, Municipal Corporation) in {selectedProject.district} are eligible.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block font-black text-slate-800">
                  Reason for Reassignment <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Project falls under Municipal Corporation urban jurisdiction rather than ZP rural limits."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning || !targetOrgId}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-black rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
