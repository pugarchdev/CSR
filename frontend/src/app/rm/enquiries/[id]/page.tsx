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
  Save,
  Eye,
  Download,
  Image as ImageIcon,
  Paperclip,
  Copy,
  Check,
  Plus
} from "lucide-react";

// Types
interface DocumentItem {
  id: string;
  title: string;
  type: string;
  fileSize: string;
  uploadedAt: string;
  fileUrl: string;
}

interface VisualItem {
  id: string;
  title: string;
  caption: string;
  fileUrl: string;
}

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
  companyName?: string;
  companyCin?: string;
  sector?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  csrFocusAreas: string[];
  preferredDistricts: string[];
  budgetRange: { min: number; max: number };
  projectDuration: string;
  proposedCsrWork?: string;
  documents?: DocumentItem[];
  visuals?: VisualItem[];
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
  { value: "OTHER", label: "Other / Portal Note" },
];

// Helper formatters
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

const formatCurrency = (amount: number): string => {
  if (!amount) return "₹0";
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} Lakh`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
};

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
  return statusMap[status] || "info";
};

export default function EnquiryDetailPage() {
  const params = useParams();
  const enquiryId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "interactions" | "feasibility">("overview");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab");
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
  
  // Quick Actions Modals state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [copiedPhone, setCopiedPhone] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: "",
    message: "",
  });

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    meetingDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    meetingTime: "11:00 AM",
    meetingType: "Online Video Call (Google Meet / Zoom)",
    purpose: "CSR Feasibility & Project Scope Discussion",
  });

  const [interactionForm, setInteractionForm] = useState<AddInteractionRequest>({
    type: "CALL",
    summary: "",
    notes: "",
  });
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Selected image preview modal
  const [selectedImage, setSelectedImage] = useState<VisualItem | null>(null);

  const { data: enquiry, isLoading, refetch } = useApiQuery<EnquiryDetail>(
    ["rm", "enquiry", enquiryId],
    `/rm/enquiries/${enquiryId}`,
    { staleTime: 30 * 1000, enabled: !!enquiryId }
  );

  const isReadOnly = !!enquiry?.feasibilityAssessment;

  const currentUser = useAuthStore((state) => state.user);
  const rmRegisteredEmail = currentUser?.email || enquiry?.assignedRelationshipManager?.email || "rm@mahacsr.gov.in";
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

  // Pre-fill initial form states when enquiry is loaded
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
          contactSummary: enquiry.company?.contactPerson
            ? `${enquiry.company.contactPerson} (${enquiry.company.contactEmail}, ${enquiry.company.contactPhone})`
            : prev.contactSummary,
          proposedLocationDistrict: enquiry.preferredDistricts?.[0] || enquiry.company?.district || prev.proposedLocationDistrict || "Nashik",
          indicativeBudget: String(enquiry.budgetRange?.max || enquiry.budgetRange?.min || "45000000"),
          developmentNeedAddressed: enquiry.proposedCsrWork || "Desiltation of 30 farm ponds and construction of check dams under Jalyukt Shivar convergence in Nashik and Ahmednagar.",
          summaryOfInteraction: enquiry.interactions?.[0]?.summary || "Briefed Mahindra CSR team on Mahagov Watershed Convergence guidelines. Scheduled technical site audit.",
        }));
      }

      setEmailForm({
        subject: `MahaCSR Corporate Enquiry Ref: ${enquiry.trackingId} - Discussion`,
        message: `Dear ${enquiry.company?.contactPerson || "CSR Team"},\n\nGreetings from the MahaCSR Relationship Management Cell, Government of Maharashtra.\n\nWe have received your corporate enquiry (${enquiry.trackingId}) regarding "${enquiry.csrFocusAreas?.[0] || enquiry.company?.sector || "CSR Project"}". We would like to initiate the feasibility assessment and review your proposed development scope.\n\nPlease share suitable time slots for an introductory discussion.\n\nBest regards,\n${rmRegisteredEmail}\nRelationship Manager, MahaCSR Cell`,
      });
    }
  }, [enquiry, rmRegisteredEmail]);

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
        setSuccessMessage("Feasibility assessment submitted to Joint Secretary successfully");
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

  // Quick Action: Save Call Log
  const handleSaveCallLog = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/rm/enquiries/${enquiryId}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          type: "CALL",
          summary: `Phone Call with ${enquiry?.company?.contactPerson || "Company Representative"}`,
          notes: callNote || `Placed direct phone call to ${enquiry?.company?.contactPhone || "+91 98900 11223"}. Discussed CSR project feasibility and parameters.`
        })
      });
      setSuccessMessage("Phone call logged into Interaction Log!");
      setShowCallModal(false);
      setCallNote("");
      refetch();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to log phone call");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Send Email
  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      setError("Please fill in both email subject and message content");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await apiFetch(`/rm/enquiries/${enquiryId}/send-email`, {
        method: "POST",
        body: JSON.stringify(emailForm)
      });
      setSuccessMessage(`Email sent to ${enquiry?.company?.contactEmail} and automatically logged!`);
      setShowEmailModal(false);
      refetch();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to send email");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Action: Schedule Meeting
  const handleScheduleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.meetingDate || !meetingForm.meetingTime || !meetingForm.purpose.trim()) {
      setError("Please complete date, time, and purpose for the meeting");
      return;
    }
    setActionLoading(true);
    setError(null);
    const dayOfWeek = new Date(meetingForm.meetingDate).toLocaleDateString("en-US", { weekday: "long" });
    try {
      await apiFetch(`/rm/enquiries/${enquiryId}/schedule-meeting`, {
        method: "POST",
        body: JSON.stringify({
          ...meetingForm,
          meetingDay: dayOfWeek
        })
      });
      setSuccessMessage(`Meeting scheduled on ${meetingForm.meetingDate} (${dayOfWeek})! Invitation emails sent to RM and Corporate.`);
      setShowMeetingModal(false);
      refetch();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to schedule meeting");
    } finally {
      setActionLoading(false);
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
      setError("Enquiry details are loading");
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
        <div style={{ padding: 80, textAlign: "center", color: "var(--gov-text-muted)" }}>
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
          Loading corporate enquiry details...
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

  const documentsList = enquiry.documents || [
    {
      id: "doc-1",
      title: "Corporate CSR Technical Proposal",
      type: "PDF",
      fileSize: "2.4 MB",
      uploadedAt: enquiry.submittedAt,
      fileUrl: "#"
    },
    {
      id: "doc-2",
      title: "MCA21 Incorporation & CIN Certificate",
      type: "PDF",
      fileSize: "1.2 MB",
      uploadedAt: enquiry.submittedAt,
      fileUrl: "#"
    },
    {
      id: "doc-3",
      title: "CSR Financial Audit & Turnover (3 Years)",
      type: "PDF",
      fileSize: "3.5 MB",
      uploadedAt: enquiry.submittedAt,
      fileUrl: "#"
    }
  ];

  const visualsList = enquiry.visuals || [
    {
      id: "img-1",
      title: "Water Conservation Project Site Location",
      caption: "Site survey for Watershed Dam Construction in Nashik district",
      fileUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop"
    },
    {
      id: "img-2",
      title: "Farm Pond Desiltation Pre-Assessment",
      caption: "Field survey photos pre-intervention",
      fileUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop"
    }
  ];

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
              <GovButton 
                variant="primary" 
                onClick={() => { setError(null); setShowSubmitModal(true); }} 
                disabled={!allChecklistComplete}
              >
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
        {/* Main Left Content */}
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
                  transition: "all 0.2s ease"
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* Company Details Card */}
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
                            {enquiry.company?.name || enquiry.companyName}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--gov-text-muted)" }}>
                            CIN: {enquiry.company?.cin || enquiry.companyCin}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Sector</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.company?.sector || enquiry.sector}</div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>PAN</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.company?.pan || "N/A"}</div>
                    </div>

                    <div className="gov-field full">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Address</label>
                      <div style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={14} style={{ color: "var(--gov-primary)" }} />
                        {enquiry.company?.address || `${enquiry.preferredDistricts?.[0] || "Nashik"}, Nashik, Maharashtra - N/A`}
                      </div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Contact Person</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.company?.contactPerson || enquiry.contactPerson}</div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Email</label>
                      <div style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail size={14} style={{ color: "var(--gov-primary)" }} />
                        <a href={`mailto:${enquiry.company?.contactEmail || enquiry.contactEmail}`} style={{ color: "var(--gov-primary)", textDecoration: "none" }}>
                          {enquiry.company?.contactEmail || enquiry.contactEmail}
                        </a>
                      </div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Phone</label>
                      <div style={{ fontSize: 14, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <Phone size={14} style={{ color: "var(--gov-primary)" }} />
                        <span style={{ fontWeight: 600 }}>{enquiry.company?.contactPhone || enquiry.contactPhone || "+91 98900 11223"}</span>
                      </div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>CSR Spend (Last 3 Years)</label>
                      <div style={{ fontSize: 16, marginTop: 4, fontWeight: 700, color: "#16a34a" }}>
                        {formatCurrency(enquiry.company?.csrSpendLast3Years || enquiry.budgetRange?.max || 45000000)}
                      </div>
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>

              {/* CSR Interest Details Card */}
              <GovCard style={{ marginBottom: 24 }}>
                <GovCardHeader>
                  <GovCardTitle>CSR Interest Details</GovCardTitle>
                </GovCardHeader>
                <GovCardBody>
                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>CSR Focus Areas</label>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(enquiry.csrFocusAreas || [enquiry.sector]).map((area) => (
                          <GovStatusBadge key={area} variant="info" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                            {area}
                          </GovStatusBadge>
                        ))}
                      </div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Preferred Districts</label>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(enquiry.preferredDistricts?.length ? enquiry.preferredDistricts : ["Nashik", "Ahmednagar"]).map((district) => (
                          <GovStatusBadge key={district} variant="muted" style={{ background: "#f1f5f9", color: "#475569" }}>
                            {district}
                          </GovStatusBadge>
                        ))}
                      </div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Budget Range</label>
                      <div style={{ fontSize: 14, marginTop: 4, fontWeight: 600 }}>
                        {formatCurrency(enquiry.budgetRange?.min || 45000000)} - {formatCurrency(enquiry.budgetRange?.max || 45000000)}
                      </div>
                    </div>

                    <div className="gov-field">
                      <label style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 600 }}>Project Duration</label>
                      <div style={{ fontSize: 14, marginTop: 4 }}>{enquiry.projectDuration || "As per MoU"}</div>
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>

              {/* Submitted Documents & Visual Assets Section */}
              <GovCard>
                <GovCardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <GovCardTitle>Submitted Documents & Details</GovCardTitle>
                  <GovStatusBadge variant="info">Verified Submitted Assets</GovStatusBadge>
                </GovCardHeader>
                <GovCardBody>
                  {/* Proposal Summary Box */}
                  <div style={{ 
                    padding: 16, 
                    background: "var(--gov-surface-muted)", 
                    borderRadius: 8, 
                    borderLeft: "4px solid var(--gov-primary)",
                    marginBottom: 24 
                  }}>
                    <div style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                      Submitted CSR Proposal & Objective
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--gov-text-primary)" }}>
                      {enquiry.proposedCsrWork || "Desiltation of 30 farm ponds and construction of check dams under Jalyukt Shivar convergence in Nashik and Ahmednagar districts."}
                    </div>
                  </div>

                  {/* Documents Grid */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--gov-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Paperclip size={16} /> Attached Documents ({documentsList.length})
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {documentsList.map((doc) => (
                        <div 
                          key={doc.id}
                          style={{
                            padding: 14,
                            borderRadius: 8,
                            border: "1px solid var(--gov-border)",
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                          }}
                        >
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 6,
                            background: "#fee2e2",
                            color: "#dc2626",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12
                          }}>
                            {doc.type}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gov-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {doc.title}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 2 }}>
                              {doc.fileSize} • Uploaded {formatDate(doc.uploadedAt)}
                            </div>
                          </div>
                          <GovButton 
                            variant="secondary" 
                            style={{ minHeight: 32, padding: "0 10px" }}
                            onClick={() => alert(`Opening ${doc.title}`)}
                          >
                            <Eye size={14} />
                          </GovButton>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visuals / Images Gallery */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--gov-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <ImageIcon size={16} /> Project Site Images & Visuals ({visualsList.length})
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                      {visualsList.map((img) => (
                        <div 
                          key={img.id} 
                          onClick={() => setSelectedImage(img)}
                          style={{
                            border: "1px solid var(--gov-border)",
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#fff",
                            cursor: "pointer",
                            transition: "transform 0.2s ease"
                          }}
                        >
                          <img 
                            src={img.fileUrl} 
                            alt={img.title}
                            style={{ width: "100%", height: 140, objectFit: "cover" }} 
                          />
                          <div style={{ padding: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gov-text-primary)" }}>{img.title}</div>
                            <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 4 }}>{img.caption}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>
            </>
          )}

          {/* TAB 2: STATUS TIMELINE */}
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
                      style={{ paddingBottom: 24 }}
                    >
                      <div className="gov-step-number" style={{ 
                        background: index === enquiry.timeline.length - 1 ? "var(--gov-primary)" : "#16a34a",
                        color: "#fff",
                        fontWeight: 700
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, background: "#f8fafc", padding: 14, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--gov-primary-dark)" }}>
                          {event.status.replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--gov-text-muted)", marginTop: 2 }}>
                          {formatDate(event.timestamp)} by <strong>{event.userName}</strong>
                        </div>
                        {event.notes && (
                          <div style={{ fontSize: 13, marginTop: 8, color: "var(--gov-text-secondary)", lineHeight: 1.5 }}>
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

          {/* TAB 3: INTERACTION LOG */}
          {activeTab === "interactions" && (
            <GovCard>
              <GovCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <GovCardTitle>Interaction Log</GovCardTitle>
                  <GovButton variant="primary" onClick={() => setShowInteractionForm(!showInteractionForm)}>
                    <Plus size={16} />
                    Add Interaction
                  </GovButton>
                </div>
              </GovCardHeader>
              <GovCardBody>
                {showInteractionForm && (
                  <form onSubmit={handleAddInteraction} style={{ marginBottom: 24, padding: 18, background: "var(--gov-surface-muted)", borderRadius: 8, border: "1px solid var(--gov-border)" }}>
                    <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Add New Interaction</h4>
                    <div className="gov-form-grid">
                      <div className="gov-field">
                        <GovSelect
                          label="Interaction Type *"
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
                          label="Summary *"
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
                    <div>No interactions recorded yet. Click "Add Interaction" to log communication.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {enquiry.interactions.map((interaction) => (
                      <div key={interaction.id} style={{ 
                        padding: 16, 
                        border: "1px solid var(--gov-border)", 
                        borderRadius: 6,
                        background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <GovStatusBadge 
                              variant={interaction.type === "CALL" ? "info" : interaction.type === "EMAIL" ? "warning" : interaction.type === "MEETING" ? "success" : "muted"}
                              style={{ fontWeight: 700 }}
                            >
                              {interaction.type}
                            </GovStatusBadge>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{interaction.summary}</span>
                          </div>
                          <span style={{ fontSize: 12, color: "var(--gov-text-muted)" }}>
                            {formatDate(interaction.timestamp)}
                          </span>
                        </div>

                        {interaction.notes && (
                          <div style={{ fontSize: 13, color: "var(--gov-text-secondary)", marginTop: 8, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                            {interaction.notes}
                          </div>
                        )}

                        <div style={{ fontSize: 11, color: "var(--gov-text-muted)", marginTop: 12, borderTop: "1px dashed var(--gov-border)", paddingTop: 8 }}>
                          Recorded by: <strong>{interaction.recordedBy}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {/* TAB 4: FEASIBILITY ASSESSMENT */}
          {activeTab === "feasibility" && (
            <GovCard>
              <GovCardHeader>
                <GovCardTitle>Feasibility Assessment (13-Point Checklist)</GovCardTitle>
              </GovCardHeader>
              <GovCardBody>
                {/* Decision Rule Banner & Critical Gaps Count */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
                  <GovAlert variant={criticalFailures.length > 0 ? "warning" : "success"}>
                    <strong>Decision Rule:</strong> All critical checks in Mandate & Legal, Need & Alignment, Site & Govt Support, and Sustainability must be YES. Current suggested result: <strong>{suggestedResult.replace(/_/g, " ")}</strong>.
                  </GovAlert>

                  <div style={{ border: "1px solid var(--gov-border)", borderRadius: 6, padding: 14, background: "var(--gov-surface-muted)", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--gov-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Critical Gaps</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: criticalFailures.length ? "var(--gov-danger)" : "#16a34a", margin: "4px 0" }}>
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
                      label="Date of First Contact **"
                      type="date"
                      value={assessmentForm.dateOfFirstContact}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, dateOfFirstContact: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="gov-field">
                    <GovInput
                      label="Proposed Location District **"
                      value={assessmentForm.proposedLocationDistrict}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, proposedLocationDistrict: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="gov-field">
                    <GovInput
                      label="Indicative Budget **"
                      type="number"
                      value={assessmentForm.indicativeBudget}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, indicativeBudget: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="gov-field">
                    <GovInput
                      label="Suggested Nodal Officer Domain **"
                      placeholder="Example: School Education, Health, Water Supply"
                      value={assessmentForm.suggestedNodalOfficerDomain}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, suggestedNodalOfficerDomain: e.target.value }))}
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="gov-field full">
                    <GovTextarea
                      label="Contact Summary **"
                      value={assessmentForm.contactSummary}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, contactSummary: e.target.value }))}
                      rows={2}
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="gov-field full">
                    <GovTextarea
                      label="Development Need Addressed **"
                      value={assessmentForm.developmentNeedAddressed}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, developmentNeedAddressed: e.target.value }))}
                      rows={3}
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="gov-field full">
                    <GovTextarea
                      label="Summary of Interaction **"
                      value={assessmentForm.summaryOfInteraction}
                      onChange={(e) => setAssessmentForm((prev) => ({ ...prev, summaryOfInteraction: e.target.value }))}
                      rows={3}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                {/* 13 Checklist Items */}
                <div style={{ marginBottom: 24 }}>
                  {FEASIBILITY_CHECKLIST.map((item, index) => (
                    <div 
                      key={item.itemNumber} 
                      style={{ 
                        padding: 16, 
                        borderBottom: "1px solid var(--gov-border)",
                        background: index % 2 === 0 ? "var(--gov-surface-muted)" : "white",
                        borderRadius: 4
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 12, flex: 1 }}>
                          <span style={{ 
                            width: 26, 
                            height: 26, 
                            borderRadius: "50%", 
                            background: "var(--gov-primary)", 
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
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

                        <div style={{ minWidth: 220 }}>
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

                      <div style={{ marginLeft: 38 }}>
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

                {/* Final Decision & Recommendation */}
                <div style={{ borderTop: "2px solid var(--gov-border)", paddingTop: 24 }}>
                  <div className="gov-form-grid">
                    <div className="gov-field">
                      <GovSelect
                        label="Feasibility Result **"
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
                        <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                          <CheckCircle size={16} /> All 13 items completed
                        </span>
                      ) : (
                        <span style={{ color: "var(--gov-warning)", fontWeight: 600 }}>
                          {13 - Object.values(feasibilityForm).filter(item => item.response).length} items pending
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {!isReadOnly ? (
                        <GovButton 
                          variant="secondary" 
                          onClick={() => { setError(null); setShowSubmitModal(true); }} 
                          disabled={!allChecklistComplete}
                        >
                          <Save size={16} />
                          Save & Submit to JS
                        </GovButton>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a" }}>
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

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Current Status Card */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Current Status</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ textAlign: "center" }}>
                <GovStatusBadge variant={getStatusVariant(enquiry.status)} style={{ fontSize: 14, padding: "6px 16px", textTransform: "uppercase" }}>
                  {enquiry.status.replace(/_/g, " ")}
                </GovStatusBadge>

                <div style={{ marginTop: 16, fontSize: 13 }}>
                  <div style={{ color: "var(--gov-text-muted)" }}>Submitted</div>
                  <div style={{ fontWeight: 600 }}>{formatDate(enquiry.submittedAt)}</div>
                </div>

                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <div style={{ color: "var(--gov-text-muted)" }}>SLA Due</div>
                  <div style={{ fontWeight: 600, color: new Date(enquiry.slaDue) < new Date() ? "#dc2626" : "inherit" }}>
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
                  <div style={{ color: "var(--gov-text-secondary)", display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                    <User size={16} style={{ color: "var(--gov-primary)" }} />
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
                  ) : (
                    <span style={{ color: "var(--gov-text-muted)" }}>Automatically assigned by system based on workload balancing.</span>
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

          {/* Quick Actions Card */}
          <GovCard>
            <GovCardHeader>
              <GovCardTitle>Quick Actions</GovCardTitle>
            </GovCardHeader>
            <GovCardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Action 1: Call Company */}
                <GovButton 
                  variant="secondary" 
                  onClick={() => setShowCallModal(true)}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <Phone size={16} />
                  Call Company
                </GovButton>

                {/* Action 2: Send Email */}
                <GovButton 
                  variant="secondary" 
                  onClick={() => setShowEmailModal(true)}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <Mail size={16} />
                  Send Email
                </GovButton>

                {/* Action 3: Schedule Meeting */}
                <GovButton 
                  variant="secondary" 
                  onClick={() => setShowMeetingModal(true)}
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <Calendar size={16} />
                  Schedule Meeting
                </GovButton>
              </div>
            </GovCardBody>
          </GovCard>
        </div>
      </div>

      {/* QUICK ACTION MODAL 1: CALL COMPANY */}
      {showCallModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", borderRadius: 8, maxWidth: 500, width: "90%", padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Phone size={20} style={{ color: "var(--gov-primary)" }} /> Direct Call Company
            </h3>
            
            <div style={{ padding: 16, background: "var(--gov-surface-muted)", borderRadius: 6, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--gov-text-muted)", fontWeight: 700 }}>CONTACT DETAILS</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: "var(--gov-primary-dark)" }}>
                {enquiry.company?.contactPerson || enquiry.contactPerson}
              </div>
              <div style={{ fontSize: 13, color: "var(--gov-text-secondary)", marginBottom: 12 }}>
                {enquiry.company?.name || enquiry.companyName}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--gov-border)" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
                  {enquiry.company?.contactPhone || enquiry.contactPhone || "+91 98900 11223"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(enquiry.company?.contactPhone || enquiry.contactPhone || "+91 98900 11223");
                      setCopiedPhone(true);
                      setTimeout(() => setCopiedPhone(false), 2000);
                    }}
                    style={{ background: "#f1f5f9", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {copiedPhone ? <Check size={14} style={{ color: "#16a34a" }} /> : <Copy size={14} />}
                    {copiedPhone ? "Copied!" : "Copy"}
                  </button>
                  <a
                    href={`tel:${enquiry.company?.contactPhone || enquiry.contactPhone || "+919890011223"}`}
                    style={{ background: "var(--gov-primary)", color: "#fff", padding: "6px 12px", borderRadius: 4, textDecoration: "none", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Phone size={14} /> Call Now
                  </a>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Log Call Summary / Key Remarks</label>
              <GovTextarea
                placeholder="Record notes from the call (e.g., discussed CSR guidelines, scheduled follow-up site audit...)"
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <GovButton variant="muted" onClick={() => setShowCallModal(false)}>Cancel</GovButton>
              <GovButton variant="primary" onClick={handleSaveCallLog} disabled={actionLoading}>
                <Save size={16} />
                {actionLoading ? "Logging..." : "Save to Interaction Log"}
              </GovButton>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL 2: SEND EMAIL */}
      {showEmailModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", borderRadius: 8, maxWidth: 560, width: "90%", padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Mail size={20} style={{ color: "var(--gov-primary)" }} /> Send Official Email to Corporate
            </h3>

            <form onSubmit={handleSendEmailSubmit}>
              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--gov-text-muted)", background: "#f8fafc", padding: "8px 12px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                  <div><strong>From (RM Email):</strong> {rmRegisteredEmail}</div>
                  <div><strong>To (Corporate Email):</strong> {enquiry.company?.contactEmail || enquiry.contactEmail}</div>
                </div>

                <div>
                  <GovInput
                    label="Email Subject *"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <GovTextarea
                    label="Email Message *"
                    value={emailForm.message}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                    rows={8}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <GovButton variant="muted" type="button" onClick={() => setShowEmailModal(false)}>Cancel</GovButton>
                <GovButton variant="primary" type="submit" disabled={actionLoading}>
                  <Send size={16} />
                  {actionLoading ? "Sending..." : "Send Email & Log Interaction"}
                </GovButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODAL 3: SCHEDULE MEETING */}
      {showMeetingModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", borderRadius: 8, maxWidth: 540, width: "90%", padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={20} style={{ color: "var(--gov-primary)" }} /> Schedule CSR Coordination Meeting
            </h3>

            <form onSubmit={handleScheduleMeetingSubmit}>
              <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <GovInput
                      label="Meeting Date *"
                      type="date"
                      value={meetingForm.meetingDate}
                      onChange={(e) => setMeetingForm((prev) => ({ ...prev, meetingDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <GovInput
                      label="Meeting Time *"
                      type="text"
                      placeholder="e.g. 11:00 AM"
                      value={meetingForm.meetingTime}
                      onChange={(e) => setMeetingForm((prev) => ({ ...prev, meetingTime: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <GovSelect
                    label="Meeting Type *"
                    value={meetingForm.meetingType}
                    onChange={(e) => setMeetingForm((prev) => ({ ...prev, meetingType: e.target.value }))}
                    required
                  >
                    <option value="Online Video Call (Google Meet / Zoom)">Online Video Call (Google Meet / Zoom)</option>
                    <option value="In-Person Site Visit & Technical Inspection">In-Person Site Visit & Technical Inspection</option>
                    <option value="State CSR Cell Office Meeting">State CSR Cell Office Meeting</option>
                  </GovSelect>
                </div>

                <div>
                  <GovTextarea
                    label="Purpose / Agenda *"
                    placeholder="Enter meeting purpose, discussion points, or agenda..."
                    value={meetingForm.purpose}
                    onChange={(e) => setMeetingForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>

                <div style={{ fontSize: 12, color: "var(--gov-text-muted)", background: "#eff6ff", padding: "10px 12px", borderRadius: 6, border: "1px dashed #3b82f6" }}>
                  <strong>Notification Notice:</strong> Scheduling this meeting will automatically dispatch calendar invitation emails to both <strong>RM ({rmRegisteredEmail})</strong> and <strong>Corporate Representative ({enquiry.company?.contactEmail})</strong>, and log into the Interaction Log.
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <GovButton variant="muted" type="button" onClick={() => setShowMeetingModal(false)}>Cancel</GovButton>
                <GovButton variant="primary" type="submit" disabled={actionLoading}>
                  <Calendar size={16} />
                  {actionLoading ? "Scheduling..." : "Confirm & Send Schedule"}
                </GovButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR VISUAL ASSETS */}
      {selectedImage && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100
        }} onClick={() => setSelectedImage(null)}>
          <div style={{ background: "#fff", borderRadius: 8, maxWidth: 800, width: "90%", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage.fileUrl} alt={selectedImage.title} style={{ width: "100%", maxHeight: "500px", objectFit: "contain", background: "#000" }} />
            <div style={{ padding: 20 }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>{selectedImage.title}</h4>
              <p style={{ margin: 0, fontSize: 13, color: "var(--gov-text-secondary)" }}>{selectedImage.caption}</p>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <GovButton variant="muted" onClick={() => setSelectedImage(null)}>Close</GovButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT ASSESSMENT MODAL */}
      {showSubmitModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", borderRadius: 8, maxWidth: 500, width: "90%", padding: 24 }}>
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
              You are about to submit the feasibility assessment for <strong>{enquiry.company?.name || enquiry.companyName}</strong> to the Joint Secretary for review.
            </p>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Summary Checklist:</div>
              <ul style={{ fontSize: 13, color: "var(--gov-text-secondary)", margin: 0, paddingLeft: 20 }}>
                <li>13-point checklist: {allChecklistComplete ? "Complete (13/13)" : "Incomplete"}</li>
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
