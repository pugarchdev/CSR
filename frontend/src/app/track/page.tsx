"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import GovInput from "@/components/gov/GovInput";
import GovButton from "@/components/gov/GovButton";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovAlert from "@/components/gov/GovAlert";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { Search, Package, Loader2, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface TrackingStatus {
  status: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

interface TrackingData {
  trackingId: string;
  type: "ENQUIRY" | "PITCH" | "INTEREST";
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

// Full enquiry lifecycle in workflow order (PDF Steps 1-8).
const ENQUIRY_FLOW = [
  { key: "TRACKING_ID_GENERATED", label: "Enquiry Received", description: "Your enquiry has been received and a tracking ID issued." },
  { key: "RM_ASSIGNED", label: "RM Assigned", description: "A dedicated CSR Relationship Manager is assigned." },
  { key: "RM_CONTACTED", label: "RM Contact", description: "Relationship Manager contacts the company (5-day SLA)." },
  { key: "ASSESSMENT_SUBMITTED_TO_JS", label: "Feasibility Report", description: "13-point feasibility assessment submitted to Joint Secretary." },
  { key: "JS_APPROVED", label: "JS Decision", description: "Joint Secretary decision recorded (5-day SLA)." },
  { key: "NODAL_OFFICER_APPOINTED", label: "Nodal Officer Appointed", description: "District Nodal Officer appointed and mapped to the project." },
  { key: "MOU_PENDING", label: "MoU Finalisation", description: "Tripartite MoU under review — deliverables and timeline being finalised." },
  { key: "PROJECT_ONBOARDED", label: "Project Onboarded", description: "MoU signed; project onboarded with Project ID and tracking begins." },
  { key: "EXECUTION_STARTED", label: "Execution", description: "Implementation in progress with milestone tracking." },
  { key: "COMPLETED", label: "Completed", description: "Project deliverables completed and handed over." },
];

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

// Corporate interest lifecycle in workflow order.
const INTEREST_FLOW = [
  { key: "INTERESTED", label: "Interest Submitted", description: "Corporate interest has been successfully registered." },
  { key: "RM_CONTACTED", label: "RM Contacted", description: "Relationship Manager initiated contact and discussion." },
  { key: "UNDER_ASSESSMENT", label: "Under Assessment", description: "13-point checklist assessment in progress." },
  { key: "NGO_SELECTED", label: "NGO Selected", description: "Executing agency selected for implementation." },
  { key: "MOU_PENDING", label: "MoU Signing", description: "Tripartite MoU drafting and signing in progress." },
  { key: "PROJECT_ONBOARDED", label: "Project Onboarded", description: "MoU signed and project implementation initiated." },
];

// Where each backend status lands on the flow above (statuses that share a
// stage map to the same index so progress is monotonic).
const ENQUIRY_STATUS_INDEX: Record<string, number> = {
  SUBMITTED: 0,
  TRACKING_ID_GENERATED: 0,
  RM_ASSIGNED: 1,
  RM_CONTACTED: 2,
  ASSESSMENT_PENDING: 2,
  ASSESSMENT_SUBMITTED_TO_JS: 3,
  JS_APPROVED: 4,
  JS_REJECTED: 4,
  NODAL_OFFICER_APPOINTED: 5,
  MOU_PENDING: 6,
  MOU_SIGNED: 7,
  PROJECT_ONBOARDED: 7,
  EXECUTION_STARTED: 8,
  COMPLETED: 9,
  CLOSED: 9,
};

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

const INTEREST_STATUS_INDEX: Record<string, number> = {
  INTERESTED: 0,
  INTEREST_SUBMITTED: 0,
  UNDER_DISCUSSION: 1,
  RM_CONTACTED: 1,
  UNDER_ASSESSMENT: 2,
  NGO_SELECTED: 3,
  FUNDING_APPROVED: 4,
  CI_AGREEMENT_PENDING: 4,
  MOU_PENDING: 4,
  CI_AGREEMENT_SIGNED: 5,
  MOU_SIGNED: 5,
  PROJECT_ONBOARDED: 5,
  FUND_RELEASED: 5,
  CI_COMPLETED: 5,
  WITHDRAWN: 5,
};

const STATUS_STEPS = [...ENQUIRY_FLOW, ...PITCH_FLOW, ...INTEREST_FLOW];

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
      const isInterest = response.type === "INTEREST";
      const currentStatus = response.status ?? enquiry.status ?? "SUBMITTED";

      let timeline;
      if (isPitch) {
        timeline = buildTimeline(PITCH_FLOW, PITCH_STATUS_INDEX, currentStatus, {
          0: enquiry.submittedAt ?? enquiry.createdAt,
          1: enquiry.assignedRelationshipManagerId ? enquiry.updatedAt : undefined,
          [PITCH_STATUS_INDEX[currentStatus] ?? 0]: enquiry.updatedAt,
        });
      } else if (isInterest) {
        timeline = buildTimeline(INTEREST_FLOW, INTEREST_STATUS_INDEX, currentStatus, {
          0: enquiry.createdAt,
          1: enquiry.dialogueInitiated ? enquiry.updatedAt : undefined,
          [INTEREST_STATUS_INDEX[currentStatus] ?? 0]: enquiry.updatedAt,
        });
      } else {
        timeline = buildTimeline(ENQUIRY_FLOW, ENQUIRY_STATUS_INDEX, currentStatus, {
          0: enquiry.submittedAt ?? enquiry.createdAt,
          1: enquiry.assignedRelationshipManager || enquiry.assignedRelationshipManagerId ? enquiry.updatedAt : undefined,
          2: enquiry.firstContactedAt ?? undefined,
          [ENQUIRY_STATUS_INDEX[currentStatus] ?? 0]: enquiry.updatedAt,
        });
      }

      setTrackingData({
        trackingId: isPitch 
          ? (enquiry.pitchReferenceId ?? response.trackingId) 
          : isInterest 
          ? (enquiry.interestTrackingId ?? response.trackingId)
          : enquiry.trackingId,
        type: isPitch ? "PITCH" : isInterest ? "INTEREST" : "ENQUIRY",
        currentStatus,
        submittedAt: response.submittedAt ?? enquiry.submittedAt ?? enquiry.createdAt,
        estimatedCompletion: enquiry.firstResponseDueAt,
        timeline,
        details: {
          companyName: isPitch ? enquiry.department : enquiry.companyName,
          sector: isPitch ? enquiry.officeName : enquiry.sector,
          district: isPitch 
            ? enquiry.district 
            : isInterest 
            ? enquiry.governmentPitch?.district 
            : enquiry.preferredDistricts?.join(", "),
          contactPerson: isPitch 
            ? `${enquiry.officialName} (${enquiry.designation})` 
            : enquiry.contactPersonName,
          requirement: isPitch 
            ? enquiry.csrRequirement 
            : isInterest 
            ? enquiry.governmentPitch?.csrRequirement 
            : enquiry.proposedCsrWork,
          estimatedCost: isPitch 
            ? (enquiry.estimatedCost ? Number(enquiry.estimatedCost) : undefined)
            : isInterest
            ? (enquiry.governmentPitch?.estimatedCost ? Number(enquiry.governmentPitch?.estimatedCost) : undefined)
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
        return "success";
      case "REJECTED":
        return "danger";
      case "SUBMITTED":
        return "info";
      case "UNDER_ASSESSMENT":
      case "JS_REVIEW":
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
      <div className="gov-public-main">
        <div className="gov-page-header">
          <div className="gov-breadcrumb">
            Home / Track Application
          </div>
          <h1 className="gov-page-title flex items-center gap-3">
            <Package size={28} className="text-[#f7941d]" />
            Track Your Application
          </h1>
          <p className="gov-page-description">
            Track the status of your CSR enquiry or development pitch using your tracking ID.
          </p>
        </div>

        {/* Search Section */}
        <GovCard className="mb-6">
          <GovCardBody>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <GovInput
                  label="Tracking ID"
                  placeholder="CSR-MH-2026-000001"
                  value={trackingId}
                  onChange={(e) => {
                    setTrackingId(e.target.value.toUpperCase());
                    setError("");
                  }}
                  error={error}
                  help="Format: PREFIX-MH-YYYY-XXXXXX (e.g., CSR-MH-2026-000001, GP-MH-2026-000001, INT-MH-2026-000001)"
                />
              </div>
              <GovButton
                onClick={() => handleSearch()}
                disabled={loading}
                className="w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Track
                  </>
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
              <GovCardHeader>
                <GovCardTitle className="flex items-center justify-between">
                  <span>Application Status</span>
                  <GovStatusBadge variant={getStatusVariant(trackingData.currentStatus)}>
                    {trackingData.currentStatus.replace(/_/g, " ")}
                  </GovStatusBadge>
                </GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded">
                    <p className="text-xs text-slate-500 mb-1">Tracking ID</p>
                    <p className="font-mono font-bold text-[#14274e]">{trackingData.trackingId}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded">
                    <p className="text-xs text-slate-500 mb-1">Application Type</p>
                    <p className="font-bold text-[#14274e]">
                      {trackingData.type === "ENQUIRY" 
                        ? "CSR Enquiry" 
                        : trackingData.type === "INTEREST"
                        ? "Corporate CSR Interest"
                        : "Development Pitch"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded">
                    <p className="text-xs text-slate-500 mb-1">Submitted On</p>
                    <p className="font-bold text-[#14274e]">
                      {new Date(trackingData.submittedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {trackingData.estimatedCompletion && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Estimated Completion:</strong>{" "}
                      {new Date(trackingData.estimatedCompletion).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )}
              </GovCardBody>
            </GovCard>

            {/* Timeline */}
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Status Timeline</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-slate-200" />

                  <div className="space-y-4">
                    {trackingData.timeline.map((step, index) => (
                      <div
                        key={step.status}
                        className={`relative flex items-start gap-4 p-4 rounded transition-colors ${
                          step.completed
                            ? "bg-green-50"
                            : step.current
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.completed
                              ? "bg-green-100"
                              : step.current
                              ? "bg-amber-100"
                              : "bg-slate-100"
                          }`}
                        >
                          {getStepIcon(step)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">{STATUS_STEPS.find(s => s.key === step.status)?.label || step.status}</h4>
                            {step.current && (
                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                          {step.timestamp && (
                            <p className="text-xs text-slate-400 mt-1">
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
                          <ArrowRight size={16} className="text-slate-300 flex-shrink-0" />
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
                <GovCardHeader>
                  <GovCardTitle>Application Details</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {trackingData.details.companyName && (
                      <div>
                        <p className="text-xs text-slate-500">
                          {trackingData.type === "PITCH" ? "Department" : "Company Name"}
                        </p>
                        <p className="font-medium">{trackingData.details.companyName}</p>
                      </div>
                    )}
                    {trackingData.details.sector && (
                      <div>
                        <p className="text-xs text-slate-500">
                          {trackingData.type === "PITCH" ? "Office Name" : "Sector"}
                        </p>
                        <p className="font-medium">{trackingData.details.sector}</p>
                      </div>
                    )}
                    {trackingData.details.district && (
                      <div>
                        <p className="text-xs text-slate-500">District</p>
                        <p className="font-medium">{trackingData.details.district}</p>
                      </div>
                    )}
                    {trackingData.details.estimatedCost && (
                      <div>
                        <p className="text-xs text-slate-500">Estimated Cost</p>
                        <p className="font-medium">
                          ₹{trackingData.details.estimatedCost.toLocaleString("en-IN")}
                        </p>
                      </div>
                    )}
                    {trackingData.details.contactPerson && (
                      <div>
                        <p className="text-xs text-slate-500">
                          {trackingData.type === "PITCH" ? "Official Name" : "Contact Person"}
                        </p>
                        <p className="font-medium">{trackingData.details.contactPerson}</p>
                      </div>
                    )}
                    {trackingData.details.requirement && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-slate-500">Requirement</p>
                        <p className="font-medium text-sm mt-1">{trackingData.details.requirement}</p>
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
            <div className="flex items-center gap-2">
              <XCircle size={20} />
              <span>No application found with the provided tracking ID. Please verify and try again.</span>
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
      <GovPortalLayout>
        <div className="gov-public-main flex items-center justify-center p-12">
          <Loader2 className="animate-spin text-slate-500" size={32} />
          <span className="ml-2 text-slate-600 font-medium">Loading tracker...</span>
        </div>
      </GovPortalLayout>
    }>
      <TrackContent />
    </Suspense>
  );
}
