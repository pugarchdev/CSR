"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ArrowLeft, Building2, Loader2, Mail, Send,
  MapPin, FileText, ClipboardCheck,
  MessageSquare, History, FileCheck,
  Copy, Check, PhoneCall, Phone, Video, Globe, User, ArrowRight, UserCheck,
  X, CalendarDays, FileImage, ExternalLink, Briefcase, FileCode, Image as ImageIcon,
  CheckCircle2, AlertCircle, ShieldCheck, FileCheck2, RotateCcw, XCircle, Clock,
  HelpCircle, Landmark, ChevronDown, Plus, Sparkles, Filter, CheckSquare
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { MAHARASHTRA_DISTRICTS } from "@/lib/locationData";

/* ─── Constants ─── */
const INTERACTION_TYPES = [
  { value: "CALL", label: "Phone Call", icon: PhoneCall },
  { value: "MEETING", label: "Video / Meeting", icon: Video },
  { value: "SITE_VISIT", label: "Site Inspection", icon: MapPin },
  { value: "EMAIL", label: "Official Email", icon: Mail },
  { value: "PORTAL_CLARIFICATION", label: "Clarification Request", icon: HelpCircle },
];

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
  const c = String(channel || "").toUpperCase();
  if (c.includes("JS_CLARIF") || c.includes("JS_DECISION") || c.includes("JS_")) return { label: "Joint Secretary Notice", icon: ShieldCheck, color: "border-purple-300 bg-purple-50 text-purple-950" };
  if (c.includes("PHONE") || c.includes("CALL")) return { label: "Phone Call", icon: PhoneCall, color: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  if (c.includes("MEET") || c.includes("DISCUSS") || c.includes("VIDEO")) return { label: "Meeting / Discussion", icon: Video, color: "border-purple-200 bg-purple-50 text-purple-800" };
  if (c.includes("SITE") || c.includes("INSPECT")) return { label: "Site Inspection", icon: MapPin, color: "border-indigo-200 bg-indigo-50 text-indigo-800" };
  if (c.includes("EMAIL") || c.includes("MAIL")) return { label: "Official Email", icon: Mail, color: "border-blue-200 bg-blue-50 text-blue-800" };
  if (c.includes("CLARIF") || c.includes("NOTICE") || c.includes("RETURN")) return { label: "Clarification Request", icon: HelpCircle, color: "border-amber-200 bg-amber-50 text-amber-900" };
  return { label: "Portal Note", icon: FileText, color: "border-slate-200 bg-slate-50 text-slate-800" };
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
  defaultDistrict = "Nagpur",
  defaultDepartmentId = "",
  onDecisionRecorded,
}: {
  assessmentId: string;
  currentStatus?: string;
  existingDecision?: string;
  existingReason?: string;
  decidedAt?: string;
  defaultDistrict?: string;
  defaultDepartmentId?: string;
  onDecisionRecorded: () => void;
}) {
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState(defaultDistrict);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(defaultDepartmentId);

  // Fetch government departments dynamically based on selected district
  const { data: govOrgsResponse, isLoading: loadingOrgs } = useApiQuery<any>(
    ["government-orgs-by-district", selectedDistrict],
    `/departments/government-orgs?district=${encodeURIComponent(selectedDistrict)}`,
    { enabled: Boolean(selectedDistrict) }
  );

  const govOrgs: Array<{ id: string; name: string; formattedLabel: string; type: string }> = useMemo(() => {
    return govOrgsResponse?.data || [];
  }, [govOrgsResponse]);

  // Set default org when org list changes
  useEffect(() => {
    if (govOrgs.length > 0 && !govOrgs.some((o) => o.id === selectedDepartmentId)) {
      setSelectedDepartmentId(govOrgs[0].id);
    }
  }, [govOrgs, selectedDepartmentId]);

  const decide = async (decision: "PROCEED" | "PROCEED_WITH_CONDITIONS" | "RETURN_FOR_CLARIFICATION" | "DO_NOT_PROCEED") => {
    setMessage("");
    setError("");
    if (decision !== "PROCEED" && (!reason.trim() || reason.trim().length < 5)) {
      setError("Please provide a reason or conditions (minimum 5 characters) for this decision.");
      return;
    }
    if ((decision === "PROCEED" || decision === "PROCEED_WITH_CONDITIONS") && !selectedDepartmentId) {
      setError("Please select a target Government Organization to assign the project.");
      return;
    }
    setWorking(decision);
    try {
      const res = await apiFetch<any>(`/js/assessments/${assessmentId}/decision`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reason: reason.trim(),
          targetDepartmentId: selectedDepartmentId,
          targetDistrict: selectedDistrict
        })
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
          This enquiry has been sanctioned and routed to the assigned Government Organization and District Nodal Consultant.
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
        Review the 13-Point Feasibility Checklist and RM recommendations. Select the target district and government organization (ZP, Collectorate, Municipal Corporation) to allocate the project upon approval.
      </p>

      {/* Target District & Organization Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/80 p-3.5 rounded-xl border border-blue-100">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <MapPin size={13} className="text-blue-800" /> Target District
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            {MAHARASHTRA_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500">Auto-fetched from Corporate Enquiry preference</span>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Building2 size={13} className="text-blue-800" /> Assign To Government Organization
          </label>
          <select
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            disabled={loadingOrgs}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-blue-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          >
            {loadingOrgs ? (
              <option value="">Loading organizations for {selectedDistrict}...</option>
            ) : govOrgs.length > 0 ? (
              govOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.formattedLabel}
                </option>
              ))
            ) : (
              <option value="">No registered organization in {selectedDistrict} (Select another district)</option>
            )}
          </select>
          <span className="text-[10px] text-slate-500">Filtered by selected district (ZP, Collectorate, MNC)</span>
        </div>
      </div>

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
          disabled={Boolean(working) || (!selectedDepartmentId && govOrgs.length > 0)}
          onClick={() => decide("PROCEED")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800 transition-all disabled:opacity-50"
        >
          {working === "PROCEED" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Approve & Route to {govOrgs.find((o) => o.id === selectedDepartmentId)?.formattedLabel || "Organization"}
        </button>

        <button
          disabled={Boolean(working) || (!selectedDepartmentId && govOrgs.length > 0)}
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
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "communication" | "feasibility" | "js" | "assignments">("overview");
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
      return u.includes("RELATIONSHIP") || u.includes("RM") || u === "6" || u === "ROLE_6";
    }) || user?.roleId === 6;
  }, [user, roles, roleDetails, isJS, mounted]);

  const isStateAuthority = useMemo(() => {
    if (!mounted) return false;
    if (isAdmin || isRM || isJS) return true;
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = t.toUpperCase();
      return (
        u === "SUPER_ADMIN" ||
        u === "PORTAL_ADMIN" ||
        u === "CSR_ADMIN" ||
        u === "STATE_CSR_CELL" ||
        u.includes("PLANNING_SECRETARY") ||
        u.includes("JOINT_SECRETARY") ||
        u === "1" ||
        u === "2" ||
        u === "3" ||
        u === "6"
      );
    });
  }, [user, roles, roleDetails, isAdmin, isRM, isJS, mounted]);

  const canAccessQuickActions = isStateAuthority || hasPermission("meeting:schedule") || hasPermission("enquiry:contact");
  const canAccessRMWorkspace = isRM || isJS || isAdmin || isStateAuthority;
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

  const contactEmail = enquiry?.contactEmail || enquiry?.email || enquiry?.submittedByUser?.email || "";
  const contactPhone = enquiry?.mobile || enquiry?.phone || enquiry?.submittedByUser?.mobile || "";
  const contactName = enquiry?.contactPersonName || [enquiry?.submittedByUser?.firstName, enquiry?.submittedByUser?.lastName].filter(Boolean).join(" ") || "";
  const contactDesignation =
    enquiry?.contactPersonDesignation ||
    enquiry?.designation ||
    enquiry?.contactDesignation ||
    enquiry?.submittedByUser?.designation ||
    (contactName ? "Corporate CSR Representative" : "—");

  const assignedRm = useMemo(() => {
    if (enquiry?.assignedRelationshipManager) {
      const rm = enquiry.assignedRelationshipManager;
      return {
        id: rm.id,
        name: rm.name || [rm.firstName, rm.lastName].filter(Boolean).join(" ") || rm.email || "State CSR Relationship Manager",
        designation: rm.designation || "State CSR Relationship Manager",
        email: rm.email || "csr-cell@mahacsr.gov.in",
        mobile: rm.mobile || "+91 9876543210"
      };
    }
    if (isRM && user) {
      return {
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "Assigned Relationship Manager",
        designation: user.designation || "State CSR Relationship Manager",
        email: user.email || "csr-cell@mahacsr.gov.in",
        mobile: user.mobile || "+91 9876543210"
      };
    }
    return null;
  }, [enquiry?.assignedRelationshipManager, isRM, user]);

  const hasRm = Boolean(assignedRm?.name || enquiry?.assignedRelationshipManagerId);

  const copyTrackingId = () => {
    const textToCopy = enquiry?.trackingId || params.id;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ─── Quick Action: Call Company (RM/State Desk) ─── */
  const handleCallCompany = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!contactPhone) return;
    const phone = contactPhone.replace(/\s/g, "");
    const refNo = enquiry?.trackingId || params.id;
    window.open(`tel:${phone}`, "_self");

    try {
      await apiFetch(`/rm/enquiries/${params.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "CALL",
          note: `Initiated telephone call to corporate contact ${contactName || ""} (${contactPhone}) regarding proposal ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log call failed:", err);
    }
  }, [params.id, contactPhone, contactName, enquiry, refetchInteractions]);

  /* ─── Quick Action: Send Email (RM/State Desk) ─── */
  const handleSendEmail = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!contactEmail) return;
    const recipient = contactEmail;
    const refNo = enquiry?.trackingId || params.id;
    const subject = encodeURIComponent(`MahaCSR Proposal — Reference ${refNo}`);
    const body = encodeURIComponent(
      `Dear ${contactName || "Sir/Madam"},\n\nThis is regarding Corporate CSR Proposal "${enquiry?.corporateName || "Proposal"}" (Reference: ${refNo}).\n\nRegards,\n${[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "State CSR Cell"}\nMaharashtra State CSR Authority`
    );
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, "_self");

    try {
      await apiFetch(`/rm/enquiries/${params.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "EMAIL",
          note: `Initiated official email communication to submitting contact ${contactName || ""} (${recipient}) regarding proposal ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log email failed:", err);
    }
  }, [params.id, contactEmail, contactName, enquiry, user, refetchInteractions]);

  /* ─── RM Contact Action: Email Relationship Manager (auto-logs to timeline) ─── */
  const handleEmailRM = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!assignedRm?.email) return;
    const refNo = enquiry?.trackingId || params.id;
    const subject = encodeURIComponent(`Regarding Corporate CSR Enquiry ${refNo} — ${enquiry?.corporateName || "Convergence Proposal"}`);
    const body = encodeURIComponent(
      `Dear ${assignedRm.name || "Relationship Manager"},\n\nThis is regarding Corporate CSR Enquiry "${enquiry?.corporateName || "Proposal"}" (Tracking ID: ${refNo}).\n\nRegards,\n${[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Corporate Representative"}\n${enquiry?.corporateName || ""}`
    );
    window.open(`mailto:${assignedRm.email}?subject=${subject}&body=${body}`, "_self");

    try {
      await apiFetch(`/rm/enquiries/${params.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "EMAIL",
          note: `Initiated email communication to assigned Relationship Manager ${assignedRm.name || ""} (${assignedRm.email}) regarding enquiry ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log email to RM failed:", err);
    }
  }, [params.id, assignedRm, enquiry, user, refetchInteractions]);

  /* ─── RM Contact Action: Call Relationship Manager (auto-logs to timeline) ─── */
  const handleCallRM = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!assignedRm?.mobile) return;
    const refNo = enquiry?.trackingId || params.id;
    window.open(`tel:${assignedRm.mobile.replace(/\s/g, "")}`, "_self");

    try {
      await apiFetch(`/rm/enquiries/${params.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "CALL",
          note: `Initiated telephone call to assigned Relationship Manager ${assignedRm.name || ""} (${assignedRm.mobile}) regarding enquiry ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log call to RM failed:", err);
    }
  }, [params.id, assignedRm, enquiry, refetchInteractions]);

  const canAccessFeasibility = isStateAuthority || hasPermission("assessment:view");
  const canAccessJSDecision = isJS || isAdmin || (isStateAuthority && !isRM) || (isRM && Boolean(assessment?.jsDecision)) || hasPermission("assessment:review");

  const tabs = useMemo(() => {
    const list: Array<{ id: "overview" | "communication" | "feasibility" | "js" | "assignments"; label: string; icon: any }> = [
      { id: "overview", label: "Overview", icon: Briefcase },
      { id: "communication", label: "Interaction Log", icon: MessageSquare },
    ];
    if (canAccessFeasibility) {
      list.push({ id: "feasibility", label: "13-Point Feasibility", icon: ClipboardCheck });
    }
    if (canAccessJSDecision) {
      list.push({ id: "js", label: isJS ? "Executive Decision" : "JS Decision", icon: ShieldCheck });
    }
    list.push({ id: "assignments", label: "Assignments & Audit", icon: History });
    return list;
  }, [canAccessFeasibility, canAccessJSDecision, isJS]);

  const documents = useMemo(() => Array.isArray(enquiry?.documents) ? enquiry.documents : [], [enquiry?.documents]);
  const preferredDistricts = useMemo(() => Array.isArray(enquiry?.preferredDistricts) ? enquiry.preferredDistricts : [], [enquiry?.preferredDistricts]);
  const preferredDivisions = useMemo(() => Array.isArray(enquiry?.preferredDivisions) ? enquiry.preferredDivisions : [], [enquiry?.preferredDivisions]);
  const preferredTalukas = useMemo(() => Array.isArray(enquiry?.preferredTalukas) ? enquiry.preferredTalukas : [], [enquiry?.preferredTalukas]);
  const preferredCities = useMemo(() => Array.isArray(enquiry?.preferredCities) ? enquiry.preferredCities : [], [enquiry?.preferredCities]);

  const isImageFile = useCallback((url: string) => {
    if (!url || typeof url !== "string") return false;
    const clean = url.split("?")[0].toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)$/i.test(clean) || url.includes("/image/upload/") || url.includes("images");
  }, []);

  const photoDocuments = useMemo(() => documents.filter((doc: string) => isImageFile(doc)), [documents, isImageFile]);
  const supportingDocuments = useMemo(() => documents.filter((doc: string) => !isImageFile(doc)), [documents, isImageFile]);

  const getDocDisplayName = useCallback((url: string, index: number, prefix: string = "Supporting Document"): string => {
    if (!url) return `${prefix} #${index + 1}`;
    try {
      const raw = url.split("/").pop()?.split("?")[0] || "";
      const decoded = decodeURIComponent(raw);
      if (decoded && decoded.trim().length > 0) {
        return decoded;
      }
    } catch {}
    return `${prefix} #${index + 1}`;
  }, []);

  if (!mounted || isLoading) {
    return (
      <GovPortalLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="animate-spin text-blue-900" size={32} />
        </div>
      </GovPortalLayout>
    );
  }

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
                  {contactDesignation && contactDesignation !== "—" && ` — ${contactDesignation}`}
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
                  <DetailField label="Designation" value={contactDesignation} />
                  <DetailField label="Email" value={contactEmail} href={`mailto:${contactEmail}`} onClick={handleSendEmail} />
                  <DetailField label="Mobile" value={contactPhone} href={`tel:${contactPhone?.replace(/\s/g, "")}`} onClick={handleCallCompany} />
                </div>
              </div>

              {/* Preferred Locations */}
              {(preferredDistricts.length > 0 || preferredDivisions.length > 0 || preferredTalukas.length > 0 || preferredCities.length > 0) && (
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
                        {d} Division
                      </span>
                    ))}
                    {preferredTalukas.map((t: string, i: number) => (
                      <span key={`t-${i}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-200">
                        Taluka: {t}
                      </span>
                    ))}
                    {preferredCities.map((c: string, i: number) => (
                      <span key={`c-${i}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
                        City: {c}
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

              {/* Submitted Field Evidence & Technical Documents */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center font-bold">
                      <FileCode size={18} />
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Submitted Field Evidence & Technical Documents
                    </h2>
                  </div>
                  {documents.length > 0 && (
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                      Attachments: <strong className="text-slate-800">{documents.length}</strong>
                    </span>
                  )}
                </div>

                {/* Attached Site Photographs & Evidence */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-blue-800" />
                    GEO-TAGGED SITE PHOTOGRAPHS ({photoDocuments.length})
                  </h3>

                  {photoDocuments.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {photoDocuments.map((photoUrl: string, idx: number) => {
                        const photoName = getDocDisplayName(photoUrl, idx, "Site Evidence");
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedPhoto(photoUrl)}
                            className="group relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-300 transition-all aspect-video flex items-center justify-center"
                          >
                            <img
                              src={photoUrl}
                              alt={photoName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent flex items-end p-2.5">
                              <span className="text-[11px] font-bold text-white flex items-center gap-1 truncate drop-shadow-xs">
                                <ImageIcon size={12} className="shrink-0" /> {photoName.length > 25 ? `Site Evidence #${idx + 1}` : photoName}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 font-medium">
                      No geo-tagged photographs submitted.
                    </div>
                  )}
                </div>

                {/* Supporting Documents & Proposals */}
                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-800" />
                    SUPPORTING PROJECT DOCUMENTS & DPR ({supportingDocuments.length})
                  </h3>

                  {supportingDocuments.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {supportingDocuments.map((docUrl: string, idx: number) => (
                        <a
                          key={idx}
                          href={docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-300 px-3.5 py-2 text-xs font-bold text-blue-950 transition-all shadow-2xs group"
                        >
                          <FileText size={14} className="text-blue-800 shrink-0 group-hover:scale-105 transition-transform" />
                          <span className="truncate max-w-[280px]">{getDocDisplayName(docUrl, idx, "Supporting Document")}</span>
                          <ExternalLink size={12} className="text-blue-700 ml-1 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500 font-medium">
                      No separate project document files attached.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right: Sidebar (1/3) ── */}
            <div className="space-y-4">

              {/* Quick Actions — Strictly restricted to RM, JS, PS, Super Admin, and State CSR Cell */}
              {canAccessQuickActions && (
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
              )}

              {/* Navigate to Other Tabs */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Workflow Actions
                </h4>
                <div className="space-y-2">
                  <TabNavButton label="View Interaction Log" icon={MessageSquare} onClick={() => setActiveTab("communication")} count={interactions.length} />
                  {canAccessFeasibility && (
                    <TabNavButton label="13-Point Feasibility" icon={ClipboardCheck} onClick={() => setActiveTab("feasibility")} />
                  )}
                  {canAccessJSDecision && (
                    <TabNavButton label={isJS ? "Joint Secretary Decision Desk" : "JS Decision & Status"} icon={ShieldCheck} onClick={() => setActiveTab("js")} />
                  )}
                </div>
              </div>

              {/* Assigned Relationship Manager (RM) Card (Matches Pitches View Page) */}
              <section className="rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50/50 via-white to-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                    <UserCheck size={16} className="text-blue-900" /> Assigned RM
                  </h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                    hasRm
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-900 border border-amber-200"
                  }`}>
                    {hasRm ? "Active Assignment" : "Allocation Pending"}
                  </span>
                </div>

                {assignedRm ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-950 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        {assignedRm.name ? assignedRm.name.charAt(0).toUpperCase() : "R"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-extrabold text-slate-900 truncate">{assignedRm.name}</h3>
                        <p className="text-[11px] font-semibold text-blue-900">{assignedRm.designation || "State CSR Relationship Manager"}</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs pt-1">
                      <div className="rounded-xl border border-slate-100 bg-white p-3 flex items-center justify-between shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 shrink-0">Email</span>
                        <a
                          href={`mailto:${assignedRm.email || "csr-cell@mahacsr.gov.in"}`}
                          onClick={handleEmailRM}
                          className="font-bold text-blue-900 hover:underline flex items-center gap-1.5 text-xs break-all cursor-pointer"
                          title="Email Relationship Manager (auto-logs to timeline)"
                        >
                          <Mail size={14} className="text-blue-600 shrink-0" />
                          <span className="break-all">{assignedRm.email || "csr-cell@mahacsr.gov.in"}</span>
                        </a>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-3 flex items-center justify-between shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 shrink-0">Mobile</span>
                        <a
                          href={`tel:${(assignedRm.mobile || "+91 9876543210").replace(/\s/g, "")}`}
                          onClick={handleCallRM}
                          className="font-bold text-slate-900 hover:text-blue-900 flex items-center gap-1.5 cursor-pointer text-xs"
                          title="Call Relationship Manager (auto-logs to timeline)"
                        >
                          <Phone size={14} className="text-emerald-600 shrink-0" />
                          <span>{assignedRm.mobile || "+91 9876543210"}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4 text-center space-y-1.5">
                    <Clock size={20} className="mx-auto text-amber-700" />
                    <p className="text-xs font-bold text-amber-950">Workload Allocation Engine</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Relationship Manager is being assigned automatically based on district and departmental specialization.
                    </p>
                  </div>
                )}
              </section>
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
        {/* TAB 3: 13-FACTOR FEASIBILITY (Restricted to RM, JS, PS, Super Admin) */}
        {/* ────────────────────────────────────────────────────── */}
        {activeTab === "feasibility" && canAccessFeasibility && (
          <FeasibilityWorkspace
            enquiryId={params.id}
            existingAssessment={assessment}
            enquiryDistricts={preferredDistricts}
            onSubmitted={() => { refetchAssessment(); refetch(); }}
            onNavigateToDecision={() => setActiveTab("js")}
            isJS={isJS}
            isRM={isRM}
            isAdmin={isAdmin}
          />
        )}

        {/* ────────────────────────────────────────────────────── */}
        {/* TAB 4: JS DECISION (Restricted to JS, PS, Super Admin) */}
        {/* ────────────────────────────────────────────────────── */}
        {activeTab === "js" && canAccessJSDecision && (
          <div className="space-y-4">
            {assessment?.id ? (
              <JointSecretaryDecisionPanel
                assessmentId={assessment.id}
                currentStatus={assessment.status}
                existingDecision={assessment.jsDecision}
                existingReason={assessment.jsDecisionReason}
                decidedAt={assessment.jsDecidedAt}
                defaultDistrict={assessment?.targetDistricts?.[0] || enquiry?.preferredDistricts?.[0] || enquiry?.district || "Nagpur"}
                defaultDepartmentId={assessment?.targetDepartmentId || ""}
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
            proposalDescription={enquiry?.proposedCSRWork || enquiry?.projectDescription || enquiry?.summary || enquiry?.corporateName || "Corporate CSR Alignment"}
            onClose={() => setShowMeetingModal(false)}
            onScheduled={() => { refetchInteractions(); setShowMeetingModal(false); }}
          />
        )}

        {/* ─── Photo Lightbox Modal ─── */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] bg-transparent rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto}
                alt="Preview"
                className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl border border-white/20"
              />
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={selectedPhoto}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink size={14} /> Open Full Resolution
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-sm transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
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

function DetailField({ label, value, mono, href, onClick }: { label: string; value?: string | null; mono?: boolean; href?: string; onClick?: (e: React.MouseEvent) => void }) {
  const display = value || "—";
  return (
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {href && value ? (
        <a href={href} onClick={onClick} className={`block text-sm font-bold text-blue-800 hover:text-blue-950 hover:underline cursor-pointer ${mono ? "font-mono" : ""}`}>
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
  const [channel, setChannel] = useState("CALL");
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
    <section className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-7 shadow-2xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Corporate Coordination & Interaction Timeline
            </h2>
            <p className="text-[11px] text-slate-500">Official log of calls, meetings, site visits, and clarification exchanges between RM, Corporate, and State Authorities.</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
          {interactions.length} Entries
        </span>
      </div>

      {/* Add Interaction Log Box */}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          LOG COMMUNICATION / INTERACTION NOTE
        </span>

        <div className="flex flex-wrap gap-2">
          {INTERACTION_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = channel === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setChannel(type.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon size={13} /> {type.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Enter discussion notes, call summary, or coordination points..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-100 resize-none"
          />
          <button
            type="button"
            disabled={submitting || note.trim().length < 3}
            onClick={handleSubmit}
            className="self-end sm:self-center inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-5 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Log Note
          </button>
        </div>
      </div>

      {/* Chronological Timeline */}
      {interactions.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl">
          <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">No communication logs recorded yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged calls, meetings, and clarifications between RM and Corporate will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {interactions.map((interaction: any, idx: number) => {
            const meta = getInteractionMeta(interaction.channel);
            const Icon = meta.icon;
            return (
              <div key={interaction.id || idx} className="flex gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${meta.color} uppercase tracking-wider`}>
                        {meta.label}
                      </span>
                      {interaction.actor && (
                        <span className="text-xs font-bold text-slate-800">
                          {[interaction.actor.firstName, interaction.actor.lastName].filter(Boolean).join(" ")}
                          {interaction.actor.designation && <span className="text-slate-400 font-normal ml-1">({interaction.actor.designation})</span>}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {interaction.occurredAt || interaction.createdAt
                        ? new Date(interaction.occurredAt || interaction.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 font-medium whitespace-pre-wrap pt-0.5">
                    {interaction.note}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─── Schedule Alignment Meeting Modal ─── */
function ScheduleMeetingModal({
  enquiryId,
  contactName,
  contactEmail,
  trackingId,
  proposalDescription,
  onClose,
  onScheduled
}: {
  enquiryId: string;
  contactName: string;
  contactEmail: string;
  trackingId: string;
  proposalDescription?: string;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:30");
  const [mode, setMode] = useState("Virtual (Video Call / MahaGov VC)");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSchedule = async () => {
    setError("");
    if (!date) return setError("Please select a date.");
    if (!purpose.trim()) return setError("Please enter the agenda / discussion purpose.");

    const meetingDateTime = new Date(`${date}T${time}`);
    const dayOfWeek = meetingDateTime.toLocaleDateString("en-IN", { weekday: "long" });
    const formattedDate = meetingDateTime.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    const note = `Stakeholder alignment meeting scheduled with ${contactName || "corporate contact"}${contactEmail ? ` (${contactEmail})` : ""} for proposal ${trackingId} on ${dayOfWeek}, ${formattedDate} at ${time}. Mode: ${mode}. Agenda: ${purpose.trim()}.`;

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
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Schedule Alignment Meeting</h3>
              <p className="text-[11px] text-slate-500">Coordinate proposal details with stakeholder.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs space-y-1">
            <p className="font-extrabold text-purple-950">Proposal: {trackingId}</p>
            {proposalDescription && (
              <p className="text-purple-800 line-clamp-1">{proposalDescription}</p>
            )}
            {contactName && (
              <p className="text-slate-600 text-[11px] pt-1">
                <strong>Attendee:</strong> {contactName} {contactEmail && `(${contactEmail})`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs font-bold text-slate-700">Date *</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs font-bold text-slate-700">Time *</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-xs font-bold text-slate-700">Meeting Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20"
            >
              <option value="Virtual (Video Call / MahaGov VC)">Virtual (Video Call / MahaGov VC)</option>
              <option value="In-Person (Mantralaya / District HQ)">In-Person (Mantralaya / District HQ)</option>
              <option value="In-Person (Collectorate Office)">In-Person (Collectorate Office)</option>
              <option value="In-Person (State CSR Cell, Mantralaya)">In-Person (State CSR Cell, Mantralaya)</option>
              <option value="Corporate Office Visit">Corporate Office Visit</option>
              <option value="Telephone Alignment Conference">Telephone Alignment Conference</option>
              <option value="Field / Site Inspection Meeting">Field / Site Inspection Meeting</option>
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-xs font-bold text-slate-700">Agenda / Discussion Purpose *</span>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              placeholder="e.g. Feasibility assessment, budget alignment, or DPR review..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 resize-none"
            />
          </label>

          {error && (
            <p className="text-xs font-bold text-rose-600">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSchedule}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-700 text-white text-xs font-extrabold shadow-sm hover:bg-purple-800 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
            Confirm & Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Feasibility Workspace (Role-Aware & Enhanced) ─── */
const MAIN_GOVERNMENT_ORGS = [
  { id: "ZP", name: "Zilla Parishad (ZP)", subtitle: "Rural Development & District Panchayati Raj", icon: Landmark },
  { id: "MNC", name: "Municipal Corporation (MNC)", subtitle: "Urban Governance & Municipal Administration", icon: Building2 },
  { id: "COLLECTORATE", name: "District Collectorate", subtitle: "District Revenue, Magisterial & State Administration", icon: ShieldCheck },
] as const;

function FeasibilityWorkspace({
  enquiryId,
  existingAssessment,
  enquiryDistricts = [],
  onSubmitted,
  onNavigateToDecision,
  isJS,
  isRM,
  isAdmin
}: {
  enquiryId: string;
  existingAssessment: any;
  enquiryDistricts?: string[];
  onSubmitted: () => void;
  onNavigateToDecision?: () => void;
  isJS: boolean;
  isRM: boolean;
  isAdmin: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, "YES" | "NO" | "NA">>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [openNotes, setOpenNotes] = useState<Record<number, boolean>>({});
  const [targetOrgId, setTargetOrgId] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [districtSearch, setDistrictSearch] = useState("");
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // Synchronize with existing assessment or auto-fetch enquiry districts
  useEffect(() => {
    if (existingAssessment) {
      setTargetOrgId(existingAssessment.targetDepartmentId || existingAssessment.targetOrganization || "");
      if (Array.isArray(existingAssessment.targetDistricts) && existingAssessment.targetDistricts.length > 0) {
        setSelectedDistricts(existingAssessment.targetDistricts);
      } else if (enquiryDistricts.length > 0) {
        setSelectedDistricts(enquiryDistricts);
      }
      setSummary(existingAssessment.executiveSummary || "");
      if (Array.isArray(existingAssessment.checklist)) {
        const nextAnswers: Record<number, "YES" | "NO" | "NA"> = {};
        const nextNotes: Record<number, string> = {};
        const nextOpenNotes: Record<number, boolean> = {};
        existingAssessment.checklist.forEach((item: any) => {
          if (item.itemNumber) {
            nextAnswers[item.itemNumber] = item.answer;
            if (item.note) {
              nextNotes[item.itemNumber] = item.note;
              nextOpenNotes[item.itemNumber] = true;
            }
          }
        });
        setAnswers(nextAnswers);
        setNotes(nextNotes);
        setOpenNotes(nextOpenNotes);
      }
    } else if (enquiryDistricts && enquiryDistricts.length > 0) {
      setSelectedDistricts((prev) => (prev.length > 0 ? prev : enquiryDistricts));
    }
  }, [existingAssessment, enquiryDistricts]);

  const isSubmitted = existingAssessment?.status === "SUBMITTED_TO_JS" ||
                      existingAssessment?.status === "JS_APPROVED" ||
                      existingAssessment?.status === "JS_REJECTED" ||
                      existingAssessment?.status === "PROCEED" ||
                      existingAssessment?.status === "PROCEED_WITH_CONDITIONS";

  const isReturned = existingAssessment?.status === "RETURN_FOR_CLARIFICATION" ||
                     existingAssessment?.status === "RETURN_FOR_CORRECTION";

  const isReadOnly = isJS || (!isRM && !isAdmin) || (isSubmitted && !isReturned);

  const completedCount = Object.keys(answers).length;
  const yesCount = Object.values(answers).filter((a) => a === "YES").length;
  const noCount = Object.values(answers).filter((a) => a === "NO").length;
  const naCount = Object.values(answers).filter((a) => a === "NA").length;
  const progressPercent = Math.round((completedCount / CHECKS.length) * 100);

  // Multi-district handlers
  const handleToggleDistrict = (dist: string) => {
    setSelectedDistricts(prev =>
      prev.includes(dist) ? prev.filter(d => d !== dist) : [...prev, dist]
    );
  };

  const handleRemoveDistrict = (dist: string) => {
    setSelectedDistricts(prev => prev.filter(d => d !== dist));
  };

  const handleSelectAllDistricts = () => {
    setSelectedDistricts([...MAHARASHTRA_DISTRICTS]);
  };

  const handleClearDistricts = () => {
    setSelectedDistricts([]);
  };

  const handleResetToEnquiryDistricts = () => {
    setSelectedDistricts(enquiryDistricts.length ? [...enquiryDistricts] : []);
  };

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return MAHARASHTRA_DISTRICTS;
    return MAHARASHTRA_DISTRICTS.filter(d =>
      d.toLowerCase().includes(districtSearch.toLowerCase().trim())
    );
  }, [districtSearch]);

  // Quick Action Helpers for RM
  const handleSetAllYes = () => {
    const allYes: Record<number, "YES" | "NO" | "NA"> = {};
    CHECKS.forEach(([num]) => {
      allYes[num] = "YES";
    });
    setAnswers(allYes);
  };

  const handleResetAll = () => {
    setAnswers({});
    setNotes({});
    setOpenNotes({});
  };

  // Find org display name
  const matchedMainOrg = MAIN_GOVERNMENT_ORGS.find(o => o.id === targetOrgId);
  const orgDisplayName = matchedMainOrg?.name || existingAssessment?.targetDepartment?.name || targetOrgId || "Not specified (Optional)";

  const submit = async () => {
    setMessage("");
    if (completedCount !== CHECKS.length) {
      return setMessage("Please evaluate all 13 feasibility criteria before submitting to Joint Secretary.");
    }

    setSubmitting(true);
    try {
      const response = await apiFetch<any>(`/rm/enquiries/${enquiryId}/feasibility`, {
        method: "POST",
        body: JSON.stringify({
          executiveSummary: summary || "Feasibility assessment completed by Relationship Manager.",
          targetDepartmentId: targetOrgId || undefined,
          targetDistricts: selectedDistricts,
          checklist: CHECKS.map(([itemNumber]) => ({
            itemNumber,
            answer: answers[itemNumber],
            note: notes[itemNumber] || ""
          }))
        })
      });
      setMessage(response?.message || "Assessment submitted to Joint Secretary successfully.");
      onSubmitted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-7 shadow-xs space-y-6">
      {/* Informative banner when assessment is in progress */}
      {!existingAssessment && (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/50 text-xs text-amber-950 shadow-2xs">
          <Clock size={19} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-amber-950 text-xs">Awaiting Relationship Manager Assessment Submission</p>
            <p className="text-[11.5px] text-amber-800 leading-relaxed">
              {isJS
                ? "The assigned Relationship Manager is evaluating the 13-Factor Feasibility parameters. Once submitted, their verified findings and recommendation will be available here for Joint Secretary sanction."
                : "Evaluate all 13 compliance and feasibility criteria below, optionally specify the target district(s) and government organization, and submit to the Joint Secretary for approval."}
            </p>
          </div>
        </div>
      )}

      {/* Header & Live Progress Scorecard */}
      <div className="border-b border-slate-100 pb-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center shadow-xs shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                13-Point Feasibility Assessment
                {isReadOnly && (
                  <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    Sanction Review Mode
                  </span>
                )}
              </h2>
              <p className="text-[11.5px] text-slate-500 font-medium mt-0.5">
                MCA Schedule VII statutory clearances, land availability, and operational sustainability evaluation.
              </p>
            </div>
          </div>

          {/* Status Badges & Metrics */}
          <div className="flex flex-wrap items-center gap-2">
            {existingAssessment?.status && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-black border uppercase tracking-wider ${
                existingAssessment.status === "JS_APPROVED" ? "bg-emerald-100 text-emerald-900 border-emerald-300" :
                existingAssessment.status === "JS_REJECTED" ? "bg-rose-100 text-rose-900 border-rose-300" :
                existingAssessment.status === "RETURN_FOR_CLARIFICATION" ? "bg-amber-100 text-amber-900 border-amber-300" :
                "bg-blue-100 text-blue-900 border-blue-300"
              }`}>
                {existingAssessment.status.replace(/_/g, " ")}
              </span>
            )}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-black text-slate-700 border border-slate-200 shadow-2xs">
              <span className="text-emerald-700">{yesCount} YES</span>
              {noCount > 0 && <span className="text-rose-700">• {noCount} NO</span>}
              {naCount > 0 && <span className="text-slate-500">• {naCount} NA</span>}
              <span className="text-slate-400 font-normal">({completedCount}/13)</span>
            </div>
          </div>
        </div>

        {/* Progress Bar & RM Quick Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              Evaluation Completion: <strong className={completedCount === 13 ? "text-emerald-700 font-black" : "text-blue-900"}>{progressPercent}%</strong>
            </span>
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetAllYes}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                  title="Mark all 13 parameters as Compliant (YES)"
                >
                  <Sparkles size={12} className="text-emerald-600" />
                  Mark All Compliant (All YES)
                </button>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Clear all recorded answers"
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>
            )}
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                completedCount === 13
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Target District(s) (Position FIRST) & Target Organization (Position SECOND) */}
      {isReadOnly ? (
        <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-gradient-to-br from-slate-50/80 to-blue-50/30 border border-slate-200/80 p-4.5 text-xs shadow-2xs">
          {/* First: District */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={13} className="text-blue-700" /> Target District(s)
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedDistricts.length > 0 ? (
                selectedDistricts.map((d: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-bold text-[11px] shadow-2xs">
                    <MapPin size={10} className="text-blue-600" /> {d}
                  </span>
                ))
              ) : (
                <span className="font-bold text-slate-800">Statewide (All Districts)</span>
              )}
            </div>
          </div>

          {/* Second: Organization */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Landmark size={13} className="text-indigo-700" /> Target Government Organization
            </span>
            <p className="font-extrabold text-slate-900 mt-1">{orgDisplayName}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4.5 lg:grid-cols-2 rounded-2xl bg-gradient-to-br from-slate-50/60 to-blue-50/20 border border-slate-200/80 p-4.5 shadow-2xs">
          {/* FIELD 1 (POSITION FIRST): Target District(s) Multi-Select */}
          <div className="space-y-2 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-700" />
                Target District(s)
                <span className="text-[10px] font-semibold text-slate-400">(Optional • Auto-fetched)</span>
              </label>
              <div className="flex items-center gap-2 text-[10.5px]">
                {enquiryDistricts.length > 0 && selectedDistricts.length !== enquiryDistricts.length && (
                  <button
                    type="button"
                    onClick={handleResetToEnquiryDistricts}
                    className="font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    Reset to Enquiry
                  </button>
                )}
                {selectedDistricts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDistricts}
                    className="font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Selected District Pills Box */}
            <div
              onClick={() => setIsDistrictDropdownOpen(true)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white p-2 flex flex-wrap items-center gap-1.5 cursor-pointer hover:border-blue-400 focus-within:border-blue-600 transition-colors shadow-2xs"
            >
              {selectedDistricts.length > 0 ? (
                selectedDistricts.map((dist) => (
                  <span
                    key={dist}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-50 text-blue-950 border border-blue-200 shadow-2xs"
                  >
                    <MapPin size={11} className="text-blue-700 shrink-0" />
                    <span>{dist}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDistrict(dist);
                      }}
                      className="text-blue-500 hover:text-rose-600 ml-0.5 rounded-full hover:bg-blue-100 p-0.5"
                      title={`Remove ${dist}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-medium px-1">
                  Click to select districts (Default: Statewide / Optional)
                </span>
              )}
              <div className="ml-auto flex items-center pr-1 text-slate-400">
                <ChevronDown size={14} className={`transition-transform ${isDistrictDropdownOpen ? "rotate-180" : ""}`} />
              </div>
            </div>

            {/* Multi-select Dropdown Popover */}
            {isDistrictDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsDistrictDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl space-y-2 max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <input
                      type="text"
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      placeholder="Filter Maharashtra districts..."
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-600"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSelectAllDistricts}
                      className="text-[11px] font-extrabold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg border border-blue-200 whitespace-nowrap"
                    >
                      Select All 36
                    </button>
                  </div>

                  <div className="overflow-y-auto max-h-48 grid grid-cols-2 sm:grid-cols-3 gap-1 pr-1">
                    {filteredDistricts.map((dist) => {
                      const isSelected = selectedDistricts.includes(dist);
                      return (
                        <button
                          key={dist}
                          type="button"
                          onClick={() => handleToggleDistrict(dist)}
                          className={`flex items-center gap-1.5 text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-900 text-white shadow-2xs"
                              : "bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-900 border border-slate-100"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                            isSelected ? "bg-white text-blue-950 border-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check size={10} className="stroke-[3]" />}
                          </span>
                          <span className="truncate">{dist}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{selectedDistricts.length} selected</span>
                    <button
                      type="button"
                      onClick={() => setIsDistrictDropdownOpen(false)}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* FIELD 2 (POSITION SECOND): Target Government Organization (3 Main Orgs: ZP, MNC, Collectorate) */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Landmark size={14} className="text-indigo-700" />
              Target Government Organization
              <span className="text-[10px] font-semibold text-slate-400">(Optional)</span>
            </label>

            <select
              value={targetOrgId}
              onChange={(e) => setTargetOrgId(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 transition-colors shadow-2xs"
            >
              <option value="">Select Organization (Optional)</option>
              {MAIN_GOVERNMENT_ORGS.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 13 Checks Grid with Enhanced Vibrant UI */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-700" />
            13 Mandatory Compliance & Feasibility Parameters
          </h3>
          <span className="text-[11px] font-bold text-slate-400">
            {completedCount} of 13 Criteria Evaluated
          </span>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-2">
          {CHECKS.map(([num, title, desc, isCritical]) => {
            const ans = answers[num];
            const hasNote = Boolean(notes[num]);
            const isNoteOpen = openNotes[num] || hasNote;

            const cardBorderClass =
              ans === "YES"
                ? "border-emerald-300 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/10 shadow-xs ring-1 ring-emerald-500/10"
                : ans === "NO"
                ? "border-rose-300 bg-gradient-to-br from-rose-50/40 via-white to-rose-50/10 shadow-xs ring-1 ring-rose-500/10"
                : ans === "NA"
                ? "border-slate-300 bg-gradient-to-br from-slate-50/60 via-white to-slate-50/20 shadow-xs"
                : "border-slate-200/90 bg-white hover:border-blue-200/90 hover:shadow-2xs";

            return (
              <div
                key={num}
                className={`p-4 rounded-2xl border transition-all duration-150 space-y-2.5 ${cardBorderClass}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-900 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0 mt-0.5">
                      {num}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 leading-snug flex items-center gap-1.5 flex-wrap">
                        <span>{title}</span>
                        {isCritical && (
                          <span className="text-[9px] font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded uppercase">
                            MCA Statutory
                          </span>
                        )}
                      </h4>
                      <p className="text-[11.5px] text-slate-600 font-medium leading-relaxed mt-0.5">
                        {desc}
                      </p>
                    </div>
                  </div>

                  {/* Segmented Control Buttons (YES / NO / NA) */}
                  <div className="shrink-0">
                    {isReadOnly ? (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black uppercase shadow-2xs ${
                        ans === "YES" ? "bg-emerald-600 text-white" :
                        ans === "NO" ? "bg-rose-600 text-white" :
                        ans === "NA" ? "bg-slate-700 text-white" :
                        "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {ans === "YES" && <CheckCircle2 size={12} />}
                        {ans === "NO" && <XCircle size={12} />}
                        {ans === "NA" && <HelpCircle size={12} />}
                        {ans || "PENDING"}
                      </span>
                    ) : (
                      <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200/80 shadow-2xs">
                        {/* YES BUTTON */}
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [num]: "YES" }))}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            ans === "YES"
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-2 ring-emerald-400/40 scale-[1.02]"
                              : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          <CheckCircle2 size={12} className={ans === "YES" ? "text-white" : "text-slate-400"} />
                          YES
                        </button>

                        {/* NO BUTTON */}
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [num]: "NO" }))}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            ans === "NO"
                              ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm ring-2 ring-rose-400/40 scale-[1.02]"
                              : "text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                          }`}
                        >
                          <XCircle size={12} className={ans === "NO" ? "text-white" : "text-slate-400"} />
                          NO
                        </button>

                        {/* NA BUTTON */}
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [num]: "NA" }))}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            ans === "NA"
                              ? "bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-sm ring-2 ring-slate-400/40 scale-[1.02]"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          }`}
                        >
                          <HelpCircle size={12} className={ans === "NA" ? "text-white" : "text-slate-400"} />
                          NA
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* RM Note & Observation Drawer */}
                {!isReadOnly ? (
                  <div className="pt-1">
                    {isNoteOpen ? (
                      <div className="space-y-1">
                        <textarea
                          rows={2}
                          value={notes[num] || ""}
                          onChange={(e) => setNotes(prev => ({ ...prev, [num]: e.target.value }))}
                          placeholder={`Add specific compliance note or field verification remark for item #${num}...`}
                          className="w-full text-xs font-medium text-slate-800 bg-white rounded-xl border border-slate-200 p-2 outline-none focus:border-blue-600 shadow-2xs"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenNotes(prev => ({ ...prev, [num]: true }))}
                        className="text-[11px] font-bold text-blue-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={11} /> Add verification note / remarks
                      </button>
                    )}
                  </div>
                ) : (
                  notes[num] && (
                    <p className="text-[11px] font-medium text-slate-700 bg-white/90 p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <strong className="text-slate-900">Observation:</strong> {notes[num]}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RM Executive Summary */}
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-900 flex items-center justify-between">
          <span>RM Executive Summary {isReadOnly ? "to Joint Secretary" : "for the Joint Secretary"}</span>
          <span className="text-[10px] font-semibold text-slate-400">Formal Sanction Briefing</span>
        </label>
        {isReadOnly ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap shadow-2xs">
            {summary || "Detailed technical and field feasibility verified by Relationship Manager. Proposal meets all eligibility and documentation standards for corporate engagement."}
          </div>
        ) : (
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Provide concise executive briefing and statutory summary for the Joint Secretary..."
            className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs font-medium outline-none focus:border-blue-600 shadow-2xs transition-colors"
          />
        )}
      </div>

      {/* RM Action Submission Bar */}
      {!isReadOnly && (
        <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-slate-100">
          <div>
            {message && (
              <p className={`text-xs font-bold ${message.includes("success") ? "text-emerald-700" : "text-blue-900"}`}>
                {message}
              </p>
            )}
          </div>
          <button
            onClick={submit}
            disabled={submitting}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-3 text-xs font-black text-white shadow-md hover:from-blue-950 hover:to-indigo-950 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>Submitting Feasibility Assessment...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Submit Assessment to Joint Secretary</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Navigation action to the dedicated Executive Decision tab */}
      {existingAssessment?.id && (isJS || isAdmin) && onNavigateToDecision && (
        <div className="pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">
                  {existingAssessment.jsDecision ? "Joint Secretary Executive Decision Recorded" : "Feasibility Assessment Ready for Joint Secretary Decision"}
                </h4>
                <p className="text-[11px] text-slate-600 font-medium">
                  {existingAssessment.jsDecision
                    ? "View sanction status, recorded conditions, and allocated government department in the Executive Decision tab."
                    : "Review completed. Proceed to the dedicated Executive Decision tab to sanction, route, or return for clarification."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToDecision}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-black hover:bg-blue-950 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <span>{existingAssessment.jsDecision ? "View Executive Decision" : "Open Executive Decision Desk"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
