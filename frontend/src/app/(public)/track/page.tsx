"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import {
  Search,
  Package,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Building2,
  MapPin,
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  Calendar
} from "lucide-react";

interface TrackingStatus {
  status: string;
  label: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

interface TrackingData {
  trackingId: string;
  type: "ENQUIRY" | "PITCH" | "INTEREST" | "HELPDESK" | "GRIEVANCE" | "PROJECT";
  currentStatus: string;
  submittedAt: string;
  updatedAt?: string;
  estimatedCompletion?: string;
  timeline: TrackingStatus[];
  details: Record<string, any>;
}

// 1. Corporate Enquiry Flow
const ENQUIRY_FLOW = [
  { key: "SUBMITTED", label: "Enquiry Received", description: "Enquiry logged and tracking code generated." },
  { key: "RM_ASSIGNED", label: "RM Assigned", description: "Dedicated CSR Relationship Manager assigned for coordination." },
  { key: "RM_CONTACTED", label: "RM Discussion", description: "Relationship Manager contacted the company (5-day SLA)." },
  { key: "ASSESSMENT_SUBMITTED_TO_JS", label: "Feasibility Assessment", description: "13-point statutory feasibility review submitted to Joint Secretary." },
  { key: "JS_APPROVED", label: "JS Decision", description: "Joint Secretary approval recorded." },
  { key: "NODAL_OFFICER_APPOINTED", label: "Nodal Officer Appointed", description: "District Nodal Officer mapped for on-ground alignment." },
  { key: "MOU_PENDING", label: "MoU Execution", description: "Tripartite MoU under review with legal & finance teams." },
  { key: "PROJECT_ONBOARDED", label: "Project Onboarded", description: "MoU signed; project code created and implementation initialized." },
  { key: "COMPLETED", label: "Completed", description: "Project execution completed and assets handed over." },
];

// 2. Government Pitch Flow
const PITCH_FLOW = [
  { key: "SUBMITTED", label: "Pitch Logged", description: "Department development pitch submitted with HOD endorsement." },
  { key: "RM_VERIFICATION_PENDING", label: "RM Verification", description: "CSR Relationship Manager verifies scope and feasibility." },
  { key: "JS_APPROVAL_PENDING", label: "JS Approval", description: "Verified proposal submitted to Joint Secretary." },
  { key: "PUBLIC_LISTED", label: "Publicly Listed", description: "Approved and listed on Maharashtra CSR Opportunity Marketplace." },
  { key: "CORPORATE_INTEREST_RECEIVED", label: "Corporate Matching", description: "Corporate donor matched and funding expressed." },
  { key: "NODAL_OFFICER_ASSIGNED", label: "Nodal Officer Assigned", description: "District Nodal Officer assigned for field implementation." },
  { key: "MOU_PENDING", label: "MoU Finalisation", description: "Tripartite agreement executed." },
  { key: "PROJECT_ONBOARDED", label: "Project Active", description: "Execution initiated under state monitoring." },
  { key: "COMPLETED", label: "Delivered", description: "Development initiative completed." },
];

// 3. Helpdesk Support Flow
const HELPDESK_FLOW = [
  { key: "OPEN", label: "Ticket Logged", description: "Support request registered with State IT Cell." },
  { key: "IN_PROGRESS", label: "Under Investigation", description: "Helpdesk officer reviewing technical issue / request." },
  { key: "RESOLVED", label: "Resolution Provided", description: "Solution delivered within statutory SLA." },
  { key: "CLOSED", label: "Ticket Closed", description: "Query successfully resolved and verified." },
];

// 4. Grievance Redressal Flow
const GRIEVANCE_FLOW = [
  { key: "SUBMITTED", label: "Grievance Lodged", description: "Grievance received under public grievance framework." },
  { key: "ACKNOWLEDGED", label: "Acknowledged", description: "Assigned to District Grievance Officer." },
  { key: "UNDER_INVESTIGATION", label: "Field Inquiry", description: "Fact-finding and physical site verification in progress." },
  { key: "RESOLVED", label: "Redressal Completed", description: "Remedial action completed and citizen informed." },
];

// 5. Project Execution Flow
const PROJECT_FLOW = [
  { key: "DRAFT", label: "Drafted", description: "Project registered." },
  { key: "APPROVED", label: "Approved", description: "Project approved under CSR Convergence framework." },
  { key: "KICKOFF", label: "Site Kickoff", description: "Implementation initiated with District Nodal Officer." },
  { key: "ACTIVE", label: "Milestones & UC", description: "Physical milestone execution and fund utilization tracking." },
  { key: "COMPLETED", label: "Completed", description: "Final inspection completed and asset handed over." },
];

const ENQUIRY_STATUS_INDEX: Record<string, number> = {
  SUBMITTED: 0, TRACKING_ID_GENERATED: 0, RM_ASSIGNED: 1, RM_CONTACTED: 2,
  ASSESSMENT_PENDING: 2, ASSESSMENT_SUBMITTED_TO_JS: 3, JS_APPROVED: 4, JS_REJECTED: 4,
  NODAL_OFFICER_APPOINTED: 5, MOU_PENDING: 6, MOU_SIGNED: 7, PROJECT_ONBOARDED: 7,
  EXECUTION_STARTED: 8, COMPLETED: 8, CLOSED: 8
};

const PITCH_STATUS_INDEX: Record<string, number> = {
  DRAFT: 0, SUBMITTED: 0, RM_VERIFICATION_PENDING: 1, RM_VERIFIED: 2,
  JS_APPROVAL_PENDING: 2, JS_APPROVED: 3, JS_REJECTED: 3, PUBLIC_LISTED: 3,
  CORPORATE_INTEREST_RECEIVED: 4, NODAL_OFFICER_ASSIGNED: 5, MOU_PENDING: 6,
  MOU_SIGNED: 7, PROJECT_ONBOARDED: 7, COMPLETED: 8, CLOSED: 8
};

const HELPDESK_STATUS_INDEX: Record<string, number> = {
  OPEN: 0, PENDING: 0, IN_PROGRESS: 1, UNDER_REVIEW: 1, RESOLVED: 2, CLOSED: 3
};

const GRIEVANCE_STATUS_INDEX: Record<string, number> = {
  SUBMITTED: 0, OPEN: 0, ACKNOWLEDGED: 1, UNDER_INVESTIGATION: 2, IN_PROGRESS: 2, RESOLVED: 3, CLOSED: 3
};

const PROJECT_STATUS_INDEX: Record<string, number> = {
  DRAFT: 0, PENDING: 0, APPROVED: 1, IN_PROGRESS: 2, ACTIVE: 3, ON_TRACK: 3, COMPLETED: 4, CLOSED: 4
};

function buildTimeline(
  flow: { key: string; label: string; description: string }[],
  statusIndex: Record<string, number>,
  currentStatus: string,
  timestamps: Record<number, string | undefined>
): TrackingStatus[] {
  const currentIdx = statusIndex[currentStatus] ?? 0;
  const isTerminal = ["COMPLETED", "CLOSED", "RESOLVED"].includes(currentStatus);

  return flow.map((step, idx) => ({
    status: step.key,
    label: step.label,
    description: step.description,
    completed: idx < currentIdx || (idx === currentIdx && isTerminal),
    current: idx === currentIdx && !isTerminal,
    timestamp: timestamps[idx] || (idx === 0 ? timestamps[0] || "" : ""),
  }));
}

function TrackContent() {
  const searchParams = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setTrackingId(id.trim());
      handleSearch(id.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = async (idToSearch: string = trackingId) => {
    const cleanId = idToSearch.trim();
    setError("");
    setTrackingData(null);
    setSearched(false);

    if (!cleanId) {
      setError("Please enter a tracking ID or code.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch<any>(`/tracking/${encodeURIComponent(cleanId)}`);
      const data = response?.data || response;
      const type = (data.type || "ENQUIRY").toUpperCase();
      const currentStatus = (data.status || "SUBMITTED").toUpperCase();
      const details = data.details || {};

      let timeline: TrackingStatus[] = [];
      const submittedAt = data.submittedAt || details.createdAt || new Date().toISOString();
      const updatedAt = data.updatedAt || details.updatedAt;

      if (type === "PITCH") {
        timeline = buildTimeline(PITCH_FLOW, PITCH_STATUS_INDEX, currentStatus, {
          0: submittedAt,
          1: details.assignedRelationshipManagerId ? updatedAt : undefined,
          [PITCH_STATUS_INDEX[currentStatus] ?? 0]: updatedAt,
        });
      } else if (type === "HELPDESK") {
        timeline = buildTimeline(HELPDESK_FLOW, HELPDESK_STATUS_INDEX, currentStatus, {
          0: submittedAt,
          [HELPDESK_STATUS_INDEX[currentStatus] ?? 0]: updatedAt,
        });
      } else if (type === "GRIEVANCE") {
        timeline = buildTimeline(GRIEVANCE_FLOW, GRIEVANCE_STATUS_INDEX, currentStatus, {
          0: submittedAt,
          [GRIEVANCE_STATUS_INDEX[currentStatus] ?? 0]: updatedAt,
        });
      } else if (type === "PROJECT") {
        timeline = buildTimeline(PROJECT_FLOW, PROJECT_STATUS_INDEX, currentStatus, {
          0: submittedAt,
          [PROJECT_STATUS_INDEX[currentStatus] ?? 0]: updatedAt,
        });
      } else {
        // ENQUIRY / INTEREST
        timeline = buildTimeline(ENQUIRY_FLOW, ENQUIRY_STATUS_INDEX, currentStatus, {
          0: submittedAt,
          1: details.assignedRelationshipManagerId ? updatedAt : undefined,
          2: details.firstContactedAt,
          [ENQUIRY_STATUS_INDEX[currentStatus] ?? 0]: updatedAt,
        });
      }

      setTrackingData({
        trackingId: data.trackingId || cleanId,
        type: type as any,
        currentStatus,
        submittedAt,
        updatedAt,
        estimatedCompletion: data.estimatedCompletion || details.firstResponseDueAt || details.resolutionDueAt,
        timeline,
        details,
      });
      setLastRefreshedAt(new Date());
      setSearched(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "No records found matching this tracking ID.";
      setError(msg);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes("APPROVED") || s.includes("RESOLVED") || s.includes("COMPLETED") || s.includes("SIGNED") || s.includes("ONBOARDED")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (s.includes("REJECT") || s.includes("CANCEL") || s.includes("FAILED")) {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (s.includes("PROGRESS") || s.includes("REVIEW") || s.includes("PENDING") || s.includes("ASSESSMENT") || s.includes("INVESTIGATION")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    return "bg-blue-50 text-blue-800 border-blue-200";
  };

  return (
    <GovPortalLayout>
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
            <ShieldCheck size={14} className="text-blue-700" />
            <span>Government of Maharashtra Citizen & Partner Live Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Track Application &amp; Case Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Enter your statutory Tracking ID or Reference Code for instant live status updates, assigned officer details, and timeline progress.
          </p>
        </div>

        {/* Search Box Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={trackingId}
                onChange={(e) => {
                  setTrackingId(e.target.value);
                  setError("");
                }}
                placeholder="e.g. CSR-MH-2026-000001, GP-MH-2026-000001, HD-MH-2026-000002..."
                className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 py-3.5 pl-11 pr-4 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs shadow-blue-500/20 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Check Status</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Helper Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-slate-700">Supported Formats:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-700">CSR-MH-XXXX</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-700">GP-MH-XXXX</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-700">HD-MH-XXXX</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-700">PRJ-MH-XXXX</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-slate-700">GRV-MH-XXXX</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-3 shadow-2xs animate-fadeIn">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Area */}
        {searched && trackingData && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Summary Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base sm:text-lg font-extrabold text-blue-900">
                      {trackingData.trackingId}
                    </span>
                    <button
                      onClick={() => handleCopyCode(trackingData.trackingId)}
                      title="Copy Tracking ID"
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Entity Type: <strong className="text-slate-800">{trackingData.type}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${getStatusBadgeClass(trackingData.currentStatus)}`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
                    {trackingData.currentStatus.replace(/_/g, " ")}
                  </span>

                  {/* Instant Live Refresh */}
                  <button
                    onClick={() => handleSearch()}
                    disabled={loading}
                    title="Live Refresh Status"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer group"
                  >
                    <RefreshCw size={13} className={`${loading ? "animate-spin text-blue-600" : "group-hover:rotate-45"}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {/* 3-Column Key Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Submission Date
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600 shrink-0" />
                    {new Date(trackingData.submittedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Last Activity / Update
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-600 shrink-0" />
                    {trackingData.updatedAt
                      ? new Date(trackingData.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "Recently updated"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    SLA Resolution Target
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    {trackingData.estimatedCompletion
                      ? new Date(trackingData.estimatedCompletion).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "Standard 5-Day SLA"}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Timeline Stepper */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Package size={16} className="text-blue-600" />
                Live Workflow Milestone Timeline
              </h2>

              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {trackingData.timeline.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4">
                    {/* Node Dot */}
                    <div className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold ring-4 ring-white shadow-2xs ${
                      step.completed
                        ? "bg-emerald-600"
                        : step.current
                        ? "bg-blue-600 ring-blue-100 animate-pulse"
                        : "bg-slate-300"
                    }`}>
                      {step.completed ? <Check size={12} strokeWidth={3} /> : idx + 1}
                    </div>

                    <div className={`flex-1 rounded-2xl p-4 border transition-all ${
                      step.current
                        ? "border-blue-200 bg-blue-50/50 shadow-xs"
                        : step.completed
                        ? "border-slate-200 bg-slate-50/50"
                        : "border-slate-100 bg-slate-50/20 opacity-60"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {step.label}
                          </h3>
                          {step.current && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                              Active Stage
                            </span>
                          )}
                        </div>
                        {step.timestamp && (
                          <span className="text-[11px] font-semibold text-slate-400">
                            {new Date(step.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Case Details Breakdown */}
            {Object.keys(trackingData.details).length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-4">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Application Summary &amp; Scope
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  {trackingData.details.companyName && (
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Submitting Entity / Company</span>
                      <p className="font-bold text-slate-900 mt-0.5">{trackingData.details.companyName}</p>
                    </div>
                  )}

                  {trackingData.details.department && (
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Government Department</span>
                      <p className="font-bold text-slate-900 mt-0.5">{trackingData.details.department}</p>
                    </div>
                  )}

                  {trackingData.details.title && (
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Project Title</span>
                      <p className="font-bold text-slate-900 mt-0.5">{trackingData.details.title}</p>
                    </div>
                  )}

                  {trackingData.details.subject && (
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Query Subject</span>
                      <p className="font-bold text-slate-900 mt-0.5">{trackingData.details.subject}</p>
                    </div>
                  )}

                  {trackingData.details.sector && (
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">CSR Focus Sector</span>
                      <p className="font-bold text-slate-900 mt-0.5">{trackingData.details.sector}</p>
                    </div>
                  )}

                  {(trackingData.details.district || (trackingData.details.districts && trackingData.details.districts.length > 0)) && (
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Target District</span>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {trackingData.details.district || trackingData.details.districts.join(", ")}
                      </p>
                    </div>
                  )}

                  {(trackingData.details.indicativeBudget || trackingData.details.budget || trackingData.details.approvedBudget) && (
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Indicative Outlay</span>
                      <p className="font-bold text-emerald-800 mt-0.5 font-mono">
                        ₹{Number(trackingData.details.indicativeBudget || trackingData.details.budget || trackingData.details.approvedBudget).toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}

                  {trackingData.details.resolution && (
                    <div className="sm:col-span-2 md:col-span-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <span className="text-[10px] font-bold text-emerald-900 uppercase">Official Resolution Note</span>
                      <p className="text-xs font-semibold text-emerald-950 mt-1 leading-relaxed">{trackingData.details.resolution}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <GovPortalLayout>
          <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-12 gap-3">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="text-xs text-slate-500 font-bold">Loading Maharashtra CSR Live Tracker...</span>
          </div>
        </GovPortalLayout>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
