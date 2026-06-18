"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  FolderPlus, Coins, Award, Clock, FileCheck2, Calendar as CalIcon, 
  AlertTriangle, FileText, ArrowUpRight, UploadCloud, Bell, 
  Settings as SettingsIcon, Layers, Users, Image as ImageIcon, CheckCircle2, X,
  Building2, Landmark, Compass, Sparkles, BarChart2, BookOpen, ShieldAlert,
  Send, ShieldCheck, HelpCircle, FileDown, PlusCircle, Trash
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatsCard } from "@/components/ui/StatsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";

type DashboardTab = 
  | "overview" | "profile" | "projects" | "drafts" | "submitted" | "approved"
  | "milestones" | "funding" | "reports" | "impact" | "beneficiaries" | "volunteers"
  | "documents" | "compliance" | "calendar" | "gallery" | "audit" | "settings" | "analytics";

export default function NgoDashboard({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Sync tab with route parameter if provided
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as DashboardTab);
    }
  }, [params?.tab]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    router.push(`/ngo-dashboard/${tab}`);
  };

  const [projects, setProjects] = useState([
    { id: "1", title: "Pune Zilla Parishad Smart Digital-Classrooms", budget: 3500000, funded: 0, completion: 0, status: "Submitted", district: "Pune", taluka: "Haveli" },
    { id: "2", title: "Gadchiroli Watershed & Reforestation Initiative", budget: 2500000, funded: 1200000, completion: 40, status: "Funded", district: "Gadchiroli", taluka: "Aheri" }
  ]);

  // Project Creation Form State
  const [newTitle, setNewTitle] = useState("");
  const [newBudget, setNewBudget] = useState("");
  const [newDistrict, setNewDistrict] = useState("Pune");
  const [newTaluka, setNewTaluka] = useState("");
  const [newFocus, setNewFocus] = useState("Education");

  // Beneficiary Log State
  const [beneficiaries, setBeneficiaries] = useState([
    { id: "b-1", name: "Ramesh Pawar", location: "Aheri, Gadchiroli", sector: "Water Supply", verifiedDate: "June 14, 2026" },
    { id: "b-2", name: "Sunita Gavit", location: "Mulshi, Pune", sector: "Education", verifiedDate: "June 10, 2026" }
  ]);
  const [bName, setBName] = useState("");
  const [bLoc, setBLoc] = useState("");
  const [bSec, setBSec] = useState("Water Supply");

  // Volunteers State
  const [volunteers, setVolunteers] = useState([
    { id: "v-1", name: "Anil Deshmukh", role: "Field Coordinator", hours: 45 },
    { id: "v-2", name: "Pooja Patil", role: "Nutritionist", hours: 30 }
  ]);
  const [vName, setVName] = useState("");
  const [vRole, setVRole] = useState("Volunteer");

  // Escrow Milestones State
  const [selectedMilestoneProject, setSelectedMilestoneProject] = useState("2");
  const [evidenceFile, setEvidenceFile] = useState<string | null>(null);
  const [evidenceSubmitted, setEvidenceSubmitted] = useState(false);

  // Gallery State
  const [galleryImages, setGalleryImages] = useState([
    { title: "Check Dam Construction Aheri", date: "June 12, 2026", size: "1.2 MB" },
    { title: "Smart Screen Delivery Mulshi", date: "June 08, 2026", size: "850 KB" }
  ]);
  const [newImageTitle, setNewImageTitle] = useState("");

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const newProj = {
      id: String(projects.length + 1),
      title: newTitle,
      budget: Number(newBudget),
      funded: 0,
      completion: 0,
      status: "Draft",
      district: newDistrict,
      taluka: newTaluka || "Mulshi"
    };
    setProjects([newProj, ...projects]);
    setNewTitle("");
    setNewBudget("");
    setNewTaluka("");
    handleTabChange("projects");
  };

  const handleAddBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName || !bLoc) return;
    const newB = {
      id: `b-${beneficiaries.length + 1}`,
      name: bName,
      location: bLoc,
      sector: bSec,
      verifiedDate: "Just now"
    };
    setBeneficiaries([newB, ...beneficiaries]);
    setBName("");
    setBLoc("");
  };

  const handleAddVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName) return;
    const newV = {
      id: `v-${volunteers.length + 1}`,
      name: vName,
      role: vRole,
      hours: 0
    };
    setVolunteers([newV, ...volunteers]);
    setVName("");
  };

  const handleAddGalleryImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageTitle) return;
    setGalleryImages([
      { title: newImageTitle, date: "Just now", size: "900 KB" },
      ...galleryImages
    ]);
    setNewImageTitle("");
  };

  const complianceAlerts = [
    { id: "a-1", title: "12A Certification Renewal Pending", expiry: "August 15, 2026", daysLeft: 58, severity: "warning" },
    { id: "a-2", title: "NGO Darpan Filing Outdated", expiry: "Immediate", daysLeft: 0, severity: "danger" }
  ];

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest">Sahyadri Eco Foundation</span>
          <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">NGO Console</h1>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleTabChange("compliance")}
            className="flex items-center gap-2"
          >
            <Bell size={16} /> Compliance Registry
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => handleTabChange("drafts")}
            className="flex items-center gap-2"
          >
            <FolderPlus size={16} /> Propose Initiative
          </Button>
        </div>
      </div>

      {/* Portal Tabs Switches */}
      <div className="flex gap-2 border-b border-slate-800 pb-px overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "profile", label: "Org Profile", icon: Landmark },
          { id: "projects", label: "Projects Ledger", icon: FileCheck2 },
          { id: "drafts", label: "Proposal Builder", icon: FolderPlus },
          { id: "milestones", label: "Milestone Escrow", icon: Coins },
          { id: "funding", label: "Drawdown Ledger", icon: Award },
          { id: "beneficiaries", label: "Beneficiary Log", icon: Users },
          { id: "volunteers", label: "Volunteer Roster", icon: Users },
          { id: "reports", label: "Annual Reports", icon: BarChart2 },
          { id: "gallery", label: "Media Gallery", icon: ImageIcon }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as DashboardTab)}
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

      {/* 1. Overview Tab */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard label="Proposals Lodged" value={projects.length} icon={FileCheck2} />
            <StatsCard label="Total Capital Sourced" value="₹12.0 Lakhs" icon={Coins} />
            <StatsCard label="Escrow Payouts Released" value="₹5.0 Lakhs" icon={Award} />
            <StatsCard label="Beneficiaries Registered" value={beneficiaries.length + 2450} icon={Users} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <h3 className="font-heading font-bold text-lg text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500" size={20} />
                    Compliance Expiry Alerts
                  </h3>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {complianceAlerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-2xl border flex justify-between items-center ${
                        alert.severity === "danger" 
                          ? "bg-rose-50 border-rose-200 text-rose-800" 
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm text-slate-950">{alert.title}</span>
                        <span className="text-xs text-slate-500">Expiry Target: {alert.expiry}</span>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-xl ${
                        alert.severity === "danger" ? "bg-rose-900/10 text-rose-700" : "bg-amber-900/10 text-amber-700"
                      }`}>
                        {alert.daysLeft === 0 ? "Immediate Action" : `${alert.daysLeft} Days Left`}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="font-heading font-bold text-lg text-slate-200">Active Tranche Milestone</h3>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-400">Milestone 2 progress:</span>
                    <span className="text-[#f97316] font-bold">40% Complete</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div className="bg-[#f97316] h-full" style={{ width: "40%" }} />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleTabChange("milestones")} className="mt-2 text-xs">
                    Upload Proof of Work
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Profile Tab */}
      {activeTab === "profile" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Organization Credentials</h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">NGO Darpan ID</span>
                <span className="text-slate-200 font-bold">MH/2024/0398492</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">CSR-1 Status</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck size={14} /> Verified</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">12A & 80G Audited</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck size={14} /> Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Projects Tab */}
      {activeTab === "projects" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Proposals & Initiatives Ledger</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-350">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                <tr>
                  <th className="py-3 px-5">Initiative Title</th>
                  <th className="py-3 px-5">Territory</th>
                  <th className="py-3 px-5">Required Budget</th>
                  <th className="py-3 px-5">Sourced</th>
                  <th className="py-3 px-5">State Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-900/40">
                    <td className="py-4 px-5 text-slate-100 font-bold">{proj.title}</td>
                    <td className="py-4 px-5">{proj.district}, {proj.taluka}</td>
                    <td className="py-4 px-5">₹{proj.budget.toLocaleString("en-IN")}</td>
                    <td className="py-4 px-5">₹{proj.funded.toLocaleString("en-IN")}</td>
                    <td className={`py-4 px-5 font-bold ${proj.status === "Funded" ? "text-emerald-600" : "text-amber-500"}`}>{proj.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 4. Proposal Builder Form */}
      {activeTab === "drafts" && (
        <Card className="max-w-2xl mx-auto w-full animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Build Project Proposal</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4 text-xs font-medium text-slate-400">
              <div className="flex flex-col gap-1.5">
                <span>Initiative Title:</span>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span>Target District:</span>
                  <select 
                    value={newDistrict} 
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option>Pune</option>
                    <option>Gadchiroli</option>
                    <option>Thane</option>
                    <option>Nandurbar</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Taluka Name:</span>
                  <input 
                    type="text" 
                    value={newTaluka} 
                    onChange={(e) => setNewTaluka(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span>Required Budget (INR):</span>
                  <input 
                    type="number" 
                    value={newBudget} 
                    onChange={(e) => setNewBudget(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Focus Sector (Schedule VII):</span>
                  <select 
                    value={newFocus} 
                    onChange={(e) => setNewFocus(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option>Education</option>
                    <option>Water Supply</option>
                    <option>Healthcare</option>
                    <option>Environment</option>
                  </select>
                </div>
              </div>
              <Button type="submit" className="mt-2 py-3">Submit Proposal</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 5. Milestone Escrow Proof Submissions */}
      {activeTab === "milestones" && (
        <Card className="max-w-2xl mx-auto w-full animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
              <Coins className="text-[#f97316]" /> Milestone Verification Center
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {evidenceSubmitted ? (
              <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center gap-3">
                <CheckCircle2 size={32} className="text-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-slate-200">Evidence File Submitted Successfully!</span>
                <span className="text-xs text-slate-500">Government auditor and Corporate trust officers have been notified to review the logs.</span>
                <Button onClick={() => setEvidenceSubmitted(false)} className="mt-2">Upload another file</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Select Active Project:</span>
                  <select 
                    value={selectedMilestoneProject} 
                    onChange={(e) => setSelectedMilestoneProject(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none"
                  >
                    {projects.filter(p => p.status === "Funded").map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center gap-3 bg-slate-950">
                  <UploadCloud size={32} className="text-slate-600" />
                  <span className="text-slate-500 text-xs">Drag and drop ZIP archive containing site photos and beneficiary logs</span>
                  <input 
                    type="file" 
                    onChange={(e) => setEvidenceFile(e.target.files?.[0]?.name || "dam_progress_logs.zip")}
                    className="hidden" 
                    id="evidence-uploader" 
                  />
                  <label htmlFor="evidence-uploader" className="cursor-pointer bg-slate-900 hover:bg-slate-850 border border-slate-800 py-2 px-4 rounded-xl text-slate-300">
                    {evidenceFile ? evidenceFile : "Choose File"}
                  </label>
                </div>

                <Button 
                  onClick={() => setEvidenceSubmitted(true)}
                  disabled={!evidenceFile}
                  className="py-3 shadow-md"
                >
                  Submit Milestone Proof
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 6. Drawdown Ledger */}
      {activeTab === "funding" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100">Drawdown Payment Ledger</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-350">
              <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                <tr>
                  <th className="py-3 px-5">Transaction ID</th>
                  <th className="py-3 px-5">Initiative</th>
                  <th className="py-3 px-5">Disbursed Amount</th>
                  <th className="py-3 px-5">Date Cleared</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                <tr className="hover:bg-slate-900/40">
                  <td className="py-4 px-5 font-bold text-[#f97316]">TXN-902840</td>
                  <td className="py-4 px-5">Gadchiroli Watershed & Reforestation</td>
                  <td className="py-4 px-5">₹5,00,000</td>
                  <td className="py-4 px-5">June 08, 2026</td>
                  <td className="py-4 px-5 text-right text-emerald-600">Cleared</td>
                </tr>
                <tr className="hover:bg-slate-900/40">
                  <td className="py-4 px-5 font-bold text-[#f97316]">TXN-859182</td>
                  <td className="py-4 px-5">Gadchiroli Watershed & Reforestation</td>
                  <td className="py-4 px-5">₹7,00,000</td>
                  <td className="py-4 px-5">June 15, 2026</td>
                  <td className="py-4 px-5 text-right text-emerald-600">Cleared</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 7. Beneficiary Registry */}
      {activeTab === "beneficiaries" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
          
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="font-heading font-bold text-xl text-slate-100">Beneficiary Registry Database</h3>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-350">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                  <tr>
                    <th className="py-3 px-5">Beneficiary Name</th>
                    <th className="py-3 px-5">Location Scope</th>
                    <th className="py-3 px-5">Benefit Sector</th>
                    <th className="py-3 px-5 text-right">Audit Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {beneficiaries.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40">
                      <td className="py-4 px-5 text-slate-200 font-bold">{b.name}</td>
                      <td className="py-4 px-5">{b.location}</td>
                      <td className="py-4 px-5">{b.sector}</td>
                      <td className="py-4 px-5 text-right">{b.verifiedDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-heading font-bold text-lg text-slate-200">Register Beneficiary</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBeneficiary} className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Beneficiary Name:</span>
                  <input 
                    type="text" 
                    value={bName} 
                    onChange={(e) => setBName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Location (Taluka, District):</span>
                  <input 
                    type="text" 
                    value={bLoc} 
                    onChange={(e) => setBLoc(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Benefit Sector:</span>
                  <select 
                    value={bSec} 
                    onChange={(e) => setBSec(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option>Water Supply</option>
                    <option>Education</option>
                    <option>Healthcare</option>
                  </select>
                </div>
                <Button type="submit" className="py-2.5">Log Beneficiary</Button>
              </form>
            </CardContent>
          </Card>

        </div>
      )}

      {/* 8. Volunteer Roster */}
      {activeTab === "volunteers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
          
          <Card className="lg:col-span-2">
            <CardHeader>
              <h3 className="font-heading font-bold text-xl text-slate-100">Volunteer Rosters</h3>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-350">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/65 font-bold">
                  <tr>
                    <th className="py-3 px-5">Volunteer Name</th>
                    <th className="py-3 px-5">Designated Role</th>
                    <th className="py-3 px-5 text-right">Hours Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {volunteers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-900/40">
                      <td className="py-4 px-5 text-slate-200 font-bold">{v.name}</td>
                      <td className="py-4 px-5">{v.role}</td>
                      <td className="py-4 px-5 text-right">{v.hours} Hours</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-heading font-bold text-lg text-slate-200">Enroll Volunteer</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddVolunteer} className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Volunteer Full Name:</span>
                  <input 
                    type="text" 
                    value={vName} 
                    onChange={(e) => setVName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Designated Role:</span>
                  <select 
                    value={vRole} 
                    onChange={(e) => setVRole(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                  >
                    <option>Field Coordinator</option>
                    <option>Nutritionist</option>
                    <option>Teacher / Mentor</option>
                  </select>
                </div>
                <Button type="submit" className="py-2.5">Enroll Member</Button>
              </form>
            </CardContent>
          </Card>

        </div>
      )}

      {/* 9. Annual Reports Generator */}
      {activeTab === "reports" && (
        <Card className="max-w-md mx-auto w-full animate-fadeIn">
          <CardHeader>
            <h3 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
              <BarChart2 className="text-[#f97316]" /> Annual Reports Desk
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
            <span className="text-slate-500">Generate boardroom-ready CSR spending summaries for corporate and state submission.</span>
            <div className="flex flex-col gap-3.5 mt-2">
              <Button onClick={() => alert("PDF Annual Report generated. Download complete.")} className="flex justify-between items-center py-3 px-5 shadow-md">
                <span>Annual Impact Summary (PDF)</span>
                <FileDown size={16} />
              </Button>
              <Button onClick={() => alert("Excel ledger sheets exported. Download complete.")} className="flex justify-between items-center py-3 px-5 shadow-md bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300">
                <span>Beneficiary Financial Ledger (XLSX)</span>
                <FileDown size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 10. Media Gallery */}
      {activeTab === "gallery" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-fadeIn">
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {galleryImages.map((img, idx) => (
              <div key={idx} className="glass-card rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between">
                <div className="h-40 w-full bg-gradient-to-tr from-[#1e3a8a]/40 to-[#f97316]/20 flex items-center justify-center relative">
                  <ImageIcon size={28} className="text-slate-400" />
                  <span className="absolute top-3 right-3 bg-slate-950/70 border border-slate-800 text-[10px] font-bold text-slate-350 px-2 py-0.5 rounded-lg">{img.size}</span>
                </div>
                <div className="p-4 flex flex-col gap-1 bg-slate-900/35 border-t border-slate-800">
                  <span className="text-[9px] text-slate-500 font-bold">{img.date}</span>
                  <h4 className="font-heading font-bold text-sm text-slate-200 mt-1 leading-tight">{img.title}</h4>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <h3 className="font-heading font-bold text-lg text-slate-200">Upload Project Image</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGalleryImage} className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Image Caption:</span>
                  <input 
                    type="text" 
                    value={newImageTitle} 
                    onChange={(e) => setNewImageTitle(e.target.value)}
                    placeholder="e.g. Check dam #3 completed"
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none" 
                    required 
                  />
                </div>
                <div className="border-2 border-dashed border-slate-800 p-6 rounded-2xl flex flex-col items-center gap-2 bg-slate-950">
                  <ImageIcon size={24} className="text-slate-600" />
                  <span className="text-[10px] text-slate-500">JPG or PNG (max 5MB)</span>
                </div>
                <Button type="submit" className="py-2.5">Upload Image</Button>
              </form>
            </CardContent>
          </Card>

        </div>
      )}

    </div>
  );
}
