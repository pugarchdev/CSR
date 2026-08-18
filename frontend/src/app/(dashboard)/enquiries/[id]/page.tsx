"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ArrowLeft, Building2, Loader2, Mail, Send,
  MapPin, FileText, ClipboardCheck,
  MessageSquare, History, FileCheck,
  Copy, Check, PhoneCall, Video, Globe, User, ArrowRight,
  X, CalendarDays, FileImage, ExternalLink, Briefcase,
  CheckCircle2, AlertCircle, ShieldCheck, FileCheck2, RotateCcw, XCircle, Clock
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

/* ─── Constants ─── */
const INTERACTION_TYPES = [
  { value: "CALL", label: "Phone Call", icon: PhoneCall, color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "EMAIL", label: "Email", icon: Mail, color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "MEETING", label: "Meeting", icon: Video, color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "PORTAL", label: "Portal Note", icon: Globe, color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "STATUS_CHANGE", label: "Status Change", icon: History, color: "bg-amber-100 text-amber-800 border-amber-200" },
] as const;

const CHECKS: Array<[number, string, string, boolean]> = [
  [1, "Schedule VII Compliance", "Proposed activity falls strictly within MCA Schedule VII permissible categories.", true],
  [2, "Non-Prohibited Activity", "Activity is not a prohibited CSR activity (e.g. political funding, normal business activities).", true],
  [3, "Genuine Verified Need", "Addresses a genuine, verified development need of the local community.", true],
  [4, "No Scheme Duplication", "Does not duplicate existing state or central government welfare schemes.", true],
  [5, "Land & Site Availability", "Required site or land is available, unencumbered, and under valid control.", true],
  [6, "Required Permissions", "Necessary statutory, environmental, or administrative permissions can be obtained.", true],
  [7, "Government Support", "District or departmental government support is confirmed in writing.", true],
  [8, "Budget Adequacy", "Indicative budget is adequate for the proposed scope of work.", true],
  [9, "Realistic Cost Estimate", "Cost breakdown and unit estimates appear realistic and benchmarked.", true],
  [10, "Implementation Capacity", "Implementing agency or corporate team has demonstrated execution capacity.", true],
  [11, "Realistic Timeline", "Proposed execution timeline is realistic and achievable.", true],
  [12, "Post-Completion Ownership", "Post-completion asset ownership and handing-over structure is clear.", true],
  [13, "Maintenance Responsibility", "Long-term operation and maintenance responsibility is explicitly identified.", true]
];

function getInteractionMeta(channel: string) {
  return INTERACTION_TYPES.find((t) => t.value === channel) || INTERACTION_TYPES[3];
}

