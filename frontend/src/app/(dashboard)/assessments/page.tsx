"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CheckCircle2,
  FileCheck2,
  Loader2,
  XCircle,
  ClipboardCheck,
  ArrowUpRight,
  Search,
  Building2,
  MapPin,
  Sparkles,
  User,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  Eye,
  ShieldCheck,
  DollarSign,
  RefreshCw,
  SlidersHorizontal,
  Grid,
  List,
  AlertTriangle,
  Building,
  Briefcase,
  Clock,
  ExternalLink,
  RotateCcw
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

// Master 13-Point Feasibility Checklist Seed Definitions
const MASTER_13_CHECKLIST = [
  { itemNumber: 1, dimension: "CSR Compliance", checkText: "Activity falls within Schedule VII of the Companies Act.", isCritical: true },
  { itemNumber: 2, dimension: "CSR Compliance", checkText: "Not a prohibited CSR activity.", isCritical: true },
  { itemNumber: 3, dimension: "Need Verification", checkText: "Addresses a genuine, verified development need.", isCritical: true },
  { itemNumber: 4, dimension: "Need Verification", checkText: "Does not duplicate an existing government scheme or ongoing project in same location.", isCritical: true },
  { itemNumber: 5, dimension: "Site Readiness", checkText: "For construction/renovation: site/land is available, clear, and in government ownership/control.", isCritical: true },
  { itemNumber: 6, dimension: "Site Readiness", checkText: "Required permissions/clearances are obtainable within reasonable time.", isCritical: true },
  { itemNumber: 7, dimension: "Site Readiness", checkText: "Required government support/personnel/access is confirmed.", isCritical: true },
  { itemNumber: 8, dimension: "Financial Viability", checkText: "Indicative budget is adequate for proposed scope.", isCritical: false },
  { itemNumber: 9, dimension: "Financial Viability", checkText: "Cost estimate is realistic and benchmarked.", isCritical: false },
  { itemNumber: 10, dimension: "Execution Capacity", checkText: "Implementing capacity exists.", isCritical: false },
  { itemNumber: 11, dimension: "Execution Capacity", checkText: "Timeline is realistic.", isCritical: false },
  { itemNumber: 12, dimension: "Sustainability", checkText: "Post-completion ownership of the asset is clear.", isCritical: true },
  { itemNumber: 13, dimension: "Sustainability", checkText: "Maintenance / recurring-cost responsibility is identified.", isCritical: true },
];

const DIMENSION_ICONS: Record<string, string> = {
  "CSR Compliance": "⚖️",
  "Need Verification": "🔍",
  "Site Readiness": "🏗️",
  "Financial Viability": "💰",
  "Execution Capacity": "⚡",
  "Sustainability": "🌿",
};

// Helper for Indian Currency Formatting
function formatINR(val?: number | string | null) {
  if (!val) return "Not specified";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
  return `₹${num.toLocaleString("en-IN")}`;
}

