"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import GovInput from "@/components/gov/GovInput";
import GovButton from "@/components/gov/GovButton";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { Search, Package, Loader2, Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft } from "lucide-react";

interface TrackingStatus {
  status: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

interface TrackingData {
  trackingId: string;
  type: "ENQUIRY" | "PITCH" | "INTEREST" | "GRIEVANCE" | "PROJECT";
  currentStatus: string;
  submittedAt: string;
  estimatedCompletion?: string;
  timeline: TrackingStatus[];
  details: {
    companyName?: string;
    sector?: string;
    district?: string;
    estimatedCost?: number;
    contactPerson?: string;
    requirement?: string;
  };
}

// Full government pitch lifecycle in workflow order.
const PITCH_FLOW = [
  { key: "SUBMITTED", label: "Pitch Received", description: "Government pitch has been received." },
  { key: "RM_VERIFICATION_PENDING", label: "RM Verification", description: "A CSR Relationship Manager verifies the pitch (5-day SLA)." },
  { key: "JS_APPROVAL_PENDING", label: "JS Approval", description: "Verified pitch submitted to Joint Secretary." },
  { key: "PUBLIC_LISTED", label: "Publicly Listed", description: "Approved and listed as a public development need." },
  { key: "CORPORATE_INTEREST_RECEIVED", label: "Corporate Interest", description: "Companies have expressed interest in funding." },
  { key: "NODAL_OFFICER_ASSIGNED", label: "Nodal Officer Assigned", description: "District Nodal Officer assigned for coordination." },
  { key: "MOU_PENDING", label: "MoU Finalisation", description: "Tripartite MoU under review with the selected corporate." },
  { key: "PROJECT_ONBOARDED", label: "Project Onboarded", description: "MoU signed; project onboarded and tracking begins." },
  { key: "COMPLETED", label: "Completed", description: "Project deliverables completed and handed over." },
];

const PITCH_STATUS_INDEX: Record<string, number> = {
  DRAFT: 0,
  SUBMITTED: 0,
  RM_VERIFICATION_PENDING: 1,
  RM_VERIFIED: 2,
  JS_APPROVAL_PENDING: 2,
  JS_APPROVED: 3,
  JS_REJECTED: 3,
  PUBLIC_LISTED: 3,
  CORPORATE_INTEREST_RECEIVED: 4,
  NODAL_OFFICER_ASSIGNED: 5,
  MOU_PENDING: 6,
  MOU_SIGNED: 7,
  PROJECT_ONBOARDED: 7,
  COMPLETED: 8,
  CLOSED: 8,
};

const buildTimeline = (
  flow: { key: string; label: string; description: string }[],
  statusIndex: Record<string, number>,
  currentStatus: string,
  timestamps: Record<number, string | undefined>
): TrackingStatus[] => {
  const currentIdx = statusIndex[currentStatus] ?? 0;
  const isTerminal = ["COMPLETED", "CLOSED"].includes(currentStatus);
  return flow.map((step, idx) => ({
    status: step.key,
    description: step.description,
    completed: idx < currentIdx || (idx === currentIdx && isTerminal),
    current: idx === currentIdx && !isTerminal,
    timestamp: timestamps[idx] || "",
  }));
};

function TrackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get("id") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setTrackingId(id);
      handleSearch(id);
    }
  }, [searchParams]);

  const validateTrackingId = (id: string): boolean => {
    const pattern = /^(CSR|GP|INT|CPI|GRV|PRJ)-MH-\d{4}-\d{6,7}$/;
    return pattern.test(id);
  };

  const handleSearch = async (id: string = trackingId) => {
    setError("");
    setTrackingData(null);
    setSearched(false);

    if (!id.trim()) {
      setError("Please enter a tracking ID");
      return;
    }

    if (!validateTrackingId(id)) {
      setError("Invalid tracking ID format. Expected prefix (e.g. CSR, GP, INT, CPI, GRV, PRJ) followed by -MH-YYYY-XXXXXX");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch<any>(`/tracking/${id}`);
      const enquiry = response.details ?? response?.data?.enquiry ?? response?.enquiry ?? response;
      const isPitch = response.type === "PITCH";
      const currentStatus = response.status ?? enquiry.status ?? "SUBMITTED";

      let timeline;
      if (isPitch) {
        timeline = buildTimeline(PITCH_FLOW, PITCH_STATUS_INDEX, currentStatus, {
          0: enquiry.submittedAt ?? enquiry.createdAt,
          1: enquiry.assignedRelationshipManagerId ? enquiry.updatedAt : undefined,
          [PITCH_STATUS_INDEX[currentStatus] ?? 0]: enquiry.updatedAt,
        });
      } else {
        // Fallback simple flow for other types
        timeline = [
          { status: "SUBMITTED", label: "Submitted", description: "Application has been submitted.", completed: true, timestamp: enquiry.createdAt },
          { status: currentStatus, label: "Current Status", description: `Application is currently in ${currentStatus.replace(/_/g, " ")} state.`, completed: false, current: true, timestamp: enquiry.updatedAt }
        ] as any[];
      }

      setTrackingData({
        trackingId: isPitch ? (enquiry.pitchReferenceId ?? response.trackingId) : response.trackingId,
        type: response.type,
        currentStatus,
        submittedAt: response.submittedAt ?? enquiry.submittedAt ?? enquiry.createdAt,
        estimatedCompletion: enquiry.firstResponseDueAt,
        timeline,
        details: {
          companyName: isPitch ? enquiry.department : enquiry.companyName,
          sector: isPitch ? enquiry.officeName : enquiry.sector,
          district: isPitch ? (enquiry.districts?.join(", ") || enquiry.district) : enquiry.preferredDistricts?.join(", "),
          contactPerson: isPitch ? `${enquiry.officialName} (${enquiry.designation})` : enquiry.contactPersonName,
          requirement: isPitch ? enquiry.csrRequirement : enquiry.proposedCsrWork,
          estimatedCost: isPitch
            ? (enquiry.estimatedCost ? Number(enquiry.estimatedCost) : enquiry.budget ? Number(enquiry.budget) : undefined)
            : (enquiry.indicativeBudget ? Number(enquiry.indicativeBudget) : undefined),
        },
      });
      setSearched(true);
    } catch (err: any) {
      if (err.status === 404) {
        setError("Tracking ID not found. Please verify and try again.");
      } else {
        setError(err.message || "Failed to fetch tracking information. Please try again.");
      }
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "muted" => {
    switch (status) {
      case "APPROVED":
      case "PUBLIC_LISTED":
      case "COMPLETED":
        return "success";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "SUBMITTED":
        return "info";
      case "RM_VERIFICATION_PENDING":
      case "JS_APPROVAL_PENDING":
      case "UNDER_REVIEW":
        return "warning";
      default:
        return "muted";
    }
  };

  const getStepIcon = (step: TrackingStatus) => {
    if (step.completed) {
      return <CheckCircle size={16} className="text-green-600" />;
    }
    if (step.current) {
      return <Clock size={16} className="text-amber-600 animate-pulse" />;
    }
    return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
  };

  return (
    <GovPortalLayout>
      <div className="gov-public-main p-6 max-w-5xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        <div className="gov-page-header">
          <h1 className="gov-page-title flex items-center gap-3 text-2xl font-black text-slate-900">
            <Package size={28} className="text-[#f7941d]" />
            Track Development Need Pitch
          </h1>
          <p className="gov-page-description text-slate-500 text-sm mt-1">
            Track the actual status and progress of your submitted development need pitch applications.
          </p>
        </div>

        {/* Search Section */}
        <GovCard>
          <GovCardBody>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-grow w-full">
                <GovInput
                  label="Enter generated pitch Tracking ID"
                  placeholder="GP-MH-2026-000001"
                  value={trackingId}
                  onChange={(e) => {
                    setTrackingId(e.target.value.toUpperCase());
                    setError("");
                  }}
                  error={error}
                  help="Format: GP-MH-YYYY-XXXXXX"
                />
              </div>
              <GovButton
                onClick={() => handleSearch()}
                disabled={loading}
                className="w-full md:w-auto h-[42px] bg-blue-900 hover:bg-blue-950 font-bold px-6 text-white text-xs rounded-xl shadow-xs"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={16} className="animate-spin" />
                    Searching...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Search size={16} />
                    Track Pitch
                  </span>
                )}
              </GovButton>
            </div>
          </GovCardBody>
        </GovCard>

        {/* Results Section */}
        {searched && trackingData && (
          <div className="space-y-6 animate-fadeIn">
            {/* Status Overview */}
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b p-4">
                <GovCardTitle className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Application Overview</span>
                  <GovStatusBadge variant={getStatusVariant(trackingData.currentStatus)}>
                    {trackingData.currentStatus.replace(/_/g, " ")}
                  </GovStatusBadge>
                </GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Tracking ID</p>
                    <p className="font-mono font-bold text-blue-900 text-sm">{trackingData.trackingId}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Application Type</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {trackingData.type === "PITCH" ? "Development Need Pitch" : trackingData.type}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Submitted On</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {new Date(trackingData.submittedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </GovCardBody>
            </GovCard>

            {/* Timeline */}
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b p-4">
                <GovCardTitle className="text-sm font-bold text-slate-900">Status Timeline</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="p-5">
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-slate-200" />

                  <div className="space-y-4">
                    {trackingData.timeline.map((step, index) => (
                      <div
                        key={step.status}
                        className={`relative flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                          step.completed
                            ? "bg-green-50/50 border-green-100"
                            : step.current
                            ? "bg-amber-50/50 border-amber-200 shadow-xs"
                            : "bg-slate-50/30 border-slate-100"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${
                            step.completed
                              ? "bg-green-100 border-green-200"
                              : step.current
                              ? "bg-amber-100 border-amber-200"
                              : "bg-slate-100 border-slate-200"
                          }`}
                        >
                          {getStepIcon(step)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-800">
                              {PITCH_FLOW.find(s => s.key === step.status)?.label || step.status}
                            </h4>
                            {step.current && (
                              <span className="text-[9px] uppercase tracking-wider bg-amber-200 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full">
                                Under Review
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                          {step.timestamp && (
                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                              {new Date(step.timestamp).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                        {index < trackingData.timeline.length - 1 && step.completed && (
                          <ArrowRight size={16} className="text-slate-300 flex-shrink-0 self-center" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </GovCardBody>
            </GovCard>

            {/* Details */}
            {Object.keys(trackingData.details).length > 0 && (
              <GovCard>
                <GovCardHeader className="bg-slate-50 border-b p-4">
                  <GovCardTitle className="text-sm font-bold text-slate-900">Application Details</GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    {trackingData.details.companyName && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Department</p>
                        <p className="font-semibold text-slate-800 text-sm">{trackingData.details.companyName}</p>
                      </div>
                    )}
                    {trackingData.details.sector && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Office / Division Name</p>
                        <p className="font-semibold text-slate-800 text-sm">{trackingData.details.sector}</p>
                      </div>
                    )}
                    {trackingData.details.district && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">District Focus</p>
                        <p className="font-semibold text-slate-800 text-sm">{trackingData.details.district}</p>
                      </div>
                    )}
                    {trackingData.details.estimatedCost && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Estimated Cost / Budget</p>
                        <p className="font-semibold text-slate-800 text-sm">
                          ₹{trackingData.details.estimatedCost.toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                    {trackingData.details.contactPerson && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Nodal Official SPOC</p>
                        <p className="font-semibold text-slate-800 text-sm">{trackingData.details.contactPerson}</p>
                      </div>
                    )}
                    {trackingData.details.requirement && (
                      <div className="md:col-span-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Need Description & CSR Requirement</p>
                        <p className="font-medium text-slate-700 text-xs leading-relaxed mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">{trackingData.details.requirement}</p>
                      </div>
                    )}
                  </div>
                </GovCardBody>
              </GovCard>
            )}
          </div>
        )}

        {/* No Results */}
        {searched && !trackingData && !loading && (
          <GovAlert variant="warning">
            <div className="flex items-center gap-2 text-xs">
              <XCircle size={18} className="text-amber-600" />
              <span className="font-bold">No application found with the provided tracking ID. Please check and try again.</span>
            </div>
          </GovAlert>
        )}
      </div>
    </GovPortalLayout>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="animate-spin text-slate-500" size={32} />
        <span className="ml-2 text-slate-650 font-bold">Loading tracker...</span>
      </div>
    }>
      <TrackContent />
    </Suspense>
  );
}