function formatBudget(val: any): string {
  const num = Number(val);
  if (!num || isNaN(num)) return "Not specified";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakhs`;
  return `₹${num.toLocaleString("en-IN")}`;
}

function formatDate(val: any): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(val: any): string {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function extractRoleTokens(user: any, roles: any[], roleDetails: any[]): string[] {
  const tokens = new Set<string>();
  if (user?.role) tokens.add(String(user.role));
  if (user?.roleSlug) tokens.add(String(user.roleSlug));
  if (user?.roleNumericId) tokens.add(String(user.roleNumericId));
  (roles || []).forEach((r) => {
    if (typeof r === "string") tokens.add(r);
    else if (typeof r === "number") tokens.add(String(r));
    else if (r && typeof r === "object") {
      if (r.slug) tokens.add(String(r.slug));
      if (r.name) tokens.add(String(r.name));
      if (r.role) tokens.add(String(r.role));
    }
  });
  (roleDetails || []).forEach((rd) => {
    if (rd?.slug) tokens.add(String(rd.slug));
    if (rd?.name) tokens.add(String(rd.name));
  });
  return Array.from(tokens);
}

/* ─── Joint Secretary Decision Panel ─── */
function JointSecretaryDecisionPanel({
  assessmentId,
  currentStatus,
  existingDecision,
  existingReason,
  decidedAt,
  onDecisionRecorded,
}: {
  assessmentId: string;
  currentStatus?: string;
  existingDecision?: string;
  existingReason?: string;
  decidedAt?: string;
  onDecisionRecorded: () => void;
}) {
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const decide = async (decision: "PROCEED" | "PROCEED_WITH_CONDITIONS" | "RETURN_FOR_CLARIFICATION" | "DO_NOT_PROCEED") => {
    setMessage("");
    setError("");
    if (decision !== "PROCEED" && (!reason.trim() || reason.trim().length < 5)) {
      setError("Please provide a reason or conditions (minimum 5 characters) for this decision.");
      return;
    }
    setWorking(decision);
    try {
      const res = await apiFetch<any>(`/js/assessments/${assessmentId}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, reason: reason.trim() })
      });
      setMessage(res?.message || "Joint Secretary decision recorded successfully.");
      onDecisionRecorded();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Failed to record decision.");
    } finally {
      setWorking("");
    }
  };

  if (currentStatus === "JS_APPROVED" || existingDecision === "PROCEED" || existingDecision === "PROCEED_WITH_CONDITIONS") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-2">
        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
          <CheckCircle2 size={18} className="text-emerald-700" />
          <span>Approved by Joint Secretary</span>
          <span className="ml-auto text-[11px] font-mono text-emerald-700">
            {formatDateTime(decidedAt)}
          </span>
        </div>
        {existingReason && (
          <p className="text-xs text-emerald-800 bg-white/70 p-3 rounded-lg border border-emerald-200 leading-relaxed">
            <strong>Decision Notes:</strong> {existingReason}
          </p>
        )}
        <p className="text-xs text-emerald-700">
          This enquiry has been sanctioned and routed for District Nodal Consultant and Department onboarding.
        </p>
      </div>
    );
  }

  if (currentStatus === "JS_REJECTED" || existingDecision === "DO_NOT_PROCEED") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 space-y-2">
        <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
          <XCircle size={18} className="text-rose-700" />
          <span>Rejected by Joint Secretary</span>
          <span className="ml-auto text-[11px] font-mono text-rose-700">
            {formatDateTime(decidedAt)}
          </span>
        </div>
        {existingReason && (
          <p className="text-xs text-rose-800 bg-white/70 p-3 rounded-lg border border-rose-200 leading-relaxed">
            <strong>Rejection Reason:</strong> {existingReason}
          </p>
        )}
      </div>
    );
  }

  if (currentStatus === "RETURN_FOR_CLARIFICATION" || existingDecision === "RETURN_FOR_CLARIFICATION") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
          <RotateCcw size={18} className="text-amber-700" />
          <span>Returned to Relationship Manager for Clarification</span>
          <span className="ml-auto text-[11px] font-mono text-amber-700">
            {formatDateTime(decidedAt)}
          </span>
        </div>
        {existingReason && (
          <p className="text-xs text-amber-900 bg-white/70 p-3 rounded-lg border border-amber-200 leading-relaxed">
            <strong>Clarification Instructions:</strong> {existingReason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
        <h4 className="text-sm font-extrabold text-blue-950 flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-900" /> Joint Secretary Executive Decision Desk
        </h4>
        <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
          Awaiting Decision
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Review the 13-Point Feasibility Checklist and RM recommendations above. Select an executive decision to proceed with Government department routing, request RM corrections, or decline.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">
          Decision Notes / Approval Rationale / Clarification Remarks
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Enter executive remarks, conditions, or required clarification points..."
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
      {message && <p className="text-xs font-bold text-emerald-700">{message}</p>}

      <div className="flex flex-wrap gap-2.5 pt-1">
        <button
          disabled={Boolean(working)}
          onClick={() => decide("PROCEED")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800 transition-all disabled:opacity-50"
        >
          {working === "PROCEED" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Approve & Route Project
        </button>

        <button
          disabled={Boolean(working)}
          onClick={() => decide("PROCEED_WITH_CONDITIONS")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50"
        >
          {working === "PROCEED_WITH_CONDITIONS" ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={14} />}
          Approve with Conditions
        </button>

        <button
          disabled={Boolean(working)}
          onClick={() => decide("RETURN_FOR_CLARIFICATION")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-4 py-2.5 text-xs font-extrabold text-amber-900 shadow-sm hover:bg-amber-200 transition-all disabled:opacity-50"
        >
          {working === "RETURN_FOR_CLARIFICATION" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Return to RM for Clarification
        </button>

        <button
          disabled={Boolean(working)}
          onClick={() => decide("DO_NOT_PROCEED")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-extrabold text-rose-800 shadow-sm hover:bg-rose-100 transition-all disabled:opacity-50"
        >
          {working === "DO_NOT_PROCEED" ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
          Reject Proposal
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page Component ─── */
export default function EnquiryDetailPage() {
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const roleDetails = useAuthStore((state) => state.roleDetails);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "communication" | "feasibility" | "js" | "assignments">("overview");
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isJS = useMemo(() => {
    if (!mounted) return false;
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = t.toUpperCase();
      return u.includes("JOINT_SECRETARY") || u.includes("JOINT SECRETARY") || u === "3" || u.includes("PLANNING_SECRETARY") || u === "2";
    }) || user?.roleId === 3 || user?.roleId === 2;
  }, [user, roles, roleDetails, mounted]);

  const isRM = useMemo(() => {
    if (!mounted || isJS) return false;
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = t.toUpperCase();
      return u.includes("RELATIONSHIP") || u.includes("RM") || u === "6";
    }) || user?.roleId === 6;
  }, [user, roles, roleDetails, isJS, mounted]);

  const canAccessRMWorkspace = isRM || isJS || isAdmin;
  const path = canAccessRMWorkspace ? `/rm/enquiries/${params.id}` : `/corporate-enquiries/${params.id}`;

  const { data: response, isLoading, refetch } = useApiQuery<any>(
    ["enquiry", params.id, canAccessRMWorkspace ? "rm" : "standard"],
    path,
    { enabled: Boolean(params.id) }
  );

  const { data: interactionsResponse, refetch: refetchInteractions } = useApiQuery<any>(
    ["enquiry-interactions", params.id],
    `/rm/enquiries/${params.id}/interactions`,
    { enabled: canAccessRMWorkspace && Boolean(params.id) }
  );

  const { data: assessmentResponse, refetch: refetchAssessment } = useApiQuery<any>(
    ["rm-feasibility", params.id],
    `/rm/enquiries/${params.id}/feasibility`,
    { enabled: canAccessRMWorkspace && Boolean(params.id) }
  );

  const enquiry = response?.data ?? response;
  const assessment = assessmentResponse?.data || null;
  const interactions: any[] = Array.isArray(interactionsResponse?.data)
    ? interactionsResponse.data
    : Array.isArray(interactionsResponse) ? interactionsResponse : [];

  const contactEmail = enquiry?.contactEmail || enquiry?.email || "";
  const contactPhone = enquiry?.mobile || enquiry?.phone || "";
  const contactName = enquiry?.contactPersonName || "";

  const copyTrackingId = () => {
    const textToCopy = enquiry?.trackingId || params.id;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ─── Quick Action: Call Company ─── */
  const handleCallCompany = useCallback(async () => {
    if (contactPhone) {
      window.open(`tel:${contactPhone.replace(/\s/g, "")}`, "_self");
    }
    try {
      await apiFetch(`/rm/enquiries/${params.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "CALL",
          note: `Outbound call initiated to ${contactName || "corporate contact"} at ${contactPhone || "registered number"}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log call failed:", err);
    }
  }, [params.id, contactPhone, contactName, refetchInteractions]);

  /* ─── Quick Action: Send Email ─── */
  const handleSendEmail = useCallback(async () => {
    const subject = encodeURIComponent(`MahaCSR Convergence — Enquiry ${enquiry?.trackingId || params.id}`);
    const body = encodeURIComponent(
      `Dear ${contactName || "Sir/Madam"},\n\nThis is regarding your CSR Convergence enquiry (Tracking ID: ${enquiry?.trackingId || params.id}).\n\nRegards,\n${user?.firstName || "State CSR Cell"} ${user?.lastName || ""}\nMaharashtra CSR Authority`
    );
    window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`, "_self");

    try {
      await apiFetch(`/rm/enquiries/${params.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "EMAIL",
          note: `Email sent to ${contactName || "corporate contact"} at ${contactEmail}. Subject: MahaCSR Convergence — Enquiry ${enquiry?.trackingId || params.id}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log email failed:", err);
    }
  }, [params.id, contactEmail, contactName, enquiry?.trackingId, user, refetchInteractions]);

  if (!mounted || isLoading) {
    return (
      <GovPortalLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="animate-spin text-blue-900" size={32} />
        </div>
      </GovPortalLayout>
    );
  }

  const documents = Array.isArray(enquiry?.documents) ? enquiry.documents : [];
  const preferredDistricts = Array.isArray(enquiry?.preferredDistricts) ? enquiry.preferredDistricts : [];
  const preferredDivisions = Array.isArray(enquiry?.preferredDivisions) ? enquiry.preferredDivisions : [];

  const tabs = [
    { id: "overview", label: "Overview", icon: Briefcase },
    { id: "communication", label: "Interaction Log", icon: MessageSquare },
    { id: "feasibility", label: "13-Point Feasibility", icon: ClipboardCheck },
    { id: "js", label: isJS ? "Executive Decision" : "JS Decision", icon: ShieldCheck },
    { id: "assignments", label: "Assignments & Audit", icon: History },
  ];

  return (
    <GovPortalLayout>
      <div className="mx-auto min-h-screen max-w-screen-2xl space-y-4 px-4 py-3 md:px-6">

        {/* ─── Back link + SLA ─── */}
        <div className="flex items-center justify-between">
          <Link
            href="/enquiries"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-900 transition-colors no-underline"
          >
            <ArrowLeft size={14} /> Back to Corporate Enquiries
          </Link>
          <span className="text-[11px] font-bold text-slate-500">
            SLA: <strong className="text-amber-700">Active</strong>
          </span>
        </div>

        {/* ─── Header Card ─── */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-extrabold text-blue-950 bg-blue-100/80 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {enquiry?.trackingId || "ENQ-MH-2026"}
                  <button onClick={copyTrackingId} className="ml-1 text-blue-700 hover:text-blue-950" title="Copy ID">
                    {copied ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                  </button>
                </span>
                <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-200 uppercase">
                  {(enquiry?.status || "PENDING").replace(/_/g, " ")}
                </span>
                {enquiry?.sector && (
                  <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                    {enquiry.sector}
                  </span>
                )}
                {isJS && (
                  <span className="rounded-md bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-950 border border-indigo-200">
                    JOINT SECRETARY DESK
                  </span>
                )}
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {enquiry?.corporateName || "Corporate Partnership Proposal"}
              </h1>
              {contactName && (
                <p className="text-xs text-slate-500">
                  Contact: <strong className="text-slate-700">{contactName}</strong>
                  {enquiry?.contactPersonDesignation && ` — ${enquiry.contactPersonDesignation}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-white p-1 rounded-xl shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-blue-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ────────────────────────────────────────────────────── */}
        {/* TAB 1: OVERVIEW                                       */}
        {/* ────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* ── Left: Main Content (2/3) ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Indicative Budget" value={formatBudget(enquiry?.indicativeBudget)} color="text-emerald-700" />
                <MetricCard label="CSR Sector" value={enquiry?.sector || "—"} color="text-slate-900" />
                <MetricCard label="Submitted On" value={formatDate(enquiry?.createdAt)} color="text-slate-800" />
                <MetricCard label="Current Stage" value={(enquiry?.status || "PENDING").replace(/_/g, " ")} color="text-blue-900" />
              </div>

              {/* Corporate Partner Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 size={16} className="text-blue-800" /> Corporate Partner Details
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                    VERIFIED CORPORATE
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <DetailField label="Company Name" value={enquiry?.corporateName} />
                  <DetailField label="CIN Registration" value={enquiry?.mca21CIN || enquiry?.cin} mono />
                  <DetailField label="Contact Person" value={contactName} />
                  <DetailField label="Designation" value={enquiry?.contactPersonDesignation} />
                  <DetailField label="Email" value={contactEmail} href={`mailto:${contactEmail}`} />
                  <DetailField label="Mobile" value={contactPhone} href={`tel:${contactPhone?.replace(/\s/g, "")}`} />
                </div>
              </div>

              {/* Preferred Locations */}
              {(preferredDistricts.length > 0 || preferredDivisions.length > 0) && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <MapPin size={16} className="text-blue-800" /> Preferred Locations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {preferredDistricts.map((d: string, i: number) => (
                      <span key={`d-${i}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                        <MapPin size={12} /> {d}
                      </span>
                    ))}
                    {preferredDivisions.map((d: string, i: number) => (
                      <span key={`dv-${i}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 text-xs font-bold border border-indigo-200">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted CSR Proposal */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                  Submitted CSR Proposal
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {enquiry?.proposedCSRWork || enquiry?.projectDescription || enquiry?.summary || "No proposal description submitted."}
                </p>
              </div>

              {/* Documents & Attachments */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText size={16} className="text-blue-800" /> Submitted Documents & Attachments
                </h3>
                {documents.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {documents.map((doc: string, idx: number) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(doc);
                      return (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                          {isImage ? (
                            <FileImage size={20} className="text-purple-600 shrink-0" />
                          ) : (
                            <FileCheck size={20} className="text-blue-600 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{doc.split("/").pop() || `Document ${idx + 1}`}</p>
                            <p className="text-[10px] text-slate-500">{isImage ? "Image" : "Document"}</p>
                          </div>
                          <a href={doc} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900">
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No documents attached to this enquiry.</p>
                )}
              </div>
            </div>

            {/* ── Right: Sidebar (1/3) ── */}
            <div className="space-y-4">

              {/* Quick Actions */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Quick Actions
                </h4>
                <div className="space-y-2.5">

                  {/* Call Company */}
                  <div className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all group">
                    <button
                      onClick={handleCallCompany}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer bg-transparent border-0 p-0"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <PhoneCall size={16} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-extrabold text-emerald-900">Call Company</p>
                        <p className="text-[11px] text-emerald-700 font-mono truncate">{contactPhone || "No phone available"}</p>
                      </div>
                    </button>
                    {contactPhone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(contactPhone);
                          setPhoneCopied(true);
                          setTimeout(() => setPhoneCopied(false), 2000);
                        }}
                        title="Copy Phone Number"
                        className="ml-auto shrink-0 px-2.5 py-1 rounded-lg bg-emerald-100/90 hover:bg-emerald-200 text-emerald-900 transition-colors border border-emerald-300/80 flex items-center gap-1 text-[11px] font-extrabold cursor-pointer"
                      >
                        {phoneCopied ? (
                          <>
                            <Check size={13} className="text-emerald-800" />
                            <span className="text-[10px] text-emerald-900">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} className="text-emerald-800" />
                            <span className="text-[10px] text-emerald-900">Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Send Email */}
                  <button
                    onClick={handleSendEmail}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mail size={16} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-extrabold text-blue-900">Send Email</p>
                      <p className="text-[11px] text-blue-700 truncate">{contactEmail || "No email available"}</p>
                    </div>
                    <ArrowRight size={14} className="text-blue-500 ml-auto shrink-0" />
                  </button>

                  {/* Schedule Meeting */}
                  <button
                    onClick={() => setShowMeetingModal(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <CalendarDays size={16} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-extrabold text-purple-900">Schedule Meeting</p>
                      <p className="text-[11px] text-purple-700">Set date, time & purpose</p>
                    </div>
                    <ArrowRight size={14} className="text-purple-500 ml-auto shrink-0" />
                  </button>
                </div>
              </div>

              {/* Navigate to Other Tabs */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Workflow Actions
                </h4>
                <div className="space-y-2">
                  <TabNavButton label="View Interaction Log" icon={MessageSquare} onClick={() => setActiveTab("communication")} count={interactions.length} />
                  <TabNavButton label="13-Point Feasibility" icon={ClipboardCheck} onClick={() => setActiveTab("feasibility")} />
                  <TabNavButton label={isJS ? "Joint Secretary Decision Desk" : "JS Decision & Status"} icon={ShieldCheck} onClick={() => setActiveTab("js")} />
                </div>
              </div>

              {/* Assigned RM */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Assigned Relationship Manager
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <User size={18} className="text-blue-800" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      {enquiry?.assignedRelationshipManager
                        ? `${enquiry.assignedRelationshipManager.firstName || ""} ${enquiry.assignedRelationshipManager.lastName || ""}`.trim() || enquiry.assignedRelationshipManager.email
                        : isRM
                        ? `${user?.firstName || "RM"} ${user?.lastName || ""}`.trim()
                        : "State CSR Cell (Unassigned)"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {enquiry?.assignedRelationshipManager?.email || (isRM ? user?.email : "csr-cell@mahacsr.gov.in")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────── */}
        {/* TAB 2: INTERACTION LOG                                 */}
        {/* ────────────────────────────────────────────────────── */}
        {activeTab === "communication" && (
          <InteractionLogTab
            enquiryId={params.id}
            interactions={interactions}
            refetchInteractions={refetchInteractions}
          />
        )}

        {/* ────────────────────────────────────────────────────── */}
        {/* TAB 3: 13-FACTOR FEASIBILITY                          */}
        {/* ────────────────────────────────────────────────────── */}
        {activeTab === "feasibility" && (
          <FeasibilityWorkspace
            enquiryId={params.id}
            existingAssessment={assessment}
            onSubmitted={() => { refetchAssessment(); refetch(); }}
            isJS={isJS}
            isRM={isRM}
            isAdmin={isAdmin}
          />
        )}

        {/* ────────────────────────────────────────────────────── */}
        {/* TAB 4: JS DECISION                                     */}
        {/* ────────────────────────────────────────────────────── */}
        {activeTab === "js" && (
          <div className="space-y-4">
            {assessment?.id ? (
              <JointSecretaryDecisionPanel
                assessmentId={assessment.id}
                currentStatus={assessment.status}
                existingDecision={assessment.jsDecision}
                existingReason={assessment.jsDecisionReason}
                decidedAt={assessment.jsDecidedAt}
                onDecisionRecorded={() => { refetchAssessment(); refetch(); }}
              />
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center space-y-2">
                <Clock size={28} className="text-amber-700 mx-auto" />
                <h3 className="text-sm font-extrabold text-amber-950">Feasibility Assessment Pending</h3>
                <p className="text-xs text-amber-800 max-w-md mx-auto leading-relaxed">
                  The 13-point feasibility checklist has not yet been submitted by the Relationship Manager. Once submitted, Joint Secretary executive decision actions will be available here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────── */}
        {/* TAB 5: ASSIGNMENTS & AUDIT                             */}
        {/* ────────────────────────────────────────────────────── */}
        {activeTab === "assignments" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                Post-JS Approval District & Dept Assignments
              </h3>
              <p className="text-xs text-slate-500">Assignments to DNC and Government Department Officer are triggered automatically upon Joint Secretary approval.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <History size={16} className="text-blue-800" /> Audit Log
              </h3>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-900">Corporate Enquiry Submitted</span>
                <span className="font-mono text-slate-500">{formatDateTime(enquiry?.createdAt)}</span>
              </div>
              {enquiry?.firstContactedAt && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">First Contact Made</span>
                  <span className="font-mono text-slate-500">{formatDateTime(enquiry.firstContactedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Schedule Meeting Modal ─── */}
        {showMeetingModal && (
          <ScheduleMeetingModal
            enquiryId={params.id}
            contactName={contactName}
            contactEmail={contactEmail}
            trackingId={enquiry?.trackingId || params.id}
            onClose={() => setShowMeetingModal(false)}
            onScheduled={() => { refetchInteractions(); setShowMeetingModal(false); }}
          />
        )}
      </div>
    </GovPortalLayout>
  );
}

/* ─── Reusable Sub-Components ─── */

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm">
      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{label}</span>
      <p className={`text-sm font-extrabold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function DetailField({ label, value, mono, href }: { label: string; value?: string | null; mono?: boolean; href?: string }) {
  const display = value || "—";
  return (
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {href && value ? (
        <a href={href} className={`block text-sm font-bold text-blue-800 hover:text-blue-950 hover:underline ${mono ? "font-mono" : ""}`}>
          {display}
        </a>
      ) : (
        <p className={`text-sm font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{display}</p>
      )}
    </div>
  );
}

function TabNavButton({ label, icon: Icon, onClick, count }: { label: string; icon: any; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
    >
      <span className="flex items-center gap-2">
        <Icon size={15} className="text-blue-700" /> {label}
      </span>
      <span className="flex items-center gap-1.5">
        {typeof count === "number" && count > 0 && (
          <span className="bg-blue-100 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
            {count}
          </span>
        )}
        <ArrowRight size={13} className="text-slate-400" />
      </span>
    </button>
  );
}

/* ─── Interaction Log Tab ─── */
function InteractionLogTab({
  enquiryId,
  interactions,
  refetchInteractions
}: {
  enquiryId: string;
  interactions: any[];
  refetchInteractions: () => void;
}) {
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState("PORTAL");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim() || note.trim().length < 3) return;
    setSubmitting(true);
    try {
      await apiFetch(`/rm/enquiries/${enquiryId}/interactions`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim(), channel })
      });
      setNote("");
      refetchInteractions();
    } catch (err) {
      console.error("Log interaction error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Interaction Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <MessageSquare size={16} className="text-blue-800" /> Log New Interaction
        </h3>
        <div className="flex flex-wrap gap-2">
          {INTERACTION_TYPES.filter(t => t.value !== "STATUS_CHANGE").map((type) => {
            const Icon = type.icon;
            const isActive = channel === type.value;
            return (
              <button
                key={type.value}
                onClick={() => setChannel(type.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon size={13} /> {type.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Describe the interaction details..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || note.trim().length < 3}
            className="self-end rounded-xl bg-blue-900 px-5 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : "Log"}
          </button>
        </div>
      </div>

      {/* Interaction Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
          Interaction Timeline ({interactions.length} entries)
        </h3>
        {interactions.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4 text-center">No interactions logged yet.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {interactions.map((interaction: any, idx: number) => {
              const meta = getInteractionMeta(interaction.channel);
              const Icon = meta.icon;
              return (
                <div key={interaction.id || idx} className="flex gap-3 group">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${meta.color}`}>
                      <Icon size={14} />
                    </div>
                    {idx < interactions.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${meta.color} uppercase`}>
                        {meta.label}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatDateTime(interaction.occurredAt || interaction.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed mt-1">{interaction.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Schedule Meeting Modal ─── */
function ScheduleMeetingModal({
  enquiryId,
  contactName,
  contactEmail,
  trackingId: _trackingId,
  onClose,
  onScheduled
}: {
  enquiryId: string;
  contactName: string;
  contactEmail: string;
  trackingId: string;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSchedule = async () => {
    setError("");
    if (!date) return setError("Please select a date.");
    if (!purpose.trim()) return setError("Please enter the meeting purpose.");

    const meetingDateTime = new Date(`${date}T${time}`);
    const dayOfWeek = meetingDateTime.toLocaleDateString("en-IN", { weekday: "long" });

    const note = `Meeting scheduled with ${contactName || "corporate contact"} on ${dayOfWeek}, ${meetingDateTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at ${time}. Purpose: ${purpose.trim()}.`;

    setSubmitting(true);
    try {
      await apiFetch(`/rm/enquiries/${enquiryId}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "MEETING",
          note,
          occurredAt: meetingDateTime.toISOString()
        })
      });
      onScheduled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-purple-700" /> Schedule Meeting
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Date *</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Time *</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20"
              />
            </label>
          </div>

          <label className="space-y-1.5 block">
            <span className="text-xs font-bold text-slate-700">Purpose *</span>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              placeholder="Describe the meeting agenda and purpose..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 resize-none"
            />
          </label>

          {contactName && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900">
              <strong>Attendee:</strong> {contactName} {contactEmail && `(${contactEmail})`}
            </div>
          )}

          {error && (
            <p className="text-xs font-bold text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-extrabold shadow-sm hover:bg-purple-800 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <CalendarDays size={15} />}
            Schedule Meeting
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Feasibility Workspace (Role-Aware) ─── */
function FeasibilityWorkspace({
  enquiryId,
  existingAssessment,
  onSubmitted,
  isJS,
  isRM,
  isAdmin
}: {
  enquiryId: string;
  existingAssessment: any;
  onSubmitted: () => void;
  isJS: boolean;
  isRM: boolean;
  isAdmin: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, "YES" | "NO" | "NA">>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [departmentId, setDepartmentId] = useState("");
  const [districtText, setDistrictText] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const { data: deptData } = useApiQuery<any>(["departments"], "/admin/organizations");
  const departments = Array.isArray(deptData?.data) ? deptData.data : Array.isArray(deptData) ? deptData : [];

  useEffect(() => {
    if (existingAssessment) {
      setDepartmentId(existingAssessment.targetDepartmentId || "");
      setDistrictText(Array.isArray(existingAssessment.targetDistricts) ? existingAssessment.targetDistricts.join(", ") : "");
      setSummary(existingAssessment.executiveSummary || "");
      if (Array.isArray(existingAssessment.checklist)) {
        const nextAnswers: Record<number, "YES" | "NO" | "NA"> = {};
        const nextNotes: Record<number, string> = {};
        existingAssessment.checklist.forEach((item: any) => {
          if (item.itemNumber) {
            nextAnswers[item.itemNumber] = item.answer;
            nextNotes[item.itemNumber] = item.note || "";
          }
        });
        setAnswers(nextAnswers);
        setNotes(nextNotes);
      }
    }
  }, [existingAssessment]);

  const isSubmitted = existingAssessment?.status === "SUBMITTED_TO_JS" ||
                      existingAssessment?.status === "JS_APPROVED" ||
                      existingAssessment?.status === "JS_REJECTED" ||
                      existingAssessment?.status === "PROCEED" ||
                      existingAssessment?.status === "PROCEED_WITH_CONDITIONS";

  const isReturned = existingAssessment?.status === "RETURN_FOR_CLARIFICATION" ||
                     existingAssessment?.status === "RETURN_FOR_CORRECTION";

  // Joint Secretary / Reviewer mode: always read-only checklist
  // RM mode: editable only when not submitted OR when returned for clarification
  const isReadOnly = isJS || (!isRM && !isAdmin) || (isSubmitted && !isReturned);

  const selectedDepartment = departments.find((d: any) => d.id === departmentId);
  const deptDisplayName = selectedDepartment?.name || existingAssessment?.targetDepartment?.name || departmentId || "—";
  const targetDistrictsList = districtText ? districtText.split(",").map((s) => s.trim()).filter(Boolean) : (Array.isArray(existingAssessment?.targetDistricts) ? existingAssessment.targetDistricts : []);

  const completed = Object.keys(answers).length;
  const yesCount = Object.values(answers).filter((a) => a === "YES").length;
  const noCount = Object.values(answers).filter((a) => a === "NO").length;

  const submit = async () => {
    setMessage("");
    if (completed !== CHECKS.length) return setMessage("Answer all 13 checks before submitting.");
    const targetDistricts = districtText.split(",").map(v => v.trim()).filter(Boolean);
    if (!departmentId || !targetDistricts.length) return setMessage("Select the target department and district.");

    setSubmitting(true);
    try {
      const response = await apiFetch<any>(`/rm/enquiries/${enquiryId}/feasibility`, {
        method: "POST",
        body: JSON.stringify({
          executiveSummary: summary,
          targetDepartmentId: departmentId,
          targetDistricts,
          checklist: CHECKS.map(([itemNumber]) => ({ itemNumber, answer: answers[itemNumber], note: notes[itemNumber] || "" }))
        })
      });
      setMessage(response?.message || "Assessment submitted to Joint Secretary.");
      onSubmitted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      {/* Informative banner when assessment is in progress */}
      {!existingAssessment && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-xs text-amber-900">
          <Clock size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Awaiting Relationship Manager Assessment Submission</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              {isJS
                ? "The assigned Relationship Manager is currently conducting the 13-Factor Feasibility Evaluation. All 13 evaluation parameters are listed below — once submitted by the RM, their recorded answers, notes, and recommendation will appear here for your sanction."
                : "Evaluate all 13 compliance and feasibility criteria below, specify the target department and districts, and submit to the Joint Secretary for approval."}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardCheck size={16} className="text-blue-800" />
            13-Point Feasibility Assessment
            {isReadOnly && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Review Mode
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            MCA Schedule VII, statutory clearances, land availability, and operational sustainability evaluation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {existingAssessment?.status && (
            <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold border ${
              existingAssessment.status === "JS_APPROVED" ? "bg-emerald-100 text-emerald-900 border-emerald-200" :
              existingAssessment.status === "JS_REJECTED" ? "bg-rose-100 text-rose-900 border-rose-200" :
              existingAssessment.status === "RETURN_FOR_CLARIFICATION" ? "bg-amber-100 text-amber-900 border-amber-200" :
              "bg-blue-100 text-blue-900 border-blue-200"
            }`}>
              {existingAssessment.status.replace(/_/g, " ")}
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-extrabold text-slate-700 border border-slate-200">
            {yesCount}/13 YES {noCount > 0 && `• ${noCount} NO`}
          </span>
        </div>
      </div>

      {/* Target Dept & Districts */}
      {isReadOnly ? (
        <div className="grid gap-3 sm:grid-cols-2 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Government Department</span>
            <p className="font-extrabold text-slate-900 mt-1">{deptDisplayName}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target District(s)</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {targetDistrictsList.length > 0 ? targetDistrictsList.map((d: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-bold text-[11px]">
                  {d}
                </span>
              )) : <span className="font-bold text-slate-900">Statewide</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-700 space-y-1.5">
            <span>Target Government Department *</span>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-600"
            >
              <option value="">Select department</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-700 space-y-1.5">
            <span>Target District(s) *</span>
            <input
              value={districtText}
              onChange={(e) => setDistrictText(e.target.value)}
              placeholder="e.g. Pune, Thane, Nagpur"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-600"
            />
          </label>
        </div>
      )}

      {/* 13 Checks Grid */}
      <div className="grid gap-2.5 md:grid-cols-2">
        {CHECKS.map(([num, title, desc]) => {
          const ans = answers[num];
          return (
            <div key={num} className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/70 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-slate-900">{num}. {title}</span>
                {isReadOnly ? (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    ans === "YES" ? "bg-emerald-700 text-white shadow-xs" :
                    ans === "NO" ? "bg-rose-700 text-white shadow-xs" :
                    ans === "NA" ? "bg-slate-700 text-white shadow-xs" :
                    "bg-slate-200 text-slate-600"
                  }`}>
                    {ans || "PENDING"}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    {(["YES", "NO", "NA"] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setAnswers((prev) => ({ ...prev, [num]: a }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                          answers[num] === a
                            ? a === "YES" ? "bg-emerald-700 text-white shadow-sm" : a === "NO" ? "bg-rose-700 text-white shadow-sm" : "bg-slate-800 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">{desc}</p>
              {notes[num] && (
                <p className="text-[11px] font-medium text-slate-700 bg-white/80 p-1.5 rounded border border-slate-200">
                  <strong>Note:</strong> {notes[num]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Executive Summary */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700">
          RM Executive Summary {isReadOnly ? "to Joint Secretary" : "for the Joint Secretary"}
        </label>
        {isReadOnly ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {summary || "No executive summary provided."}
          </div>
        ) : (
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Executive summary for the Joint Secretary..."
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-600"
          />
        )}
      </div>

      {/* RM Action Bar (Only shown for RM when not in readOnly mode) */}
      {!isReadOnly && (
        <div className="flex justify-between items-center pt-1">
          {message && <p className="text-xs font-bold text-blue-900">{message}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Submit to Joint Secretary
          </button>
        </div>
      )}

      {/* Joint Secretary Decision Panel (Rendered when viewing as JS) */}
      {isJS && existingAssessment?.id && (
        <div className="pt-3 border-t border-slate-200">
          <JointSecretaryDecisionPanel
            assessmentId={existingAssessment.id}
            currentStatus={existingAssessment.status}
            existingDecision={existingAssessment.jsDecision}
            existingReason={existingAssessment.jsDecisionReason}
            decidedAt={existingAssessment.jsDecidedAt}
            onDecisionRecorded={() => { onSubmitted(); }}
          />
        </div>
      )}
    </section>
  );
}
