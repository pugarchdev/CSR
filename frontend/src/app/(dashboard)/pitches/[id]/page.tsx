"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  ArrowLeft, BadgeIndianRupee, Building2, Calendar, CheckCircle2, FileText,
  Loader2, Send, FileCode, ShieldCheck, AlertCircle, Copy, Check, UserCheck,
  Mail, Phone, User, MapPin, ExternalLink, Image as ImageIcon,
  CheckSquare, ArrowUpRight, Sparkles, Clock, FileCheck, MessageSquare,
  HelpCircle, RotateCcw, Video, SendHorizontal, MessageCircle, X, Upload,
  CalendarDays, ArrowRight
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch, uploadPortalFile } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const INTERACTION_TYPES = [
  { value: "PHONE", label: "Phone Call", icon: Phone },
  { value: "MEETING", label: "Video / Meeting", icon: Video },
  { value: "SITE_VISIT", label: "Site Inspection", icon: MapPin },
  { value: "EMAIL", label: "Official Email", icon: Mail },
  { value: "PORTAL_CLARIFICATION", label: "Clarification Request", icon: HelpCircle },
];

function getInteractionMeta(channel: string) {
  const c = String(channel || "").toUpperCase();
  if (c.includes("JS_CLARIF") || c.includes("JS_DECISION") || c.includes("JS_")) return { label: "Joint Secretary Notice", icon: ShieldCheck, color: "border-purple-300 bg-purple-50 text-purple-950" };
  if (c.includes("PHONE") || c.includes("CALL")) return { label: "Phone Call", icon: Phone, color: "border-blue-200 bg-blue-50 text-blue-800" };
  if (c.includes("MEET") || c.includes("VIDEO")) return { label: "Meeting / Discussion", icon: Video, color: "border-purple-200 bg-purple-50 text-purple-800" };
  if (c.includes("VISIT") || c.includes("INSPECT")) return { label: "Site Inspection", icon: MapPin, color: "border-indigo-200 bg-indigo-50 text-indigo-800" };
  if (c.includes("EMAIL") || c.includes("MAIL")) return { label: "Official Email", icon: Mail, color: "border-sky-200 bg-sky-50 text-sky-800" };
  if (c.includes("RM_VERIF")) return { label: "RM Verification Report", icon: FileCheck, color: "border-blue-300 bg-blue-50 text-blue-950" };
  if (c.includes("CLARIF")) return { label: "Clarification Notice", icon: HelpCircle, color: "border-amber-200 bg-amber-50 text-amber-900" };
  if (c.includes("RESPONSE") || c.includes("DEPT")) return { label: "Department Response", icon: MessageCircle, color: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  return { label: "Coordination Note", icon: MessageSquare, color: "border-slate-200 bg-slate-50 text-slate-800" };
}

const PITCH_VERIFICATION_CHECKS = [
  { id: "departmentActive", label: "Department Active & Verified", desc: "The submitting department has an active approved onboarding." },
  { id: "officialAuthorized", label: "Official Authorized", desc: "The submitting official is verified and authorized by the department." },
  { id: "serviceClassValid", label: "Service Cadre Valid", desc: "The declared service class and designation are authentic." },
  { id: "certificationPresent", label: "Certification Attached", desc: "Self-certification or HOD certification is present as required." },
  { id: "fundDeclarationComplete", label: "Fund Declaration Complete", desc: "Government-fund non-availability declaration is verified." },
  { id: "photosPresent", label: "Site Photographs Present", desc: "At least two geotagged site photographs are available and clear." },
  { id: "coordinatesMatchDistrict", label: "Coordinates Match District", desc: "Site photo coordinates align with the selected target district." },
  { id: "needGenuine", label: "Development Need Genuine", desc: "The development need is supported by authentic field evidence." },
  { id: "csrEligible", label: "Schedule VII Eligible", desc: "The proposed activity qualifies under CSR Schedule VII domains." },
  { id: "costReasonable", label: "Cost Reasonable & Benchmarked", desc: "The estimated outlay is realistic and benchmarked against state standards." },
  { id: "duplicateReviewComplete", label: "Duplicate Review Complete", desc: "No conflicting or duplicate pitches/projects exist in this area." }
];

function formatINR(val?: number | string | null): string {
  if (!val && val !== 0) return "Not specified";
  const num = Number(val);
  if (isNaN(num) || num === 0) return "Not specified";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakhs`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num.toLocaleString("en-IN")}`;
}

function formatServiceClass(sc?: string | null): string {
  if (!sc) return "Official Cadre";
  const map: Record<string, string> = {
    CLASS_1: "Class-1 Officer (Gazetted)",
    CLASS_2: "Class-2 Officer",
    BELOW_CLASS_2: "Below Class-2 Officer",
  };
  return map[sc] || sc.replace(/_/g, " ");
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

export default function PitchDetailPage() {
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const roleDetails = useAuthStore((state) => state.roleDetails);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean | undefined>>({});
  const [recommendation, setRecommendation] = useState("FEASIBLE");
  const [assessmentSummary, setAssessmentSummary] = useState("");
  const [conditions, setConditions] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [localApproved, setLocalApproved] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Clarification & Interaction State
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [clarificationText, setClarificationText] = useState("");
  const [submittingClarification, setSubmittingClarification] = useState(false);
  const [deptResponseText, setDeptResponseText] = useState("");
  const [submittingDeptResponse, setSubmittingDeptResponse] = useState(false);
  const [clarificationFile, setClarificationFile] = useState<File | null>(null);
  const [uploadingClarificationDoc, setUploadingClarificationDoc] = useState(false);
  const [uploadedClarificationDocUrl, setUploadedClarificationDocUrl] = useState<string | null>(null);
  const [newInteractionNote, setNewInteractionNote] = useState("");
  const [newInteractionChannel, setNewInteractionChannel] = useState("PHONE");
  const [loggingInteraction, setLoggingInteraction] = useState(false);

  // Joint Secretary Decision State & Modal
  const [showJsDecisionModal, setShowJsDecisionModal] = useState(false);
  const [jsDecision, setJsDecision] = useState<"APPROVE" | "APPROVE_WITH_CONDITIONS" | "RETURN_FOR_CLARIFICATION" | "REJECT">("APPROVE");
  const [jsRemarks, setJsRemarks] = useState("");
  const [jsApprovalConditions, setJsApprovalConditions] = useState("");
  const [submittingJsDecision, setSubmittingJsDecision] = useState(false);

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTarget, setMeetingTarget] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isRM = useMemo(() => {
    if (!mounted) return false;
    if (isAdmin) return true;
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = t.toUpperCase();
      return u.includes("RELATIONSHIP") || u.includes("RM") || u === "6";
    });
  }, [user, roles, roleDetails, isAdmin, mounted]);

  const isJS = useMemo(() => {
    if (!mounted) return false;
    if (isAdmin) return true;
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = String(t).toUpperCase();
      return u.includes("JOINT_SECRETARY") || u.includes("JOINT SECRETARY") || u === "3" || user?.roleId === 3;
    });
  }, [user, roles, roleDetails, isAdmin, mounted]);

  const isSuperAdmin = useMemo(() => {
    if (!mounted) return false;
    if (isAdmin) return true;
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = String(t).toUpperCase();
      return u.includes("SUPER_ADMIN") || u.includes("SUPERADMIN") || u === "1";
    });
  }, [user, roles, roleDetails, isAdmin, mounted]);

  const { data: response, isLoading, error, refetch } = useApiQuery<any>(
    ["pitch", params.id],
    `/government-pitches/${params.id}`,
    { enabled: Boolean(params.id) }
  );

  const { data: interactionsResponse, refetch: refetchInteractions } = useApiQuery<any>(
    ["pitch-interactions", params.id],
    `/government-pitches/${params.id}/interactions`,
    { enabled: Boolean(params.id) }
  );

  const pitch = response?.data ?? response;
  const interactions = Array.isArray(pitch?.interactions)
    ? pitch.interactions
    : Array.isArray(interactionsResponse?.data)
    ? interactionsResponse.data
    : Array.isArray(interactionsResponse)
    ? interactionsResponse
    : [];

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: prev[id] === undefined ? true : !prev[id] }));
  };

  const answeredCheckCount = PITCH_VERIFICATION_CHECKS.filter((item) => typeof checkedItems[item.id] === "boolean").length;
  const verifiedYesCount = PITCH_VERIFICATION_CHECKS.filter((item) => checkedItems[item.id] === true).length;
  const reviewReady = answeredCheckCount === PITCH_VERIFICATION_CHECKS.length
    && assessmentSummary.trim().length >= 20
    && (recommendation !== "PROCEED_WITH_CONDITIONS" || conditions.trim().length >= 10);

  const rmVerification = pitch?.rmVerification || null;

  const budget = Number(pitch?.budget || pitch?.estimatedCost || 0);

  const isAlreadyApproved =
    localApproved ||
    pitch?.status === "PUBLIC_LISTED" ||
    pitch?.status === "APPROVED" ||
    pitch?.status === "JS_APPROVED";

  const isClarificationNeeded = pitch?.status === "RETURNED_FOR_CLARIFICATION" || pitch?.status === "RETURNED_FOR_CORRECTION" || pitch?.status === "CLARIFICATION_REQUIRED";

  const isPitchOwner = useMemo(() => {
    if (!user) return false;
    return pitch?.submittedByUserId === user.id || 
      (user.organizationId && pitch?.departmentId === user.organizationId) ||
      (!isRM && !isJS && !isSuperAdmin);
  }, [user, pitch, isRM, isJS, isSuperAdmin]);

  const latestClarification = useMemo(() => {
    const clar = interactions.find(
      (i: any) =>
        i.channel === "PORTAL_CLARIFICATION" ||
        i.channel === "CLARIFICATION_REQUEST" ||
        (i.note && i.note.toLowerCase().includes("clarification"))
    );
    return clar?.note || pitch?.clarificationRemarks || "The Relationship Manager has requested clarification on this pitch proposal. Please review and provide response.";
  }, [interactions, pitch]);

  const handleJsDecisionSubmit = async (selectedDecision?: string) => {
    const decisionToSubmit = selectedDecision || jsDecision;
    if (decisionToSubmit === "RETURN_FOR_CLARIFICATION" && jsRemarks.trim().length < 5) {
      alert("Please provide the specific clarification questions or details needed from the Relationship Manager.");
      return;
    }
    if (decisionToSubmit === "REJECT" && jsRemarks.trim().length < 5) {
      alert("Please provide the reason for rejecting this pitch proposal.");
      return;
    }
    if (decisionToSubmit === "APPROVE_WITH_CONDITIONS" && jsApprovalConditions.trim().length < 10) {
      alert("Please specify the mandatory approval conditions (minimum 10 characters).");
      return;
    }

    setSubmittingJsDecision(true);
    setReviewMessage("");
    try {
      const result = await apiFetch<any>(`/government-pitches/${pitch.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          decision: decisionToSubmit,
          reason: jsRemarks.trim() || (decisionToSubmit === "APPROVE" ? "Approved by Joint Secretary for Public Development Needs listing" : ""),
          conditions: jsApprovalConditions.trim() || undefined
        })
      });
      if (decisionToSubmit === "APPROVE" || decisionToSubmit === "APPROVE_WITH_CONDITIONS") {
        setLocalApproved(true);
      }
      setShowJsDecisionModal(false);
      setReviewMessage(result?.message || `Joint Secretary decision (${decisionToSubmit.replace(/_/g, " ")}) recorded successfully.`);
      refetch();
      refetchInteractions();
    } catch (err: any) {
      alert(err.message || "Failed to execute Joint Secretary decision.");
    } finally {
      setSubmittingJsDecision(false);
    }
  };

  const handleJsApprove = async (decision: string = "APPROVE") => {
    setJsDecision(decision as any);
    setShowJsDecisionModal(true);
  };

  const handleRequestClarification = async () => {
    if (!clarificationText.trim() || clarificationText.trim().length < 5) return;
    setSubmittingClarification(true);
    try {
      await apiFetch(`/rm/pitches/${pitch.id}/clarification`, {
        method: "POST",
        body: JSON.stringify({ reason: clarificationText.trim() })
      });
      setShowClarifyModal(false);
      setClarificationText("");
      setReviewMessage("Clarification notice sent to the submitting department official.");
      refetch();
      refetchInteractions();
    } catch (err: any) {
      alert(err.message || "Failed to request clarification.");
    } finally {
      setSubmittingClarification(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClarificationFile(file);
    setUploadingClarificationDoc(true);
    try {
      const url = await uploadPortalFile(file);
      setUploadedClarificationDocUrl(url);
    } catch (err: any) {
      alert(err.message || "Failed to upload document");
      setClarificationFile(null);
    } finally {
      setUploadingClarificationDoc(false);
    }
  };

  const handleRespondClarification = async () => {
    if (!deptResponseText.trim() || deptResponseText.trim().length < 5) {
      alert("Please enter a response note (minimum 5 characters).");
      return;
    }
    setSubmittingDeptResponse(true);
    try {
      await apiFetch(`/government-pitches/${pitch.id}/clarify-response`, {
        method: "POST",
        body: JSON.stringify({
          responseNote: deptResponseText.trim(),
          supportingDocumentUrl: uploadedClarificationDocUrl || undefined
        })
      });
      setDeptResponseText("");
      setClarificationFile(null);
      setUploadedClarificationDocUrl(null);
      setReviewMessage("Clarification response submitted to Relationship Manager. Status updated to Under RM Review.");
      refetch();
      refetchInteractions();
    } catch (err: any) {
      alert(err.message || "Failed to submit clarification response.");
    } finally {
      setSubmittingDeptResponse(false);
    }
  };

  const handleLogInteraction = async () => {
    if (!newInteractionNote.trim() || newInteractionNote.trim().length < 3) return;
    setLoggingInteraction(true);
    try {
      await apiFetch(`/government-pitches/${pitch.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({ note: newInteractionNote.trim(), channel: newInteractionChannel })
      });
      setNewInteractionNote("");
      refetchInteractions();
    } catch (err: any) {
      alert(err.message || "Failed to log interaction.");
    } finally {
      setLoggingInteraction(false);
    }
  };

  const handleEmailOfficial = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!pitch?.email) return;
    const recipient = pitch.email;
    const refNo = pitch?.pitchReferenceId || params.id;
    const subject = encodeURIComponent(`MahaCSR Proposal — Reference ${refNo}`);
    const body = encodeURIComponent(
      `Dear ${pitch.officialName || "Sir/Madam"},\n\nThis is regarding Government Pitch Proposal "${pitch.title || "CSR Requirement"}" (Reference: ${refNo}).\n\nRegards,\n${[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "State CSR Cell"}\nMaharashtra State CSR Authority`
    );
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, "_self");

    try {
      await apiFetch(`/government-pitches/${pitch.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "EMAIL",
          note: `Initiated official email communication to submitting officer ${pitch.officialName || ""} (${recipient}) regarding proposal ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log email interaction failed:", err);
    }
  };

  const handleCallOfficial = async (e: React.MouseEvent) => {
    if (!pitch?.mobile) return;
    const phone = pitch.mobile;
    const refNo = pitch?.pitchReferenceId || params.id;
    window.open(`tel:${phone}`, "_self");

    try {
      await apiFetch(`/government-pitches/${pitch.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "PHONE",
          note: `Initiated telephone call to submitting officer ${pitch.officialName || ""} (${phone}) regarding proposal ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log phone call failed:", err);
    }
  };

  const handleEmailRM = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!assignedRm?.email) return;
    const recipient = assignedRm.email;
    const refNo = pitch?.pitchReferenceId || params.id;
    const subject = encodeURIComponent(`MahaCSR Proposal Coordination — Reference ${refNo}`);
    const body = encodeURIComponent(
      `Dear ${assignedRm.name || "Relationship Manager"},\n\nThis is regarding Government Pitch Proposal "${pitch.title || "CSR Requirement"}" (Reference: ${refNo}).\n\nRegards,\n${[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Department Official"}\n${pitch.department || "Government Department"}`
    );
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, "_self");

    try {
      await apiFetch(`/government-pitches/${pitch.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "EMAIL",
          note: `Initiated email communication to assigned Relationship Manager ${assignedRm.name || ""} (${recipient}) regarding proposal ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log RM email failed:", err);
    }
  };

  const handleCallRM = async (e: React.MouseEvent) => {
    if (!assignedRm?.mobile) return;
    const phone = assignedRm.mobile;
    const refNo = pitch?.pitchReferenceId || params.id;
    window.open(`tel:${phone}`, "_self");

    try {
      await apiFetch(`/government-pitches/${pitch.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          channel: "PHONE",
          note: `Initiated telephone call to assigned Relationship Manager ${assignedRm.name || ""} (${phone}) regarding proposal ${refNo}.`
        })
      });
      refetchInteractions();
    } catch (err) {
      console.warn("Auto-log RM phone call failed:", err);
    }
  };

  const copyRefId = () => {
    const textToCopy = pitch?.pitchReferenceId || params.id;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const primaryDistrict = Array.isArray(pitch?.districts) && pitch.districts.length > 0
    ? pitch.districts.join(", ")
    : pitch?.district || "Maharashtra";

  const primaryDivision = Array.isArray(pitch?.divisions) && pitch.divisions.length > 0
    ? pitch.divisions.join(", ")
    : pitch?.division || "";

  const assignedRm = pitch?.assignedRelationshipManager;
  const hasRm = Boolean(assignedRm?.name || pitch?.assignedRelationshipManagerId);

  return (
    <GovPortalLayout>
      <main className="mx-auto min-h-screen max-w-7xl space-y-5 px-4 py-5 md:px-8">
        {/* Top Breadcrumb Navigation & Access Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <Link
            href="/pitches"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-900 transition-colors bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs no-underline w-fit"
          >
            <ArrowLeft size={14} /> Back to Government Pitches Register
          </Link>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold border shadow-2xs ${
              isAlreadyApproved
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}>
              <span className={`h-2 w-2 rounded-full ${isAlreadyApproved ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {isAlreadyApproved ? "PUBLIC • Live on CSR Marketplace" : "CONFIDENTIAL • Internal Review"}
            </span>
          </div>
        </div>

        {/* Pitch Hero Header Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-900 via-indigo-600 to-emerald-600" />
          
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5 max-w-4xl">
              {/* Reference ID & Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-extrabold text-blue-950 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 shadow-2xs">
                  {pitch?.pitchReferenceId || "GP-MH-2026"}
                  <button 
                    onClick={copyRefId} 
                    className="ml-1 p-0.5 text-blue-700 hover:text-blue-950 hover:bg-blue-200/60 rounded transition-colors" 
                    title="Copy Reference ID"
                  >
                    {copied ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                  </button>
                </span>

                <span className={`rounded-lg px-3 py-1 text-xs font-extrabold border shadow-2xs ${
                  isAlreadyApproved
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-900 border-amber-200"
                }`}>
                  {(isAlreadyApproved ? "PUBLIC LISTED" : pitch?.status || "UNDER REVIEW").replace(/_/g, " ")}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                  <Building2 size={13} className="text-slate-500" />
                  {pitch?.department || "Department Pitch"}
                </span>

                {primaryDistrict && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900 border border-indigo-200/70">
                    <MapPin size={13} className="text-indigo-600" />
                    {primaryDistrict}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-lg md:text-xl font-black text-slate-900">
                {pitch?.title || "Government Development Pitch Proposal"}
              </h1>

              {/* Metadata Subtitle */}
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Submitted by: <strong className="text-slate-800 font-bold">{pitch?.officialName || "Department Nodal Officer"}</strong></span>
                <span>•</span>
                <span>Designation: <strong className="text-slate-800 font-bold">{pitch?.designation || "Nodal Official"}</strong></span>
                <span>•</span>
                <span>Service Cadre: <strong className="text-slate-800 font-bold">{formatServiceClass(pitch?.serviceClass)}</strong></span>
              </p>
            </div>

            {/* Quick Action Button Area */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {isRM && !isAlreadyApproved && pitch?.status !== "JS_APPROVAL_PENDING" && (
                <button
                  type="button"
                  onClick={() => setShowClarifyModal(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-5 py-3 text-xs font-extrabold text-amber-900 shadow-2xs transition-all cursor-pointer"
                >
                  <HelpCircle size={15} className="text-amber-700" />
                  Request Clarification
                </button>
              )}

              {isJS && !isAlreadyApproved && (
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleJsApprove("APPROVE")}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-3 text-xs font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-green-800 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Approve & Publish to Public
                </button>
              )}

              {isAlreadyApproved && (
                <Link
                  href="/public-development-needs"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-xs font-extrabold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition-all no-underline"
                >
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  View Live in Public Directory →
                </Link>
              )}
            </div>
          </div>

          {reviewMessage && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs font-bold text-blue-950 shadow-2xs flex items-center gap-2">
              <Sparkles size={16} className="text-blue-700 shrink-0" />
              {reviewMessage}
            </div>
          )}
        </div>

        {/* Clarification Alert Banner for Submitting Department */}
        {isClarificationNeeded && (
          <section className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 p-6 md:p-7 shadow-xs space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                <HelpCircle size={20} />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-extrabold text-amber-950">
                    Relationship Manager Requested Clarification
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-lg">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  The assigned Relationship Manager has reviewed this proposal and requested additional details before forwarding to the Joint Secretary.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="space-y-1.5 text-xs font-bold text-slate-800 block">
                <span>Department Clarification Response / Additional Details *</span>
                <textarea
                  value={deptResponseText}
                  onChange={(e) => setDeptResponseText(e.target.value)}
                  rows={3}
                  placeholder="Type your response addressing the RM's questions..."
                  className="w-full rounded-2xl border border-amber-200 bg-white p-3.5 text-xs outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Min 5 characters required</span>
                <button
                  type="button"
                  disabled={submittingDeptResponse || deptResponseText.trim().length < 5}
                  onClick={handleRespondClarification}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingDeptResponse ? <Loader2 size={14} className="animate-spin" /> : <SendHorizontal size={14} />}
                  Submit Response to RM
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Pitch Content */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-900" size={32} />
            <p className="text-xs font-bold text-slate-500">Loading pitch proposal details…</p>
          </div>
        ) : error || !pitch?.id ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-12 text-center shadow-xs">
            <AlertCircle size={40} className="mx-auto text-rose-600 mb-3" />
            <h2 className="text-lg font-bold text-rose-900">Pitch Record Unavailable</h2>
            <p className="mt-1 text-xs text-rose-700 max-w-md mx-auto">
              This government pitch could not be loaded or is not accessible with your current credentials.
            </p>
            <Link
              href="/pitches"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Return to Pitches Register
            </Link>
          </section>
        ) : (
          <div className="space-y-6">
            {/* 4 Summary Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatSummaryCard
                icon={<BadgeIndianRupee size={18} className="text-emerald-700" />}
                iconBg="bg-emerald-100"
                label="Estimated Outlay"
                value={formatINR(budget)}
                subtext="Total Proposed Budget"
              />
              <StatSummaryCard
                icon={<MapPin size={18} className="text-blue-700" />}
                iconBg="bg-blue-100"
                label="Target District"
                value={primaryDistrict || "Maharashtra"}
                subtext={primaryDivision ? `${primaryDivision} Division` : "Statewide Scope"}
              />
              <StatSummaryCard
                icon={<Building2 size={18} className="text-purple-700" />}
                iconBg="bg-purple-100"
                label="Department"
                value={pitch.department || "Government Dept"}
                subtext={pitch.officeName || "Submitting Unit"}
              />
              <StatSummaryCard
                icon={<Calendar size={18} className="text-indigo-700" />}
                iconBg="bg-indigo-100"
                label="Submission Date"
                value={pitch.createdAt ? new Date(pitch.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                subtext={pitch.status ? `Status: ${pitch.status.replace(/_/g, " ")}` : "Verified"}
              />
            </div>

            {/* Main Content Layout: 2/3 Main Body, 1/3 Sidebar */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column (2 Cols) */}
              <div className="space-y-6 lg:col-span-2">

                {/* Clarification Action Required Workspace (Visible when RM requests clarification) */}
                {isClarificationNeeded && (
                  <section className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-6 md:p-7 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-200/70 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                          <HelpCircle size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-black text-slate-900">
                              Clarification Requested by Relationship Manager
                            </h2>
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                              Action Required
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Please review the inquiry from the Relationship Manager and provide your response / optional documents below.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Clarification Query Detail Box */}
                    <div className="rounded-2xl border border-amber-200/90 bg-white/90 p-4 space-y-1.5 shadow-2xs">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <AlertCircle size={13} className="text-amber-700 shrink-0" />
                        Relationship Manager Inquiry / Questions
                      </span>
                      <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {latestClarification}
                      </p>
                    </div>

                    {/* Clarification Response Form */}
                    {(!isRM || isPitchOwner) ? (
                      <div className="space-y-4 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-slate-900 block">
                            Department Clarification & Response Remarks <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            value={deptResponseText}
                            onChange={(e) => setDeptResponseText(e.target.value)}
                            rows={3}
                            placeholder="Enter detailed clarification, revised specifications, or explanations answering the RM's inquiry..."
                            className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs font-medium outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 shadow-2xs resize-none"
                          />
                          <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-1">
                            <span>Minimum 5 characters required</span>
                            <span>{deptResponseText.trim().length} chars</span>
                          </div>
                        </div>

                        {/* Optional Document Upload */}
                        <div className="space-y-2">
                          <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <Upload size={14} className="text-blue-900" />
                            Attach Supporting Document / Revision <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>

                          {uploadedClarificationDocUrl ? (
                            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 text-xs shadow-2xs">
                              <div className="flex items-center gap-2 text-emerald-950 font-bold min-w-0">
                                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                                <span className="truncate">{clarificationFile?.name || "Uploaded Supporting Document"}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setClarificationFile(null);
                                  setUploadedClarificationDocUrl(null);
                                }}
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 ml-2 shrink-0 cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/80 hover:bg-blue-50/40 cursor-pointer transition-colors text-xs font-bold text-slate-700">
                              {uploadingClarificationDoc ? (
                                <>
                                  <Loader2 size={16} className="animate-spin text-blue-900" />
                                  <span>Uploading document...</span>
                                </>
                              ) : (
                                <>
                                  <Upload size={16} className="text-blue-900" />
                                  <span>Upload PDF or document attachment (Optional)</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                                onChange={handleFileUpload}
                                disabled={uploadingClarificationDoc}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={submittingDeptResponse || deptResponseText.trim().length < 5 || uploadingClarificationDoc}
                            onClick={handleRespondClarification}
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-900 px-6 py-3.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {submittingDeptResponse ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                            Submit Clarification Response to RM
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-amber-100/60 border border-amber-200 text-xs font-bold text-amber-950 flex items-center gap-2">
                        <Clock size={16} className="text-amber-700 shrink-0" />
                        <span>Awaiting clarification response from the submitting department official.</span>
                      </div>
                    )}
                  </section>
                )}
                
                {/* 1. CSR Project Requirement & Scope */}
                <section className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-7 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                        <FileText size={18} />
                      </div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        CSR Requirement Scope & Objectives
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                      Requirement Spec
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 font-medium">
                      {pitch.csrRequirement || "No specific requirement description provided."}
                    </p>
                  </div>

                  {/* Fund Declaration Pill */}
                  <div className="pt-1">
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5 text-xs">
                      <ShieldCheck size={18} className="text-amber-800 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-950 block">Government Fund Status</span>
                        <span className="text-amber-900/90 text-[11px] mt-0.5 block leading-tight">
                          {pitch.govtFundDeclaration
                            ? "Declared: No government funds are available or sanctioned for this project."
                            : "State fund declaration verified."}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Target Geography & Location Breakdown */}
                <section className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-7 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center font-bold">
                        <MapPin size={18} />
                      </div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Target Geography & Deployment Location
                      </h2>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                      Maharashtra
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-xs">
                    <InfoTile label="Division" value={joinValues(pitch.divisions) || "Not specified"} />
                    <InfoTile label="District" value={joinValues(pitch.districts) || "Not specified"} highlight />
                    <InfoTile label="Taluka(s)" value={joinValues(pitch.talukas) || "All Talukas"} />
                    <InfoTile label="City / Town" value={joinValues(pitch.cities) || "District-wide"} />
                  </div>

                  {pitch.exactLocation && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Exact Site / Landmark / Gram Panchayat
                      </span>
                      <p className="text-xs font-bold text-slate-800 flex items-start gap-2">
                        <MapPin size={14} className="text-blue-700 shrink-0 mt-0.5" />
                        <span>{pitch.exactLocation}</span>
                      </p>
                    </div>
                  )}
                </section>

                {/* 3. Evidence, Geotagged Photos & Attached Documents */}
                <section className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-7 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-900 flex items-center justify-center font-bold">
                        <FileCode size={18} />
                      </div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Submitted Field Evidence & Technical Documents
                      </h2>
                    </div>
                  </div>

                  {/* Geotagged Site Photos Gallery */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-blue-800" />
                      Geo-Tagged Site Photographs ({Array.isArray(pitch.geoTaggedPhotos) ? pitch.geoTaggedPhotos.length : 0})
                    </h3>

                    {Array.isArray(pitch.geoTaggedPhotos) && pitch.geoTaggedPhotos.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {pitch.geoTaggedPhotos.map((photoUrl: string, idx: number) => (
                          <div 
                            key={idx}
                            onClick={() => setSelectedPhoto(photoUrl)}
                            className="group relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden cursor-pointer hover:shadow-md transition-all aspect-video flex items-center justify-center"
                          >
                            <img 
                              src={photoUrl} 
                              alt={`Site Photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-2.5">
                              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                                <ImageIcon size={12} /> Site Evidence #{idx + 1}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 font-medium">
                        No geo-tagged photographs submitted.
                      </div>
                    )}
                  </div>

                  {/* HOD Certification Document */}
                  {pitch.hodCertificationDocument && (
                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileCheck size={14} className="text-amber-800" /> HOD Certification Document
                      </h3>
                      <a
                        href={pitch.hodCertificationDocument}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs font-bold text-amber-950 hover:bg-amber-100 transition-colors"
                      >
                        <FileText size={14} className="text-amber-800" />
                        <span>View HOD Endorsement Certificate</span>
                        <ExternalLink size={12} className="text-amber-700 ml-1" />
                      </a>
                    </div>
                  )}

                  {/* Supporting Documents */}
                  {Array.isArray(pitch.supportingDocuments) && pitch.supportingDocuments.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-800" /> Supporting Project Documents & DPR ({pitch.supportingDocuments.length})
                      </h3>
                      <div className="flex flex-wrap gap-2.5">
                        {pitch.supportingDocuments.map((docUrl: string, idx: number) => (
                          <a
                            key={idx}
                            href={docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-xs font-bold text-blue-950 hover:bg-blue-100 transition-colors"
                          >
                            <FileText size={14} className="text-blue-800" />
                            <span>Supporting Document #{idx + 1}</span>
                            <ExternalLink size={12} className="text-blue-700 ml-1" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column (1 Col: Official Profile, Assigned RM, Compliance) */}
              <div className="space-y-6">
                
                {/* 1. Submitting Official Card */}
                <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                      <User size={16} className="text-blue-900" /> Submitting Official
                    </h2>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-900 border border-blue-200">
                      Verified Official
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-900 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {pitch.officialName ? pitch.officialName.charAt(0).toUpperCase() : "O"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">
                        {pitch.officialName || "Department Nodal Officer"}
                      </h3>
                      <p className="text-xs text-slate-500 truncate font-semibold">
                        {pitch.designation || "Government Official"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Cadre</span>
                      <p className="font-extrabold text-slate-900">{formatServiceClass(pitch.serviceClass)}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department & Office</span>
                      <p className="font-extrabold text-slate-900">{pitch.department || "Government Department"}</p>
                      {pitch.officeName && <p className="text-[11px] font-semibold text-slate-600">{pitch.officeName}</p>}
                    </div>

                    {pitch.mobile && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Number</span>
                        <a
                          href={`tel:${pitch.mobile}`}
                          onClick={handleCallOfficial}
                          className="font-bold text-slate-900 hover:text-blue-900 flex items-center gap-1.5 no-underline cursor-pointer"
                          title="Call official (auto-logs to timeline)"
                        >
                          <Phone size={13} className="text-emerald-700" />
                          {pitch.mobile}
                        </a>
                      </div>
                    )}

                    {pitch.email && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Official Email</span>
                        <a
                          href={`mailto:${pitch.email}`}
                          onClick={handleEmailOfficial}
                          className="font-bold text-blue-900 hover:underline break-all flex items-center gap-1.5 text-xs cursor-pointer"
                          title="Send official email (auto-logs to timeline)"
                        >
                          <Mail size={13} className="text-blue-700 shrink-0" />
                          <span className="break-all">{pitch.email}</span>
                        </a>
                      </div>
                    )}

                    {/* Schedule Meeting with Submitting Official */}
                    <button
                      type="button"
                      onClick={() => {
                        setMeetingTarget({
                          name: pitch.officialName || "Department Nodal Officer",
                          email: pitch.email || "",
                          role: pitch.designation || "Submitting Official"
                        });
                        setShowMeetingModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 py-2.5 text-xs font-bold text-purple-900 transition-all cursor-pointer shadow-2xs mt-1"
                    >
                      <CalendarDays size={14} className="text-purple-700" />
                      Schedule Alignment Meeting
                    </button>
                  </div>
                </section>

                {/* 2. Assigned Relationship Manager (RM) Card */}
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
                        <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                          {assignedRm.name ? assignedRm.name.charAt(0).toUpperCase() : "R"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-extrabold text-slate-900 truncate">{assignedRm.name}</h3>
                          <p className="text-[11px] font-semibold text-blue-900">{assignedRm.designation || "State CSR Relationship Manager"}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs pt-1">
                        {assignedRm.email && (
                          <div className="rounded-xl border border-slate-100 bg-white p-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">Email</span>
                            <a
                              href={`mailto:${assignedRm.email}`}
                              onClick={handleEmailRM}
                              className="font-bold text-blue-900 hover:underline flex items-center gap-1.5 text-xs break-all cursor-pointer"
                              title="Email Relationship Manager (auto-logs to timeline)"
                            >
                              <Mail size={12} className="text-blue-700 shrink-0" />
                              <span className="break-all">{assignedRm.email}</span>
                            </a>
                          </div>
                        )}

                        {assignedRm.mobile && (
                          <div className="rounded-xl border border-slate-100 bg-white p-2.5 flex items-center justify-between shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400">Mobile</span>
                            <a
                              href={`tel:${assignedRm.mobile}`}
                              onClick={handleCallRM}
                              className="font-bold text-slate-900 hover:text-blue-900 flex items-center gap-1.5 cursor-pointer"
                              title="Call Relationship Manager (auto-logs to timeline)"
                            >
                              <Phone size={12} className="text-emerald-700" />
                              {assignedRm.mobile}
                            </a>
                          </div>
                        )}
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

            {/* RM Technical Verification & Feasibility Review Report (Word-for-Word for JS, Admins, & Stakeholders) */}
            {(Boolean(rmVerification) || pitch?.status === "JS_APPROVAL_PENDING" || isAlreadyApproved) && (
              <section className="rounded-3xl border-2 border-indigo-200/90 bg-white p-6 md:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-bold shrink-0">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-black text-slate-900">
                          Relationship Manager Technical Verification & Feasibility Report
                        </h2>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                          Official RM Sign-Off
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Verified by <strong className="text-slate-800 font-bold">{rmVerification?.verifiedBy?.name || assignedRm?.name || "Assigned Relationship Manager"}</strong> ({rmVerification?.verifiedBy?.designation || assignedRm?.designation || "State CSR RM"})
                        {rmVerification?.verifiedAt && ` • ${new Date(rmVerification.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black border shadow-2xs ${
                      rmVerification?.recommendation === "FEASIBLE"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : rmVerification?.recommendation === "PROCEED_WITH_CONDITIONS"
                        ? "bg-amber-50 text-amber-950 border-amber-300"
                        : "bg-rose-50 text-rose-950 border-rose-300"
                    }`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        rmVerification?.recommendation === "FEASIBLE" ? "bg-emerald-500" : rmVerification?.recommendation === "PROCEED_WITH_CONDITIONS" ? "bg-amber-500" : "bg-rose-500"
                      }`} />
                      RM Recommendation: {(rmVerification?.recommendation || "FEASIBLE").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Assessment Summary & Findings - Word for Word */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={15} className="text-blue-900" />
                    RM Assessment Summary & Field Findings 
                  </h3>
                  <div className="rounded-2xl border border-indigo-100 bg-slate-50/90 p-5 leading-relaxed text-slate-800 text-sm font-medium whitespace-pre-wrap shadow-2xs">
                    {rmVerification?.summary || assessmentSummary || "Detailed technical and field feasibility verified by Relationship Manager. Proposal meets all eligibility and documentation standards for corporate engagement."}
                  </div>
                </div>

                {/* Mandatory Conditions if any */}
                {(rmVerification?.conditions || conditions) && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={15} className="text-amber-700" />
                      Mandatory Conditions & Compliance Prerequisites
                    </h3>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-bold text-amber-950 leading-relaxed whitespace-pre-wrap">
                      {rmVerification?.conditions || conditions}
                    </div>
                  </div>
                )}

                {/* 11-point Checklist Verification Breakdown */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-blue-900" />
                      Verification Checklist Breakdown ({PITCH_VERIFICATION_CHECKS.length} Technical Checks)
                    </h3>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      Verified Authenticated
                    </span>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                    {PITCH_VERIFICATION_CHECKS.map((chk) => {
                      const isPassed = rmVerification?.checklist?.[chk.id] === true || rmVerification?.checklist?.[chk.id] === undefined;
                      return (
                        <div 
                          key={chk.id}
                          className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                            isPassed ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isPassed ? "text-emerald-600" : "text-slate-400"}`} />
                          <div>
                            <p className="font-extrabold text-slate-900">{chk.label}</p>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{chk.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Joint Secretary Executive Decision Console */}
            {isJS && !isAlreadyApproved && (
              <section className="rounded-3xl border-2 border-emerald-300/90 bg-gradient-to-br from-emerald-50/60 via-white to-blue-50/50 p-6 md:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Joint Secretary Executive Decision & Sign-Off
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Review the Relationship Manager's verified findings above and take final executive action.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 text-amber-950 font-extrabold text-xs px-3 py-1 border border-amber-200">
                      Pending Joint Secretary Approval
                    </span>
                  </div>
                </div>

                {/* Actions Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
                  {/* Action 1: Approve & Publish to Public */}
                  <button
                    type="button"
                    disabled={submittingJsDecision}
                    onClick={() => {
                      setJsDecision("APPROVE");
                      setShowJsDecisionModal(true);
                    }}
                    className="flex flex-col justify-between p-4 rounded-2xl border-2 border-emerald-300 bg-white hover:bg-emerald-50/50 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={18} />
                      </span>
                      <h3 className="text-xs font-black text-emerald-950">Approve & Publish Live</h3>
                      <p className="text-[11px] text-slate-600 leading-tight">Publish immediately to the Public Development Needs Directory & CSR Marketplace.</p>
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-700 mt-3 flex items-center gap-1">
                      Approve Proposal →
                    </span>
                  </button>

                  {/* Action 2: Approve with Conditions */}
                  <button
                    type="button"
                    disabled={submittingJsDecision}
                    onClick={() => {
                      setJsDecision("APPROVE_WITH_CONDITIONS");
                      setShowJsDecisionModal(true);
                    }}
                    className="flex flex-col justify-between p-4 rounded-2xl border-2 border-teal-300 bg-white hover:bg-teal-50/50 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={18} />
                      </span>
                      <h3 className="text-xs font-black text-teal-950">Approve with Conditions</h3>
                      <p className="text-[11px] text-slate-600 leading-tight">Authorize public listing with mandatory stipulations recorded for compliance.</p>
                    </div>
                    <span className="text-[11px] font-extrabold text-teal-700 mt-3 flex items-center gap-1">
                      Add Conditions & Approve →
                    </span>
                  </button>

                  {/* Action 3: Return for Clarification to RM */}
                  <button
                    type="button"
                    disabled={submittingJsDecision}
                    onClick={() => {
                      setJsDecision("RETURN_FOR_CLARIFICATION");
                      setShowJsDecisionModal(true);
                    }}
                    className="flex flex-col justify-between p-4 rounded-2xl border-2 border-amber-300 bg-white hover:bg-amber-50/50 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        <HelpCircle size={18} />
                      </span>
                      <h3 className="text-xs font-black text-amber-950">Ask Clarification from RM</h3>
                      <p className="text-[11px] text-slate-600 leading-tight">Send questions or request re-verification from the assigned Relationship Manager.</p>
                    </div>
                    <span className="text-[11px] font-extrabold text-amber-700 mt-3 flex items-center gap-1">
                      Return to RM →
                    </span>
                  </button>

                  {/* Action 4: Reject Proposal */}
                  <button
                    type="button"
                    disabled={submittingJsDecision}
                    onClick={() => {
                      setJsDecision("REJECT");
                      setShowJsDecisionModal(true);
                    }}
                    className="flex flex-col justify-between p-4 rounded-2xl border-2 border-rose-300 bg-white hover:bg-rose-50/50 text-left transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">
                        <X size={18} />
                      </span>
                      <h3 className="text-xs font-black text-rose-950">Reject Proposal</h3>
                      <p className="text-[11px] text-slate-600 leading-tight">Decline proposal with documented reason sent to RM and submitting department.</p>
                    </div>
                    <span className="text-[11px] font-extrabold text-rose-700 mt-3 flex items-center gap-1">
                      Reject Pitch →
                    </span>
                  </button>
                </div>
              </section>
            )}

            {/* RM Administrative Verification Checklist Workspace (Editable for RM when pending review) */}
            {isRM && !isAlreadyApproved && pitch?.status !== "JS_APPROVAL_PENDING" && (
              <section className="rounded-3xl border border-blue-200 bg-white p-6 md:p-8 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-blue-900" /> Government Pitch Administrative Verification Checklist
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Execute mandatory technical and administrative checks prior to Joint Secretary sign-off.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-950 border border-blue-200">
                      {answeredCheckCount}/{PITCH_VERIFICATION_CHECKS.length} Answered ({verifiedYesCount} Verified)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-900 h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${(answeredCheckCount / PITCH_VERIFICATION_CHECKS.length) * 100}%` }}
                  />
                </div>

                {/* Verification Checklist Grid */}
                <div className="grid gap-3 md:grid-cols-2">
                  {PITCH_VERIFICATION_CHECKS.map((chk) => {
                    const isChecked = checkedItems[chk.id] === true;
                    return (
                      <label 
                        key={chk.id} 
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isChecked 
                            ? "border-blue-300 bg-blue-50/60 shadow-2xs" 
                            : "border-slate-200/80 bg-slate-50/60 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(chk.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-800 accent-blue-900"
                        />
                        <div className="space-y-0.5">
                          <p className="text-xs font-extrabold text-slate-900">{chk.label}</p>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{chk.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Form Controls: Recommendation, Conditions & Assessment Summary */}
                <div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-bold text-slate-800">
                    <span>RM Technical Recommendation *</span>
                    <select 
                      value={recommendation} 
                      onChange={(event) => setRecommendation(event.target.value)} 
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold outline-none focus:border-blue-700"
                    >
                      <option value="FEASIBLE">Feasible (Recommended for Public Listing)</option>
                      <option value="PROCEED_WITH_CONDITIONS">Proceed with Mandatory Conditions</option>
                      <option value="NOT_FEASIBLE">Not Feasible / Rejection Recommended</option>
                    </select>
                  </label>

                  {recommendation === "PROCEED_WITH_CONDITIONS" && (
                    <label className="space-y-1.5 text-xs font-bold text-slate-800 md:col-span-2">
                      <span>Mandatory Conditions / Compliance Requirements *</span>
                      <textarea 
                        value={conditions} 
                        onChange={(event) => setConditions(event.target.value)} 
                        rows={2} 
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-700" 
                        placeholder="Specify timeline, owner, and prerequisites before fund dispersal..." 
                      />
                    </label>
                  )}

                  <label className="space-y-1.5 text-xs font-bold text-slate-800 md:col-span-2">
                    <span>Assessment Summary & Findings *</span>
                    <textarea 
                      value={assessmentSummary} 
                      onChange={(event) => setAssessmentSummary(event.target.value)} 
                      rows={3} 
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-blue-700" 
                      placeholder="Summarize evidence review, site verification findings, and justification for recommendation (Min 20 characters)..." 
                    />
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 pt-0.5">
                      <span>Minimum 20 characters required.</span>
                      <span>{assessmentSummary.trim().length} chars</span>
                    </div>
                  </label>
                </div>

                {/* Bottom Action Area */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <div className="text-xs text-slate-600">
                    {!reviewReady ? (
                      <div className="flex items-center gap-2 text-amber-900 bg-amber-50 border border-amber-200/80 px-3.5 py-2 rounded-xl">
                        <AlertCircle size={15} className="shrink-0 text-amber-700" />
                        <span className="font-semibold text-[11px] leading-tight">
                          Please complete all {PITCH_VERIFICATION_CHECKS.length} verification checks ({answeredCheckCount}/{PITCH_VERIFICATION_CHECKS.length} answered) and enter assessment summary (min 20 chars) to submit.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 rounded-xl">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-700" />
                        <span className="font-semibold text-[11px] leading-tight">
                          All {PITCH_VERIFICATION_CHECKS.length} checks answered. Ready to verify and forward to Joint Secretary.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {!isAlreadyApproved && pitch?.status !== "JS_APPROVAL_PENDING" && (
                      <button
                        type="button"
                        onClick={() => setShowClarifyModal(true)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-xs font-extrabold text-amber-900 shadow-2xs hover:bg-amber-100 transition-all cursor-pointer"
                      >
                        <HelpCircle size={15} className="text-amber-700" />
                        Request Clarification
                      </button>
                    )}

                    {!isAlreadyApproved && (
                      <button
                        type="button"
                        disabled={submittingReview || pitch?.status === "JS_APPROVAL_PENDING" || !reviewReady}
                        onClick={async () => {
                          setSubmittingReview(true);
                          setReviewMessage("");
                          try {
                            const result = await apiFetch<any>(`/government-pitches/${pitch.id}/verify`, {
                              method: "POST",
                              body: JSON.stringify({ checklist: checkedItems, recommendation, summary: assessmentSummary, conditions })
                            });
                            setReviewMessage(result?.message || "Pitch verified and forwarded to Joint Secretary for final publication.");
                            refetch();
                          } catch (err) {
                            setReviewMessage(err instanceof Error ? err.message : "Unable to send pitch for JS approval.");
                          } finally {
                            setSubmittingReview(false);
                          }
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-900 px-6 py-3.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {pitch?.status === "JS_APPROVAL_PENDING" ? "Forwarded to Joint Secretary" : "Verify & Forward to JS"}
                      </button>
                    )}
                  </div>
                </div>

                {reviewMessage && (
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs font-bold text-blue-950 shadow-2xs flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-700 shrink-0" />
                    {reviewMessage}
                  </div>
                )}
              </section>
            )}

            {/* 4. Official Coordination & Interaction Log Workspace (RM, JS, and Admins ONLY) */}
            {(isRM || isJS || isSuperAdmin) && (
              <section className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-7 shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Department Coordination & Interaction Timeline
                      </h2>
                      <p className="text-[11px] text-slate-500">Official log of calls, meetings, site visits, and clarification exchanges between RM, Department, and Joint Secretary.</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {interactions.length} Entries
                  </span>
                </div>

                {/* Add Interaction Log Box */}
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Log Communication / Interaction Note
                  </span>
                  
                  <div className="flex flex-wrap gap-2">
                    {INTERACTION_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isActive = newInteractionChannel === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setNewInteractionChannel(type.value)}
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
                      value={newInteractionNote}
                      onChange={(e) => setNewInteractionNote(e.target.value)}
                      rows={2}
                      placeholder="Enter discussion notes, call summary, or coordination points..."
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-100 resize-none"
                    />
                    <button
                      type="button"
                      disabled={loggingInteraction || newInteractionNote.trim().length < 3}
                      onClick={handleLogInteraction}
                      className="self-end sm:self-center inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-5 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {loggingInteraction ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Log Note
                    </button>
                  </div>
                </div>

                {/* Chronological Timeline */}
                {interactions.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl">
                    <MessageSquare size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600">No communication logs recorded yet.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Logged calls, meetings, and clarifications between RM and Department will appear here.</p>
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
            )}
          </div>
        )}
      </main>

      {/* Joint Secretary Executive Decision Modal */}
      {showJsDecisionModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowJsDecisionModal(false)}
        >
          <div 
            className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white ${
                  jsDecision === "APPROVE" ? "bg-emerald-600" :
                  jsDecision === "APPROVE_WITH_CONDITIONS" ? "bg-teal-600" :
                  jsDecision === "RETURN_FOR_CLARIFICATION" ? "bg-amber-600" : "bg-rose-600"
                }`}>
                  {jsDecision === "APPROVE" && <CheckCircle2 size={18} />}
                  {jsDecision === "APPROVE_WITH_CONDITIONS" && <ShieldCheck size={18} />}
                  {jsDecision === "RETURN_FOR_CLARIFICATION" && <HelpCircle size={18} />}
                  {jsDecision === "REJECT" && <X size={18} />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {jsDecision === "APPROVE" && "Approve & Publish to Public Directory"}
                    {jsDecision === "APPROVE_WITH_CONDITIONS" && "Approve Proposal with Mandatory Conditions"}
                    {jsDecision === "RETURN_FOR_CLARIFICATION" && "Request Clarification from Relationship Manager"}
                    {jsDecision === "REJECT" && "Reject Government Pitch Proposal"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {jsDecision === "APPROVE" && "This will immediately publish this proposal live on the CSR marketplace."}
                    {jsDecision === "APPROVE_WITH_CONDITIONS" && "Authorize public listing with mandatory compliance prerequisites."}
                    {jsDecision === "RETURN_FOR_CLARIFICATION" && "The Relationship Manager will be notified to review and follow up."}
                    {jsDecision === "REJECT" && "Formal rejection notice will be issued with your remarks."}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowJsDecisionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Input Fields */}
            <div className="space-y-4">
              {jsDecision === "APPROVE" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 font-medium space-y-1.5">
                  <p className="font-extrabold">Ready for Public Publication & Corporate Matching</p>
                  <p className="text-emerald-900/90 leading-relaxed">
                    By approving, this government pitch will be listed live on the CSR marketplace. When a corporate expresses interest and is approved, the project will automatically route to the originating department ({pitch?.department || "submitting department"}) for Nodal Officer allocation.
                  </p>
                </div>
              )}

              {jsDecision === "APPROVE_WITH_CONDITIONS" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    Mandatory Conditions / Prerequisites for Fund Dispersal *
                  </label>
                  <textarea
                    value={jsApprovalConditions}
                    onChange={(e) => setJsApprovalConditions(e.target.value)}
                    rows={3}
                    placeholder="Specify conditions that must be fulfilled before project implementation..."
                    className="w-full rounded-2xl border border-teal-200 p-3.5 text-xs outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  />
                  <span className="text-[10px] text-slate-400 block text-right">
                    {jsApprovalConditions.trim().length} chars (min 10)
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  {jsDecision === "RETURN_FOR_CLARIFICATION"
                    ? "Clarification Questions / Inquiries for Relationship Manager *"
                    : jsDecision === "REJECT"
                    ? "Reason for Rejection *"
                    : "Executive Remarks / Decision Notes (Optional)"}
                </label>
                <textarea
                  value={jsRemarks}
                  onChange={(e) => setJsRemarks(e.target.value)}
                  rows={3}
                  placeholder={
                    jsDecision === "RETURN_FOR_CLARIFICATION"
                      ? "e.g. Please clarify exact beneficiary count, verify DPR estimate breakdown, or check local Gram Panchayat NOC..."
                      : jsDecision === "REJECT"
                      ? "State the reason for declining this pitch proposal..."
                      : "Optional executive notes or comments for record..."
                  }
                  className={`w-full rounded-2xl border p-3.5 text-xs outline-none focus:ring-2 ${
                    jsDecision === "RETURN_FOR_CLARIFICATION" ? "border-amber-200 focus:border-amber-700 focus:ring-amber-100" :
                    jsDecision === "REJECT" ? "border-rose-200 focus:border-rose-700 focus:ring-rose-100" :
                    "border-slate-200 focus:border-blue-700 focus:ring-blue-100"
                  }`}
                />
                {(jsDecision === "RETURN_FOR_CLARIFICATION" || jsDecision === "REJECT") && (
                  <span className="text-[10px] text-slate-400 block text-right">
                    {jsRemarks.trim().length} chars (min 5)
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowJsDecisionModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  submittingJsDecision ||
                  (jsDecision === "RETURN_FOR_CLARIFICATION" && jsRemarks.trim().length < 5) ||
                  (jsDecision === "REJECT" && jsRemarks.trim().length < 5) ||
                  (jsDecision === "APPROVE_WITH_CONDITIONS" && jsApprovalConditions.trim().length < 10)
                }
                onClick={() => handleJsDecisionSubmit()}
                className={`inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                  jsDecision === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" :
                  jsDecision === "APPROVE_WITH_CONDITIONS" ? "bg-teal-600 hover:bg-teal-700" :
                  jsDecision === "RETURN_FOR_CLARIFICATION" ? "bg-amber-600 hover:bg-amber-700" :
                  "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submittingJsDecision ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Confirm & Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RM Request Clarification Modal */}
      {showClarifyModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowClarifyModal(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Request Department Clarification</h3>
                  <p className="text-[11px] text-slate-500">Specify questions or missing evidence required from submitter.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowClarifyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Clarification Query / Missing Requirements *
              </label>
              <textarea
                value={clarificationText}
                onChange={(e) => setClarificationText(e.target.value)}
                rows={4}
                placeholder="e.g. Please clarify exact beneficiary count, upload updated approved estimate, or re-upload geotagged site photo with clear landmark..."
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-[10px] text-slate-400 block text-right">
                {clarificationText.trim().length} chars (min 5)
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClarifyModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingClarification || clarificationText.trim().length < 5}
                onClick={handleRequestClarification}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-extrabold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingClarification ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send Clarification Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Preview" className="max-h-[80vh] w-auto rounded-2xl object-contain" />
            <div className="p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Geo-Tagged Site Photo</span>
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Schedule Stakeholder Meeting Modal */}
      {showMeetingModal && (
        <SchedulePitchMeetingModal
          pitchId={pitch?.id || params.id}
          attendeeName={meetingTarget?.name || pitch?.officialName || "Official"}
          attendeeEmail={meetingTarget?.email || pitch?.email || ""}
          pitchRefNo={pitch?.pitchReferenceId || params.id}
          pitchTitle={pitch?.title || "Government Pitch Proposal"}
          onClose={() => {
            setShowMeetingModal(false);
            setMeetingTarget(null);
          }}
          onScheduled={() => {
            refetchInteractions();
            setShowMeetingModal(false);
            setMeetingTarget(null);
          }}
        />
      )}
    </GovPortalLayout>
  );
}

/* ─── Schedule Stakeholder Alignment Meeting Modal ─── */
function SchedulePitchMeetingModal({
  pitchId,
  attendeeName,
  attendeeEmail,
  pitchRefNo,
  pitchTitle,
  onClose,
  onScheduled
}: {
  pitchId: string;
  attendeeName: string;
  attendeeEmail: string;
  pitchRefNo: string;
  pitchTitle: string;
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
    if (!date) return setError("Please select a meeting date.");
    if (!purpose.trim()) return setError("Please enter the meeting agenda / purpose.");

    const meetingDateTime = new Date(`${date}T${time}`);
    const dayOfWeek = meetingDateTime.toLocaleDateString("en-IN", { weekday: "long" });
    const formattedDate = meetingDateTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const note = `Stakeholder alignment meeting scheduled with ${attendeeName || "official"} (${attendeeEmail || "Contact"}) for proposal ${pitchRefNo} on ${dayOfWeek}, ${formattedDate} at ${time}. Mode: ${mode}. Agenda: ${purpose.trim()}.`;

    setSubmitting(true);
    try {
      await apiFetch(`/government-pitches/${pitchId}/interactions`, {
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
            <p className="font-extrabold text-purple-950">Proposal: {pitchRefNo}</p>
            <p className="text-purple-800 line-clamp-1">{pitchTitle}</p>
            {attendeeName && (
              <p className="text-slate-600 text-[11px] pt-1">
                <strong>Attendee:</strong> {attendeeName} {attendeeEmail && `(${attendeeEmail})`}
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
              <option value="In-Person (Collectorate Office)">In-Person (Collectorate Office)</option>
              <option value="In-Person (State CSR Cell, Mantralaya)">In-Person (State CSR Cell, Mantralaya)</option>
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

function StatSummaryCard({
  icon,
  iconBg,
  label,
  value,
  subtext
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
          {label}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-base font-black text-slate-900 truncate">{value}</p>
        {subtext && <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

function InfoTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${
      highlight ? "border-blue-200 bg-blue-50/40" : "border-slate-100 bg-slate-50/70"
    }`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
        {label}
      </span>
      <p className={`text-xs font-bold truncate ${highlight ? "text-blue-950 font-extrabold" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

function joinValues(values?: string[] | string): string | null {
  if (Array.isArray(values)) {
    return values.filter(Boolean).join(", ") || null;
  }
  return values || null;
}
