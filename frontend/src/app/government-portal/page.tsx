"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, Landmark, ShieldCheck, CheckCircle2, XCircle, 
  MapPin, Coins, FileText, Download, Calendar, Layers, ShieldAlert,
  BarChart2, FileDown, PlusCircle, Trash, MessageSquare, Send, Settings as SettingsIcon, AlertTriangle
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatsCard } from "@/components/ui/StatsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";

const GisMap = dynamic(() => import("@/components/GisMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[580px] w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 font-semibold">Initializing digital GIS network...</span>
      </div>
    </div>
  )
});

const FundingGrowthChart = dynamic(() => import("@/components/AnalyticsCharts").then(mod => mod.FundingGrowthChart), {
  ssr: false,
  loading: () => <div className="h-[260px] w-full flex items-center justify-center text-slate-400">Loading charts...</div>
});

type GovTab = 
  | "statewide" | "district" | "analytics" | "ngo-verify" | "company-verify" 
  | "project-verify" | "monitoring" | "compliance" | "impact" | "heatmaps" 
  | "circulars" | "knowledge" | "feedback" | "audit" | "settings" | "reports";

const TableLoader = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 w-full bg-white rounded-xl border border-slate-100">
    <div className="w-10 h-10 rounded-full border-4 border-[#1e3a8a] border-t-transparent animate-spin" />
    <span className="text-xs text-slate-500 font-semibold">{message}</span>
  </div>
);

