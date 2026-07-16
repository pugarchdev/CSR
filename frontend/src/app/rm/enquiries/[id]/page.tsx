"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovButton from "@/components/gov/GovButton";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovTextarea from "@/components/gov/GovTextarea";
import GovAlert from "@/components/gov/GovAlert";
import { apiFetch } from "@/lib/api";
import { useApiQuery, useApiMutation } from "@/lib/apiHooks";
import { useAuthStore } from "@/store/authStore";
import { 
  ArrowLeft,
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  Send,
  User,
  FileText,
  AlertTriangle,
  Save
} from "lucide-react";

// Types
interface CompanyDetails {
  id: string;
  name: string;
  cin: string;
  sector: string;
  pan: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  csrSpendLast3Years: number;
}

interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  notes: string;
  userName: string;
}

interface Interaction {
  id: string;
  type: "CALL" | "EMAIL" | "MEETING" | "SITE_VISIT" | "OTHER";
  timestamp: string;
  summary: string;
  notes: string;
  recordedBy: string;
}

interface FeasibilityChecklistItem {
  id: string;
  itemNumber?: number;
  question: string;
  response: "YES" | "NO" | "N/A" | null;
  notes: string;
}

interface EnquiryDetail {
  id: string;
  trackingId: string;
  status: 
    | "SUBMITTED" 
    | "TRACKING_ID_GENERATED" 
    | "RM_ASSIGNED" 
    | "RM_CONTACTED" 
    | "ASSESSMENT_PENDING" 
    | "ASSESSMENT_SUBMITTED_TO_JS" 
    | "JS_APPROVED" 
    | "JS_REJECTED" 
    | "NODAL_OFFICER_APPOINTED" 
    | "MOU_PENDING" 
    | "MOU_SIGNED" 
    | "PROJECT_ONBOARDED" 
    | "EXECUTION_STARTED" 
    | "COMPLETED" 
    | "CLOSED";
  submittedAt: string;
  slaDue: string;
  company: CompanyDetails;
  csrFocusAreas: string[];
  preferredDistricts: string[];
  budgetRange: { min: number; max: number };
  projectDuration: string;
  timeline: TimelineEvent[];
  interactions: Interaction[];
  feasibilityChecklist: FeasibilityChecklistItem[];
  rmRecommendation: string | null;
  rmNotes: string | null;
  jsDecision: "APPROVED" | "REJECTED" | "APPROVED_WITH_CONDITIONS" | null;
  jsConditions: string | null;
  jsDecisionDate: string | null;
  assignedRelationshipManager?: { id: string; email: string } | null;
  assignedRelationshipManagerId?: string | null;
  feasibilityAssessment?: {
    id: string;
    reportReference: string;
    corporateEnquiryId: string;
    relationshipManagerId: string;
    companyName: string;
    cin: string;
    sector: string;
    contactSummary: string;
    proposedLocationDistrict: string;
    indicativeBudget: number;
    developmentNeedAddressed: string;
    dateOfFirstContact: string;
    summaryOfInteraction: string;
    feasibilityResult: "FEASIBLE" | "PROCEED_WITH_CONDITIONS" | "NOT_FEASIBLE";
    recommendation: string;
    suggestedNodalOfficerDomain: string;
    conditionText?: string | null;
    submittedToJsAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

interface AddInteractionRequest {
  type: "CALL" | "EMAIL" | "MEETING" | "SITE_VISIT" | "OTHER";
  summary: string;
  notes: string;
}

interface SubmitFeasibilityRequest {
  companyName: string;
  cin: string;
  sector: string;
  contactSummary: string;
  proposedLocationDistrict: string;
  indicativeBudget: number;
  developmentNeedAddressed: string;
  dateOfFirstContact: string;
  summaryOfInteraction: string;
  feasibilityResult: "FEASIBLE" | "PROCEED_WITH_CONDITIONS" | "NOT_FEASIBLE";
  recommendation: string;
  suggestedNodalOfficerDomain: string;
  conditionText?: string;
  checklistItems: { itemNumber: number; answer: "YES" | "NO" | "NA"; remarks: string }[];
}

const FEASIBILITY_CHECKLIST: { itemNumber: number; dimension: string; question: string; isCritical: boolean }[] = [
  { itemNumber: 1, dimension: "Mandate & Legal", question: "Activity falls within Schedule VII of the Companies Act.", isCritical: true },
  { itemNumber: 2, dimension: "Mandate & Legal", question: "Not a prohibited CSR activity: not employee-only, not political, not normal course of business.", isCritical: true },
  { itemNumber: 3, dimension: "Need & Alignment", question: "Addresses a genuine, verified development need.", isCritical: true },
  { itemNumber: 4, dimension: "Need & Alignment", question: "Does NOT duplicate an existing government scheme or ongoing project in same location.", isCritical: true },
  { itemNumber: 5, dimension: "Site & Govt Support", question: "For construction/renovation: site/land is available, clear, and in government ownership/control.", isCritical: true },
  { itemNumber: 6, dimension: "Site & Govt Support", question: "Required permissions/clearances are obtainable within a reasonable time.", isCritical: true },
  { itemNumber: 7, dimension: "Site & Govt Support", question: "Required government support/personnel/access is confirmed.", isCritical: true },
  { itemNumber: 8, dimension: "Financial", question: "Indicative budget is adequate for the proposed scope.", isCritical: false },
  { itemNumber: 9, dimension: "Financial", question: "Cost estimate is realistic and benchmarked against similar works.", isCritical: false },
  { itemNumber: 10, dimension: "Implementation", question: "Implementing capacity exists: corporate/foundation/NGO is capable.", isCritical: false },
  { itemNumber: 11, dimension: "Implementation", question: "Timeline is realistic for the scope.", isCritical: false },
  { itemNumber: 12, dimension: "Sustainability", question: "Post-completion ownership of the asset is clear.", isCritical: true },
  { itemNumber: 13, dimension: "Sustainability", question: "Maintenance / recurring-cost responsibility is identified.", isCritical: true },
];

const RESPONSE_OPTIONS = [
  { value: "", label: "Select Response" },
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "N/A", label: "Not Applicable" },
];

const INTERACTION_TYPES = [
  { value: "CALL", label: "Phone Call" },
  { value: "EMAIL", label: "Email Exchange" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "OTHER", label: "Other" },
];

// Format date helper
const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format currency
const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} Lakh`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
};

// Status badge variant mapper
const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "muted" => {
  const statusMap: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
    SUBMITTED: "warning",
    TRACKING_ID_GENERATED: "info",
    RM_ASSIGNED: "info",
    RM_CONTACTED: "info",
    ASSESSMENT_PENDING: "info",
    ASSESSMENT_SUBMITTED_TO_JS: "warning",
    JS_APPROVED: "success",
    JS_REJECTED: "danger",
    NODAL_OFFICER_APPOINTED: "success",
    MOU_PENDING: "warning",
    MOU_SIGNED: "success",
    PROJECT_ONBOARDED: "success",
    EXECUTION_STARTED: "info",
    COMPLETED: "success",
    CLOSED: "muted",
  };
  return statusMap[status] || "muted";
};

export default function EnquiryDetailPage() {
  const params = useParams();
  const enquiryId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "interactions" | "feasibility">("overview");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "overview" || tab === "timeline" || tab === "interactions" || tab === "feasibility") {
        setActiveTab(tab);
      }
    }
  }, []);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [feasibilityForm, setFeasibilityForm] = useState<Record<string, { response: string; notes: string }>>({});
  const [assessmentForm, setAssessmentForm] = useState({
    dateOfFirstContact: new Date().toISOString().slice(0, 10),
    contactSummary: "",
    proposedLocationDistrict: "",
    indicativeBudget: "",
    developmentNeedAddressed: "",
    summaryOfInteraction: "",
    feasibilityResult: "FEASIBLE" as "FEASIBLE" | "PROCEED_WITH_CONDITIONS" | "NOT_FEASIBLE",
    suggestedNodalOfficerDomain: "",
    conditionText: "",
  });
  const [recommendation, setRecommendation] = useState("");
  const [rmNotes, setRmNotes] = useState("");
  const [interactionForm, setInteractionForm] = useState<AddInteractionRequest>({
    type: "CALL",
    summary: "",
    notes: "",
  });
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: enquiry, isLoading, refetch } = useApiQuery<EnquiryDetail>(
    ["rm", "enquiry", enquiryId],
    `/rm/enquiries/${enquiryId}`,
    { staleTime: 30 * 1000, enabled: !!enquiryId }
  );

  const isReadOnly = !!enquiry?.feasibilityAssessment;

  const currentUser = useAuthStore((state) => state.user);
  const isAssigner = currentUser && ["SUPER_ADMIN", "PORTAL_ADMIN", "CSR_ADMIN", "JOINT_SECRETARY", "STATE_CSR_CELL"].includes(currentUser.role);

  const [relationshipManagers, setRelationshipManagers] = useState<{ id: string; email: string; assignedDistrict?: string }[]>([]);
  const [selectedRmId, setSelectedRmId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isAssigner) {
      apiFetch<any>("/corporate-enquiries/relationship-managers")
        .then((res) => {
          const data = res?.data || res;
          if (Array.isArray(data)) {
            setRelationshipManagers(data);
          }
        })
        .catch((err) => console.error("Error fetching RMs:", err));
    }
  }, [isAssigner]);

  // Set initial selected RM
  useEffect(() => {
    if (enquiry && enquiry.assignedRelationshipManagerId) {
      setSelectedRmId(enquiry.assignedRelationshipManagerId);
    }
  }, [enquiry]);

  const handleAssignRM = async () => {
    if (!selectedRmId) return;
    setAssigning(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch(`/corporate-enquiries/${enquiryId}/assign-rm`, {
        method: "PATCH",
        body: JSON.stringify({ relationshipManagerId: selectedRmId })
      });
      setSuccessMessage("Relationship Manager assigned successfully!");
      refetch();
    } catch (err: any) {
      setError(err?.message || "Failed to assign Relationship Manager.");
    } finally {
      setAssigning(false);
    }
  };

  const handleClaimEnquiry = async () => {
    if (!currentUser?.id) return;
    setAssigning(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiFetch(`/corporate-enquiries/${enquiryId}/assign-rm`, {
        method: "PATCH",
        body: JSON.stringify({ relationshipManagerId: currentUser.id })
      });
      setSuccessMessage("Enquiry claimed successfully!");
      refetch();
    } catch (err: any) {
      setError(err?.message || "Failed to claim enquiry.");
    } finally {
      setAssigning(false);
    }
  };

  // Initialize feasibility form when enquiry loads
  useEffect(() => {
    if (enquiry) {
      const initialForm: Record<string, { response: string; notes: string }> = {};
      FEASIBILITY_CHECKLIST.forEach((item) => {
        const saved = enquiry.feasibilityChecklist?.find((candidate) => {
          const candidateNumber = candidate.itemNumber || Number(candidate.id);
          return candidateNumber === item.itemNumber;
        });
        initialForm[String(item.itemNumber)] = {
          response: saved?.response || "",
          notes: saved?.notes || "",
        };
      });
      setFeasibilityForm(initialForm);
      setRecommendation(enquiry.rmRecommendation || "");
      setRmNotes(enquiry.rmNotes || "");

      if (enquiry.feasibilityAssessment) {
        const fa = enquiry.feasibilityAssessment;
        setAssessmentForm({
          dateOfFirstContact: fa.dateOfFirstContact ? fa.dateOfFirstContact.slice(0, 10) : "",
          contactSummary: fa.contactSummary || "",
          proposedLocationDistrict: fa.proposedLocationDistrict || "",
          indicativeBudget: fa.indicativeBudget ? String(fa.indicativeBudget) : "",
          developmentNeedAddressed: fa.developmentNeedAddressed || "",
          summaryOfInteraction: fa.summaryOfInteraction || "",
          feasibilityResult: fa.feasibilityResult || "FEASIBLE",
          suggestedNodalOfficerDomain: fa.suggestedNodalOfficerDomain || "",
          conditionText: fa.conditionText || "",
        });
      } else {
        setAssessmentForm((prev) => ({
          ...prev,
          contactSummary: enquiry.company.contactPerson
            ? `${enquiry.company.contactPerson} (${enquiry.company.contactEmail}, ${enquiry.company.contactPhone})`
            : prev.contactSummary,
          proposedLocationDistrict: enquiry.preferredDistricts?.[0] || enquiry.company.district || prev.proposedLocationDistrict,
          indicativeBudget: String(enquiry.budgetRange?.max || enquiry.budgetRange?.min || ""),
          developmentNeedAddressed: (enquiry as EnquiryDetail & { proposedCsrWork?: string }).proposedCsrWork || prev.developmentNeedAddressed,
          summaryOfInteraction: enquiry.interactions?.[0]?.summary || prev.summaryOfInteraction,
        }));
      }
    }
  }, [enquiry]);

  const addInteractionMutation = useApiMutation<Interaction, AddInteractionRequest>(
    "POST",
    `/rm/enquiries/${enquiryId}/interactions`,
    {
      onSuccess: () => {
        refetch();
        setShowInteractionForm(false);
        setInteractionForm({ type: "CALL", summary: "", notes: "" });
        setSuccessMessage("Interaction logged successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      },
    }
  );

  const submitFeasibilityMutation = useApiMutation<void, SubmitFeasibilityRequest>(
    "POST",
    `/rm/enquiries/${enquiryId}/assessment`,
    {
      invalidateKeys: [["rm", "enquiry", enquiryId]],
      onSuccess: () => {
        refetch();
        setShowSubmitModal(false);
        setSuccessMessage("Feasibility assessment submitted to Joint Secretary");
        setTimeout(() => setSuccessMessage(null), 3000);
      },
    }
  );

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionForm.summary.trim()) {
      setError("Please enter a summary for the interaction");
      return;
    }
    try {
      await addInteractionMutation.mutateAsync(interactionForm);
    } catch (err) {
      setError("Failed to add interaction. Please try again.");
    }
  };

  const handleFeasibilityChange = (itemId: string, field: "response" | "notes", value: string) => {
    setFeasibilityForm((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const criticalFailures = FEASIBILITY_CHECKLIST.filter((item) => {
    const answer = feasibilityForm[String(item.itemNumber)]?.response;
    if (!item.isCritical) return false;
    if (item.itemNumber === 5 && answer === "N/A") return false;
    return answer && answer !== "YES";
  });

  const suggestedResult = criticalFailures.length === 0
    ? "FEASIBLE"
    : assessmentForm.feasibilityResult === "NOT_FEASIBLE"
      ? "NOT_FEASIBLE"
      : "PROCEED_WITH_CONDITIONS";

  const handleSubmitFeasibility = async () => {
    if (!enquiry) {
      setError("Enquiry details are still loading");
      return;
    }
    const incomplete = FEASIBILITY_CHECKLIST.some((item) => !feasibilityForm[String(item.itemNumber)]?.response);
    if (incomplete) {
      setError("Please complete all 13 checklist items before submitting");
      return;
    }
    if (!assessmentForm.contactSummary.trim() || !assessmentForm.proposedLocationDistrict.trim() || !assessmentForm.indicativeBudget || !assessmentForm.developmentNeedAddressed.trim() || !assessmentForm.summaryOfInteraction.trim() || !assessmentForm.suggestedNodalOfficerDomain.trim()) {
      setError("Please complete all RM assessment report fields before submitting");
      return;
    }
    if (criticalFailures.length > 0 && assessmentForm.feasibilityResult === "FEASIBLE") {
      setError("FEASIBLE requires all critical checks to be YES. Select Proceed with Conditions or Not Feasible.");
      return;
    }
    if (assessmentForm.feasibilityResult === "PROCEED_WITH_CONDITIONS" && !assessmentForm.conditionText.trim()) {
      setError("Please record the fixable conditions before selecting Proceed with Conditions");
      return;
    }
    if (!recommendation.trim()) {
      setError("Please provide your recommendation");
      return;
    }

    const checklistItems = FEASIBILITY_CHECKLIST.map((item) => {
      const data = feasibilityForm[String(item.itemNumber)];
      return {
        itemNumber: item.itemNumber,
        answer: data.response === "N/A" ? "NA" as const : data.response as "YES" | "NO",
        remarks: data.notes,
      };
    });

    try {
      await submitFeasibilityMutation.mutateAsync({
        companyName: enquiry.company.name,
        cin: enquiry.company.cin,
        sector: enquiry.company.sector,
        contactSummary: assessmentForm.contactSummary.trim(),
        proposedLocationDistrict: assessmentForm.proposedLocationDistrict.trim(),
        indicativeBudget: Number(assessmentForm.indicativeBudget),
        developmentNeedAddressed: assessmentForm.developmentNeedAddressed.trim(),
        dateOfFirstContact: assessmentForm.dateOfFirstContact,
        summaryOfInteraction: assessmentForm.summaryOfInteraction.trim(),
        feasibilityResult: assessmentForm.feasibilityResult,
        recommendation,
        suggestedNodalOfficerDomain: assessmentForm.suggestedNodalOfficerDomain.trim(),
        conditionText: assessmentForm.conditionText.trim() || undefined,
        checklistItems,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to submit feasibility assessment. Please try again.");
    }
  };

  const allChecklistComplete = FEASIBILITY_CHECKLIST.every((item) => feasibilityForm[String(item.itemNumber)]?.response);

  if (isLoading) {
    return (
      <GovPortalLayout>
        <div style={{ padding: 60, textAlign: "center", color: "var(--gov-text-muted)" }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            border: "4px solid var(--gov-border)", 
            borderTopColor: "var(--gov-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Loading enquiry details...
        </div>
      </GovPortalLayout>
    );
  }

  if (!enquiry) {
    return (
      <GovPortalLayout>
        <GovAlert variant="danger">Enquiry not found or you do not have permission to view it.</GovAlert>
      </GovPortalLayout>
    );
  }

  return (
    <GovPortalLayout>
      <GovPageHeader
        title={`Enquiry ${enquiry.trackingId}`}
        description="View and manage corporate CSR enquiry details"
        breadcrumb={`Home / Enquiries / ${enquiry.trackingId}`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/rm/enquiries">
              <GovButton variant="muted">
                <ArrowLeft size={16} />
                Back to List
              </GovButton>
            </Link>
            {!isReadOnly && (
              <GovButton variant="primary" onClick={() => { setError(null); setShowSubmitModal(true); }} disabled={!allChecklistComplete}>
                <Send size={16} />
                Submit to JS
              </GovButton>
            )}
          </div>
        }
      />

      {error && (
        <div style={{ marginBottom: 16 }}>
          <GovAlert variant="danger">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={18} />
              {error}
            </div>
          </GovAlert>
        </div>
      )}

      {successMessage && (
        <div style={{ marginBottom: 16 }}>
          <GovAlert variant="success">
            {successMessage}
          </GovAlert>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 24 }}>
        {/* Main Content */}
        <div>
          {/* Tab Navigation */}
          <div style={{ display: "flex", borderBottom: "2px solid var(--gov-border)", marginBottom: 24 }}>
            {[
              { id: "overview", label: "Overview", icon: FileText },
              { id: "timeline", label: "Status Timeline", icon: Clock },
              { id: "interactions", label: "Interaction Log", icon: User },
              { id: "feasibility", label: "Feasibility Assessment", icon: CheckCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 20px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "2px solid var(--gov-primary)" : "2px solid transparent",
                  color: activeTab === tab.id ? "var(--gov-primary)" : "var(--gov-text-muted)",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  cursor: "pointer",
                  fontSize: 14,
                  marginBottom: -2,
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <>
              {/* Company Details */}
              <GovCard style={{ marginBottom: 24 }}>
                <GovCardHeader>
                  <GovCardTitle>Company Details</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="gov-form-grid">
                    <div className="gov-field full">
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div style={{ 
                          width: 56, 
                          height: 56, 
                          borderRadius: 8, 
                          background: "var(--gov-primary-light)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--gov-primary)"
                        }}>
                          <Building2 size={28} />
                        </div>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gov-primary-dark)" }}>
                            {enquiry.company.name}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--gov-text-muted)" }}>
                            CIN: {enquiry.company.cin}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Sector</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.company.sector}</div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>PAN</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.company.pan}</div>
                    </div>
                    <div className="gov-field full">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Address</label>
                      <div style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={14} />
                        {enquiry.company.address}, {enquiry.company.district}, {enquiry.company.state} - {enquiry.company.pincode}
                      </div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Contact Person</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.company.contactPerson}</div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Email</label>
                      <div style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail size={14} />
                        {enquiry.company.contactEmail}
                      </div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Phone</label>
                      <div style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <Phone size={14} />
                        {enquiry.company.contactPhone}
                      </div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>CSR Spend (Last 3 Years)</label>
                      <div style={{ fontSize: 14, marginTop: 4, fontWeight: 600, color: "var(--gov-success)" }}>
                        {formatCurrency(enquiry.company.csrSpendLast3Years)}
                      </div>
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>

              {/* CSR Interest Details */}
              <GovCard>
                <GovCardHeader>
                  <GovCardTitle>CSR Interest Details</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>CSR Focus Areas</label>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {enquiry.csrFocusAreas.map((area) => (
                          <GovStatusBadge key={area} variant="info">{area}</GovStatusBadge>
                        ))}
                      </div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Preferred Districts</label>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {enquiry.preferredDistricts.map((district) => (
                          <GovStatusBadge key={district} variant="muted">{district}</GovStatusBadge>
                        ))}
                      </div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Budget Range</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>
                        {formatCurrency(enquiry.budgetRange.min)} - {formatCurrency(enquiry.budgetRange.max)}
                      </div>
                    </div>
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Project Duration</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.projectDuration}</div>
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>
            </>
          )}

          {activeTab === "timeline" && (
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Status Timeline</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div className="gov-stepper">
                  {enquiry.timeline.map((event, index) => (
                    <div 
                      key={event.id} 
                      className={`gov-step ${index === enquiry.timeline.length - 1 ? "active" : "completed"}`}
                    >
                      <div className="gov-step-number">{index + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {event.status.replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--gov-text-muted)", marginTop: 2 }}>
                          {formatDate(event.timestamp)} by {event.userName}
                        </div>
                        {event.notes && (
                          <div style={{ fontSize: 13, marginTop: 6, color: "var(--gov-text-secondary)" }}>
                            {event.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GovCardBody>
            </GovCard>
          )}

          {activeTab === "interactions" && (
            <GovCard>
              <GovCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <GovCardTitle>Interaction Log</GovCardTitle>
                  <GovButton variant="secondary" onClick={() => setShowInteractionForm(true)}>
                    <User size={16} />
                    Add Interaction
                  </GovButton>
                </div>
              </GovCardHeader>
              <GovCardBody>
                {showInteractionForm && (
                  <form onSubmit={handleAddInteraction} style={{ marginBottom: 24, padding: 16, background: "var(--gov-surface-muted)", borderRadius: 4 }}>
                    <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Add New Interaction</h4>
                    <div className="gov-form-grid">
                      <div className="gov-field">
                        <GovSelect
                          label="Interaction Type"
                          value={interactionForm.type}
                          onChange={(e) => setInteractionForm(prev => ({ ...prev, type: e.target.value as typeof interactionForm.type }))}
                          required
                        >
                          {INTERACTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </GovSelect>
                      </div>
                      <div className="gov-field full">
                        <GovInput
                          label="Summary"
                          value={interactionForm.summary}
                          onChange={(e) => setInteractionForm(prev => ({ ...prev, summary: e.target.value }))}
                          placeholder="Brief summary of the interaction"
                          required
                        />
                      </div>
                      <div className="gov-field full">
                        <GovTextarea
                          label="Detailed Notes"
                          value={interactionForm.notes}
                          onChange={(e) => setInteractionForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Detailed notes about the interaction"
                          rows={4}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                      <GovButton variant="muted" type="button" onClick={() => setShowInteractionForm(false)}>Cancel</GovButton>
                      <GovButton variant="primary" type="submit" disabled={addInteractionMutation.isPending}>
                        <Save size={16} />
                        {addInteractionMutation.isPending ? "Saving..." : "Save Interaction"}
                      </GovButton>
                    </div>
                  </form>
                )}

                {enquiry.interactions.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--gov-text-muted)" }}>
                    <User size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <div>No interactions recorded yet</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {enquiry.interactions.map((interaction) => (
                      <div key={interaction.id} style={{ padding: 16, border: "1px solid var(--gov-border)", borderRadius: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <GovStatusBadge variant="info">{interaction.type}</GovStatusBadge>
                            <span style={{ fontWeight: 600 }}>{interaction.summary}</span>
                          </div>
                          <span style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>
                            {formatDate(interaction.timestamp)}
                          </span>
                        </div>
                        {interaction.notes && (
                          <div style={{ fontSize: 13, color: "var(--gov-text-secondary)", marginTop: 8 }}>
                            {interaction.notes}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 8 }}>
                          Recorded by: {interaction.recordedBy}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {activeTab === "feasibility" && (
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Feasibility Assessment (13-Point Checklist)</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
                  <GovAlert variant={criticalFailures.length > 0 ? "warning" : "success"}>
                    <strong>Decision Rule:</strong> All critical checks in Mandate & Legal, Need & Alignment, Site & Govt Support, and Sustainability must be YES. Current suggested result: <strong>{suggestedResult.replace(/_/g, " ")}</strong>.
                  </GovAlert>
                  <div style={{ border: "1px solid var(--gov-border)", padding: 12, background: "var(--gov-surface-muted)" }}>
                    <div style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Critical gaps</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: criticalFailures.length ? "var(--gov-danger)" : "var(--gov-success)" }}>
                      {criticalFailures.length}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>
                      {criticalFailures.length ? `Items ${criticalFailures.map((item) => item.itemNumber).join(", ")} need action` : "All critical checks pass"}
                    </div>
                  </div>
                </div>

                <div className="gov-form-grid" style={{ marginBottom: 24 }}>
                  <div className="gov-field">
                    <GovInput
                      label="Date of First Contact *"
                      type="date"
                      value={assessmentForm.dateOfFirstContact}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, dateOfFirstContact: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="gov-field">
                    <GovInput
                      label="Proposed Location District *"
                      value={assessmentForm.proposedLocationDistrict}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, proposedLocationDistrict: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="gov-field">
                    <GovInput
                      label="Indicative Budget *"
                      type="number"
                      value={assessmentForm.indicativeBudget}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, indicativeBudget: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="gov-field">
                    <GovInput
                      label="Suggested Nodal Officer Domain *"
                      placeholder="Example: School Education, Health, Water Supply"
                      value={assessmentForm.suggestedNodalOfficerDomain}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, suggestedNodalOfficerDomain: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="gov-field full">
                    <GovTextarea
                      label="Contact Summary *"
                      value={assessmentForm.contactSummary}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, contactSummary: e.target.value }))}
                      rows={2}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="gov-field full">
                    <GovTextarea
                      label="Development Need Addressed *"
                      value={assessmentForm.developmentNeedAddressed}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, developmentNeedAddressed: e.target.value }))}
                      rows={3}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="gov-field full">
                    <GovTextarea
                      label="Summary of Interaction *"
                      value={assessmentForm.summaryOfInteraction}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, summaryOfInteraction: e.target.value }))}
                      rows={3}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  {FEASIBILITY_CHECKLIST.map((item, index) => (
                    <div 
                      key={item.itemNumber} 
                      style={{ 
                        padding: 16, 
                        borderBottom: "1px solid var(--gov-border)",
                        background: index % 2 === 0 ? "var(--gov-surface-muted)" : "white"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 12, flex: 1 }}>
                          <span style={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: "50%", 
                            background: "var(--gov-primary)", 
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {item.itemNumber}
                          </span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.question}</div>
                            <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                              <span style={{ fontSize: 11, color: "var(--gov-text-muted)" }}>{item.dimension}</span>
                              {item.isCritical && <GovStatusBadge variant="danger">Critical</GovStatusBadge>}
                            </div>
                          </div>
                        </div>
                        <div style={{ minWidth: 200 }}>
                          <GovSelect
                            value={feasibilityForm[String(item.itemNumber)]?.response || ""}
                            onChange={(e) => handleFeasibilityChange(String(item.itemNumber), "response", e.target.value)}
                            required
                            disabled={isReadOnly}
                          >
                            {RESPONSE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </GovSelect>
                        </div>
                      </div>
                      <div style={{ marginLeft: 36 }}>
                        <GovTextarea
                          placeholder={item.isCritical ? "Add remarks, especially for NO or N/A" : "Add notes (optional)"}
                          value={feasibilityForm[String(item.itemNumber)]?.notes || ""}
                          onChange={(e) => handleFeasibilityChange(String(item.itemNumber), "notes", e.target.value)}
                          rows={2}
                          style={{ fontSize: 13 }}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "2px solid var(--gov-border)", paddingTop: 24 }}>
                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <GovSelect
                        label="Feasibility Result *"
                        value={assessmentForm.feasibilityResult}
                        onChange={(e) => setAssessmentForm((prev) => ({ ...prev, feasibilityResult: e.target.value as typeof assessmentForm.feasibilityResult }))}
                        required
                        disabled={isReadOnly}
                      >
                        <option value="FEASIBLE">Feasible - recommend Proceed</option>
                        <option value="PROCEED_WITH_CONDITIONS">Proceed with Conditions</option>
                        <option value="NOT_FEASIBLE">Not Feasible - Do Not Proceed</option>
                      </GovSelect>
                    </div>
                    {assessmentForm.feasibilityResult === "PROCEED_WITH_CONDITIONS" && (
                      <div className="gov-field full">
                        <GovTextarea
                          label="Conditions to Fix Critical Gap *"
                          placeholder="Example: site clearance required, scope/budget revision needed..."
                          value={assessmentForm.conditionText}
                          onChange={(e) => setAssessmentForm((prev) => ({ ...prev, conditionText: e.target.value }))}
                          rows={3}
                          required
                          disabled={isReadOnly}
                        />
                      </div>
                    )}
                    <div className="gov-field full">
                      <GovTextarea
                        label="RM Recommendation *"
                        placeholder="Provide your overall recommendation for this CSR enquiry..."
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        rows={4}
                        required
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="gov-field full">
                      <GovTextarea
                        label="Additional Notes"
                        placeholder="Any additional observations or notes..."
                        value={rmNotes}
                        onChange={(e) => setRmNotes(e.target.value)}
                        rows={3}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
                    <div style={{ fontSize: 13, color: "var(--gov-text-muted)" }}>
                      {allChecklistComplete ? (
                        <span style={{ color: "var(--gov-success)", display: "flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle size={16} /> All 13 items completed
                        </span>
                      ) : (
                        <span style={{ color: "var(--gov-warning)" }}>
                          {13 - Object.values(feasibilityForm).filter(item => item.response).length} items pending
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {!isReadOnly ? (
                        <GovButton variant="secondary" onClick={() => { setError(null); setShowSubmitModal(true); }} disabled={!allChecklistComplete}>
                          <Save size={16} />
                          Save & Submit to JS
                        </GovButton>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--gov-success)" }}>
                          <CheckCircle size={18} />
                          <span style={{ fontWeight: 600 }}>Feasibility assessment has been submitted to Joint Secretary</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GovCardBody>
            </GovCard>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status Card */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Current Status</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ textAlign: "center" }}>
                <GovStatusBadge variant={getStatusVariant(enquiry.status)} style={{ fontSize: 14, padding: "6px 16px" }}>
                  {enquiry.status.replace(/_/g, " ")}
                </GovStatusBadge>
                <div style={{ marginTop: 16, fontSize: 13 }}>
                  <div style={{ color: "var(--gov-text-muted)" }}>Submitted</div>
                  <div style={{ fontWeight: 600 }}>{formatDate(enquiry.submittedAt)}</div>
                </div>
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <div style={{ color: "var(--gov-text-muted)" }}>SLA Due</div>
                  <div style={{ fontWeight: 600, color: new Date(enquiry.slaDue) < new Date() ? "var(--gov-danger)" : "inherit" }}>
                    {formatDate(enquiry.slaDue)}
                  </div>
                </div>
              </div>
            </GovCardBody>
          </GovCard>

          {/* Relationship Manager Card */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Relationship Manager</GovCardTitle>
            </GovCardHeader>
            <GovCardBody style={{ fontSize: 13 }}>
              {enquiry.assignedRelationshipManager ? (
                <div>
                  <div style={{ color: "var(--gov-text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
                    <User size={16} />
                    <span>{enquiry.assignedRelationshipManager.email}</span>
                  </div>
                  {isAssigner && (
                    <div style={{ marginTop: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--gov-text-muted)", display: "block", marginBottom: 6 }}>REASSIGN MANAGER</label>
                      <GovSelect
                        value={selectedRmId}
                        onChange={(e) => setSelectedRmId(e.target.value)}
                        style={{ fontSize: 13, marginBottom: 8 }}
                      >
                        <option value="">Select Relationship Manager</option>
                        {relationshipManagers.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.email} {rm.assignedDistrict ? `(${rm.assignedDistrict})` : ""}
                          </option>
                        ))}
                      </GovSelect>
                      <GovButton 
                        variant="secondary" 
                        onClick={handleAssignRM} 
                        disabled={assigning || !selectedRmId}
                        style={{ width: "100%", minHeight: 32, fontSize: 12 }}
                      >
                        {assigning ? "Assigning..." : "Reassign RM"}
                      </GovButton>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ color: "var(--gov-danger)", fontWeight: 600, marginBottom: 12 }}>
                    ⚠️ Not Assigned
                  </div>
                  {isAssigner ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <GovSelect
                        value={selectedRmId}
                        onChange={(e) => setSelectedRmId(e.target.value)}
                        style={{ fontSize: 13 }}
                      >
                        <option value="">Select Relationship Manager</option>
                        {relationshipManagers.map((rm) => (
                          <option key={rm.id} value={rm.id}>
                            {rm.email} {rm.assignedDistrict ? `(${rm.assignedDistrict})` : ""}
                          </option>
                        ))}
                      </GovSelect>
                      <GovButton 
                        variant="primary" 
                        onClick={handleAssignRM} 
                        disabled={assigning || !selectedRmId}
                        style={{ width: "100%", minHeight: 32, fontSize: 12 }}
                      >
                        {assigning ? "Assigning..." : "Assign RM"}
                      </GovButton>
                    </div>
                  ) : currentUser?.role === "CSR_RELATIONSHIP_MANAGER" ? (
                    <GovButton 
                      variant="primary" 
                      onClick={handleClaimEnquiry} 
                      disabled={assigning}
                      style={{ width: "100%", minHeight: 32, fontSize: 12 }}
                    >
                      {assigning ? "Claiming..." : "Claim Enquiry"}
                    </GovButton>
                  ) : (
                    <span style={{ color: "var(--gov-text-muted)" }}>Awaiting assignment by State Cell / Admin.</span>
                  )}
                </div>
              )}
            </GovCardBody>
          </GovCard>

          {/* JS Decision */}
          {enquiry.jsDecision && (
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Joint Secretary Decision</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                <GovStatusBadge 
                  variant={enquiry.jsDecision === "APPROVED" || enquiry.jsDecision === "APPROVED_WITH_CONDITIONS" ? "success" : "danger"}
                  style={{ marginBottom: 12 }}
                >
                  {enquiry.jsDecision.replace(/_/g, " ")}
                </GovStatusBadge>
                {enquiry.jsConditions && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--gov-text-muted)", marginBottom: 4 }}>Conditions:</div>
                    <div style={{ fontSize: 13 }}>{enquiry.jsConditions}</div>
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--gov-text-muted)" }}>
                  Decided on: {formatDate(enquiry.jsDecisionDate || "")}
                </div>
              </GovCardBody>
            </GovCard>
          )}

          {/* Quick Actions */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Quick Actions</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <GovButton variant="secondary" style={{ justifyContent: "flex-start" }}>
                  <Phone size={16} />
                  Call Company
                </GovButton>
                <GovButton variant="secondary" style={{ justifyContent: "flex-start" }}>
                  <Mail size={16} />
                  Send Email
                </GovButton>
                <GovButton variant="muted" style={{ justifyContent: "flex-start" }}>
                  <Calendar size={16} />
                  Schedule Meeting
                </GovButton>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: 8,
            maxWidth: 500,
            width: "90%",
            padding: 24,
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>
              Submit Feasibility Assessment to Joint Secretary
            </h3>
            {error && (
              <div style={{ marginBottom: 16 }}>
                <GovAlert variant="danger">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={18} />
                    <span style={{ fontSize: 13 }}>{error}</span>
                  </div>
                </GovAlert>
              </div>
            )}
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--gov-text-secondary)" }}>
              You are about to submit the feasibility assessment for <strong>{enquiry.company.name}</strong> to the Joint Secretary for review.
            </p>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Summary:</div>
              <ul style={{ fontSize: 13, color: "var(--gov-text-secondary)", margin: 0, paddingLeft: 20 }}>
                <li>13-point checklist: {allChecklistComplete ? "Complete" : "Incomplete"}</li>
                <li>Recommendation provided: {recommendation ? "Yes" : "No"}</li>
              </ul>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <GovButton variant="muted" onClick={() => { setShowSubmitModal(false); setError(null); }}>Cancel</GovButton>
              <GovButton 
                variant="primary" 
                onClick={handleSubmitFeasibility}
                disabled={submitFeasibilityMutation.isPending || !allChecklistComplete}
              >
                {submitFeasibilityMutation.isPending ? "Submitting..." : "Confirm & Submit"}
              </GovButton>
            </div>
          </div>
        </div>
      )}
    </GovPortalLayout>
  );
}
