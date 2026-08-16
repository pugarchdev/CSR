"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useMemo, type ReactNode } from "react";
import {
  ArrowLeft, BadgeIndianRupee, Building2, Calendar, CheckCircle2, FileText,
  Loader2, Send, FileCode, ShieldCheck, AlertCircle, Copy, Check
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const PITCH_VERIFICATION_CHECKS = [
  { id: "departmentActive", label: "Department active", desc: "The submitting department has active approved onboarding." },
  { id: "officialAuthorized", label: "Official authorized", desc: "The submitting official is authorized by the department." },
  { id: "serviceClassValid", label: "Service class valid", desc: "The declared service class and designation are valid." },
  { id: "certificationPresent", label: "Certification present", desc: "Self-certification or HOD certification is attached as required." },
  { id: "fundDeclarationComplete", label: "Fund declaration complete", desc: "Government-fund non-availability is declared." },
  { id: "photosPresent", label: "Site photographs present", desc: "At least two geotagged site photographs are available." },
  { id: "coordinatesMatchDistrict", label: "Coordinates match district", desc: "Photo coordinates align with the selected district." },
  { id: "needGenuine", label: "Development need genuine", desc: "The development need is supported by the submitted evidence." },
  { id: "csrEligible", label: "Schedule VII eligible", desc: "The proposed activity is eligible for CSR support." },
  { id: "costReasonable", label: "Cost reasonable", desc: "The estimated outlay is benchmarked and realistic." },
  { id: "duplicateReviewComplete", label: "Duplicate review complete", desc: "Potential duplicate pitches and active projects were checked." }
];

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

  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean | undefined>>({});
  const [recommendation, setRecommendation] = useState("FEASIBLE");
  const [assessmentSummary, setAssessmentSummary] = useState("");
  const [conditions, setConditions] = useState("");

  const isRM = useMemo(() => {
    if (isAdmin) return true;
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = t.toUpperCase();
      return u.includes("RELATIONSHIP") || u.includes("RM") || u === "6";
    });
  }, [user, roles, roleDetails, isAdmin]);

  const isJS = useMemo(() => {
    const tokens = extractRoleTokens(user, roles, roleDetails);
    return tokens.some((t) => {
      const u = String(t).toUpperCase();
      return u.includes("JOINT_SECRETARY") || u.includes("JOINT SECRETARY") || u === "3" || user?.roleId === 3;
    });
  }, [user, roles, roleDetails]);

  const { data: response, isLoading, error, refetch } = useApiQuery<any>(
    ["pitch", params.id, isRM ? "rm" : "standard"],
    isRM ? `/rm/pitches/${params.id}` : `/government-pitches/${params.id}`,
    { enabled: Boolean(params.id) }
  );

  const pitch = response?.data ?? response;
  const budget = Number(pitch?.budget || pitch?.estimatedCost || 0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [localApproved, setLocalApproved] = useState(false);

  const isAlreadyApproved = localApproved || pitch?.status === "PUBLIC_LISTED" || pitch?.status === "APPROVED" || pitch?.status === "JS_APPROVED";

  const handleJsApprove = async (decision: string = "APPROVE") => {
    setSubmittingReview(true);
    setReviewMessage("");
    try {
      const result = await apiFetch<any>(`/government-pitches/${pitch.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ decision, reason: "Approved by Joint Secretary for Public Development Needs listing" })
      });
      setLocalApproved(true);
      setReviewMessage(result?.message || "Pitch approved and published to Public Development Needs (Live)!");
      refetch();
    } catch (err) {
      setReviewMessage(err instanceof Error ? err.message : "Unable to execute Joint Secretary decision.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formattedBudget = budget
    ? budget >= 10000000
      ? `₹${(budget / 10000000).toFixed(2)} Cr`
      : `₹${(budget / 100000).toFixed(2)} Lakhs`
    : "Not specified";

  const detailFields = pitch ? [
    ["Name of official", pitch.officialName],
    ["Designation", pitch.designation],
    ["Department", pitch.department],
    ["Office name", pitch.officeName],
    ["Service class", pitch.serviceClass],
    ["Mobile number", pitch.mobile],
    ["Email address", pitch.email],
    ["Division(s)", joinValues(pitch.divisions)],
    ["District(s)", joinValues(pitch.districts)],
    ["City / cities", joinValues(pitch.cities)],
    ["Taluka(s)", joinValues(pitch.talukas)],
    ["Exact location", pitch.exactLocation],
    ["Estimated cost", pitch.estimatedCost ? `₹${Number(pitch.estimatedCost).toLocaleString("en-IN")}` : null],
    ["Government fund declaration", typeof pitch.govtFundDeclaration === "boolean" ? pitch.govtFundDeclaration ? "No government funds available" : "Government funds available" : null],
    ["Certification type", pitch.certificationType]
  ] : [];

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: prev[id] === undefined ? true : !prev[id] }));
  };

  const answeredCheckCount = PITCH_VERIFICATION_CHECKS.filter((item) => typeof checkedItems[item.id] === "boolean").length;
  const reviewReady = answeredCheckCount === PITCH_VERIFICATION_CHECKS.length
    && assessmentSummary.trim().length >= 20
    && (recommendation !== "PROCEED_WITH_CONDITIONS" || conditions.trim().length >= 10);

  const copyRefId = () => {
    const textToCopy = pitch?.pitchReferenceId || params.id;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <GovPortalLayout>
      <main className="mx-auto min-h-screen max-w-screen-2xl space-y-3.5 px-4 py-3 md:px-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/pitches"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-900 transition-colors no-underline"
          >
            <ArrowLeft size={14} /> Back to Government Pitches Register
          </Link>
          <span className="text-[11px] font-bold text-slate-500">
            Visibility: <strong className="text-amber-800 font-extrabold">{isAlreadyApproved ? "PUBLIC (Live on Marketplace)" : "CONFIDENTIAL (Internal Review)"}</strong>
          </span>
        </div>

        {/* Compact Portal Light Header Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 p-4 shadow-2xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-mono text-xs font-extrabold text-blue-950 bg-blue-100/80 px-2.5 py-0.5 rounded-md border border-blue-200">
                  {pitch?.pitchReferenceId || "GP-MH-2026"}
                  <button onClick={copyRefId} className="ml-1 text-blue-700 hover:text-blue-950" title="Copy ID">
                    {copied ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                  </button>
                </span>
                <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-extrabold border ${
                  isAlreadyApproved
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-amber-100 text-amber-900 border-amber-200"
                }`}>
                  {(isAlreadyApproved ? "PUBLIC LISTED" : pitch?.status || "UNDER REVIEW").replace(/_/g, " ")}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                  {pitch?.department || "Department Pitch"}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {pitch?.title || "Government Development Pitch"}
              </h1>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              {isJS && !isAlreadyApproved && (
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleJsApprove("APPROVE")}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-green-800 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submittingReview ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Approve & Publish to Public
                </button>
              )}

              {isAlreadyApproved && (
                <Link
                  href="/public-development-needs"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-extrabold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-all no-underline"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Live on Public Development Needs →
                </Link>
              )}

              {isRM && !isAlreadyApproved && (
                <button
                  type="button"
                  disabled={submittingReview || pitch?.status === "JS_APPROVAL_PENDING" || !reviewReady}
                  onClick={async () => {
                    setSubmittingReview(true);
                    setReviewMessage("");
                    try {
                      const result = await apiFetch<any>(`/rm/pitches/${pitch.id}/verify`, {
                        method: "PATCH",
                        body: JSON.stringify({ checklist: checkedItems, recommendation, summary: assessmentSummary, conditions })
                      });
                      setReviewMessage(result?.message || "Pitch verified and forwarded to Joint Secretary.");
                      refetch();
                    } catch (err) {
                      setReviewMessage(err instanceof Error ? err.message : "Unable to send pitch for JS approval.");
                    } finally {
                      setSubmittingReview(false);
                    }
                  }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs hover:bg-blue-950 transition-all disabled:opacity-60"
                >
                  {submittingReview ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {pitch?.status === "JS_APPROVAL_PENDING" ? "With Joint Secretary" : "Verify & Send to JS"}
                </button>
              )}
            </div>
          </div>
          {reviewMessage && (
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/90 p-3 text-xs font-bold text-blue-900 shadow-2xs">
              {reviewMessage}
            </div>
          )}
        </div>

        {/* Pitch Content */}
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="animate-spin text-blue-900" size={28} />
          </div>
        ) : error || !pitch?.id ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center">
            <AlertCircle size={36} className="mx-auto text-rose-600 mb-2" />
            <h2 className="text-base font-bold text-rose-900">Pitch Unavailable</h2>
            <p className="mt-1 text-xs text-rose-700">This pitch was not found or is not assigned to your workspace.</p>
          </section>
        ) : (
          <div className="space-y-3.5">

            {/* Metrics */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PitchCard icon={<FileText size={16} className="text-blue-600" />} label="Pitch Reference" value={pitch.pitchReferenceId} />
              <PitchCard icon={<BadgeIndianRupee size={16} className="text-emerald-700" />} label="Estimated Outlay" value={formattedBudget} />
              <PitchCard icon={<Building2 size={16} className="text-purple-600" />} label="Department" value={pitch.department || "Government Department"} />
              <PitchCard icon={<Calendar size={16} className="text-indigo-600" />} label="Submission Date" value={pitch.createdAt ? new Date(pitch.createdAt).toLocaleDateString("en-IN") : "—"} />
            </div>

            {/* Submission Application Details */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">Departmental Pitch Payload & Official Details</h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs">
                {detailFields.filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                    <p className="mt-0.5 text-xs font-bold text-slate-900">{String(value)}</p>
                  </div>
                ))}
              </div>

              <LongAnswer label="CSR Requirement & Development Scope" value={pitch.csrRequirement} />
              <Documents label="HOD Certification Document" documents={pitch.hodCertificationDocument ? [pitch.hodCertificationDocument] : []} />
              <Documents label="Supporting Project Documents" documents={pitch.supportingDocuments} />
              <Documents label="Geo-Tagged Site Photographs" documents={pitch.geoTaggedPhotos} />
            </section>

            {/* RM Verification Checklist Workspace */}
            {isRM && (
              <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-blue-800" /> Government Pitch Administrative Verification Checklist
                  </h3>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-900">
                    {answeredCheckCount}/{PITCH_VERIFICATION_CHECKS.length} Answered
                  </span>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {PITCH_VERIFICATION_CHECKS.map((chk) => (
                    <label key={chk.id} className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200/80 bg-slate-50/70 cursor-pointer hover:bg-slate-100 transition-colors text-xs">
                      <input
                        type="checkbox"
                        checked={checkedItems[chk.id] === true}
                        onChange={() => toggleCheck(chk.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-600"
                      />
                      <div>
                        <p className="font-extrabold text-slate-900">{chk.label}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{chk.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs font-bold text-slate-800">
                    <span>RM recommendation</span>
                    <select value={recommendation} onChange={(event) => setRecommendation(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-700">
                      <option value="FEASIBLE">Feasible</option>
                      <option value="PROCEED_WITH_CONDITIONS">Proceed with conditions</option>
                      <option value="NOT_FEASIBLE">Not feasible</option>
                    </select>
                  </label>
                  {recommendation === "PROCEED_WITH_CONDITIONS" && (
                    <label className="space-y-1 text-xs font-bold text-slate-800">
                      <span>Mandatory conditions</span>
                      <textarea value={conditions} onChange={(event) => setConditions(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-700" placeholder="Record owners, remediation, and target dates." />
                    </label>
                  )}
                  <label className="space-y-1 text-xs font-bold text-slate-800 md:col-span-2">
                    <span>Assessment summary</span>
                    <textarea value={assessmentSummary} onChange={(event) => setAssessmentSummary(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-700" placeholder="Summarize evidence, risks, and the basis for your recommendation." />
                    <span className="block text-[10px] font-medium text-slate-500">Minimum 20 characters. Answer each check; unchecked means “No”.</span>
                  </label>
                </div>

                {reviewMessage && <p className="text-xs font-bold text-blue-900 pt-1">{reviewMessage}</p>}
              </section>
            )}
          </div>
        )}
      </main>
    </GovPortalLayout>
  );
}

function PitchCard({ icon, label, value }: { icon: ReactNode; label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className="mt-1 truncate text-xs font-extrabold text-slate-900">{value || "Not provided"}</p>
    </div>
  );
}

function LongAnswer({ label, value }: { label: string; value?: string | null }) {
  return value ? (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
        <FileText size={13} /> {label}
      </span>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-800">{value}</p>
    </div>
  ) : null;
}

function Documents({ label, documents }: { label: string; documents?: string[] }) {
  if (!documents || documents.length === 0) return null;
  return (
    <div className="pt-2 border-t border-slate-100">
      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1 mb-1.5">
        <FileCode size={13} /> {label} ({documents.length})
      </span>
      <div className="flex flex-wrap gap-2">
        {documents.map((doc, idx) => (
          <a
            key={doc}
            href={doc}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition-colors"
          >
            <FileText size={13} className="text-blue-700" />
            <span>Document #{idx + 1}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function joinValues(values?: string[]) {
  return values?.filter(Boolean).join(", ") || null;
}
