"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch, API_BASE_URL, getAccessToken } from "@/lib/api";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import {
  Landmark,
  ArrowLeft,
  UploadCloud,
  Target,
  XCircle,
  CheckCircle2,
  Coins,
  MapPin,
  Calendar,
  Building2,
  Phone,
  Mail,
  UserCheck,
  FileText,
  ImageIcon,
  ShieldCheck,
  Award,
  Download,
  Eye,
  X,
  FileCheck2,
  Handshake,
  Lock,
  Share2,
  Check,
  Info,
  Copy,
  MessageCircle,
  Printer,
  Send
} from "lucide-react";

const money = (value: unknown) => {
  const amount = Number(value || 0);
  if (!amount) return "Not specified";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
};

export default function CSRRequirementDetail() {
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || (params?.tab as string) || "";
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [requirement, setRequirement] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Response forms states
  const [showApplyModal, setShowApplyModal] = useState(false);

  // NGO application form
  const [ngoForm, setNgoForm] = useState({
    proposedPlan: "",
    proposedTimeline: "",
    estimatedCost: "",
    teamDetails: "",
    pastExperience: "",
    proposalDocumentUrl: "",
    remarks: ""
  });
  const [submittingNgo, setSubmittingNgo] = useState(false);
  const [uploadingProposal, setUploadingProposal] = useState(false);

  // Agreement creation state
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    ngoId: "",
    companyId: "",
    fundingAmount: "",
    expectedStartDate: "",
    expectedCompletionDate: "",
    termsAndConditions: "",
    milestonePlan: [
      { milestoneName: "Tranche 1 - Mobilization", milestonePercentage: "30", amount: "0" },
      { milestoneName: "Tranche 2 - Midterm", milestonePercentage: "45", amount: "0" },
      { milestoneName: "Tranche 3 - Final Completion", milestonePercentage: "25", amount: "0" }
    ]
  });
  const [creatingAgreement, setCreatingAgreement] = useState(false);
  const [uploadingSignedAgreement, setUploadingSignedAgreement] = useState(false);

  // Progress submission state
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState({
    progressTitle: "",
    progressDescription: "",
    physicalProgressPercent: "0",
    financialUtilPercent: "0",
    photoUrls: [] as string[],
    challenges: "",
    nextSteps: ""
  });
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [uploadingProgressPhoto, setUploadingProgressPhoto] = useState(false);

  // Completion submission state
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    workCompletedSummary: "",
    finalCost: "",
    fundUtilizationSummary: "",
    beneficiaryCount: "",
    beneficiaryFeedback: "",
    beforePhotoUrls: [] as string[],
    afterPhotoUrls: [] as string[],
    certificateUrls: [] as string[]
  });
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  const fetchRequirementDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      let data: any;
      try {
        const res = await fetch(`${API_BASE_URL}/public/requirements/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load requirement details");
        const body = await res.json();
        data = body.data || body;
      } catch (err) {
        data = await apiFetch<any>(`/public/requirements/${id}`);
      }

      setRequirement(data);

      // Autofill forms
      setNgoForm(prev => ({ ...prev, estimatedCost: data.estimatedCost || data.approvedBudget || "" }));
      setAgreementForm(prev => ({
        ...prev,
        ngoId: data.ngoApplications?.find((a: any) => a.status === "SELECTED_BY_COMPANY")?.ngoId || "",
        companyId: data.companyInterests?.[0]?.companyId || "",
        fundingAmount: data.estimatedCost || data.approvedBudget || "",
        milestonePlan: prev.milestonePlan.map(m => ({
          ...m,
          amount: String(Number(data.estimatedCost || data.approvedBudget || 0) * Number(m.milestonePercentage) / 100)
        }))
      }));
      setCompletionForm(prev => ({ ...prev, finalCost: data.estimatedCost || data.approvedBudget || "", beneficiaryCount: data.beneficiaryCount || "" }));
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load requirement details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    fetchRequirementDetails();
  }, [id, fetchRequirementDetails]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "VERIFIED":
      case "MARKETPLACE_LISTED":
      case "AGREEMENT_SIGNED":
      case "COMPLETED":
        return "success";
      case "PENDING_VERIFICATION":
      case "FIELD_VERIFICATION_REQUIRED":
      case "AGREEMENT_PENDING":
        return "warning";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "DRAFT":
      default:
        return "muted";
    }
  };

  // NGO Upload
  const handleProposalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingProposal(true);
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setNgoForm(prev => ({ ...prev, proposalDocumentUrl: data.url }));
    } catch {
      alert("Failed to upload proposal document.");
    } finally {
      setUploadingProposal(false);
    }
  };

  // NGO Submit Application
  const handleNgoApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingNgo(true);
    try {
      await apiFetch("/ngo-applications", {
        method: "POST",
        body: JSON.stringify({
          csrRequirementId: id,
          ...ngoForm
        })
      });
      alert("Application submitted successfully!");
      setShowApplyModal(false);
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to submit application");
    } finally {
      setSubmittingNgo(false);
    }
  };

  // Build destination Corporate Enquiry URL with pre-filled marketplace project metadata
  const buildEnquiryUrl = (reqData: any) => {
    const p = new URLSearchParams();
    if (reqData?.title) p.set("projectTitle", reqData.title);
    const refCode = reqData?.trackingId || reqData?.projectCode || id;
    if (refCode) p.set("projectId", refCode);
    const dist = reqData?.district || (Array.isArray(reqData?.districts) ? reqData.districts[0] : "") || "";
    if (dist) p.set("district", dist);
    const budgetVal = reqData?.estimatedCost || reqData?.budgetRequested || reqData?.approvedBudget || "";
    if (budgetVal) p.set("budget", String(budgetVal));
    const sectorVal = reqData?.sector || reqData?.category || "";
    if (sectorVal) p.set("sector", sectorVal);
    const deptName = reqData?.organization?.name || reqData?.governmentOrganization?.name || "";
    if (deptName) p.set("departmentName", deptName);
    return `/partner/enquiries/new?${p.toString()}`;
  };

  // Company Express Interest Handler - seamlessly redirects to official Corporate Enquiry creation
  const handleExpressInterest = () => {
    const targetUrl = buildEnquiryUrl(requirement);
    router.push(targetUrl);
  };

  // Company Select NGO
  const handleSelectNgo = async (interestId: string, ngoAppId: string) => {
    if (!confirm("Are you sure you want to select this NGO as implementation partner? This will reject all other bids.")) return;
    try {
      await apiFetch(`/company-interests/${interestId}/select-ngo`, {
        method: "POST",
        body: JSON.stringify({ ngoApplicationId: ngoAppId })
      });
      alert("NGO selected successfully!");
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to select NGO");
    }
  };

  // Generate Agreement
  const handleGenerateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAgreement(true);
    try {
      await apiFetch("/agreements", {
        method: "POST",
        body: JSON.stringify({
          csrRequirementId: id,
          ...agreementForm
        })
      });

      // Also create milestone objects
      await apiFetch(`/csr-funds/requirement/${id}`, {
        method: "POST",
        body: JSON.stringify({
          milestones: agreementForm.milestonePlan
        })
      });

      alert("Agreement draft and fund milestones created successfully!");
      setShowAgreementForm(false);
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to generate agreement");
    } finally {
      setCreatingAgreement(false);
    }
  };

  // Upload signed agreement
  const handleSignedAgreementUpload = async (e: React.ChangeEvent<HTMLInputElement>, agreementId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingSignedAgreement(true);
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      // Update agreement status in backend
      await apiFetch(`/agreements/${agreementId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "SIGNED",
          signedDocumentUrl: data.url
        })
      });

      alert("Agreement signed and uploaded successfully!");
      fetchRequirementDetails();
    } catch {
      alert("Failed to upload signed agreement.");
    } finally {
      setUploadingSignedAgreement(false);
    }
  };

  // Update milestone status (FM_RELEASED)
  const handleReleaseMilestone = async (milestoneId: string) => {
    if (!confirm("Are you triggering milestone release payment? This signifies funds are disbursed.")) return;
    try {
      await apiFetch(`/csr-funds/${milestoneId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "FM_RELEASED",
          releaseDate: new Date()
        })
      });
      alert("Milestone funding released!");
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to release milestone");
    }
  };

  // Upload Progress photo
  const handleProgressPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingProgressPhoto(true);
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setProgressForm(prev => ({
        ...prev,
        photoUrls: [...prev.photoUrls, data.url]
      }));
    } catch {
      alert("Failed to upload progress photo.");
    } finally {
      setUploadingProgressPhoto(false);
    }
  };

  // Submit Progress Report
  const handleSubmitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProgress(true);
    try {
      await apiFetch("/progress-reports", {
        method: "POST",
        body: JSON.stringify({
          csrRequirementId: id,
          ...progressForm
        })
      });
      alert("Progress report submitted!");
      setShowProgressForm(false);
      setProgressForm({
        progressTitle: "",
        progressDescription: "",
        physicalProgressPercent: "0",
        financialUtilPercent: "0",
        photoUrls: [],
        challenges: "",
        nextSteps: ""
      });
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to submit progress");
    } finally {
      setSubmittingProgress(false);
    }
  };

  // Submit Completion Report
  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCompletion(true);
    try {
      await apiFetch(`/completions/requirement/${id}/submit`, {
        method: "POST",
        body: JSON.stringify(completionForm)
      });
      alert("Completion report submitted successfully!");
      setShowCompletionForm(false);
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to submit completion report");
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Generate Impact Report (Admin)
  const handleGenerateImpact = async () => {
    try {
      await apiFetch(`/completions/requirement/${id}/generate-impact`, {
        method: "POST"
      });
      alert("Impact report successfully generated with AI scorecard calculation!");
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to generate impact report");
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopySummary = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      const b = requirement?.estimatedCost || requirement?.budgetRequested || requirement?.approvedBudget || 0;
      const d = requirement?.district || (Array.isArray(requirement?.districts) ? requirement.districts[0] : "") || "Maharashtra";
      const t = requirement?.taluka || (Array.isArray(requirement?.talukas) ? requirement.talukas[0] : "") || "";
      const org = requirement?.departmentName || requirement?.organization?.name || requirement?.governmentOrganization?.name || "Government Body";
      const pTitle = requirement?.title || requirement?.needTitle || "Development Requirement";
      const pCode = requirement?.trackingId || requirement?.projectCode || requirement?.id?.slice(0, 8) || "REQ-CSR";

      const text = `🏛️ *MahaCSR Verified Development Requirement*\n\n📌 *Project:* ${pTitle}\n💰 *Requested Outlay:* ${money(b)}\n📍 *Location:* ${t ? `${t}, ` : ""}${d}\n🏢 *Organization:* ${org}\n📜 *Ref Code:* ${pCode}\n\n🔗 *Review & Express CSR Interest:*\n${url}`;
      navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    if (typeof window !== "undefined") {
      const url = encodeURIComponent(window.location.href);
      const b = requirement?.estimatedCost || requirement?.budgetRequested || requirement?.approvedBudget || 0;
      const d = requirement?.district || (Array.isArray(requirement?.districts) ? requirement.districts[0] : "") || "Maharashtra";
      const org = requirement?.departmentName || requirement?.organization?.name || requirement?.governmentOrganization?.name || "Government Body";
      const pTitle = requirement?.title || requirement?.needTitle || "Development Requirement";

      const msg = encodeURIComponent(`*MahaCSR Verified Requirement*\n\n*${pTitle}*\n💰 Outlay: ${money(b)}\n📍 District: ${d}\n🏢 Organization: ${org}\n\nReview & Express Interest: `);
      window.open(`https://api.whatsapp.com/send?text=${msg}${url}`, "_blank");
    }
  };

  const handleEmailShare = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      const b = requirement?.estimatedCost || requirement?.budgetRequested || requirement?.approvedBudget || 0;
      const d = requirement?.district || (Array.isArray(requirement?.districts) ? requirement.districts[0] : "") || "Maharashtra";
      const t = requirement?.taluka || (Array.isArray(requirement?.talukas) ? requirement.talukas[0] : "") || "";
      const org = requirement?.departmentName || requirement?.organization?.name || requirement?.governmentOrganization?.name || "Government Body";
      const pTitle = requirement?.title || requirement?.needTitle || "Development Requirement";
      const pCode = requirement?.trackingId || requirement?.projectCode || requirement?.id?.slice(0, 8) || "REQ-CSR";

      const subject = encodeURIComponent(`CSR Convergence Opportunity: ${pTitle} (${pCode})`);
      const body = encodeURIComponent(`Dear CSR Committee / Partner,\n\nHere is a verified government CSR requirement listed on Maharashtra CSR Setu:\n\nProject: ${pTitle}\nReference ID: ${pCode}\nSponsoring Organization: ${org}\nTarget District: ${d}${t ? ` (${t})` : ""}\nRequested Outlay: ${money(b)}\n\nYou can review the complete requirement scope and express corporate interest here:\n${url}\n\nRegards,\nMaharashtra CSR Convergence Platform`);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    }
  };

  const handleNativeShare = async () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      const pTitle = requirement?.title || requirement?.needTitle || "Development Requirement";
      const d = requirement?.district || (Array.isArray(requirement?.districts) ? requirement.districts[0] : "") || "Maharashtra";
      const b = requirement?.estimatedCost || requirement?.budgetRequested || requirement?.approvedBudget || 0;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `${pTitle} | MahaCSR Setu`,
            text: `Verified CSR Convergence Requirement: ${pTitle} in ${d}, Maharashtra (Outlay: ${money(b)}).`,
            url: url
          });
        } catch {
          // Cancelled
        }
      } else {
        handleCopyLink();
      }
    }
  };

  const handlePrintBrief = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // -------------------------------------------------------------
  // ROLE & LIFECYCLE CHECKS FOR TABS
  // -------------------------------------------------------------
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const isGovAuthority = isSuperAdmin || user?.role === "BENEFICIARY_AGENCY" || user?.role === "GOV_ADMIN" || user?.role === "DISTRICT_OFFICER" || user?.role === "NODAL_OFFICER";
  const isCompanyUser = user?.role === "COMPANY_ADMIN" || user?.role === "COMPANY_MEMBER" || user?.role === "CORPORATE_USER" || user?.role === "CSR_ADMIN" || Boolean(user?.companyId);
  const isCompanyLinkedToThis = Boolean(requirement?.companyInterests?.some((i: any) => i.companyId === user?.companyId));
  const isNgoLinkedToThis = Boolean(requirement?.ngoApplications?.some((a: any) => a.ngoId === user?.ngoId));
  const isSelectedNgo = Boolean(requirement?.ngoApplications?.some((a: any) => a.ngoId === user?.ngoId && a.status === "SELECTED_BY_COMPANY"));

  const isInExecution = ["NGO_SELECTED", "AGREEMENT_DRAFTED", "AGREEMENT_SIGNED", "IN_PROGRESS", "EXECUTION_STARTED", "COMPLETION_SUBMITTED", "COMPLETED"].includes(requirement?.status);

  // Management tab permissions
  const canViewNgoApplications = isGovAuthority || (isCompanyUser && (isCompanyLinkedToThis || isSuperAdmin));
  const canViewCompanyInterests = isGovAuthority;
  const canViewExecution = isInExecution && (isGovAuthority || isCompanyLinkedToThis || isNgoLinkedToThis || isSelectedNgo);

  const data = requirement || {};
  const photos = data.geoTaggedPhotos || data.photos || [];
  const hodDoc = data.hodApprovalDocUrl || data.declarationDocUrl || null;
  const supportingDocs = data.supportingDocuments || data.documentUrls || [];

  // Compute public discovery tabs
  const publicTabs = useMemo(() => [
    { id: "overview", label: "Overview & Need", icon: FileText },
    { id: "scope-impact", label: "Requirement Scope & Impact", icon: Award },
    { id: "governance", label: "Verification & Governance", icon: ShieldCheck },
    { id: "media-docs", label: `Media & Sanctions (${photos.length + (hodDoc ? 1 : 0) + supportingDocs.length})`, icon: ImageIcon }
  ], [photos.length, hodDoc, supportingDocs.length]);

  // Compute management tabs based on roles
  const managementTabs = useMemo(() => {
    const list: { id: string; label: string; icon: any; isManagement: boolean }[] = [];

    if (canViewNgoApplications) {
      list.push({
        id: "ngo-applications",
        label: `NGO Proposals (${data.ngoApplications?.length || 0})`,
        icon: Landmark,
        isManagement: true
      });
    }

    if (canViewCompanyInterests) {
      list.push({
        id: "company-interests",
        label: `Corporate Interests (${data.companyInterests?.length || 0})`,
        icon: Handshake,
        isManagement: true
      });
    }

    if (canViewExecution) {
      list.push(
        { id: "agreement", label: "Tripartite Agreement", icon: FileCheck2, isManagement: true },
        { id: "milestones", label: `Fund Milestones (${data.fundMilestones?.length || 0})`, icon: Coins, isManagement: true },
        { id: "progress", label: `Progress Logs (${data.progressReports?.length || 0})`, icon: Calendar, isManagement: true },
        { id: "impact", label: "Completion & Impact", icon: Target, isManagement: true }
      );
    }

    return list;
  }, [canViewNgoApplications, canViewCompanyInterests, canViewExecution, data.ngoApplications?.length, data.companyInterests?.length, data.fundMilestones?.length, data.progressReports?.length]);

  const allVisibleTabs = useMemo(() => [...publicTabs, ...managementTabs], [publicTabs, managementTabs]);

  // Ensure activeTab is valid
  useEffect(() => {
    if (allVisibleTabs.length > 0 && !allVisibleTabs.some(t => t.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [allVisibleTabs, activeTab]);

  if (loading) {
    return (
      <GovPortalLayout showSidebar={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </GovPortalLayout>
    );
  }

  if (error || !requirement) {
    return (
      <GovPortalLayout showSidebar={false}>
        <div className="p-8 max-w-xl mx-auto my-12 text-center space-y-4 rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <XCircle className="mx-auto text-rose-500" size={48} />
          <h2 className="text-xl font-extrabold text-slate-800">Requirement Not Found</h2>
          <p className="text-slate-600 text-xs">{error || "The requested development requirement could not be retrieved."}</p>
          <div className="pt-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 shadow-xs transition-all no-underline"
            >
              <ArrowLeft size={14} />
              <span>Back to Marketplace</span>
            </Link>
          </div>
        </div>
      </GovPortalLayout>
    );
  }

  // Extract variables strictly from pitch creation submission
  const trackingId = data.trackingId || data.projectCode || data.id?.slice(0, 8) || "REQ-CSR";
  const title = data.title || data.needTitle || "Community Development Requirement";
  const description = data.description || data.csrRequirement || data.detailedDescription || "No detailed description provided.";
  const departmentName = data.departmentName || data.department || data.organization?.name || data.governmentOrganization?.name || "Government Department";
  const officeName = data.officeName || data.districtOffice || "";
  const officialName = data.officialName || data.nodalOfficerName || data.designatedOfficialName || "";
  const designation = data.designation || data.nodalOfficerDesignation || "Designated Nodal Officer";
  const phone = data.phone || data.mobile || data.nodalOfficerPhone || data.contactNumber || "";
  const email = data.email || data.nodalOfficerEmail || data.contactEmail || "";
  const serviceClass = data.serviceClass || data.officialCadre || "";
  const district = data.district || (Array.isArray(data.districts) && data.districts.length > 0 ? data.districts.join(", ") : "") || "Maharashtra";
  const taluka = data.taluka || (Array.isArray(data.talukas) && data.talukas.length > 0 ? data.talukas.join(", ") : "") || data.block || "All Talukas";
  const division = data.division || (Array.isArray(data.divisions) && data.divisions.length > 0 ? data.divisions.join(", ") : "") || "Maharashtra State";
  const exactLocation = data.exactLocation || data.village || data.gramPanchayat || `${taluka}, ${district}`;
  const rawSector = data.sector || data.category || "";
  const sector = (rawSector && rawSector.toLowerCase() !== departmentName.toLowerCase()) ? rawSector : "COMMUNITY_DEVELOPMENT";
  const budget = data.estimatedCost || data.budgetRequested || data.approvedBudget || 0;
  const beneficiaries = data.beneficiaryCount || data.targetBeneficiaries || null;
  const selectedNGO = data.ngoApplications?.find((a: any) => a.status === "SELECTED_BY_COMPANY")?.ngo;

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (pathname.includes("/csr-marketplace")) {
                router.push("/csr-marketplace");
              } else {
                router.push("/marketplace");
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft size={14} className="text-slate-500" />
            <span>Back to Marketplace</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-blue-600 transition">Portal</Link>
            <span>/</span>
            <Link href="/marketplace" className="hover:text-blue-600 transition">Marketplace</Link>
            <span>/</span>
            <span className="font-semibold text-slate-700 truncate max-w-[220px]">{trackingId}</span>
          </div>
        </div>

        {/* Main Title Banner */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                {sector.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {trackingId}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={12} className="text-emerald-600" />
                JS APPROVED &amp; VERIFIED
              </span>
              <GovStatusBadge variant={getStatusVariant(data.status || "MARKETPLACE_LISTED")}>
                {(data.status || "MARKETPLACE_LISTED").replace(/_/g, " ")}
              </GovStatusBadge>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug break-words">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span>Organization: <strong className="text-slate-800">{departmentName}</strong></span>
              </div>
              {officeName && officeName !== departmentName && (
                <div className="text-slate-500">
                  ({officeName})
                </div>
              )}
            </div>
          </div>

          {/* Action buttons on overview */}
          <div className="shrink-0 flex flex-wrap gap-2 w-full md:w-auto">
            {user?.role === "NGO_ADMIN" && !data.ngoApplications?.some((a: any) => a.ngoId === user.ngoId) && (
              <button
                type="button"
                onClick={() => setShowApplyModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 shadow-xs transition-all cursor-pointer"
              >
                <Handshake size={15} />
                <span>Apply as Implementation Partner</span>
              </button>
            )}

            {(user?.role === "COMPANY_ADMIN" || user?.role === "COMPANY_MEMBER" || user?.role === "CORPORATE_USER" || user?.role === "CORPORATE_PARTNER" || user?.role === "CSR_ADMIN" || user?.companyId || user?.kind === "CSR_COMPANY") && (
              <button
                type="button"
                onClick={handleExpressInterest}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 shadow-xs transition-all cursor-pointer"
              >
                <Handshake size={15} />
                <span>Express CSR Interest</span>
              </button>
            )}

            {!user && (
              <Link
                href={`/login?next=${encodeURIComponent(buildEnquiryUrl(data))}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 shadow-xs transition-all no-underline cursor-pointer"
              >
                <Handshake size={15} />
                <span>Sign in to Express CSR Interest</span>
              </Link>
            )}
          </div>
        </div>

        {/* Key Metrics Strip (Reflecting Exact Submitted Pitch Data) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Requested Outlay */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Requested Outlay</span>
                <Coins size={16} className="text-blue-600" />
              </div>
              <p className="mt-1 text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 break-words leading-tight">
                {money(budget)}
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-500">Convergence Gap Grant</span>
          </div>

          {/* Card 2: Target Region */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Target Region</span>
                <MapPin size={16} className="text-purple-600" />
              </div>
              <p className="mt-1 text-sm sm:text-base lg:text-lg font-extrabold text-slate-900 line-clamp-2 break-words leading-tight" title={`${taluka}, ${district}`}>
                {district}
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-500 line-clamp-1 break-words">{taluka}</span>
          </div>

          {/* Card 3: Sponsoring Organization */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Organization</span>
                <Building2 size={16} className="text-emerald-600" />
              </div>
              <p className="mt-1 text-sm sm:text-base font-extrabold text-slate-900 capitalize line-clamp-2 break-words leading-tight" title={departmentName}>
                {departmentName}
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-500">Authority</span>
          </div>

          {/* Card 4: Governance & Audit */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Governance &amp; Audit</span>
                <ShieldCheck size={16} className="text-amber-600" />
              </div>
              <p className="mt-1 text-sm sm:text-base font-extrabold text-slate-900 line-clamp-2 break-words leading-tight" title={data.certificationType || "HOD Endorsed"}>
                {data.certificationType || "HOD Endorsed"}
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-500 line-clamp-1 break-words">
              {photos.length > 0 ? `${photos.length} Field Media Attached` : "Non-Budgeted Gap Certified"}
            </span>
          </div>
        </div>

        {/* Tab bar (Discovery Tabs + Role-Gated Management Tabs) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-px bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {/* Public Discovery Tabs */}
            {publicTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                  {tab.label}
                </button>
              );
            })}

            {/* Role-Gated Management Tabs Divider */}
            {managementTabs.length > 0 && (
              <>
                <div className="h-6 w-px bg-slate-200 mx-1.5 shrink-0" />
                <div className="flex items-center gap-1.5">
                  {managementTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-emerald-900 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/60"
                        }`}
                      >
                        <Lock size={12} className={isActive ? "text-white" : "text-emerald-700"} />
                        <Icon size={14} className={isActive ? "text-white" : "text-emerald-700"} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Marketplace Listing Active</span>
          </div>
        </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: OVERVIEW & NEED */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Section 1: Scope & Need Description */}
              <GovCard>
                <GovCardHeader className="bg-slate-50/80 border-b border-slate-200/80">
                  <GovCardTitle className="flex items-center gap-2 text-slate-800">
                    <FileText size={16} className="text-blue-900" />
                    Verified Requirement Scope & Need
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="space-y-5 text-sm">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1.5 text-xs uppercase tracking-wider">Project Need Description</h4>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs sm:text-sm">
                      {description}
                    </p>
                  </div>

                  {data.expectedImpact && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Award size={14} className="text-emerald-600" /> Expected Social & Community Impact
                      </h4>
                      <p className="text-slate-700 leading-relaxed bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/70 text-xs sm:text-sm">
                        {data.expectedImpact}
                      </p>
                    </div>
                  )}
                </GovCardBody>
              </GovCard>

              {/* Section 2: Location Hierarchy & Sponsoring Body */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location Hierarchy */}
                <GovCard>
                  <GovCardHeader className="bg-slate-50/80 border-b border-slate-200/80">
                    <GovCardTitle className="flex items-center gap-2 text-slate-800 text-sm">
                      <MapPin size={15} className="text-rose-600" /> Location Hierarchy
                    </GovCardTitle>
                  </GovCardHeader>
                  <GovCardBody className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Division</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">{division}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">District</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">{district}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Taluka / Block</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">{taluka}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Gram Panchayat / Site</span>
                        <span className="font-bold text-slate-800 mt-0.5 block truncate">{exactLocation}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-slate-600">
                      <strong>Exact Site Location:</strong> {exactLocation}
                    </div>
                  </GovCardBody>
                </GovCard>

                {/* Sponsoring Body & Nodal Officer */}
                <GovCard>
                  <GovCardHeader className="bg-slate-50/80 border-b border-slate-200/80">
                    <GovCardTitle className="flex items-center gap-2 text-slate-800 text-sm">
                      <UserCheck size={15} className="text-blue-900" /> Sponsoring Office & Nodal Officer
                    </GovCardTitle>
                  </GovCardHeader>
                  <GovCardBody className="space-y-3 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <Building2 size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{departmentName}</span>
                        {officeName && officeName !== departmentName && (
                          <p className="text-[11px] text-slate-500">Office: {officeName}</p>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                        <span>{officialName || "District Nodal Desk"}</span>
                        <span className="text-[11px] font-normal text-slate-500">({designation})</span>
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        {phone && phone !== "N/A" && (
                          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-blue-900 hover:underline font-semibold">
                            <Phone size={12} /> {phone}
                          </a>
                        )}
                        {email && email !== "N/A" && (
                          <a href={`mailto:${email}`} className="inline-flex items-center gap-1 text-blue-900 hover:underline font-semibold">
                            <Mail size={12} /> {email}
                          </a>
                        )}
                      </div>
                      {serviceClass && (
                        <span className="inline-block text-[10px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                          Cadre: {serviceClass.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </GovCardBody>
                </GovCard>
              </div>
            </div>
          )}

          {/* TAB 2: REQUIREMENT SCOPE & IMPACT */}
          {activeTab === "scope-impact" && (
            <div className="space-y-6">
              <GovCard>
                <GovCardHeader className="bg-slate-50/80 border-b border-slate-200/80">
                  <GovCardTitle className="flex items-center gap-2 text-slate-800">
                    <Award size={16} className="text-emerald-700" />
                    Requirement Scope & Submission Details
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="space-y-5 text-xs sm:text-sm text-slate-700">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1.5 text-xs uppercase tracking-wider">Project Need & Requirement Statement</h4>
                    <p className="leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs sm:text-sm text-slate-800 whitespace-pre-line">
                      {description}
                    </p>
                  </div>

                  {data.expectedImpact && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1.5 text-xs uppercase tracking-wider">Expected Social & Community Impact</h4>
                      <p className="leading-relaxed bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-xs sm:text-sm text-slate-800">
                        {data.expectedImpact}
                      </p>
                    </div>
                  )}

                  {/* Pitch Submission Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Budget</span>
                      <p className="text-lg font-black text-slate-900 mt-1">{money(budget)}</p>
                      <span className="text-[10px] text-slate-500">Convergence Gap Grant</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Location</span>
                      <p className="text-base font-black text-slate-900 mt-1 truncate" title={`${taluka}, ${district}`}>{district}</p>
                      <span className="text-[10px] text-slate-500 truncate block">{taluka}</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sponsoring Body</span>
                      <p className="text-base font-black text-slate-900 mt-1 truncate capitalize" title={departmentName}>{departmentName}</p>
                      <span className="text-[10px] text-slate-500">Government Authority</span>
                    </div>
                  </div>

                  {/* Beneficiary reach (ONLY IF ACTUALLY PROVIDED IN DATA) */}
                  {Boolean(beneficiaries) && (
                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                      <span className="font-semibold">Target Beneficiary Reach:</span>
                      <span className="font-bold text-sm">{Number(beneficiaries).toLocaleString("en-IN")} Lives</span>
                    </div>
                  )}

                  {/* SDG Goals (ONLY IF ACTUALLY SPECIFIED IN DATA) */}
                  {Array.isArray(data.sdgGoals) && data.sdgGoals.length > 0 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider">UN Sustainable Development Goals (SDGs)</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.sdgGoals.map((g: string) => (
                          <span key={g} className="bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-blue-600" />
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </GovCardBody>
              </GovCard>
            </div>
          )}

          {/* TAB 3: VERIFICATION & GOVERNANCE */}
          {activeTab === "governance" && (
            <div className="space-y-6">
              <GovCard>
                <GovCardHeader className="bg-slate-50/80 border-b border-slate-200/80">
                  <GovCardTitle className="flex items-center gap-2 text-slate-800 text-sm">
                    <ShieldCheck size={16} className="text-emerald-700" /> Government Verification & Eligibility Checklist
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">JS Feasibility Approved</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">RM review verified & Joint Secretary cleared for marketplace listing.</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">Non-Budgeted Gap</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Government fund declaration verified as genuine CSR convergence gap.</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900">Department Endorsed</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Authorized Head of Department / Officer certification verified.</p>
                      </div>
                    </div>
                  </div>

                  {(data.govtFundDeclaration || data.certificationType) && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">Official Non-Budgeted Declaration:</p>
                      <p>{data.govtFundDeclaration || "Certified as an unbudgeted public development requirement under Government of Maharashtra CSR convergence norms."}</p>
                      {data.certificationType && <p className="text-[11px] text-slate-500 pt-1">Certification Authority: <strong>{data.certificationType}</strong></p>}
                    </div>
                  )}
                </GovCardBody>
              </GovCard>
            </div>
          )}

          {/* TAB 4: MEDIA & SANCTIONS */}
          {activeTab === "media-docs" && (
            <div className="space-y-6">
              <GovCard>
                <GovCardHeader className="bg-slate-50/80 border-b border-slate-200/80">
                  <GovCardTitle className="flex items-center gap-2 text-slate-800 text-sm">
                    <ImageIcon size={16} className="text-blue-900" /> Verified Site Media & Attached Certifications
                  </GovCardTitle>
                </GovCardHeader>
                <GovCardBody className="space-y-5 text-xs">
                  {/* Geo-tagged Photos */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-800 text-xs">Geo-Tagged Field Photos ({photos.length})</h5>
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {photos.map((url: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePhoto(url)}
                            className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:border-blue-500 hover:shadow-md transition text-left"
                          >
                            <img src={url} alt={`Site photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye size={14} /> Preview
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl text-slate-500 italic border border-slate-100 text-center">
                        No field photographs uploaded for this requirement yet.
                      </div>
                    )}
                  </div>

                  {/* Official Documents */}
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <h5 className="font-bold text-slate-800 text-xs">Official Sanction Documents</h5>
                    <div className="flex flex-wrap gap-2">
                      {hodDoc ? (
                        <a
                          href={hodDoc}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold transition hover:no-underline"
                        >
                          <Download size={14} />
                          <span>View / Download HOD Certification Document (PDF)</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Self-certified under official administrative authority.</span>
                      )}
                      {supportingDocs.map((doc: string, idx: number) => (
                        <a
                          key={idx}
                          href={doc}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition hover:no-underline"
                        >
                          <FileText size={13} /> Supporting Document #{idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                </GovCardBody>
              </GovCard>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* PROTECTED MANAGEMENT TABS (ROLE-GATED) */}
          {/* ----------------------------------------------------------------- */}

          {/* MANAGEMENT TAB 1: NGO APPLICATIONS */}
          {activeTab === "ngo-applications" && canViewNgoApplications && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle className="flex items-center gap-2">
                  <Landmark size={16} className="text-blue-900" />
                  NGO Implementation Proposals
                </GovCardTitle>
                <span className="text-[11px] font-bold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full">
                  Authorized Review Desk
                </span>
              </GovCardHeader>
              <GovCardBody className="p-0">
                {(!requirement.ngoApplications || requirement.ngoApplications.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">No NGO applications submitted yet.</div>
                ) : (
                  <div className="divide-y divide-slate-150">
                    {(requirement.ngoApplications || []).map((app: any) => (
                      <div key={app.id} className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{app.ngo?.name || "Empanelled NGO Partner"}</h4>
                            <p className="text-xs text-slate-500">District HQ: {app.ngo?.district || district}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {app.matchScore && (
                              <span className="bg-[#eff6ff] text-blue-900 border border-[#dbeafe] px-2 py-0.5 rounded text-[10px] font-bold">
                                {app.matchScore}% Match
                              </span>
                            )}
                            <GovStatusBadge variant={app.status === "SELECTED_BY_COMPANY" ? "success" : "info"}>
                              {app.status.replace(/_/g, " ")}
                            </GovStatusBadge>
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border">
                          <div><strong>Proposed Plan:</strong> {app.proposedPlan}</div>
                          <div><strong>Proposed Timeline:</strong> {app.proposedTimeline}</div>
                          <div><strong>Estimated Cost:</strong> ₹{Number(app.estimatedCost).toLocaleString()}</div>
                          <div>
                            <strong>Proposal Document:</strong>{" "}
                            {app.proposalDocumentUrl ? (
                              <a href={app.proposalDocumentUrl} target="_blank" rel="noreferrer" className="text-blue-900 hover:underline font-bold">
                                Download Proposal File
                              </a>
                            ) : "None"}
                          </div>
                        </div>

                        {/* Selection Button: Visible to companies who expressed interest */}
                        {user?.role === "COMPANY_ADMIN" &&
                         requirement.companyInterests?.some((i: any) => i.companyId === user.companyId && i.status !== "NGO_SELECTED") &&
                         app.status === "NGO_APPLIED" && (
                          <div className="flex justify-end pt-2">
                            <Button
                              onClick={() => {
                                const companyInterest = requirement.companyInterests.find((i: any) => i.companyId === user.companyId);
                                handleSelectNgo(companyInterest.id, app.id);
                              }}
                              className="bg-green-700 hover:bg-green-800 text-white font-bold text-xs py-1.5 px-4"
                            >
                              Select as Partner & Initiate Agreement
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {/* MANAGEMENT TAB 2: COMPANY INTERESTS */}
          {activeTab === "company-interests" && canViewCompanyInterests && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle className="flex items-center gap-2">
                  <Handshake size={16} className="text-blue-900" />
                  Corporate CSR Expressions of Interest
                </GovCardTitle>
                <span className="text-[11px] font-bold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full">
                  Department Confidential
                </span>
              </GovCardHeader>
              <GovCardBody className="p-0">
                {(!requirement.companyInterests || requirement.companyInterests.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">No CSR companies have expressed interest yet.</div>
                ) : (
                  <div className="divide-y divide-slate-150 text-xs">
                    {(requirement.companyInterests || []).map((interest: any) => (
                      <div key={interest.id} className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{interest.company?.name || "Corporate Donor"}</h4>
                            <p className="text-slate-500">Type: {interest.fundingType ? interest.fundingType.replace(/_/g, " ") : "Full Grant"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <GovStatusBadge variant={interest.status === "CI_AGREEMENT_SIGNED" ? "success" : "info"}>
                              {interest.status.replace(/_/g, " ")}
                            </GovStatusBadge>
                            <span className="font-bold text-slate-800">₹{Number(interest.fundingAmount || 0).toLocaleString()} pledged</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border text-slate-600 space-y-2">
                          <div><strong>Focus Alignment:</strong> {interest.focusAlignmentNotes || "N/A"}</div>
                          <div><strong>Remarks / Message:</strong> {interest.discussionMessage || "N/A"}</div>
                          {interest.selectedNgoId && (
                            <div className="text-green-700 font-bold pt-1 border-t">
                              Selected NGO Partner ID: {interest.selectedNgoId}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {/* MANAGEMENT TAB 3: AGREEMENT WORKFLOW */}
          {activeTab === "agreement" && canViewExecution && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle>Tripartite Agreement Management</GovCardTitle>
                {user?.role === "BENEFICIARY_AGENCY" &&
                 requirement.status === "NGO_SELECTED" &&
                 !showAgreementForm &&
                 (!requirement.agreements || requirement.agreements.length === 0) && (
                  <Button
                    onClick={() => setShowAgreementForm(true)}
                    className="bg-blue-900 text-white hover:bg-blue-950 text-xs font-bold"
                  >
                    Draft Tripartite Agreement
                  </Button>
                )}
              </GovCardHeader>
              <GovCardBody className="space-y-6 text-xs">
                {showAgreementForm && (
                  <form onSubmit={handleGenerateAgreement} className="space-y-4 border p-4 rounded-lg bg-slate-50">
                    <h4 className="font-bold text-slate-800 text-sm">Draft Agreement parameters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Company Partner ID</label>
                        <input
                          type="text"
                          disabled
                          className="w-full border rounded px-2.5 py-1.5 bg-slate-100 text-slate-650"
                          value={agreementForm.companyId}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">NGO Partner ID</label>
                        <input
                          type="text"
                          disabled
                          className="w-full border rounded px-2.5 py-1.5 bg-slate-100 text-slate-650"
                          value={agreementForm.ngoId}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Funding Amount (INR)</label>
                        <input
                          type="number"
                          required
                          className="w-full border rounded px-2.5 py-1.5 bg-white"
                          value={agreementForm.fundingAmount}
                          onChange={e => setAgreementForm({ ...agreementForm, fundingAmount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Expected Completion Date</label>
                        <input
                          type="date"
                          required
                          className="w-full border rounded px-2.5 py-1.5 bg-white"
                          value={agreementForm.expectedCompletionDate}
                          onChange={e => setAgreementForm({ ...agreementForm, expectedCompletionDate: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Terms & Conditions</label>
                        <textarea
                          placeholder="Standard tripartite terms: escrow milestone releases, mandatory physical verification checks, etc."
                          className="w-full border rounded px-2.5 py-1.5 bg-white"
                          rows={3}
                          value={agreementForm.termsAndConditions}
                          onChange={e => setAgreementForm({ ...agreementForm, termsAndConditions: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowAgreementForm(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" disabled={creatingAgreement} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50">
                        {creatingAgreement ? "Generating..." : "Generate & Share"}
                      </button>
                    </div>
                  </form>
                )}

                {(!requirement.agreements || requirement.agreements.length === 0) ? (
                  <div className="p-6 text-center text-slate-400 italic">No agreements drafted yet.</div>
                ) : (
                  <div className="space-y-4">
                    {(requirement.agreements || []).map((agr: any) => (
                      <div key={agr.id} className="border p-4 rounded-xl space-y-4 bg-white shadow-sm">
                        <div className="flex justify-between items-start pb-2 border-b">
                          <div>
                            <h4 className="font-bold text-slate-900">MahaCSR Tripartite Agreement Draft</h4>
                            <p className="text-[10px] text-slate-400">Created: {new Date(agr.createdAt).toLocaleDateString()}</p>
                          </div>
                          <GovStatusBadge variant={agr.status === "SIGNED" ? "success" : "warning"}>
                            {agr.status.replace(/_/g, " ")}
                          </GovStatusBadge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600">
                          <div><strong>Funding amount:</strong> ₹{Number(agr.fundingAmount).toLocaleString()}</div>
                          <div><strong>Agreement terms:</strong> {agr.termsAndConditions || "Standard terms apply"}</div>
                          {agr.signedDocumentUrl && (
                            <div className="md:col-span-2">
                              <strong>Signed Document:</strong>{" "}
                              <a href={agr.signedDocumentUrl} target="_blank" rel="noreferrer" className="text-blue-900 hover:underline font-bold">
                                View Signed Tripartite PDF
                              </a>
                            </div>
                          )}
                        </div>

                        {agr.status !== "SIGNED" && (isNgoLinkedToThis || isCompanyLinkedToThis || isGovAuthority) && (
                          <div className="bg-slate-50 border border-dashed rounded-lg p-4 flex flex-col items-center gap-3">
                            <h5 className="font-bold text-slate-800">Upload Executed & Signed Agreement</h5>
                            <p className="text-[10px] text-slate-500 text-center">
                              Once all three parties (Beneficiary, Company, NGO) execute the agreement, scan and upload the signed PDF.
                            </p>

                            <div className="relative cursor-pointer bg-blue-600 text-white hover:bg-blue-700 font-bold px-6 py-2 rounded-xl shadow-xs text-center transition-all">
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => handleSignedAgreementUpload(e, agr.id)}
                                disabled={uploadingSignedAgreement}
                                accept=".pdf"
                              />
                              {uploadingSignedAgreement ? "Uploading..." : "Upload Signed PDF"}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {/* MANAGEMENT TAB 4: FUND MILESTONES */}
          {activeTab === "milestones" && canViewExecution && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b">
                <GovCardTitle>Escrow Milestone Tranches</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="space-y-4 text-xs">
                {(!requirement.fundMilestones || requirement.fundMilestones.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 italic">No fund milestones configured. Generate tripartite agreement first.</div>
                ) : (
                  <div className="space-y-3">
                    {(requirement.fundMilestones || []).map((ms: any) => (
                      <div key={ms.id} className="border p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm hover:border-slate-300">
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900">{ms.milestoneName}</h4>
                          <div className="text-slate-500 text-[10px] flex gap-4">
                            <span>Percentage: <strong>{ms.milestonePercentage}%</strong></span>
                            <span>Amount: <strong>₹{Number(ms.amount).toLocaleString()}</strong></span>
                            {ms.releaseDate && (
                              <span>Released on: <strong>{new Date(ms.releaseDate).toLocaleDateString()}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <GovStatusBadge variant={ms.status === "FM_RELEASED" ? "success" : "warning"}>
                            {ms.status.replace(/_/g, " ")}
                          </GovStatusBadge>

                          {ms.status !== "FM_RELEASED" && (isCompanyLinkedToThis || isSuperAdmin) && (
                            <button
                              onClick={() => handleReleaseMilestone(ms.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg shadow-2xs cursor-pointer transition-all"
                            >
                              Release payment
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {/* MANAGEMENT TAB 5: PROGRESS LOGS */}
          {activeTab === "progress" && canViewExecution && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle>Field Progress Reports</GovCardTitle>
                {(isNgoLinkedToThis || isGovAuthority) && !showProgressForm && (
                  <button
                    onClick={() => setShowProgressForm(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
                  >
                    Submit Field Progress
                  </button>
                )}
              </GovCardHeader>
              <GovCardBody className="space-y-6 text-xs">
                {showProgressForm && (
                  <form onSubmit={handleSubmitProgress} className="space-y-4 border p-4 rounded-lg bg-slate-50">
                    <h4 className="font-bold text-slate-800 text-sm">Add Progress Log</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Progress Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Civil construction work completed"
                          className="w-full border rounded px-2.5 py-1.5"
                          value={progressForm.progressTitle}
                          onChange={e => setProgressForm({ ...progressForm, progressTitle: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Physical Progress (%)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            className="w-full border rounded px-2.5 py-1.5"
                            value={progressForm.physicalProgressPercent}
                            onChange={e => setProgressForm({ ...progressForm, physicalProgressPercent: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Financial Utilized (%)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            className="w-full border rounded px-2.5 py-1.5"
                            value={progressForm.financialUtilPercent}
                            onChange={e => setProgressForm({ ...progressForm, financialUtilPercent: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Description *</label>
                        <textarea
                          required
                          placeholder="What tasks are executed? What materials are procured?"
                          className="w-full border rounded px-2.5 py-1.5"
                          rows={3}
                          value={progressForm.progressDescription}
                          onChange={e => setProgressForm({ ...progressForm, progressDescription: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Current Challenges</label>
                        <input
                          type="text"
                          placeholder="e.g. rains delayed concrete curing"
                          className="w-full border rounded px-2.5 py-1.5"
                          value={progressForm.challenges}
                          onChange={e => setProgressForm({ ...progressForm, challenges: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Next steps</label>
                        <input
                          type="text"
                          placeholder="e.g. electrical fittings procurement"
                          className="w-full border rounded px-2.5 py-1.5"
                          value={progressForm.nextSteps}
                          onChange={e => setProgressForm({ ...progressForm, nextSteps: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block font-bold text-slate-700 mb-1">Field Photo Evidence</label>
                        <div className="relative border-2 border-dashed rounded p-4 text-center cursor-pointer">
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            onChange={handleProgressPhotoUpload}
                            disabled={uploadingProgressPhoto}
                            accept="image/*"
                          />
                          <div className="flex items-center justify-center gap-1.5 text-slate-500">
                            <UploadCloud size={18} />
                            <span>{uploadingProgressPhoto ? "Uploading..." : "Click to upload progress site picture"}</span>
                          </div>
                        </div>

                        {progressForm.photoUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {progressForm.photoUrls.map((url, idx) => (
                              <img key={idx} src={url} className="w-16 h-16 object-cover rounded border" alt="Progress evidence" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button type="button" onClick={() => setShowProgressForm(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" disabled={submittingProgress} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50">
                        {submittingProgress ? "Submitting..." : "Submit Progress Log"}
                      </button>
                    </div>
                  </form>
                )}

                {(!requirement.progressReports || requirement.progressReports.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 italic">No progress logs submitted yet.</div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-6">
                    {(requirement.progressReports || []).map((rep: any) => (
                      <div key={rep.id} className="relative space-y-2">
                        <div className="absolute -left-[31px] top-1 bg-blue-900 h-4 w-4 rounded-full border-4 border-white shadow-sm" />

                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{rep.progressTitle}</h4>
                            <p className="text-[10px] text-slate-400">{new Date(rep.createdAt).toLocaleString()}</p>
                          </div>
                          <GovStatusBadge variant={rep.status === "PR_VERIFIED" ? "success" : "info"}>
                            {rep.status.replace(/_/g, " ")}
                          </GovStatusBadge>
                        </div>

                        <p className="text-slate-600 leading-relaxed">{rep.progressDescription}</p>

                        <div className="flex gap-4 text-[10px] text-slate-500 font-semibold">
                          <span>Physical Progress: <strong>{rep.physicalProgressPercent}%</strong></span>
                          <span>Financial Utilized: <strong>{rep.financialUtilPercent}%</strong></span>
                        </div>

                        {rep.photoUrls?.length > 0 && (
                          <div className="flex gap-2 flex-wrap pt-1">
                            {rep.photoUrls.map((url: string, index: number) => (
                              <a href={url} target="_blank" rel="noreferrer" key={index}>
                                <img src={url} className="w-20 h-20 object-cover rounded border hover:opacity-80 transition-opacity" alt="evidence" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {/* MANAGEMENT TAB 6: COMPLETION & IMPACT */}
          {activeTab === "impact" && canViewExecution && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle>Completion & Impact Scorecard</GovCardTitle>
                {isNgoLinkedToThis && (requirement.status === "IN_PROGRESS" || requirement.status === "EXECUTION_STARTED") && !showCompletionForm && (
                  <Button
                    onClick={() => setShowCompletionForm(true)}
                    className="bg-blue-900 text-white font-bold text-xs"
                  >
                    Submit Completion Report
                  </Button>
                )}
                {isSuperAdmin && requirement.status === "COMPLETION_SUBMITTED" && (
                  <Button
                    onClick={handleGenerateImpact}
                    className="bg-green-700 hover:bg-green-800 text-white font-bold text-xs"
                  >
                    Calculate Impact Score
                  </Button>
                )}
              </GovCardHeader>
              <GovCardBody className="space-y-6 text-xs">
                {showCompletionForm && (
                  <form onSubmit={handleSubmitCompletion} className="space-y-4 border p-4 rounded-lg bg-slate-50">
                    <h4 className="font-bold text-slate-800 text-sm">Submit Project Completion Report</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Work Completed Summary *</label>
                        <textarea
                          required
                          placeholder="Summarize the overall work executed, infrastructure created, and outcomes."
                          className="w-full border rounded px-2.5 py-1.5"
                          rows={3}
                          value={completionForm.workCompletedSummary}
                          onChange={e => setCompletionForm({ ...completionForm, workCompletedSummary: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Final Executed Cost (INR) *</label>
                        <input
                          type="number"
                          required
                          className="w-full border rounded px-2.5 py-1.5"
                          value={completionForm.finalCost}
                          onChange={e => setCompletionForm({ ...completionForm, finalCost: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Actual Beneficiary Reach *</label>
                        <input
                          type="number"
                          required
                          className="w-full border rounded px-2.5 py-1.5"
                          value={completionForm.beneficiaryCount}
                          onChange={e => setCompletionForm({ ...completionForm, beneficiaryCount: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Fund Utilization Summary *</label>
                        <textarea
                          required
                          placeholder="Detail of how funds were spent under different milestone heads."
                          className="w-full border rounded px-2.5 py-1.5"
                          rows={2}
                          value={completionForm.fundUtilizationSummary}
                          onChange={e => setCompletionForm({ ...completionForm, fundUtilizationSummary: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block font-bold text-slate-700 mb-1">Beneficiary Feedback Summary</label>
                        <textarea
                          placeholder="Quotes or feedback from Zilla Parishad officers, school children, doctors, villagers."
                          className="w-full border rounded px-2.5 py-1.5"
                          rows={2}
                          value={completionForm.beneficiaryFeedback}
                          onChange={e => setCompletionForm({ ...completionForm, beneficiaryFeedback: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button type="button" onClick={() => setShowCompletionForm(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">
                        Cancel
                      </button>
                      <button type="submit" disabled={submittingCompletion} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50">
                        {submittingCompletion ? "Submitting..." : "Submit Report"}
                      </button>
                    </div>
                  </form>
                )}

                {!requirement.completionReport && !requirement.impactReport ? (
                  <div className="p-8 text-center text-slate-400 italic">Project is not yet completed. Completion logs will appear once execution finishes.</div>
                ) : (
                  <div className="space-y-6">
                    {requirement.completionReport && (
                      <div className="border p-4 rounded-xl bg-slate-50/50 space-y-3">
                        <h4 className="font-bold text-slate-900 text-sm">NGO Project Completion Log</h4>
                        <p className="text-slate-650">{requirement.completionReport.workCompletedSummary}</p>
                        <div className="grid grid-cols-2 gap-4 text-slate-600">
                          <div>Final Cost: <strong>₹{Number(requirement.completionReport.finalCost).toLocaleString()}</strong></div>
                          <div>Actual Reach: <strong>{requirement.completionReport.beneficiaryCount} lives</strong></div>
                        </div>
                      </div>
                    )}

                    {requirement.impactReport && (
                      <div className="border p-5 rounded-xl bg-[#eff6ff] border-[#bfdbfe] space-y-4">
                        <div className="flex justify-between items-center border-b border-[#bfdbfe] pb-2">
                          <h4 className="font-bold text-[#14274e] text-sm flex items-center gap-1">
                            <Target size={16} /> MahaCSR Project Impact scorecard
                          </h4>
                          <span className="text-2xl font-extrabold text-blue-900 bg-white px-3 py-1 rounded-lg border shadow-sm">
                            {requirement.impactReport.impactScore} / 100
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {[
                            { name: "Timely Completion", val: requirement.impactReport.timelyCompletionScore, max: 20 },
                            { name: "Budget Util Accuracy", val: requirement.impactReport.fundUtilAccuracyScore, max: 20 },
                            { name: "Beneficiary Feedback", val: requirement.impactReport.beneficiaryFeedbackScore, max: 15 },
                            { name: "Government Verification", val: requirement.impactReport.govVerificationScore, max: 15 },
                            { name: "Social Impact Reach", val: requirement.impactReport.socialImpactScore, max: 15 },
                            { name: "Evidence Documentation", val: requirement.impactReport.documentationScore, max: 15 }
                          ].map(c => (
                            <div key={c.name} className="bg-white p-2.5 rounded-lg border shadow-sm flex flex-col justify-between">
                              <span className="text-slate-500 text-[10px] block leading-snug">{c.name}</span>
                              <span className="text-sm font-bold text-slate-800 mt-1 block">
                                {c.val} / {c.max}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

        </div>

        {/* Right Sidebar: Quick Stats & Public Support Panel */}
        <div className="space-y-4">
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>Project Status Details</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="flex justify-between items-center">
                <span>Estimated Cost:</span>
                <strong className="text-slate-900 text-sm font-bold">₹{Number(requirement.estimatedCost || requirement.approvedBudget || 0).toLocaleString("en-IN")}</strong>
              </div>
              {Boolean(beneficiaries) && (
                <div className="flex justify-between items-center">
                  <span>Beneficiary Reach:</span>
                  <strong className="text-slate-800">{Number(beneficiaries).toLocaleString("en-IN")} lives</strong>
                </div>
              )}
              {requirement.priorityLevel && (
                <div className="flex justify-between items-center">
                  <span>Priority Scope:</span>
                  <strong className="text-slate-800">{requirement.priorityLevel}</strong>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Target District:</span>
                <strong className="text-slate-800">{district}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Posted Date:</span>
                <strong className="text-slate-800">{new Date(requirement.createdAt || Date.now()).toLocaleDateString("en-IN")}</strong>
              </div>

              {selectedNGO && (
                <div className="pt-3 border-t space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Implementation Partner</span>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                    <Landmark size={14} className="text-slate-500" />
                    {selectedNGO.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Rating: 4.5 ★ • Empanelled: {selectedNGO.empanelmentStatus || "Verified"}
                  </div>
                </div>
              )}
            </GovCardBody>
          </GovCard>

          {/* Quick Engagement / Share Card (Enhanced Multi-Channel CSR Outreach) */}
          <GovCard className="overflow-hidden border-slate-200/90 shadow-sm">
            <GovCardHeader className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/50 border-b border-slate-200/80 py-3 px-4 flex justify-between items-center">
              <GovCardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Share2 size={14} className="text-blue-900" /> Spread the Word
              </GovCardTitle>
              <span className="text-[10px] font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded-full border border-blue-200/60">
                CSR Outreach
              </span>
            </GovCardHeader>
            <GovCardBody className="p-4 space-y-3 text-xs">
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Share this verified government CSR gap requirement directly with CSR committees, leadership boards, and partner networks.
              </p>

              {/* 1-Click Multi-Channel Actions Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* WhatsApp Share */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all duration-150 cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp</span>
                </button>

                {/* Email CSR Committee */}
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-2xs transition-all duration-150 cursor-pointer"
                  title="Compose Email to CSR Committee"
                >
                  <Mail size={14} />
                  <span>Email Brief</span>
                </button>

                {/* Copy Direct Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all duration-150 cursor-pointer ${
                    copiedLink
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                  title="Copy Direct URL"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                </button>

                {/* Copy Executive Summary */}
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all duration-150 cursor-pointer ${
                    copiedSummary
                      ? "bg-purple-50 text-purple-800 border-purple-300"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                  title="Copy Formatted Pitch Summary"
                >
                  {copiedSummary ? <Check size={14} className="text-purple-600" /> : <FileText size={14} />}
                  <span>{copiedSummary ? "Text Copied!" : "Copy Summary"}</span>
                </button>
              </div>

              {/* Native Device Share / Print Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-blue-900 hover:bg-blue-50/60 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  <Share2 size={12} />
                  <span>Device Share Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintBrief}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-blue-900 hover:bg-blue-50/60 border border-slate-200/80 transition-colors cursor-pointer"
                  title="Print / Save as PDF"
                >
                  <Printer size={12} />
                  <span>Print Brief</span>
                </button>
              </div>
            </GovCardBody>
          </GovCard>

          {/* Help & Support Advisory */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-slate-600 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
              <Info size={14} className="shrink-0" />
              <span>CSR Partnership Advisory</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-650">
              Direct corporate enquiries undergo fast-track sanction under the Maharashtra CSR Convergence Authority framework.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: NGO Application Form */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 text-slate-700">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Apply as Implementation Partner</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleNgoApply} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">Proposed Execution Plan *</label>
                <textarea
                  required
                  placeholder="Detail your engineering plan, project phases, and operational checks."
                  className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                  rows={3}
                  value={ngoForm.proposedPlan}
                  onChange={e => setNgoForm({ ...ngoForm, proposedPlan: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Execution Cost (INR) *</label>
                  <input
                    type="number"
                    required
                    className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                    value={ngoForm.estimatedCost}
                    onChange={e => setNgoForm({ ...ngoForm, estimatedCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Expected Timeline *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4 months"
                    className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                    value={ngoForm.proposedTimeline}
                    onChange={e => setNgoForm({ ...ngoForm, proposedTimeline: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Team Competency Details</label>
                <input
                  type="text"
                  placeholder="e.g. 2 civil engineers, 1 coordinator"
                  className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                  value={ngoForm.teamDetails}
                  onChange={e => setNgoForm({ ...ngoForm, teamDetails: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Upload Proposal / Budget details (PDF)</label>
                <div className="relative border border-dashed rounded p-3 text-center cursor-pointer hover:border-blue-900 transition-colors">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={handleProposalUpload}
                    disabled={uploadingProposal}
                    accept=".pdf"
                  />
                  <div className="flex items-center justify-center gap-1.5 text-slate-500">
                    <UploadCloud size={16} />
                    <span>{uploadingProposal ? "Uploading..." : "Select proposal PDF"}</span>
                  </div>
                </div>
                {ngoForm.proposalDocumentUrl && (
                  <p className="text-[10px] text-green-700 font-bold mt-1">✓ Proposal document uploaded!</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowApplyModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer">Cancel</button>
                <button type="submit" disabled={submittingNgo} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50">
                  {submittingNgo ? "Submitting..." : "Submit Bidding proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lightbox photo preview */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent" onClick={(e) => e.stopPropagation()}>
            <img src={activePhoto} alt="Site evidence preview" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      </div>
    </GovPortalLayout>
  );
}
