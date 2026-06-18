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

const GisMap = dynamic(() => import("@/components/GisMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[580px] w-full flex items-center justify-center bg-slate-900/40 rounded-3xl border border-slate-800/80">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Initializing digital GIS network...</span>
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

export default function GovernmentPortal({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<GovTab>("statewide");

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as GovTab);
    }
  }, [params?.tab]);

  const handleTabChange = (tab: GovTab) => {
    setActiveTab(tab);
    router.push(`/government-portal/${tab}`);
  };

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
    setTimeout(() => {
      setNgos(ngos.filter(n => n.id !== id));
      alert(approve ? "NGO approved and credentials activated." : "NGO flagged for credentials audit.");
    }, 500);
  };

  const handleVerifyCompany = (id: string, approve: boolean) => {
    setTimeout(() => {
      setCompanies(companies.filter(c => c.id !== id));
      alert(approve ? "Corporate account verified." : "Corporate flagged for budget audit.");
    }, 500);
  };

  const handleVerifyProject = (id: string, approve: boolean) => {
    setAuditedProjIds([...auditedProjIds, id]);
    setTimeout(() => {
      setProjects(projects.filter(p => p.id !== id));
      alert(approve ? "Project proposal listed in public directories." : "Project proposal rejected.");
    }, 500);
  };

  const handlePublishCircular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCirTitle || !newCirBody) return;
    alert(`Circular resolution [${newCirTitle}] successfully published to the public registry!`);
    setNewCirTitle("");
    setNewCirBody("");
  };

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Header Banner */}
      <div className="flex flex-col gap-1">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <ShieldAlert size={14} /> Maharashtra CSR Authority (महाराष्ट्र शासन)
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Government Audit Portal</h1>
      </div>

      {/* Gov Sub-Tabs Switches */}
      <div className="flex gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        {[
          { id: "statewide", label: "Statewide Monitor", icon: Layers },
          { id: "district", label: "District Grids", icon: MapPin },
          { id: "analytics", label: "Sourcing Analytics", icon: BarChart2 },
          { id: "ngo-verify", label: "NGO Verifications", icon: Landmark },
          { id: "company-verify", label: "Corporate Verifications", icon: Building2 },
          { id: "project-verify", label: "Project Approvals", icon: ShieldCheck },
          { id: "circulars", label: "Circulars Editor", icon: FileText },
          { id: "feedback", label: "Citizen Feedbacks", icon: MessageSquare }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as GovTab)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
                isActive 
                  ? "border-[#f97316] text-[#f97316] bg-slate-900/50" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Statewide Monitor */}
      {activeTab === "statewide" && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard label="Aggregate Sourced CSR Funds" value="₹18.40 Cr" icon={Coins} />
            <StatsCard label="Escrow Capital Disbursed" value="₹10.50 Cr" icon={ShieldCheck} />
            <StatsCard label="Verified NGO accounts" value="145 NGOs" icon={Landmark} />
            <StatsCard label="Active CSR Corporates" value="52 Companies" icon={Building2} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <CardHeader className="flex justify-between items-center sm:flex-row flex-col gap-4">
                  <h3 className="font-heading font-bold text-lg text-slate-200">Statewide Compliance Audit Summary</h3>
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5 shadow-sm" onClick={() => alert("Statewide GR Report downloaded.")}>
                    <Download size={14} /> Download Statewide GR Report (PDF)
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-200 font-bold">Pune District CSR Allocation</span>
                      <span className="text-slate-500">Total: ₹4.80 Cr Sourced • 14 Projects</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">High Compliance</span>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-200 font-bold">Gadchiroli Tribal Area Allocation</span>
                      <span className="text-slate-500">Total: ₹2.50 Cr Sourced • 8 Projects</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">High Compliance</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="font-heading font-bold text-base text-slate-200">Verification Backlog</h3>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-xs font-medium text-slate-400">
                <div className="flex justify-between items-center bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                  <span>NGO Registrations Pending</span>
                  <span className="text-[#f97316] font-bold text-sm">{ngos.length} Requests</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                  <span>Project Listings Pending</span>
                  <span className="text-[#f97316] font-bold text-sm">{projects.length} Proposals</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: District Grids */}
      {activeTab === "district" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Regional District Coverage Indices</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-350">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                <tr>
                  <th className="py-3 px-5">District Name</th>
                  <th className="py-3 px-5">Sourced CSR Capital</th>
                  <th className="py-3 px-5">Active Projects</th>
                  <th className="py-3 px-5">Verified NGOs</th>
                  <th className="py-3 px-5 text-right">Penetration Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {[
                  { name: "Pune", funding: "₹5.50 Cr", projects: 29, ngos: 24, rate: "High" },
                  { name: "Mumbai City", funding: "₹4.50 Cr", projects: 22, ngos: 18, rate: "High" },
                  { name: "Nagpur", funding: "₹3.50 Cr", projects: 20, ngos: 16, rate: "High" },
                  { name: "Gadchiroli", funding: "₹2.50 Cr", projects: 14, ngos: 8, rate: "Medium" }
                ].map((d, index) => (
                  <tr key={index} className="hover:bg-slate-900/40">
                    <td className="py-4 px-5 text-slate-200 font-bold">{d.name}</td>
                    <td className="py-4 px-5">{d.funding}</td>
                    <td className="py-4 px-5">{d.projects}</td>
                    <td className="py-4 px-5">{d.ngos}</td>
                    <td className="py-4 px-5 text-right text-[#f97316] font-bold">{d.rate}</td>
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
            <h3 className="font-heading font-bold text-xl text-slate-100">Cumulative Sourcing Analytics</h3>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <FundingGrowthChart />
          </CardContent>
        </Card>
      )}

      {/* Tab 4: NGO Verification Queue */}
      {activeTab === "ngo-verify" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">NGO Credentials Verification Registry</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {ngos.length > 0 ? (
              <table className="w-full text-left text-sm text-slate-350">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                  <tr>
                    <th className="py-3 px-5">NGO Name</th>
                    <th className="py-3 px-5">Darpan ID</th>
                    <th className="py-3 px-5">Location</th>
                    <th className="py-3 px-5">CSR-1 Status</th>
                    <th className="py-3 px-5 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {ngos.map((ngo) => (
                    <tr key={ngo.id} className="hover:bg-slate-900/40">
                      <td className="py-4 px-5 font-bold text-slate-200">{ngo.name}</td>
                      <td className="py-4 px-5">{ngo.darpanId}</td>
                      <td className="py-4 px-5">{ngo.district}</td>
                      <td className="py-4 px-5 text-[#f97316]">{ngo.csr1}</td>
                      <td className="py-4 px-5 text-right flex gap-2 justify-end">
                        <Button variant="primary" size="sm" onClick={() => handleVerifyNgo(ngo.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"><CheckCircle2 size={12} /> Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleVerifyNgo(ngo.id, false)} className="flex items-center gap-1"><XCircle size={12} /> Flag</Button>
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
            <h3 className="font-heading font-bold text-xl text-slate-100">Corporate Account Audits</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {companies.length > 0 ? (
              <table className="w-full text-left text-sm text-slate-350">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                  <tr>
                    <th className="py-3 px-5">Corporate Name</th>
                    <th className="py-3 px-5">Industry</th>
                    <th className="py-3 px-5">State Location</th>
                    <th className="py-3 px-5">CSR Budget</th>
                    <th className="py-3 px-5 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {companies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-900/40">
                      <td className="py-4 px-5 font-bold text-slate-200">{comp.name}</td>
                      <td className="py-4 px-5">{comp.industry}</td>
                      <td className="py-4 px-5">{comp.district}</td>
                      <td className="py-4 px-5">{comp.budget}</td>
                      <td className="py-4 px-5 text-right flex gap-2 justify-end">
                        <Button variant="primary" size="sm" onClick={() => handleVerifyCompany(comp.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"><CheckCircle2 size={12} /> Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleVerifyCompany(comp.id, false)} className="flex items-center gap-1"><XCircle size={12} /> Flag</Button>
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
            <h3 className="font-heading font-bold text-xl text-slate-100">Project Listings Approvals</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {projects.length > 0 ? (
              <table className="w-full text-left text-sm text-slate-350">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                  <tr>
                    <th className="py-3 px-5">Proposal Title</th>
                    <th className="py-3 px-5">Proposing NGO</th>
                    <th className="py-3 px-5">Target Territory</th>
                    <th className="py-3 px-5">Requested Budget</th>
                    <th className="py-3 px-5 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-900/40">
                      <td className="py-4 px-5 font-bold text-slate-200">{proj.title}</td>
                      <td className="py-4 px-5">{proj.ngo}</td>
                      <td className="py-4 px-5">{proj.district}, {proj.taluka}</td>
                      <td className="py-4 px-5">₹{proj.budget.toLocaleString("en-IN")}</td>
                      <td className="py-4 px-5 text-right flex gap-2 justify-end">
                        <Button variant="primary" size="sm" onClick={() => handleVerifyProject(proj.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"><CheckCircle2 size={12} /> Approve</Button>
                        <Button variant="danger" size="sm" onClick={() => handleVerifyProject(proj.id, false)} className="flex items-center gap-1"><XCircle size={12} /> Flag</Button>
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
            <h3 className="font-heading font-bold text-xl text-slate-100">Publish Government Resolution (GR)</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePublishCircular} className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
              <div className="flex flex-col gap-1.5">
                <span>Circular Title:</span>
                <input 
                  type="text" 
                  value={newCirTitle} 
                  onChange={(e) => setNewCirTitle(e.target.value)}
                  placeholder="e.g. GR-2026/06: Funding for tribal talukas"
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-250 focus:outline-none" 
                  required 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span>Subject / Policy tag:</span>
                <select 
                  value={newCirTag} 
                  onChange={(e) => setNewCirTag(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                >
                  <option>Aspirational Talukas</option>
                  <option>Taxation & Audit</option>
                  <option>Education</option>
                  <option>Escrow Guidelines</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span>Circular Content:</span>
                <textarea 
                  value={newCirBody} 
                  onChange={(e) => setNewCirBody(e.target.value)}
                  placeholder="Enter policy brief details..."
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 h-36 focus:outline-none" 
                  required 
                />
              </div>
              <Button type="submit" className="py-2.5">Publish Policy GR</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 8: Citizen Feedback Logs */}
      {activeTab === "feedback" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Citizen & User Feedbacks</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-355">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                <tr>
                  <th className="py-3 px-5">Submitter Name</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Message / Grievance Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {feedbacks.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-900/40">
                    <td className="py-4 px-5 text-slate-200 font-bold">{f.user}</td>
                    <td className={`py-4 px-5 font-bold ${f.type === "Grievance" ? "text-rose-500" : "text-[#f97316]"}`}>{f.type}</td>
                    <td className="py-4 px-5 text-slate-400 leading-relaxed">{f.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