export default function AssessmentsPage() {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const roleNames = roles?.length ? roles : user?.role ? [user.role] : [];
  const isJs = roleNames.some((role) => /JOINT[ _-]?SECRETARY/i.test(String(role)));

  const { data: response, isLoading, refetch } = useApiQuery<any>(
    [isJs ? "js-pending-assessments" : "feasibility-assessments"],
    isJs ? "/js/assessments/pending" : "/feasibility"
  );

  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [recommendationFilter, setRecommendationFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"card" | "matrix">("card");

  // Selected Assessment for Modal Drawer
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

  const rawAssessments = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response?.data?.assessments)
    ? response.data.assessments
    : Array.isArray(response)
    ? response
    : [];

  // Extract list of unique districts for filter
  const allDistricts = useMemo(() => {
    const set = new Set<string>();
    rawAssessments.forEach((a: any) => {
      if (Array.isArray(a.targetDistricts)) {
        a.targetDistricts.forEach((d: string) => set.add(d));
      }
    });
    return Array.from(set);
  }, [rawAssessments]);

  // Filtered Assessments
  const filtered = useMemo(() => {
    return rawAssessments.filter((a: any) => {
      const term = search.toLowerCase();
      const matchSearch =
        !search ||
        (a.id || "").toLowerCase().includes(term) ||
        (a.enquiryId || "").toLowerCase().includes(term) ||
        (a.enquiry?.trackingId || "").toLowerCase().includes(term) ||
        (a.enquiry?.corporateName || "").toLowerCase().includes(term) ||
        (a.enquiry?.sector || "").toLowerCase().includes(term) ||
        (a.targetDepartment?.name || "").toLowerCase().includes(term) ||
        (a.executiveSummary || "").toLowerCase().includes(term) ||
        (a.recommendation || "").toLowerCase().includes(term) ||
        (a.assessedBy?.name || "").toLowerCase().includes(term);

      const matchStatus =
        statusFilter === "ALL" ||
        a.status === statusFilter ||
        (statusFilter === "APPROVED" && (a.status === "JS_APPROVED" || a.status === "APPROVED")) ||
        (statusFilter === "REJECTED" && (a.status === "JS_REJECTED" || a.status === "DO_NOT_PROCEED")) ||
        (statusFilter === "RETURNED" && (a.status === "RETURN_FOR_CLARIFICATION" || a.status === "RETURN_FOR_CORRECTION"));

      const matchRecommendation =
        recommendationFilter === "ALL" || a.recommendation === recommendationFilter;

      const matchDistrict =
        districtFilter === "ALL" ||
        (Array.isArray(a.targetDistricts) && a.targetDistricts.includes(districtFilter));

      return matchSearch && matchStatus && matchRecommendation && matchDistrict;
    });
  }, [rawAssessments, search, statusFilter, recommendationFilter, districtFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = rawAssessments.length;
    const fullyFeasible = rawAssessments.filter(
      (a: any) => a.recommendation === "FEASIBLE" || a.status === "FEASIBLE"
    ).length;
    const conditional = rawAssessments.filter(
      (a: any) => a.recommendation === "PROCEED_WITH_CONDITIONS"
    ).length;
    const pendingJs = rawAssessments.filter((a: any) => a.status === "SUBMITTED_TO_JS").length;
    const approved = rawAssessments.filter(
      (a: any) => a.status === "JS_APPROVED" || a.status === "APPROVED" || a.jsDecision === "PROCEED"
    ).length;

    return { total, fullyFeasible, conditional, pendingJs, approved };
  }, [rawAssessments]);

  // Export Filtered Assessments to CSV
  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = [
      "Assessment ID",
      "Enquiry ID",
      "Corporate Name",
      "Department",
      "Districts",
      "Recommendation",
      "Status",
      "Passed Items",
      "Assessed By",
      "Submitted At"
    ];
    const rows = filtered.map((a: any) => {
      const checklist = Array.isArray(a.checklist) ? a.checklist : [];
      const yesCount = checklist.filter((i: any) => i.answer === "YES").length;
      return [
        a.id,
        a.enquiryId,
        `"${a.enquiry?.corporateName || "N/A"}"`,
        `"${a.targetDepartment?.name || a.targetDepartmentId || "N/A"}"`,
        `"${Array.isArray(a.targetDistricts) ? a.targetDistricts.join(", ") : "Statewide"}"`,
        a.recommendation || "N/A",
        a.status || "N/A",
        `${yesCount}/13`,
        `"${a.assessedBy?.name || "RM"}"`,
        new Date(a.submittedAt || a.createdAt).toLocaleDateString()
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Feasibility_Assessments_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <GovPortalLayout>
      <main className="mx-auto min-h-screen max-w-screen-2xl space-y-5 px-4 py-4 md:px-6">
        {/* Page Header */}
        <GovPageHeader
          eyebrow={isJs ? "Joint Secretary Decision Desk" : "13-Factor Feasibility Audit"}
          title={isJs ? "Feasibility Decisions & Approvals" : "Feasibility Reports & Assessment Register"}
          description="Technical, financial, regulatory, and sustainability feasibility assessments compiled by Relationship Managers."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
                title="Refresh Assessments"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin text-blue-700" : ""} /> Refresh
              </button>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          }
        />

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Assessments"
            value={stats.total}
            icon={ClipboardCheck}
            index={0}
            badge="Register"
            sublabel="Compiled reports"
          />
          <StatCard
            label="100% Feasible"
            value={stats.fullyFeasible}
            icon={CheckCircle2}
            index={1}
            badge="13/13 Passed"
            sublabel="Clean compliance"
          />
          <StatCard
            label="Conditional"
            value={stats.conditional}
            icon={AlertTriangle}
            index={2}
            badge="Remediation"
            sublabel="Gaps with action plan"
          />
          <StatCard
            label="Pending JS Review"
            value={stats.pendingJs}
            icon={FileCheck2}
            index={3}
            badge="Awaiting JS"
            sublabel="Submitted to JS"
          />
          <StatCard
            label="Approved & Routed"
            value={stats.approved}
            icon={ShieldCheck}
            index={4}
            badge="Execution Pipeline"
            sublabel="Routed to DNC / Dept"
          />
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by assessment ID, enquiry ID, corporate name, sector, RM, or district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 self-end lg:self-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === "card" ? "bg-white text-blue-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Grid size={14} /> Detail Cards
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === "matrix" ? "bg-white text-blue-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List size={14} /> Matrix View
              </button>
            </div>
          </div>

          {/* Filter Options Strip */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center gap-1 text-slate-500 font-bold">
              <SlidersHorizontal size={14} /> Filters:
            </div>

            {/* Recommendation Filter */}
            <select
              value={recommendationFilter}
              onChange={(e) => setRecommendationFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="ALL">All Recommendations</option>
              <option value="FEASIBLE">100% Feasible</option>
              <option value="PROCEED_WITH_CONDITIONS">Proceed with Conditions</option>
              <option value="NOT_FEASIBLE">Not Feasible</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="ALL">All Workflow Statuses</option>
              <option value="SUBMITTED_TO_JS">Submitted to JS</option>
              <option value="APPROVED">Approved / JS Approved</option>
              <option value="REJECTED">Rejected / Do Not Proceed</option>
              <option value="RETURNED">Returned for Clarification</option>
            </select>

            {/* District Filter */}
            {allDistricts.length > 0 && (
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="ALL">All Target Districts ({allDistricts.length})</option>
                {allDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filters */}
            {(search || statusFilter !== "ALL" || recommendationFilter !== "ALL" || districtFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setRecommendationFilter("ALL");
                  setDistrictFilter("ALL");
                }}
                className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-800"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-900" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500 shadow-xs">
            <ClipboardCheck size={44} className="mx-auto mb-3 text-slate-300" />
            <p className="text-base font-bold text-slate-900">No feasibility assessments match your criteria</p>
            <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Relationship Managers compile 13-Factor Feasibility Assessments directly inside assigned Corporate Enquiries. Try resetting your search filters or browse corporate enquiries.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                href="/enquiries"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all"
              >
                View Corporate Enquiries <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
        ) : viewMode === "card" ? (
          /* Cards View Mode */
          <div className="space-y-6">
            {filtered.map((assessment: any) => (
              <AssessmentDetailCard
                key={assessment.id}
                assessment={assessment}
                isJs={isJs}
                onCompleted={refetch}
                onViewFullAudit={() => setSelectedAudit(assessment)}
              />
            ))}
          </div>
        ) : (
          /* Matrix / Table View Mode */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Assessment & Corporate</th>
                    <th className="px-4 py-3">Target Dept & District</th>
                    <th className="px-4 py-3">Assessed By (RM)</th>
                    <th className="px-4 py-3">13-Point Compliance</th>
                    <th className="px-4 py-3">Recommendation</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filtered.map((a: any) => {
                    const checklist = Array.isArray(a.checklist) ? a.checklist : [];
                    const yesCount = checklist.filter((i: any) => i.answer === "YES").length;
                    const percent = Math.round((yesCount / 13) * 100);

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-mono font-bold text-blue-900">#{a.id.slice(0, 8)}</p>
                          <p className="font-extrabold text-slate-900 mt-0.5">{a.enquiry?.corporateName || `Enquiry #${a.enquiryId.slice(0, 8)}`}</p>
                          <span className="text-[10px] text-slate-500">{a.enquiry?.sector || "Sector N/A"}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900">{a.targetDepartment?.name || a.targetDepartmentId || "Not specified"}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            📍 {Array.isArray(a.targetDistricts) ? a.targetDistricts.join(", ") : "Statewide"}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900">{a.assessedBy?.name || "Relationship Manager"}</p>
                          <p className="text-[10px] text-slate-500">{new Date(a.submittedAt || a.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 rounded-full bg-slate-100 h-2 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full ${percent === 100 ? "bg-emerald-500" : percent >= 80 ? "bg-blue-600" : "bg-amber-500"}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-[11px] text-slate-900">{yesCount}/13 YES</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              a.recommendation === "FEASIBLE"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : a.recommendation === "PROCEED_WITH_CONDITIONS"
                                ? "bg-amber-50 text-amber-900 border border-amber-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {a.recommendation?.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-900 border border-blue-200">
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedAudit(a)}
                            className="inline-flex items-center gap-1 rounded-xl bg-blue-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-800 transition-all"
                          >
                            <Eye size={13} /> View Audit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 13-Point Audit Details Modal / Slide-Over Drawer */}
        {selectedAudit && (
          <AuditDetailsModal assessment={selectedAudit} onClose={() => setSelectedAudit(null)} isJs={isJs} onCompleted={refetch} />
        )}
      </main>
    </GovPortalLayout>
  );
}

/**
 * Rich Assessment Detail Card Component displaying full 13 points, RM summary, conditions, and action controls
 */
function AssessmentDetailCard({
  assessment,
  isJs,
  onCompleted,
  onViewFullAudit
}: {
  assessment: any;
  isJs: boolean;
  onCompleted: () => void;
  onViewFullAudit: () => void;
}) {
  const [show13Points, setShow13Points] = useState(false);
  const [showJsPanel, setShowJsPanel] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");

  const checklist = Array.isArray(assessment.checklist) && assessment.checklist.length > 0 ? assessment.checklist : MASTER_13_CHECKLIST;
  const conditions = Array.isArray(assessment.conditions) ? assessment.conditions : [];

  const yesCount = checklist.filter((item: any) => item.answer === "YES").length;
  const noCount = checklist.filter((item: any) => item.answer === "NO").length;
  const naCount = checklist.filter((item: any) => item.answer === "NA").length;
  const percent = Math.round((yesCount / 13) * 100);

  const decide = async (decision: "PROCEED" | "PROCEED_WITH_CONDITIONS" | "DO_NOT_PROCEED" | "RETURN_FOR_CLARIFICATION" | "RETURN_FOR_CORRECTION") => {
    setWorking(decision);
    setMessage("");
    try {
      const result = await apiFetch<any>(`/js/assessments/${assessment.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, reason })
      });
      setMessage(result?.message || "Joint Secretary decision recorded.");
      onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record decision.");
    } finally {
      setWorking("");
    }
  };

  const handlePrintCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Feasibility Audit Report - #${assessment.id.slice(0, 8)}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f1f5f9; }
            .badge { padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
            .yes { background: #d1fae5; color: #065f46; }
            .no { background: #ffe4e6; color: #9f1239; }
          </style>
        </head>
        <body>
          <h1>Maharashtra CSR Feasibility Audit Report</h1>
          <p><strong>Assessment ID:</strong> #${assessment.id}</p>
          <p><strong>Corporate Enquiry:</strong> ${assessment.enquiry?.corporateName || assessment.enquiryId}</p>
          <div class="grid">
            <div class="box"><strong>Target Department:</strong> ${assessment.targetDepartment?.name || assessment.targetDepartmentId || "N/A"}</div>
            <div class="box"><strong>Target District(s):</strong> ${Array.isArray(assessment.targetDistricts) ? assessment.targetDistricts.join(", ") : "Statewide"}</div>
            <div class="box"><strong>RM Assessor:</strong> ${assessment.assessedBy?.name || "Relationship Manager"} (${assessment.assessedBy?.email || ""})</div>
            <div class="box"><strong>Recommendation:</strong> ${assessment.recommendation}</div>
          </div>
          <h3>Executive Summary</h3>
          <div class="box">${assessment.executiveSummary || "N/A"}</div>
          <h3>13-Factor Checklist Matrix</h3>
          <table>
            <thead><tr><th>#</th><th>Dimension</th><th>Check Statement</th><th>Critical</th><th>RM Answer</th><th>RM Observation / Note</th></tr></thead>
            <tbody>
              ${checklist.map((item: any) => `
                <tr>
                  <td>${item.itemNumber}</td>
                  <td>${item.dimension}</td>
                  <td>${item.checkText}</td>
                  <td>${item.isCritical ? "CRITICAL" : "Standard"}</td>
                  <td><span class="badge ${item.answer === "YES" ? "yes" : "no"}">${item.answer || "N/A"}</span></td>
                  <td>${item.note || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/30 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-100/70 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Assessment #{assessment.id.slice(0, 8)}
            </span>
            <span className="text-xs font-bold text-slate-500">
              Enquiry #{assessment.enquiryId?.slice(0, 8)} {assessment.enquiry?.trackingId ? `(${assessment.enquiry.trackingId})` : ""}
            </span>
          </div>

          <h2 className="mt-1.5 text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Building className="text-blue-800 shrink-0" size={18} />
            {assessment.enquiry?.corporateName || `Corporate Enquiry #${assessment.enquiryId.slice(0, 8)}`}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
            {assessment.enquiry?.sector && (
              <span className="flex items-center gap-1 text-slate-700">
                <Briefcase size={13} className="text-slate-400" /> Sector: <strong>{assessment.enquiry.sector}</strong>
              </span>
            )}
            {assessment.enquiry?.indicativeBudget && (
              <span className="flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                <DollarSign size={13} /> Indicative Budget: {formatINR(assessment.enquiry.indicativeBudget)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-extrabold border ${
                assessment.recommendation === "FEASIBLE"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : assessment.recommendation === "PROCEED_WITH_CONDITIONS"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-rose-100 text-rose-900 border-rose-300"
              }`}
            >
              RM Rec: {assessment.recommendation?.replaceAll("_", " ")}
            </span>
            <span className="rounded-full bg-blue-900 px-3 py-1 text-[10px] font-extrabold text-white shadow-xs">
              {assessment.status}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <Clock size={12} /> Submitted: {new Date(assessment.submittedAt || assessment.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="p-5 space-y-5">
        {/* Core Attributes & Score Bar Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1">
              <Building2 size={12} /> Target Department
            </span>
            <p className="mt-1 font-bold text-xs text-slate-900">
              {assessment.targetDepartment?.name || assessment.targetDepartmentId || "Not specified"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1">
              <MapPin size={12} /> Target District(s)
            </span>
            <p className="mt-1 font-bold text-xs text-slate-900">
              {Array.isArray(assessment.targetDistricts) && assessment.targetDistricts.length > 0
                ? assessment.targetDistricts.join(", ")
                : "Statewide"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1">
              <User size={12} /> Relationship Manager
            </span>
            <p className="mt-1 font-bold text-xs text-slate-900">
              {assessment.assessedBy?.name || "RM Assessor"}
            </p>
            {assessment.assessedBy?.email && (
              <p className="text-[10px] text-slate-500 truncate">{assessment.assessedBy.email}</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-blue-50/40 p-3.5">
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              <span>13-Factor Score</span>
              <span className="text-blue-950 font-black">{yesCount}/13 ({percent}%)</span>
            </div>
            <div className="mt-1.5 w-full rounded-full bg-slate-200 h-2 overflow-hidden border border-slate-300/60">
              <div
                className={`h-full transition-all ${
                  percent === 100 ? "bg-emerald-500" : percent >= 80 ? "bg-blue-600" : "bg-amber-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] font-bold text-slate-600">
              <span className="text-emerald-700">{yesCount} YES</span>
              <span className="text-amber-700">{noCount} NO</span>
              <span className="text-slate-500">{naCount} NA</span>
            </div>
          </div>
        </div>

        {/* RM Executive Summary */}
        {assessment.executiveSummary && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
            <p className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-700" /> RM Executive Summary
            </p>
            <p className="mt-1.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {assessment.executiveSummary}
            </p>
          </div>
        )}

        {/* Remediation Conditions Plan (If Any) */}
        {conditions.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
            <p className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-700" /> Conditional Remediation Action Plan ({conditions.length} Items)
            </p>
            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-100/60 font-extrabold text-amber-950 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Check #</th>
                    <th className="p-2.5">Remediation Required</th>
                    <th className="p-2.5">Responsible Owner</th>
                    <th className="p-2.5">Target Completion Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 font-medium">
                  {conditions.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-amber-50/40">
                      <td className="p-2.5 font-mono font-bold text-amber-900">Check #{c.itemNumber}</td>
                      <td className="p-2.5 text-slate-800">{c.remediation}</td>
                      <td className="p-2.5 text-slate-800 font-bold">{c.owner}</td>
                      <td className="p-2.5 text-slate-700">{c.targetDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Collapsible 13-Point Matrix View */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setShow13Points(!show13Points)}
            className="flex w-full items-center justify-between p-3.5 text-left text-xs font-extrabold text-slate-900 hover:bg-slate-100/70 transition-all rounded-xl"
          >
            <span className="flex items-center gap-2">
              <FileCheck2 size={16} className="text-blue-900" />
              Complete 13-Point Feasibility Checklist Breakdown
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-900 border border-blue-200">
                {yesCount}/13 YES
              </span>
            </span>
            <span className="flex items-center gap-1 text-blue-900">
              {show13Points ? "Hide Matrix" : "Expand Matrix"}
              {show13Points ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {show13Points && (
            <div className="border-t border-slate-200 p-4 space-y-4 bg-white">
              <div className="grid gap-3 md:grid-cols-2">
                {checklist.map((item: any) => {
                  const seedDef = MASTER_13_CHECKLIST.find((m) => m.itemNumber === item.itemNumber) || item;
                  const isCritical = item.isCritical ?? seedDef.isCritical;
                  const icon = DIMENSION_ICONS[item.dimension] || "📌";

                  return (
                    <div
                      key={item.itemNumber}
                      className={`rounded-xl border p-3 text-xs transition-all ${
                        item.answer === "YES"
                          ? "border-slate-200 bg-white"
                          : item.answer === "NO"
                          ? "border-rose-200 bg-rose-50/30"
                          : "border-amber-200 bg-amber-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span className="font-extrabold text-slate-900">
                            {item.itemNumber}. {item.dimension}
                          </span>
                          {isCritical && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-800 uppercase tracking-wider">
                              CRITICAL
                            </span>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                            item.answer === "YES"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : item.answer === "NO"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {item.answer === "YES" ? <Check size={12} /> : item.answer === "NO" ? <X size={12} /> : null}
                          {item.answer || "N/A"}
                        </span>
                      </div>

                      <p className="mt-2 font-semibold text-slate-800 leading-snug">{item.checkText || seedDef.checkText}</p>

                      {item.note && (
                        <div className="mt-2 rounded-lg bg-slate-50 p-2 border border-slate-100 text-[11px] text-slate-700">
                          <strong className="text-slate-900">RM Note:</strong> {item.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Existing JS Decision Display (If Already Decided) */}
        {assessment.jsDecision && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <p className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-800" /> Joint Secretary Decision Record
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Decision Outcome</span>
                <p className="font-extrabold text-blue-900">{assessment.jsDecision}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Decided At</span>
                <p className="font-bold text-slate-800">
                  {assessment.jsDecidedAt ? new Date(assessment.jsDecidedAt).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>
            {assessment.jsDecisionReason && (
              <p className="mt-2 text-xs text-slate-700 border-t border-blue-100 pt-2">
                <strong>Rationale:</strong> {assessment.jsDecisionReason}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onViewFullAudit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all"
            >
              <Eye size={14} /> Full 13-Point Audit Sheet
            </button>

            <button
              onClick={handlePrintCard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
            >
              <Printer size={14} /> Print Audit Report
            </button>

            <Link
              href={`/enquiries/${assessment.enquiryId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
            >
              <ExternalLink size={14} /> View Corporate Enquiry
            </Link>
          </div>

          {/* JS Action Button Trigger (If JS or Pending) */}
          {(isJs || assessment.status === "SUBMITTED_TO_JS") && (
            <button
              onClick={() => setShowJsPanel(!showJsPanel)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-800 transition-all"
            >
              <ShieldCheck size={14} /> {showJsPanel ? "Hide JS Decision Form" : "Record JS Decision"}
            </button>
          )}
        </div>

        {/* JS Decision Form Panel */}
        {showJsPanel && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-4 space-y-3">
            <p className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-900" /> Joint Secretary Executive Decision Entry
            </p>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Decision note / approval rationale (recommended for all decisions; required for rejection/returns)"
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <div className="flex flex-wrap gap-2">
              <button
                disabled={Boolean(working)}
                onClick={() => decide("PROCEED")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all disabled:opacity-60"
              >
                <CheckCircle2 size={15} /> Approve & Route Project
              </button>
              <button
                disabled={Boolean(working)}
                onClick={() => decide("PROCEED_WITH_CONDITIONS")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all disabled:opacity-60"
              >
                <FileCheck2 size={15} /> Approve with Conditions
              </button>
              <button
                disabled={Boolean(working)}
                onClick={() => decide("RETURN_FOR_CLARIFICATION")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-200 transition-all disabled:opacity-60"
              >
                <RotateCcw size={15} /> Return to RM for Clarification
              </button>
              <button
                disabled={Boolean(working)}
                onClick={() => decide("DO_NOT_PROCEED")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 shadow-xs hover:bg-rose-100 transition-all disabled:opacity-60"
              >
                <XCircle size={15} /> Do Not Proceed
              </button>
            </div>

            {working && <p className="text-xs font-semibold text-blue-900 animate-pulse">Recording decision in workflow system…</p>}
            {message && <p className="text-xs font-bold text-slate-800">{message}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Slide-Over Modal Drawer for Detailed 13-Point Audit View
 */
function AuditDetailsModal({
  assessment,
  onClose,
  isJs,
  onCompleted
}: {
  assessment: any;
  onClose: () => void;
  isJs: boolean;
  onCompleted: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"checklist" | "remediation" | "corporate">("checklist");
  const scrollRef = useRef<HTMLDivElement>(null);

  const checklist = Array.isArray(assessment.checklist) && assessment.checklist.length > 0 ? assessment.checklist : MASTER_13_CHECKLIST;
  const conditions = Array.isArray(assessment.conditions) ? assessment.conditions : [];

  const yesCount = checklist.filter((item: any) => item.answer === "YES").length;
  const percent = Math.round((yesCount / 13) * 100);

  // Mount portal & lock background body scroll
  useEffect(() => {
    setMounted(true);
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Smooth mouse wheel scroll implementation with animated scrollBy
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      e.stopPropagation();
      el.scrollBy({
        top: e.deltaY,
        behavior: "smooth"
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [mounted, activeTab]);

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/40 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] sm:max-h-[85vh] h-[90vh] sm:h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 z-[1000000]"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-start sm:items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-900 to-indigo-900 p-4 sm:p-5 text-white gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] sm:text-xs font-extrabold text-blue-200 bg-white/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-white/20">
                Assessment #{assessment.id.slice(0, 8)}
              </span>
              <span className="text-[10px] sm:text-xs text-blue-100 font-medium">
                Enquiry #{assessment.enquiryId.slice(0, 8)}
              </span>
            </div>
            <h2 className="mt-1.5 sm:mt-1 text-sm sm:text-base font-extrabold line-clamp-2 sm:line-clamp-1">
              {assessment.enquiry?.corporateName || "Corporate Feasibility Audit Sheet"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all -mr-1 sm:mr-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs Header - FIX: Added overflow-x-auto and webkit hide scrollbar styles */}
        <div 
          className="flex shrink-0 items-center overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 sm:px-5 text-xs font-bold text-slate-600 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {/* FIX: Added shrink-0 and whitespace-nowrap to prevent text squishing/wrapping */}
          <button
            onClick={() => setActiveTab("checklist")}
            className={`shrink-0 whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "checklist" ? "border-blue-900 text-blue-900 font-extrabold" : "border-transparent hover:text-slate-900"
            }`}
          >
            <FileCheck2 size={15} /> 13-Point Checklist ({yesCount}/13 YES)
          </button>
          <button
            onClick={() => setActiveTab("remediation")}
            className={`shrink-0 whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "remediation" ? "border-blue-900 text-blue-900 font-extrabold" : "border-transparent hover:text-slate-900"
            }`}
          >
            <AlertTriangle size={15} /> Remediation Plan ({conditions.length})
          </button>
          <button
            onClick={() => setActiveTab("corporate")}
            className={`shrink-0 whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "corporate" ? "border-blue-900 text-blue-900 font-extrabold" : "border-transparent hover:text-slate-900"
            }`}
          >
            <Building size={15} /> Corporate Context
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div
          ref={scrollRef}
          tabIndex={0}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-4 sm:p-6 space-y-5 focus:outline-none"
          style={{ scrollbarWidth: "thin" }}
        >
          {activeTab === "checklist" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-blue-50/60 p-3.5 border border-blue-100">
                <div>
                  <p className="text-xs font-extrabold text-blue-950">Feasibility Verification Matrix</p>
                  <p className="text-[11px] text-slate-600">All 13 criteria evaluated by Relationship Manager.</p>
                </div>
                <div className="sm:text-right flex sm:block items-center gap-3">
                  <span className="text-sm font-black text-blue-900">{yesCount}/13 YES</span>
                  <p className="text-[10px] font-bold text-emerald-700">{percent}% Compliance Rate</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {checklist.map((item: any) => {
                  const seedDef = MASTER_13_CHECKLIST.find((m) => m.itemNumber === item.itemNumber) || item;
                  const isCritical = item.isCritical ?? seedDef.isCritical;
                  const icon = DIMENSION_ICONS[item.dimension] || "📌";

                  return (
                    <div
                      key={item.itemNumber}
                      className={`rounded-xl border p-3.5 text-xs transition-all ${
                        item.answer === "YES" ? "border-slate-200 bg-white" : "border-rose-200 bg-rose-50/30"
                      }`}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="font-extrabold text-slate-900 leading-tight">
                          {icon} {item.itemNumber}. {item.dimension}
                        </span>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-extrabold ${
                            item.answer === "YES" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.answer || "N/A"}
                        </span>
                      </div>
                      <p className="mt-2 font-medium text-slate-800 leading-relaxed">{item.checkText || seedDef.checkText}</p>
                      {item.note && (
                        <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-600 leading-relaxed">
                          <strong>Note:</strong> {item.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "remediation" && (
            <div className="space-y-3">
              {conditions.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-center text-xs text-slate-500">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
                  <p className="font-bold text-slate-900">No Conditional Remediations Required</p>
                  <p className="mt-1">All critical feasibility factors passed initial evaluation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((c: any, index: number) => (
                    <div key={index} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs space-y-1">
                      <p className="font-extrabold text-amber-950">Check #{c.itemNumber} Remediation Action</p>
                      <p className="text-slate-800 font-medium leading-relaxed">{c.remediation}</p>
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 text-[11px] font-bold text-amber-900 border-t border-amber-200 pt-2">
                        <span>Owner: {c.owner}</span>
                        <span>Target Date: {c.targetDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "corporate" && (
            <div className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Corporate Name</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{assessment.enquiry?.corporateName || "N/A"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-400">CIN (MCA21)</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{assessment.enquiry?.mca21CIN || "N/A"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Indicative Budget</span>
                  <p className="font-extrabold text-emerald-800 mt-0.5">{formatINR(assessment.enquiry?.indicativeBudget)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Sector</span>
                  <p className="font-extrabold text-slate-900 mt-0.5">{assessment.enquiry?.sector || "N/A"}</p>
                </div>
              </div>

              {assessment.enquiry?.proposedCSRWork && (
                <div className="rounded-xl border border-slate-200 p-3.5 bg-white">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Proposed CSR Work</span>
                  <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-wrap">{assessment.enquiry.proposedCSRWork}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 text-center sm:text-left">MahaCSR Setu Feasibility Audit Module</span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl bg-blue-900 px-6 py-2.5 sm:py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-all"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
