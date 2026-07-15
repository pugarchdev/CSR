"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { apiFetch, API_BASE_URL, getAccessToken } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { 
  Building2, Landmark, Coins, Users, Clock, FileText, Compass, AlertTriangle, 
  MapPin, CheckCircle2, ChevronRight, User, PlusCircle, ArrowLeft, UploadCloud, Target, ShieldCheck,
  XCircle
} from "lucide-react";

export default function CSRRequirementDetail() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [requirement, setRequirement] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Response forms states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  
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

  // Company interest form
  const [companyForm, setCompanyForm] = useState({
    fundingAmount: "",
    fundingType: "FULL_FUNDING",
    focusAlignmentNotes: "",
    discussionMessage: "",
    expectedTimeline: "",
    companyRemarks: ""
  });
  const [submittingCompany, setSubmittingCompany] = useState(false);

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

  useEffect(() => {
    // Get user info
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    
    fetchRequirementDetails();
  }, [id]);

  const fetchRequirementDetails = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/csr-requirements/${id}`);
      setRequirement(data);
      
      // Autofill forms
      setNgoForm(prev => ({ ...prev, estimatedCost: data.estimatedCost }));
      setCompanyForm(prev => ({ ...prev, fundingAmount: data.estimatedCost }));
      setAgreementForm(prev => ({
        ...prev,
        ngoId: data.ngoApplications?.find((a: any) => a.status === "SELECTED_BY_COMPANY")?.ngoId || "",
        companyId: data.companyInterests?.[0]?.companyId || "",
        fundingAmount: data.estimatedCost,
        milestonePlan: prev.milestonePlan.map(m => ({
          ...m,
          amount: String(Number(data.estimatedCost) * Number(m.milestonePercentage) / 100)
        }))
      }));
      setCompletionForm(prev => ({ ...prev, finalCost: data.estimatedCost, beneficiaryCount: data.beneficiaryCount }));
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load requirement details");
    } finally {
      setLoading(false);
    }
  };

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

  // Company Submit Interest
  const handleCompanyInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCompany(true);
    try {
      await apiFetch("/company-interests", {
        method: "POST",
        body: JSON.stringify({
          csrRequirementId: id,
          ...companyForm
        })
      });
      alert("Interest expressed successfully!");
      setShowInterestModal(false);
      fetchRequirementDetails();
    } catch (err: any) {
      alert(err.message || "Failed to express interest");
    } finally {
      setSubmittingCompany(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
          <p className="text-red-700 font-bold">Error loading details</p>
          <p className="text-xs text-red-500 mt-1">{error || "Requirement not found"}</p>
          <Button onClick={() => router.back()} className="mt-4 bg-red-800 text-white">Go Back</Button>
        </div>
      </div>
    );
  }

  const selectedNGO = requirement.ngoApplications?.find((a: any) => a.status === "SELECTED_BY_COMPANY" || a.status === "AGREEMENT_SIGNED")?.ngo;
  const isNgoLinkedToThis = user?.ngoId && selectedNGO?.id === user.ngoId;
  const isCompanyLinkedToThis = user?.companyId && requirement.companyInterests?.some((i: any) => i.companyId === user.companyId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back to marketplace */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={() => {
            const backDest = pathname.startsWith("/company/marketplace")
              ? "/company/marketplace"
              : pathname.startsWith("/department/requirements")
              ? "/department/requirements"
              : "/csr-marketplace";
            router.push(backDest);
          }}
          className="bg-transparent hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 py-1.5 px-3 flex items-center gap-1 text-xs"
        >
          <ArrowLeft size={14} /> Back
        </Button>
      </div>

      {/* Main Title Banner */}
      <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              {requirement.category.replace(/_/g, " ")}
            </span>
            <GovStatusBadge variant={getStatusVariant(requirement.status)}>
              {requirement.status.replace(/_/g, " ")}
            </GovStatusBadge>
          </div>
          <h1 className="text-xl font-bold text-slate-900 leading-snug">{requirement.title}</h1>
          <p className="text-xs text-slate-500">
            Department: <strong className="text-slate-800">{requirement.beneficiaryProfile.agencyName}</strong> ({requirement.beneficiaryProfile.agencyType})
          </p>
        </div>

        {/* Action buttons on overview */}
        <div className="shrink-0 flex gap-2">
          {user?.role === "NGO_ADMIN" && !requirement.ngoApplications?.some((a: any) => a.ngoId === user.ngoId) && (
            <Button
              onClick={() => setShowApplyModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 shadow-sm"
            >
              Apply as Implementation Partner
            </Button>
          )}

          {user?.role === "COMPANY_ADMIN" && !requirement.companyInterests?.some((i: any) => i.companyId === user.companyId) && (
            <Button
              onClick={() => setShowInterestModal(true)}
              className="bg-blue-900 hover:bg-blue-950 text-white font-bold px-6 shadow-sm"
            >
              Express CSR Interest
            </Button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b gap-1 overflow-x-auto pb-px bg-white p-2 rounded-lg border shadow-sm scrollbar-none">
        {[
          { id: "overview", label: "Overview" },
          { id: "ngo-applications", label: `NGO Applications (${requirement.ngoApplications?.length || 0})` },
          { id: "company-interests", label: `Company Interests (${requirement.companyInterests?.length || 0})` },
          { id: "agreement", label: "Agreement Workflow" },
          { id: "milestones", label: "Fund Milestones" },
          { id: "progress", label: "Progress Logs" },
          { id: "impact", label: "Completion & Impact" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? "bg-blue-900 text-white shadow-sm" 
                : "text-slate-650 hover:text-blue-900 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b">
                <GovCardTitle>Requirement Overview</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="space-y-6 text-sm">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Project Need Description</h4>
                  <p className="text-slate-600 leading-relaxed">{requirement.description}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Expected Social Impact</h4>
                  <p className="text-slate-600 leading-relaxed">{requirement.expectedImpact}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h5 className="font-bold text-slate-800">Site Location</h5>
                    <p className="text-slate-600 text-xs mt-1">
                      {requirement.address || `${requirement.village ? `${requirement.village}, ` : ""}${requirement.taluka}, ${requirement.district}`}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">Timeline Scope</h5>
                    <p className="text-slate-600 text-xs mt-1">{requirement.completionTimeline || "N/A"}</p>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">Contact Details</h5>
                    <p className="text-slate-600 text-xs mt-1">
                      Name: {requirement.contactPersonName || "N/A"}<br />
                      Phone: {requirement.contactPersonPhone || "N/A"}<br />
                      Email: {requirement.contactPersonEmail || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">UN SDG Alignment</h5>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {requirement.sdgGoals?.map((g: string) => (
                        <span key={g} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {g}
                        </span>
                      )) || <span className="text-slate-400 italic">None</span>}
                    </div>
                  </div>
                </div>
              </GovCardBody>
            </GovCard>
          )}

          {/* TAB 2: NGO APPLICATIONS */}
          {activeTab === "ngo-applications" && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b">
                <GovCardTitle>NGO Applications</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="p-0">
                {requirement.ngoApplications?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">No NGO applications submitted yet.</div>
                ) : (
                  <div className="divide-y divide-slate-150">
                    {requirement.ngoApplications.map((app: any) => (
                      <div key={app.id} className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{app.ngo.name}</h4>
                            <p className="text-xs text-slate-500">District HQ: {app.ngo.district}</p>
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

                        <div className="text-xs text-slate-600 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border">
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

          {/* TAB 3: COMPANY INTERESTS */}
          {activeTab === "company-interests" && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b">
                <GovCardTitle>Company Interests</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="p-0">
                {requirement.companyInterests?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-xs">No CSR companies have expressed interest yet.</div>
                ) : (
                  <div className="divide-y divide-slate-150 text-xs">
                    {requirement.companyInterests.map((interest: any) => (
                      <div key={interest.id} className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{interest.company.name}</h4>
                            <p className="text-slate-500">Type: {interest.fundingType.replace(/_/g, " ")}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <GovStatusBadge variant={interest.status === "CI_AGREEMENT_SIGNED" ? "success" : "info"}>
                              {interest.status.replace(/_/g, " ")}
                            </GovStatusBadge>
                            <span className="font-bold text-slate-800">₹{Number(interest.fundingAmount).toLocaleString()} pledged</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded border text-slate-600 space-y-2">
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

          {/* TAB 4: AGREEMENT WORKFLOW */}
          {activeTab === "agreement" && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle>Agreement Management</GovCardTitle>
                {/* Government Department can track agreement once NGO is selected */}
                {user?.role === "BENEFICIARY_AGENCY" && 
                 requirement.status === "NGO_SELECTED" && 
                 !showAgreementForm && 
                 requirement.agreements?.length === 0 && (
                  <Button 
                    onClick={() => setShowAgreementForm(true)}
                    className="bg-blue-900 text-white hover:bg-blue-950 text-xs font-bold"
                  >
                    Draft Tripartite Agreement
                  </Button>
                )}
              </GovCardHeader>
              <GovCardBody className="space-y-6 text-xs">
                {/* Draft agreement form */}
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
                      <Button type="button" onClick={() => setShowAgreementForm(false)} className="bg-slate-200 text-slate-800">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creatingAgreement} className="bg-blue-900 text-white font-bold">
                        {creatingAgreement ? "Generating..." : "Generate & Share"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Listing generated agreements */}
                {requirement.agreements?.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic">No agreements drafted yet.</div>
                ) : (
                  <div className="space-y-4">
                    {requirement.agreements.map((agr: any) => (
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

                        {/* Sign/Upload Section: Visible to NGO/Company/Beneficiary if draft generated */}
                        {agr.status !== "SIGNED" && (isNgoLinkedToThis || isCompanyLinkedToThis || user?.role === "BENEFICIARY_AGENCY" || user?.role === "SUPER_ADMIN") && (
                          <div className="bg-slate-50 border border-dashed rounded-lg p-4 flex flex-col items-center gap-3">
                            <h5 className="font-bold text-slate-800">Upload Executed & Signed Agreement</h5>
                            <p className="text-[10px] text-slate-500 text-center">
                              Once all three parties (Beneficiary, Company, NGO) execute the agreement, scan and upload the signed PDF.
                            </p>
                            
                            <div className="relative cursor-pointer bg-blue-900 text-white hover:bg-blue-950 font-bold px-6 py-2 rounded shadow-sm text-center">
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

          {/* TAB 5: FUND MILESTONES */}
          {activeTab === "milestones" && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b">
                <GovCardTitle>Escrow Milestone Tranches</GovCardTitle>
              </GovCardHeader>
              <GovCardBody className="space-y-4 text-xs">
                {requirement.fundMilestones?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">No fund milestones configured. Generate tripartite agreement first.</div>
                ) : (
                  <div className="space-y-3">
                    {requirement.fundMilestones.map((ms: any) => (
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

                          {/* Release trigger: Visible to Company sponsor or Admin */}
                          {ms.status !== "FM_RELEASED" && (isCompanyLinkedToThis || user?.role === "SUPER_ADMIN") && (
                            <Button
                              onClick={() => handleReleaseMilestone(ms.id)}
                              className="bg-blue-900 hover:bg-blue-950 text-white font-bold text-[10px] py-1 px-3"
                            >
                              Release payment
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GovCardBody>
            </GovCard>
          )}

          {/* TAB 6: PROGRESS LOGS */}
          {activeTab === "progress" && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle>Field Progress Reports</GovCardTitle>
                {/* NGO partner can submit progress report */}
                {isNgoLinkedToThis && requirement.status === "AGREEMENT_SIGNED" || requirement.status === "IN_PROGRESS" && !showProgressForm && (
                  <Button
                    onClick={() => setShowProgressForm(true)}
                    className="bg-blue-900 text-white font-bold text-xs"
                  >
                    Submit Field Progress
                  </Button>
                )}
              </GovCardHeader>
              <GovCardBody className="space-y-6 text-xs">
                {/* Form to submit progress */}
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

                      {/* Photo evidence */}
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
                      <Button type="button" onClick={() => setShowProgressForm(false)} className="bg-slate-200 text-slate-800">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submittingProgress} className="bg-blue-900 text-white font-bold">
                        {submittingProgress ? "Submitting..." : "Submit Progress Log"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Progress reports timeline */}
                {requirement.progressReports?.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">No progress logs submitted yet.</div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-6">
                    {requirement.progressReports.map((rep: any) => (
                      <div key={rep.id} className="relative space-y-2">
                        {/* Dot */}
                        <div className="absolute -left-[31px] top-1 bg-blue-900 h-4 h-4 rounded-full border-4 border-white shadow-sm" />
                        
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

          {/* TAB 7: COMPLETION & IMPACT */}
          {activeTab === "impact" && (
            <GovCard>
              <GovCardHeader className="bg-slate-50 border-b flex justify-between items-center">
                <GovCardTitle>Completion & Impact Scorecard</GovCardTitle>
                {/* Submit Completion: Visible to NGO partner */}
                {isNgoLinkedToThis && (requirement.status === "IN_PROGRESS" || requirement.status === "EXECUTION_STARTED") && !showCompletionForm && (
                  <Button
                    onClick={() => setShowCompletionForm(true)}
                    className="bg-blue-900 text-white font-bold text-xs"
                  >
                    Submit Completion Report
                  </Button>
                )}
                {/* Generate Impact Report: Visible to Admins */}
                {user?.role === "SUPER_ADMIN" && requirement.status === "COMPLETION_SUBMITTED" && (
                  <Button
                    onClick={handleGenerateImpact}
                    className="bg-green-700 hover:bg-green-800 text-white font-bold text-xs"
                  >
                    Calculate Impact Score
                  </Button>
                )}
              </GovCardHeader>
              <GovCardBody className="space-y-6 text-xs">
                {/* Completion Report Form */}
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
                        <label className="block font-bold text-slate-700 mb-1">Final Project Cost (INR) *</label>
                        <input
                          type="number"
                          required
                          className="w-full border rounded px-2.5 py-1.5"
                          value={completionForm.finalCost}
                          onChange={e => setCompletionForm({ ...completionForm, finalCost: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Actual Beneficiary Count *</label>
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
                      <Button type="button" onClick={() => setShowCompletionForm(false)} className="bg-slate-200 text-slate-800">
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-900 text-white font-bold">
                        Submit Report
                      </Button>
                    </div>
                  </form>
                )}

                {/* Display Completion & Impact details */}
                {!requirement.completionReport && !requirement.impactReport ? (
                  <div className="p-8 text-center text-slate-400 italic">Project is not yet completed. Completion logs will appear once execution finishes.</div>
                ) : (
                  <div className="space-y-6">
                    {/* Completion report summary */}
                    {requirement.completionReport && (
                      <div className="border p-4 rounded-xl bg-slate-50/50 space-y-3">
                        <h4 className="font-bold text-slate-900 text-sm">NGO Project Completion Log</h4>
                        <p className="text-slate-655">{requirement.completionReport.workCompletedSummary}</p>
                        <div className="grid grid-cols-2 gap-4 text-slate-600">
                          <div>Final Cost: <strong>₹{Number(requirement.completionReport.finalCost).toLocaleString()}</strong></div>
                          <div>Actual Reach: <strong>{requirement.completionReport.beneficiaryCount} lives</strong></div>
                        </div>
                      </div>
                    )}

                    {/* Impact scorecard */}
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

        {/* Right Sidebar: Quick Stats & Support Panel */}
        <div className="space-y-4">
          <GovCard>
            <GovCardHeader className="bg-slate-50 border-b">
              <GovCardTitle>Project Status Details</GovCardTitle>
            </GovCardHeader>
            <GovCardBody className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="flex justify-between">
                <span>Estimated Cost:</span>
                <strong className="text-slate-800">₹{Number(requirement.estimatedCost).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span>Beneficiary Reach:</span>
                <strong className="text-slate-800">{requirement.beneficiaryCount} lives</strong>
              </div>
              <div className="flex justify-between">
                <span>Priority Scope:</span>
                <strong className="text-slate-800">{requirement.priorityLevel}</strong>
              </div>
              <div className="flex justify-between">
                <span>Posted Date:</span>
                <strong className="text-slate-800">{new Date(requirement.createdAt).toLocaleDateString()}</strong>
              </div>

              {selectedNGO && (
                <div className="pt-3 border-t space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Implementation Partner</span>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                    <Landmark size={14} className="text-slate-500" />
                    {selectedNGO.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Rating: 4.5 ★ • Empanelled: {selectedNGO.empanelmentStatus}
                  </div>
                </div>
              )}
            </GovCardBody>
          </GovCard>
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
                <Button type="button" onClick={() => setShowApplyModal(false)} className="bg-slate-200 text-slate-800">Cancel</Button>
                <Button type="submit" disabled={submittingNgo} className="bg-blue-900 text-white font-bold">
                  {submittingNgo ? "Submitting..." : "Submit Bidding proposal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Company Express Interest */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 text-slate-700">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Express CSR Funding Interest</h3>
              <button onClick={() => setShowInterestModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleCompanyInterest} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Funding Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                    value={companyForm.fundingAmount}
                    onChange={e => setCompanyForm({ ...companyForm, fundingAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Funding Type *</label>
                  <select
                    className="w-full border rounded px-2.5 py-1.5 bg-slate-50 focus:outline-none"
                    value={companyForm.fundingType}
                    onChange={e => setCompanyForm({ ...companyForm, fundingType: e.target.value })}
                  >
                    <option value="FULL_FUNDING">FULL FUNDING</option>
                    <option value="PARTIAL_FUNDING">PARTIAL FUNDING</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Focus Alignment Notes</label>
                <textarea
                  placeholder="e.g. aligns with company education support focus areas."
                  className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                  rows={2}
                  value={companyForm.focusAlignmentNotes}
                  onChange={e => setCompanyForm({ ...companyForm, focusAlignmentNotes: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Message to Beneficiary</label>
                <textarea
                  placeholder="Introduce company interest, discussion points, or queries."
                  className="w-full border rounded px-2.5 py-1.5 bg-slate-50"
                  rows={2}
                  value={companyForm.discussionMessage}
                  onChange={e => setCompanyForm({ ...companyForm, discussionMessage: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" onClick={() => setShowInterestModal(false)} className="bg-slate-200 text-slate-800">Cancel</Button>
                <Button type="submit" disabled={submittingCompany} className="bg-blue-900 text-white font-bold">
                  {submittingCompany ? "Sending..." : "Submit CSR Interest"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