export default function GovernmentPortal({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<GovTab>("statewide");
  const [loading, setLoading] = useState(true);
  const [reviewEntity, setReviewEntity] = useState<any>(null);
  const [reviewEntityType, setReviewEntityType] = useState<"NGO" | "COMPANY" | null>(null);

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as GovTab);
    }
  }, [params?.tab]);

  const handleTabChange = (tab: GovTab) => {
    setActiveTab(tab);
    router.push(`/government-portal/${tab}`);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<any[]>("/ngos?status=PENDING"),
      apiFetch<any[]>("/companies?status=PENDING"),
      apiFetch<any[]>("/projects?status=SUBMITTED")
    ])
      .then(([ngoRows, companyRows, projectRows]) => {
        setNgos(ngoRows.map((ngo) => ({
          id: ngo.id,
          name: ngo.name,
          darpanId: ngo.darpanNumber,
          csr1: ngo.csr1Number,
          district: ngo.district,
          contact: ngo.website || "Not published"
        })));
        setCompanies(companyRows.map((company) => ({
          id: company.id,
          name: company.name,
          budget: `INR ${Number(company.csrBudget).toLocaleString("en-IN")}`,
          industry: company.contactInfo?.industry || "Corporate",
          district: company.contactInfo?.district || "Maharashtra"
        })));
        setProjects(projectRows.map((project) => ({
          id: project.id,
          title: project.title,
          budget: Number(project.budgetRequested),
          focusArea: project.focusArea,
          district: project.district,
          taluka: project.taluka,
          ngo: project.ngo?.name || "Registered NGO"
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Mock NGO registrations awaiting verification
  const [ngos, setNgos] = useState([
    { id: "ngo-x", name: "Vidarbha Adivasi Vikas Sanstha", darpanId: "MH/2023/048591", csr1: "CSR-1 Pending", district: "Gadchiroli", contact: "vidarbha_adivasi@domain.org" },
    { id: "ngo-y", name: "Konkan Sagarmata Mandal", darpanId: "MH/2024/095812", csr1: "CSR-1 Submitted", district: "Ratnagiri", contact: "konkan_sagarmata@domain.org" }
  ]);

  // Mock companies awaiting verification
  const [companies, setCompanies] = useState([
    { id: "comp-a", name: "Apex Steel Industries Ltd", budget: "₹85 Lakhs", industry: "Steel Manufacturing", district: "Nagpur" }
  ]);

  // Mock projects awaiting market-listing approval
  const [projects, setProjects] = useState([
    { id: "proj-x", title: "Washim Primary School Solar-Grid installations", budget: 1500000, focusArea: "Environmental Care", district: "Washim", taluka: "Risod", ngo: "Pragati Shikshan Trust" },
    { id: "proj-y", title: "Nandurbar Tribal Nutritional Support Campaign", budget: 2200000, focusArea: "Healthcare & Sanitation", district: "Nandurbar", taluka: "Akrani", ngo: "Satpura Welfare Society" }
  ]);

  // Circular Editor State
  const [newCirTitle, setNewCirTitle] = useState("");
  const [newCirBody, setNewCirBody] = useState("");
  const [newCirTag, setNewCirTag] = useState("Aspirational Talukas");

  // Citizen Feedbacks State
  const [feedbacks, setFeedbacks] = useState([
    { id: "1", type: "Suggestion", user: "Gopal Joshi", message: "Integrating digital smart screens has boosted tribal ZP school attendance by 20%. Requesting more funding." },
    { id: "2", type: "Grievance", user: "Seema Salve", message: "Delay in NGO Darpan background checks. Our verification is stuck for 2 weeks." }
  ]);

  const [auditedNgoIds, setAuditedNgoIds] = useState<string[]>([]);
  const [auditedProjIds, setAuditedProjIds] = useState<string[]>([]);

  const handleVerifyNgo = (id: string, approve: boolean) => {
    setAuditedNgoIds([...auditedNgoIds, id]);
    apiFetch(`/ngos/${id}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ status: approve ? "VERIFIED" : "REJECTED", rejectionReason: approve ? undefined : "Flagged for credentials audit" })
    }).catch(() => {});
    setTimeout(() => {
      setNgos(ngos.filter(n => n.id !== id));
      alert(approve ? "NGO approved and credentials activated." : "NGO flagged for credentials audit.");
    }, 500);
  };

  const handleVerifyCompany = (id: string, approve: boolean) => {
    apiFetch(`/companies/${id}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ status: approve ? "VERIFIED" : "REJECTED", rejectionReason: approve ? undefined : "Flagged for budget audit" })
    }).catch(() => {});
    setTimeout(() => {
      setCompanies(companies.filter(c => c.id !== id));
      alert(approve ? "Corporate account verified." : "Corporate flagged for budget audit.");
    }, 500);
  };

  const handleVerifyProject = (id: string, approve: boolean) => {
    setAuditedProjIds([...auditedProjIds, id]);
    apiFetch(`/projects/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: approve ? "APPROVED" : "REJECTED" })
    }).catch(() => {});
    setTimeout(() => {
      setProjects(projects.filter(p => p.id !== id));
      alert(approve ? "Project proposal listed in public directories." : "Project proposal rejected.");
    }, 500);
  };

  const handleOpenNgoReviewModal = (ngo: any) => {
    setReviewEntity(ngo);
    setReviewEntityType("NGO");
  };

  const handleOpenCompanyReviewModal = (comp: any) => {
    setReviewEntity(comp);
    setReviewEntityType("COMPANY");
  };

  const handlePublishCircular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCirTitle || !newCirBody) return;
    alert(`Circular resolution [${newCirTitle}] successfully published to the public registry!`);
    setNewCirTitle("");
    setNewCirBody("");
  };

  const pageMeta: Record<GovTab, { title: string; description: string; office: string; status: string }> = {
    statewide: {
      title: "Statewide CSR Oversight",
      description: "Consolidated monitor for funds sourced, verified institutions, disbursed capital, and district-level compliance posture.",
      office: "State CSR Monitoring Cell",
      status: "Live monitoring"
    },
    district: {
      title: "District Coverage Register",
      description: "District-wise CSR penetration, verified NGO availability, project density, and sourcing gaps for administrative review.",
      office: "District Coordination Desk",
      status: "Reviewed monthly"
    },
    analytics: {
      title: "CSR Sourcing Analytics",
      description: "Trend analysis for CSR capital mobilization, beneficiary reach, project approvals, and statewide implementation velocity.",
      office: "Data and Evaluation Unit",
      status: "Dashboard view"
    },
    "ngo-verify": {
      title: "NGO Verification Desk",
      description: "Credential review queue for NGO Darpan, CSR-1, PAN, 12A/80G, registration, and location records.",
      office: "Registration Audit Cell",
      status: `${ngos.length} pending`
    },
    "company-verify": {
      title: "Corporate Verification Desk",
      description: "Corporate identity, CSR budget, CIN, GST, PAN, focus-area, and policy validation before platform activation.",
      office: "Corporate Compliance Cell",
      status: `${companies.length} pending`
    },
    "project-verify": {
      title: "Project Approval Desk",
      description: "Administrative review queue for NGO proposals before listing them in the CSR project marketplace.",
      office: "Project Sanction Committee",
      status: `${projects.length} pending`
    },
    monitoring: {
      title: "Milestone Inspection Register",
      description: "Milestone evidence, field review, tranche readiness, and unresolved inspection matters for funded initiatives.",
      office: "Inspection and Escrow Cell",
      status: "Operational"
    },
    compliance: {
      title: "Compliance Audit Register",
      description: "Regulatory watchlist for overdue documents, rejected filings, funding exceptions, and audit follow-up.",
      office: "Compliance Review Cell",
      status: "Audit mode"
    },
    impact: {
      title: "Impact Assessment Desk",
      description: "Beneficiary outcomes, SDG coverage, focus-sector reach, and outcome evidence for completed and active projects.",
      office: "Impact Evaluation Unit",
      status: "Assessment view"
    },
    heatmaps: {
      title: "GIS Heatmap Monitor",
      description: "Geographic view of CSR project activity, funding density, beneficiary coverage, and under-served districts.",
      office: "GIS and Planning Cell",
      status: "Map view"
    },
    circulars: {
      title: "Government Circular Management",
      description: "Publish and maintain policy circulars, government resolutions, guidelines, and administrative advisories.",
      office: "Policy Publication Desk",
      status: "Drafting enabled"
    },
    knowledge: {
      title: "Knowledge Index",
      description: "Reference material for CSR rules, NGO registration, Section 135 compliance, and operational guidance.",
      office: "Knowledge Management Cell",
      status: "Reference view"
    },
    feedback: {
      title: "Citizen Feedback Register",
      description: "Track suggestions, grievances, field observations, and user feedback for administrative follow-up.",
      office: "Public Grievance Cell",
      status: `${feedbacks.length} entries`
    },
    audit: {
      title: "System Audit Trail",
      description: "Event history for verification actions, user access, data changes, and administrative decisions.",
      office: "Security Audit Cell",
      status: "Restricted"
    },
    settings: {
      title: "Government Portal Settings",
      description: "Administrative configuration for government portal workflows, publishing, and audit preferences.",
      office: "System Administration",
      status: "Restricted"
    },
    reports: {
      title: "Government Reports Desk",
      description: "Generate official summaries for district performance, CSR utilization, verification backlog, and compliance.",
      office: "Reporting Cell",
      status: "Export ready"
    }
  };

  const currentPage = pageMeta[activeTab] || pageMeta.statewide;

  return (
    <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto flex flex-col gap-7 min-h-screen">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
        <div className="p-6 md:p-7 flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="flex flex-col gap-2 max-w-3xl">
              <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert size={14} /> Maharashtra CSR Authority
              </span>
              <div>
                <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-slate-950 tracking-tight">{currentPage.title}</h1>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{currentPage.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs min-w-0 lg:min-w-[440px]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Office</span>
                <span className="block mt-1 font-bold text-slate-900">{currentPage.office}</span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="block text-[10px] font-bold uppercase text-emerald-700">Status</span>
                <span className="block mt-1 font-bold text-emerald-900">{currentPage.status}</span>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 col-span-2 sm:col-span-1">
                <span className="block text-[10px] font-bold uppercase text-blue-700">Access Class</span>
                <span className="block mt-1 font-bold text-blue-950">Super Admin</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] font-semibold text-slate-500">
            <span>Government of Maharashtra | Department of Industries and Social Welfare</span>
            <span>Last reviewed: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Tab 1: Statewide Monitor */}
      {activeTab === "statewide" && (
        <div className="flex flex-col gap-7 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard label="Aggregate Sourced CSR Funds" value="₹18.40 Cr" icon={Coins} />
            <StatsCard label="Escrow Capital Disbursed" value="₹10.50 Cr" icon={ShieldCheck} />
            <StatsCard label="Verified NGO accounts" value="145 NGOs" icon={Landmark} />
            <StatsCard label="Active CSR Corporates" value="52 Companies" icon={Building2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-5">
              <Card>
                <CardHeader className="flex justify-between items-center sm:flex-row flex-col gap-4">
                  <h3 className="govt-section-header">
                    <Layers size={20} />
                    Statewide Compliance Audit Summary
                  </h3>
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5 shadow-sm text-xs py-1.5 px-3" onClick={() => alert("Statewide GR Report downloaded.")}>
                    <Download size={14} /> Download GR Report (PDF)
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-800 font-bold text-sm">Pune District CSR Allocation</span>
                      <span className="text-slate-500 text-xs">Total: ₹4.80 Cr Sourced • 14 Projects</span>
                    </div>
                    <span className="govt-badge govt-badge-verified">High Compliance</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-800 font-bold text-sm">Gadchiroli Tribal Area Allocation</span>
                      <span className="text-slate-500 text-xs">Total: ₹2.50 Cr Sourced • 8 Projects</span>
                    </div>
                    <span className="govt-badge govt-badge-verified">High Compliance</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="govt-section-header text-base">
                  <AlertTriangle className="text-amber-500" size={18} />
                  Verification Backlog
                </h3>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-600">NGO Registrations Pending</span>
                      <span className="text-[#f97316] font-bold text-sm">{ngos.length} Requests</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-600">Project Listings Pending</span>
                      <span className="text-[#f97316] font-bold text-sm">{projects.length} Proposals</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: District Grids */}
      {activeTab === "district" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <MapPin size={20} />
              Regional District Coverage Indices
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>District Name</th>
                  <th>Sourced CSR Capital</th>
                  <th>Active Projects</th>
                  <th>Verified NGOs</th>
                  <th className="text-right">Penetration Rating</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Pune", funding: "₹5.50 Cr", projects: 29, ngos: 24, rate: "High" },
                  { name: "Mumbai City", funding: "₹4.50 Cr", projects: 22, ngos: 18, rate: "High" },
                  { name: "Nagpur", funding: "₹3.50 Cr", projects: 20, ngos: 16, rate: "High" },
                  { name: "Gadchiroli", funding: "₹2.50 Cr", projects: 14, ngos: 8, rate: "Medium" }
                ].map((d, index) => (
                  <tr key={index}>
                    <td className="font-bold text-slate-800">{d.name}</td>
                    <td>{d.funding}</td>
                    <td>{d.projects}</td>
                    <td>{d.ngos}</td>
                    <td className="text-right"><span className="govt-badge govt-badge-verified">{d.rate}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Sourcing Analytics */}
      {activeTab === "analytics" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <BarChart2 size={20} />
              Cumulative Sourcing Analytics
            </h3>
          </CardHeader>
          <CardContent className="h-[320px] w-full bg-white p-4">
            <FundingGrowthChart />
          </CardContent>
        </Card>
      )}

      {/* Tab 4: NGO Verification Queue */}
      {activeTab === "ngo-verify" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <Landmark size={20} />
              NGO Credentials Verification Registry
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <TableLoader message="Retrieving pending NGO registrations from server..." />
            ) : ngos.length > 0 ? (
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>NGO Name</th>
                    <th>Darpan ID</th>
                    <th>Location</th>
                    <th>CSR-1 Status</th>
                    <th className="text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ngos.map((ngo) => (
                    <tr key={ngo.id}>
                      <td className="font-bold text-slate-800">
                        <button 
                          onClick={() => handleOpenNgoReviewModal(ngo)}
                          className="font-bold text-[#12325a] hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                        >
                          {ngo.name}
                        </button>
                      </td>
                      <td>{ngo.darpanId}</td>
                      <td>{ngo.district}</td>
                      <td><span className="govt-badge govt-badge-pending">{ngo.csr1}</span></td>
                      <td className="text-right flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleOpenNgoReviewModal(ngo)} className="flex items-center gap-1.5 py-1 px-3 text-xs border-slate-300 hover:bg-slate-50 text-slate-750 font-semibold"><FileText size={12} /> Review</Button>
                        <Button variant="primary" size="sm" onClick={() => handleVerifyNgo(ngo.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 py-1 px-3 text-xs"><CheckCircle2 size={12} /> Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleVerifyNgo(ngo.id, false)} className="flex items-center gap-1.5 py-1 px-3 text-xs"><XCircle size={12} /> Flag</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="NGO verification queue clear" description="All registrations audited." icon={CheckCircle2} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Corporate verification */}
      {activeTab === "company-verify" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <Building2 size={20} />
              Corporate Account Audits
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <TableLoader message="Retrieving corporate registrations from server..." />
            ) : companies.length > 0 ? (
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>Corporate Name</th>
                    <th>Industry</th>
                    <th>State Location</th>
                    <th>CSR Budget</th>
                    <th className="text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((comp) => (
                    <tr key={comp.id}>
                      <td className="font-bold text-slate-800">
                        <button 
                          onClick={() => handleOpenCompanyReviewModal(comp)}
                          className="font-bold text-[#12325a] hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                        >
                          {comp.name}
                        </button>
                      </td>
                      <td>{comp.industry}</td>
                      <td>{comp.district}</td>
                      <td className="font-semibold text-slate-700">{comp.budget}</td>
                      <td className="text-right flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleOpenCompanyReviewModal(comp)} className="flex items-center gap-1.5 py-1 px-3 text-xs border-slate-300 hover:bg-slate-50 text-slate-750 font-semibold"><FileText size={12} /> Review</Button>
                        <Button variant="primary" size="sm" onClick={() => handleVerifyCompany(comp.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 py-1 px-3 text-xs"><CheckCircle2 size={12} /> Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleVerifyCompany(comp.id, false)} className="flex items-center gap-1.5 py-1 px-3 text-xs"><XCircle size={12} /> Flag</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="Corporate verification queue clear" description="All accounts approved." icon={CheckCircle2} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 6: Project Verification Desk */}
      {activeTab === "project-verify" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <ShieldCheck size={20} />
              Project Listings Approvals
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <TableLoader message="Retrieving pending project proposals from server..." />
            ) : projects.length > 0 ? (
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>Proposal Title</th>
                    <th>Proposing NGO</th>
                    <th>Target Territory</th>
                    <th>Requested Budget</th>
                    <th className="text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => (
                    <tr key={proj.id}>
                      <td className="font-bold text-slate-800">{proj.title}</td>
                      <td>{proj.ngo}</td>
                      <td>{proj.district}, {proj.taluka}</td>
                      <td className="font-semibold text-slate-700">₹{proj.budget.toLocaleString("en-IN")}</td>
                      <td className="text-right flex gap-2 justify-end">
                        <Button variant="primary" size="sm" onClick={() => handleVerifyProject(proj.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 py-1 px-3 text-xs"><CheckCircle2 size={12} /> Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleVerifyProject(proj.id, false)} className="flex items-center gap-1.5 py-1 px-3 text-xs"><XCircle size={12} /> Flag</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="Project approval queue clear" description="All project listings verified." icon={CheckCircle2} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 7: Circulars Editor */}
      {activeTab === "circulars" && (
        <Card className="max-w-2xl mx-auto w-full animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <FileText size={20} />
              Publish Government Resolution (GR)
            </h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePublishCircular} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Circular Title:</span>
                <input 
                  type="text" 
                  value={newCirTitle} 
                  onChange={(e) => setNewCirTitle(e.target.value)}
                  placeholder="e.g. GR-2026/06: Funding for tribal talukas"
                  className="govt-input" 
                  required 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Subject / Policy tag:</span>
                <select 
                  value={newCirTag} 
                  onChange={(e) => setNewCirTag(e.target.value)}
                  className="govt-input"
                >
                  <option>Aspirational Talukas</option>
                  <option>Taxation & Audit</option>
                  <option>Education</option>
                  <option>Escrow Guidelines</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Circular Content:</span>
                <textarea 
                  value={newCirBody} 
                  onChange={(e) => setNewCirBody(e.target.value)}
                  placeholder="Enter policy brief details..."
                  className="govt-input h-36 resize-none" 
                  required 
                />
              </div>
              <Button type="submit" variant="accent" className="py-2.5 text-sm">Publish Policy GR</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 8: Citizen Feedback Logs */}
      {activeTab === "feedback" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <MessageSquare size={20} />
              Citizen & User Feedbacks
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>Submitter Name</th>
                  <th>Category</th>
                  <th>Message / Grievance Details</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((f) => (
                  <tr key={f.id}>
                    <td className="font-bold text-slate-800">{f.user}</td>
                    <td>
                      <span className={`govt-badge ${f.type === "Grievance" ? "govt-badge-rejected" : "govt-badge-pending"}`}>
                        {f.type}
                      </span>
                    </td>
                    <td className="text-slate-600 leading-relaxed text-xs">{f.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === "monitoring" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="govt-section-header">
                <Calendar size={20} />
                Milestone Inspection Queue
              </h3>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Inspection Stage</th>
                    <th>District</th>
                    <th>Due Date</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { project: "Gadchiroli Watershed Initiative", stage: "Check dam structure verification", district: "Gadchiroli", due: "25 Jun 2026", status: "Field visit due" },
                    { project: "Pune Smart Classrooms", stage: "Asset delivery confirmation", district: "Pune", due: "30 Jun 2026", status: "Document review" }
                  ].map((row) => (
                    <tr key={row.project}>
                      <td className="font-bold text-slate-800">{row.project}</td>
                      <td>{row.stage}</td>
                      <td>{row.district}</td>
                      <td>{row.due}</td>
                      <td className="text-right"><span className="govt-badge govt-badge-pending">{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="govt-section-header text-base">
                <AlertTriangle size={18} />
                Inspection Controls
              </h3>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-xs text-slate-600">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">Require geo-tagged evidence for every tranche release.</div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">Escalate overdue inspections after 7 working days.</div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">Maintain physical verification notes for audit retention.</div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "compliance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {[
            { title: "NGO Credential Expiry Watch", value: "12 records", tone: "amber", detail: "12A/80G, CSR-1, Darpan, and registration renewals due within 60 days." },
            { title: "Funding Exception Review", value: "3 records", tone: "rose", detail: "Milestone releases requiring secondary approval before clearance." },
            { title: "Corporate Filing Pending", value: "5 records", tone: "blue", detail: "CSR policy, board approval, and budget declaration records pending validation." },
            { title: "Audit Completed This Month", value: "42 records", tone: "emerald", detail: "Verification decisions logged with user, timestamp, and organization reference." }
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="p-5 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">{item.title}</span>
                <span className="text-2xl font-extrabold text-slate-900">{item.value}</span>
                <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "impact" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="govt-section-header">
                <BarChart2 size={20} />
                Impact Assessment Matrix
              </h3>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>Focus Area</th>
                    <th>Beneficiaries</th>
                    <th>Districts</th>
                    <th>Projects</th>
                    <th className="text-right">Outcome Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Education", "62,400", "12", "41", "Strong"],
                    ["Water Conservation", "38,200", "8", "22", "Strong"],
                    ["Healthcare", "54,000", "10", "29", "Moderate"],
                    ["Environment", "21,700", "7", "16", "Moderate"]
                  ].map(([focus, beneficiaries, districts, projectCount, rating]) => (
                    <tr key={focus}>
                      <td className="font-bold text-slate-800">{focus}</td>
                      <td>{beneficiaries}</td>
                      <td>{districts}</td>
                      <td>{projectCount}</td>
                      <td className="text-right"><span className="govt-badge govt-badge-verified">{rating}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h3 className="govt-section-header text-base">Assessment Notes</h3>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 leading-relaxed">
              Outcome ratings should be based on verified beneficiary evidence, tranche completion, district officer review, and post-implementation checks.
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "heatmaps" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <MapPin size={20} />
              GIS Funding and Project Density Heatmap
            </h3>
          </CardHeader>
          <CardContent>
            <GisMap />
          </CardContent>
        </Card>
      )}

      {activeTab === "knowledge" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {[
            ["Section 135 Compliance", "CSR applicability, board committee duties, spending requirements, and annual disclosure rules."],
            ["NGO Registration Checklist", "Darpan, CSR-1, PAN, 12A, 80G, audited statements, and office location validation."],
            ["Milestone Evidence Standards", "Geo-tagged photos, beneficiary records, invoices, field reports, and completion certificates."],
            ["District Priority Guidance", "Aspirational talukas, tribal areas, water-stress zones, and school infrastructure needs."]
          ].map(([title, detail]) => (
            <Card key={title}>
              <CardContent className="p-5 flex flex-col gap-2">
                <span className="font-bold text-slate-900">{title}</span>
                <p className="text-xs text-slate-600 leading-relaxed">{detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "audit" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">
              <FileText size={20} />
              Administrative Audit Trail
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Officer</th>
                  <th>Action</th>
                  <th className="text-right">Reference</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["18 Jun 2026, 16:10", "admin@mahacsr.gov.in", "NGO verification reviewed", "NGO-QUEUE"],
                  ["18 Jun 2026, 15:42", "admin@mahacsr.gov.in", "Project approval desk opened", "PROJECT-QUEUE"],
                  ["18 Jun 2026, 15:20", "system", "Matching scores recalculated", "MATCHING"]
                ].map(([time, officer, action, ref]) => (
                  <tr key={`${time}-${action}`}>
                    <td>{time}</td>
                    <td className="font-bold text-slate-800">{officer}</td>
                    <td>{action}</td>
                    <td className="text-right font-bold text-[#1e3a8a]">{ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {[
            ["Verification SLA", "7 working days", "Maximum review period for pending NGO, corporate, and project queues."],
            ["Escalation Threshold", "3 reminders", "Automatic escalation to state office after repeated unresolved compliance notices."],
            ["Report Retention", "8 years", "Audit and evidence records retained for statutory and administrative review."],
            ["Access Mode", "Super Admin only", "Government configuration pages are restricted to platform administrators."]
          ].map(([label, value, detail]) => (
            <Card key={label}>
              <CardContent className="p-5 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
                <span className="text-xl font-extrabold text-slate-900">{value}</span>
                <p className="text-xs text-slate-600">{detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "reports" && (
        <Card className="animate-fadeIn max-w-3xl">
          <CardHeader>
            <h3 className="govt-section-header">
              <FileDown size={20} />
              Official Reports Desk
            </h3>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "District CSR Utilization Report",
              "Verification Backlog Summary",
              "CSR Funding and Tranche Register",
              "Annual State Impact Statement"
            ].map((report) => (
              <Button key={report} variant="outline" className="justify-between py-3">
                <span>{report}</span>
                <Download size={14} />
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Entity Onboarding Review Modal */}
      {reviewEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn text-slate-900">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                {reviewEntityType === "NGO" ? <Landmark className="text-[#12325a]" size={20} /> : <Building2 className="text-[#12325a]" size={20} /> }
                <h3 className="font-heading font-extrabold text-lg text-slate-900">
                  {reviewEntityType === "NGO" ? "NGO" : "Corporate"} Onboarding Credentials Review
                </h3>
              </div>
              <button 
                onClick={() => { setReviewEntity(null); setReviewEntityType(null); }}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer text-lg font-bold p-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#f97316] mb-3">Submitted Registration Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  {reviewEntityType === "NGO" ? (
                    <>
                      <div>
                        <span className="block text-slate-500 font-medium">NGO Legal Name</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.name}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">NGO Darpan ID</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.darpanId}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">CSR-1 Registry Code</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.csr1}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Registered Office Address</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">Plot No 42, Bandra East, Mumbai</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">District Location</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.district}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Official Website / Contact</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.contact}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Organization PAN Card</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">ABCDE1234F</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Registration Authority</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">Charity Commissioner, Maharashtra</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="block text-slate-500 font-medium">Company Legal Name</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.name}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Corporate CIN Code</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">L72200MH2018PLC309876</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">GSTIN Registry</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">27AAAAA1111A1Z1</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">CSR Sourcing Budget</span>
                        <strong className="block text-[#12325a] text-sm mt-0.5">{reviewEntity.budget}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Industry Classification</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.industry}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">State Headquarters</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">{reviewEntity.district}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Company PAN Registry</span>
                        <strong className="block text-slate-900 text-sm mt-0.5">AAACC1234E</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-medium">Onboarding Status</span>
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded mt-1">Pending Approval</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#f97316] mb-3">Uploaded Verification Documents</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="p-3">Document Name</th>
                        <th className="p-3">File Name</th>
                        <th className="p-3">File Size</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reviewEntityType === "NGO" ? (
                        [
                          ["Registration Certificate", "registration_certificate.pdf", "820 KB"],
                          ["NGO Darpan Registration", "darpan_profile_audit.pdf", "1.1 MB"],
                          ["CSR-1 Registry Approval", "csr1_approval_cert.pdf", "740 KB"],
                          ["12A Registration Certificate", "12a_tax_exemption.pdf", "1.2 MB"],
                          ["80G Registration Certificate", "80g_deduction_approval.pdf", "980 KB"],
                          ["Audited Financials (3 Years)", "financial_statements_last3years.pdf", "3.1 MB"],
                          ["Board Resolution / Authority Letter", "board_resolution_auth.pdf", "420 KB"]
                        ].map(([docName, fileName, size]) => (
                          <tr key={docName} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{docName}</td>
                            <td className="p-3 text-slate-500 font-mono">{fileName}</td>
                            <td className="p-3 text-slate-400">{size}</td>
                            <td className="p-3 text-right">
                              <a 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); alert(`Downloading ${fileName}...`); }}
                                className="text-[#12325a] font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <Download size={12} /> View Document
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        [
                          ["CIN Incorporation Certificate", "cin_certificate_of_inc.pdf", "1.2 MB"],
                          ["GST Registration Document", "gst_certificate_registered.pdf", "650 KB"],
                          ["Company PAN Registry", "corporate_pan_card.pdf", "420 KB"],
                          ["CSR Policy Declaration", "board_approved_csr_policy.pdf", "1.4 MB"],
                          ["Audited Financial Statements", "annual_financials_fy25.pdf", "2.8 MB"]
                        ].map(([docName, fileName, size]) => (
                          <tr key={docName} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{docName}</td>
                            <td className="p-3 text-slate-500 font-mono">{fileName}</td>
                            <td className="p-3 text-slate-400">{size}</td>
                            <td className="p-3 text-right">
                              <a 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); alert(`Downloading ${fileName}...`); }}
                                className="text-[#12325a] font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <Download size={12} /> View Document
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between gap-3">
              <Button 
                variant="outline" 
                onClick={() => { setReviewEntity(null); setReviewEntityType(null); }}
                className="border-slate-300 hover:bg-slate-100 text-slate-700 text-xs py-1.5 px-4"
              >
                Close Review
              </Button>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (reviewEntityType === "NGO") {
                      handleVerifyNgo(reviewEntity.id, false);
                    } else {
                      handleVerifyCompany(reviewEntity.id, false);
                    }
                    setReviewEntity(null);
                    setReviewEntityType(null);
                  }}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  <XCircle size={14} /> Flag
                </Button>
                <Button 
                  onClick={() => {
                    if (reviewEntityType === "NGO") {
                      handleVerifyNgo(reviewEntity.id, true);
                    } else {
                      handleVerifyCompany(reviewEntity.id, true);
                    }
                    setReviewEntity(null);
                    setReviewEntityType(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Approve & Activate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
