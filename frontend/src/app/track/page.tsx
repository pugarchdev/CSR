"use client";

import React, { useState, useEffect, Suspense } from "react";
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
}

interface TrackingData {
  trackingId: string;
  type: "ENQUIRY" | "PITCH";
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

const STATUS_STEPS = [
  { key: "SUBMITTED", label: "Submitted", description: "Application received" },
  { key: "RM_ASSIGNED", label: "RM Assigned", description: "Relationship manager assigned" },
  { key: "UNDER_ASSESSMENT", label: "Assessment", description: "Under assessment" },
  { key: "JS_REVIEW", label: "JS Review", description: "Joint Secretary review" },
  { key: "APPROVED", label: "Approved", description: "Application approved" },
  { key: "REJECTED", label: "Rejected", description: "Application rejected" },
  
  // Pitch workflow steps
  { key: "RM_VERIFICATION_PENDING", label: "Verification Pending", description: "Relationship Manager verification pending" },
  { key: "JS_APPROVAL_PENDING", label: "JS Approval Pending", description: "Joint Secretary approval pending" },
  { key: "PUBLIC_LISTED", label: "Publicly Listed", description: "Listed on public portal" },
  { key: "CORPORATE_INTEREST_RECEIVED", label: "Corporate Interest Received", description: "Companies expressed interest" },
];

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
    const pattern = /^(CSR|GP|INT|GRV|PRJ)-MH-\d{4}-\d{6}$/;
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
      setError("Invalid tracking ID format. Expected prefix (e.g. CSR, GP, INT, GRV, PRJ) followed by -MH-YYYY-XXXXXX");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch<any>(`/tracking/${id}`);
      const enquiry = response.details ?? response?.data?.enquiry ?? response?.enquiry ?? response;
      const isPitch = response.type === "PITCH";
      
      let timeline = [];
      if (isPitch) {
        timeline = [
          {
            status: "SUBMITTED",
            description: "Government pitch has been received.",
            completed: true,
            timestamp: enquiry.submittedAt
          },
          {
            status: "RM_VERIFICATION_PENDING",
            description: "A CSR Relationship Manager is assigned for verification.",
            completed: enquiry.status !== "SUBMITTED",
            timestamp: enquiry.assignedRelationshipManagerId ? enquiry.updatedAt : ""
          },
          {
            status: "JS_APPROVAL_PENDING",
            description: "Relationship Manager verified the need and submitted to Joint Secretary.",
            completed: !["SUBMITTED", "RM_VERIFICATION_PENDING"].includes(enquiry.status),
            timestamp: enquiry.status === "JS_APPROVAL_PENDING" || !["SUBMITTED", "RM_VERIFICATION_PENDING"].includes(enquiry.status) ? enquiry.updatedAt : ""
          },
          {
            status: "PUBLIC_LISTED",
            description: "Joint Secretary approved and listed the development need publicly.",
            completed: ["PUBLIC_LISTED", "CORPORATE_INTEREST_RECEIVED", "NODAL_OFFICER_ASSIGNED", "MOU_PENDING", "MOU_SIGNED", "PROJECT_ONBOARDED", "COMPLETED", "CLOSED"].includes(enquiry.status),
            timestamp: ["PUBLIC_LISTED", "CORPORATE_INTEREST_RECEIVED", "NODAL_OFFICER_ASSIGNED", "MOU_PENDING", "MOU_SIGNED", "PROJECT_ONBOARDED", "COMPLETED", "CLOSED"].includes(enquiry.status) ? enquiry.updatedAt : ""
          }
        ];
      } else {
        timeline = [
          { status: "TRACKING_ID_GENERATED", description: "Your enquiry has been received.", completed: true, timestamp: enquiry.submittedAt },
          { status: "RM_ASSIGNED", description: "A CSR Relationship Manager is assigned.", completed: Boolean(enquiry.assignedRelationshipManager), timestamp: enquiry.updatedAt },
          { status: "RM_CONTACTED", description: "Relationship Manager contacts the company.", completed: Boolean(enquiry.firstContactedAt), timestamp: enquiry.firstContactedAt ?? "" },
          { status: "ASSESSMENT_SUBMITTED_TO_JS", description: "Feasibility assessment is submitted for decision.", completed: false, timestamp: "" },
          { status: "JS_APPROVED", description: "Joint Secretary decision is recorded.", completed: false, timestamp: "" },
        ];
      }

      setTrackingData({
        trackingId: isPitch ? (enquiry.pitchReferenceId ?? response.trackingId) : enquiry.trackingId,
        type: isPitch ? "PITCH" : "ENQUIRY",
        currentStatus: response.status ?? enquiry.status,
        submittedAt: response.submittedAt ?? enquiry.submittedAt ?? enquiry.createdAt,
        estimatedCompletion: enquiry.firstResponseDueAt,
        timeline,
        details: {
          companyName: isPitch ? enquiry.department : enquiry.companyName,
          sector: isPitch ? enquiry.officeName : enquiry.sector,
          district: isPitch ? enquiry.district : enquiry.preferredDistricts?.join(", "),
          contactPerson: isPitch ? `${enquiry.officialName} (${enquiry.designation})` : enquiry.contactPersonName,
          requirement: isPitch ? enquiry.csrRequirement : enquiry.proposedCsrWork,
          estimatedCost: isPitch 
            ? (enquiry.estimatedCost ? Number(enquiry.estimatedCost) : undefined)
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
    if (step.status === trackingData?.currentStatus) {
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
                  placeholder="CSR-MH-YYYY-XXXXXX"
                  value={trackingId}
                  onChange={(e) => {
                    setTrackingId(e.target.value.toUpperCase());
                    setError("");
                  }}
                  error={error}
                  help="Format: CSR-MH-YYYY-XXXXXX (e.g., CSR-MH-2024-001234)"
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
                      {trackingData.type === "ENQUIRY" ? "CSR Enquiry" : "Development Pitch"}
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
                            : step.status === trackingData.currentStatus
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.completed
                              ? "bg-green-100"
                              : step.status === trackingData.currentStatus
                              ? "bg-amber-100"
                              : "bg-slate-100"
                          }`}
                        >
                          {getStepIcon(step)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">{STATUS_STEPS.find(s => s.key === step.status)?.label || step.status}</h4>
                            {step.status === trackingData.currentStatus && (
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
