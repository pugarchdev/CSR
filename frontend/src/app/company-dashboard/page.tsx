"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Coins, Star, Award, Layers, Sparkles, FolderKanban, Check, 
  ShieldAlert, Landmark, FileText, TrendingUp, Compass, 
  Sliders, FileCheck2, ShieldCheck, Download, Calendar, Mail, 
  Bell, Settings as SettingsIcon, Users, Play, PlusCircle, Trash, FileDown, CheckCircle2,
  ArrowUpRight, AlertTriangle, Eye, Lock, Key, Server, Plus, Edit, Folder, HelpCircle, BookOpen
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatsCard } from "@/components/ui/StatsCard";
import { EmptyState } from "@/components/ui/EmptyState";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";

const BudgetPieChart = dynamic(() => import("@/components/BudgetPieChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
    </div>
  )
});

const FundingGrowthChart = dynamic(() => import("@/components/AnalyticsCharts").then(mod => mod.FundingGrowthChart), {
  ssr: false,
  loading: () => <div className="h-[250px] w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl"><div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-transparent animate-spin" /></div>
});

const SdgStatsChart = dynamic(() => import("@/components/AnalyticsCharts").then(mod => mod.SdgStatsChart), {
  ssr: false,
  loading: () => <div className="h-[250px] w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl"><div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-transparent animate-spin" /></div>
});

const DistrictBudgetPieChart = dynamic(() => import("@/components/AdminCharts").then(mod => mod.DistrictBudgetPieChart), {
  ssr: false,
  loading: () => <div className="h-[250px] w-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl"><div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-transparent animate-spin" /></div>
});

type CompanyTab = 
  | "overview" | "budget" | "marketplace" | "recommendations" | "funded" 
  | "reviews" | "milestones" | "ngos" | "meetings" | "documents" 
  | "compliance" | "reports" | "analytics" | "coverage" | "sdg" 
  | "notifications" | "audit" | "settings";

const SectionLoader = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 w-full bg-white rounded-xl border border-gray-150">
    <div className="w-10 h-10 rounded-full border-4 border-[#1e3a8a] border-t-transparent animate-spin" />
    <span className="text-xs text-gray-500 font-semibold">{message}</span>
  </div>
);

export default function CompanyDashboard({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CompanyTab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as CompanyTab);
    }
  }, [params?.tab]);

  const handleTabChange = (tab: CompanyTab) => {
    setActiveTab(tab);
    router.push(`/company-dashboard/${tab}`);
  };

  const [totalBudget, setTotalBudget] = useState(10000000);
  
  const [allocations, setAllocations] = useState({
    education: 40,
    healthcare: 30,
    water: 20,
    environment: 10
  });

  const handleSliderChange = (sector: keyof typeof allocations, val: number) => {
    setAllocations(prev => ({ ...prev, [sector]: val }));
  };

  const getSourcedAmount = (pct: number) => (totalBudget * pct) / 100;

  // DB and Fallback Mock Data State
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [ngosList, setNgosList] = useState<any[]>([]);
  const [matches, setMatches] = useState([
    { id: "p-2", title: "Pune Zilla Parishad Smart Digital-Classrooms", ngo: "Sahyadri Eco Foundation", score: 95, budget: 3500000, focus: "Education & Literacy", district: "Pune" },
    { id: "p-1", title: "Gadchiroli Watershed & Reforestation Initiative", ngo: "Sahyadri Eco Foundation", score: 85, budget: 2500000, focus: "Water Conservation", district: "Gadchiroli" }
  ]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<any[]>("/company/projects").catch(() => []),
      apiFetch<any[]>("/ngos").catch(() => []),
      apiFetch<any[]>("/matching").catch(() => [])
    ])
      .then(([projectsData, ngosData, matchingData]) => {
        if (projectsData && projectsData.length > 0) {
          setProjectsList(projectsData);
        }
        if (ngosData && ngosData.length > 0) {
          setNgosList(ngosData);
        }
        if (matchingData && matchingData.length > 0) {
          setMatches(matchingData.map((match) => ({
            id: match.projectId,
            title: match.projectTitle,
            ngo: match.ngoName,
            score: match.score,
            budget: Number(match.budgetRequested),
            focus: match.focusArea,
            district: match.district
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mockProjects = [
    { id: "p-2", title: "Pune Zilla Parishad Smart Digital-Classrooms", ngo: { name: "Sahyadri Eco Foundation" }, focusArea: "Education & Literacy", district: "Pune", taluka: "Mulshi", budgetRequested: 3500000, beneficiaryCount: 2400, description: "Setting up smart labs and digital interactive classrooms across 15 government schools in Pune rural talukas." },
    { id: "p-1", title: "Gadchiroli Watershed & Reforestation Initiative", ngo: { name: "Sahyadri Eco Foundation" }, focusArea: "Water Conservation", district: "Gadchiroli", taluka: "Mulchera", budgetRequested: 2500000, beneficiaryCount: 1800, description: "Reforestation of 50 hectares of degraded forest lands and build check dams to recharge local watershed aquifers." },
    { id: "p-3", title: "Nandurbar Mobile Primary Health Clinics", ngo: { name: "Vidarbha Seva Samiti" }, focusArea: "Healthcare & Nutrition", district: "Nandurbar", taluka: "Akrani", budgetRequested: 4200000, beneficiaryCount: 3500, description: "Procuring and running 2 mobile health vans equipped with testing kits and essential medicines for tribal hamlets." },
    { id: "p-4", title: "Thane Lakes Rejuvenation Campaign", ngo: { name: "Konkan Sagarmata Mandal" }, focusArea: "Urban Afforestation", district: "Thane", taluka: "Kalyan", budgetRequested: 1800000, beneficiaryCount: 8000, description: "Restoring biodiversity in urban lakes and afforesting lake buffer zones in Thane district." }
  ];

  const mockNgos = [
    { id: "ngo-1", name: "Sahyadri Eco Foundation", registrationNumber: "MH/2021/012345", darpanNumber: "MH/2021/012345-DARPAN", csr1Number: "CSR00012345", district: "Pune", status: "VERIFIED", website: "https://sahyadrieco.org" },
    { id: "ngo-2", name: "Vidarbha Seva Samiti", registrationNumber: "MH/2023/048591", darpanNumber: "MH/2023/048591-DARPAN", csr1Number: "CSR00048591", district: "Gadchiroli", status: "VERIFIED", website: "https://vidarbhaseva.org" },
    { id: "ngo-3", name: "Konkan Sagarmata Mandal", registrationNumber: "MH/2024/095812", darpanNumber: "MH/2024/095812-DARPAN", csr1Number: "CSR00095812", district: "Thane", status: "VERIFIED", website: "https://konkansagar.org" }
  ];

  const displayProjects = projectsList.length > 0 ? projectsList : mockProjects;
  const displayNgos = ngosList.length > 0 ? ngosList : mockNgos;

  // Project Directory Filters
  const [projectSearch, setProjectSearch] = useState("");
  const [filterFocus, setFilterFocus] = useState("All");
  const [filterDistrict, setFilterDistrict] = useState("All");
  const [filterBudget, setFilterBudget] = useState(5000000); // 50 Lakhs default limit

  const filteredProjectsList = displayProjects.filter(p => {
    const titleText = p.title || "";
    const descText = p.description || "";
    const ngoName = p.ngo?.name || "";
    const matchesSearch = titleText.toLowerCase().includes(projectSearch.toLowerCase()) || 
                          descText.toLowerCase().includes(projectSearch.toLowerCase()) ||
                          ngoName.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesFocus = filterFocus === "All" || p.focusArea.includes(filterFocus);
    const matchesDistrict = filterDistrict === "All" || p.district === filterDistrict;
    const matchesBudget = Number(p.budgetRequested || p.budget) <= filterBudget;
    return matchesSearch && matchesFocus && matchesDistrict && matchesBudget;
  });

  const [milestones, setMilestones] = useState([
    { id: "m-1", project: "Gadchiroli Watershed Initiative", name: "Milestone 2: Completion of Check Dam #2", amount: 400000, status: "Pending Approval", evidence: "evidence_dam2.zip", ngo: "Sahyadri Eco Foundation" }
  ]);

  const [auditLogs, setAuditLogs] = useState([
    { date: "June 18, 2026", project: "Gadchiroli Watershed Initiative", amount: 500000, type: "Tranche 1 Payout", status: "Cleared", receipt: "receipt_tr1_gad.pdf" },
    { date: "June 05, 2026", project: "Smart Classroom Mulshi", amount: 1200000, type: "Advance Release", status: "Cleared", receipt: "receipt_adv_mulshi.pdf" }
  ]);

  const [meetings, setMeetings] = useState([
    { id: "1", ngo: "Sahyadri Eco Foundation", date: "June 25, 2026", time: "11:00 AM", topic: "Milestone 3 Inspection Review" }
  ]);
  const [mNgo, setMNgo] = useState("Sahyadri Eco Foundation");
  const [mDate, setMDate] = useState("");
  const [mTime, setMTime] = useState("10:00 AM");
  const [mTopic, setMTopic] = useState("");

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mDate || !mTopic) return;
    const newMeet = {
      id: String(meetings.length + 1),
      ngo: mNgo,
      date: mDate,
      time: mTime,
      topic: mTopic
    };
    setMeetings([newMeet, ...meetings]);
    setMTopic("");
    setMDate("");
  };

  const [releasingId, setReleasingId] = useState<string | null>(null);

  const handleReleaseMilestone = (id: string, amount: number, project: string, ngo: string) => {
    setReleasingId(id);
    setTimeout(() => {
      setMilestones(milestones.filter(m => m.id !== id));
      const newLog = {
        date: "Just now",
        project: project,
        amount: amount,
        type: "Milestone Tranche Release",
        status: "Cleared",
        receipt: `receipt_tr2_${id}.pdf`
      };
      setAuditLogs([newLog, ...auditLogs]);
      setReleasingId(null);
    }, 1500);
  };

  // Compliance Section 135 Calculator State
  const [turnover, setTurnover] = useState(12000); // in Millions (1200 Cr)
  const [netWorth, setNetWorth] = useState(6000);   // in Millions (600 Cr)
  const [netProfit, setNetProfit] = useState(80);    // in Millions (8 Cr)

  const isEligible = turnover >= 10000 || netWorth >= 5000 || netProfit >= 50;
  const calculatedCSR = isEligible ? (netProfit * 0.02) : 0;

  // Documents
  const [documents, setDocuments] = useState([
    { name: "CSR_Board_Resolution_FY26.pdf", type: "Agreement", size: "2.4 MB", date: "June 01, 2026" },
    { name: "NGO_Registration_Darpan_Verify.pdf", type: "Compliance", size: "1.1 MB", date: "May 15, 2026" },
    { name: "Milestone_1_Payout_Receipt.pdf", type: "Invoice", size: "850 KB", date: "June 05, 2026" }
  ]);
  const [docFilter, setDocFilter] = useState("All");

  // Inspections Reviews
  const [inspections, setInspections] = useState([
    { id: "i-1", project: "Gadchiroli Watershed Initiative", inspector: "Officer S. Patil", date: "June 12, 2026", status: "COMPLIANT", coordinates: "20.1842° N, 80.0125° E", comments: "Water conservation check-dam completed. Geo-tagged media verification approved." },
    { id: "i-2", project: "Smart Classroom Mulshi", inspector: "Officer M. Kulkarni", date: "May 28, 2026", status: "COMPLIANT", coordinates: "18.5284° N, 73.5132° E", comments: "15 digital classroom projectors and internet modules operational." }
  ]);

  // District Coverage
  const districtCoverage = [
    { name: "Pune", projectsCount: 15, fundingSpent: 45000000, penetration: 92 },
    { name: "Gadchiroli", projectsCount: 8, fundingSpent: 25000000, penetration: 85 },
    { name: "Thane", projectsCount: 11, fundingSpent: 32000000, penetration: 78 },
    { name: "Nandurbar", projectsCount: 6, fundingSpent: 18000000, penetration: 70 }
  ];

  // SDG Investments
  const sdgGoals = [
    { id: 4, name: "Quality Education", description: "SDG 4: Smart Labs and Classrooms", color: "bg-rose-500", text: "text-white", funds: 4000000 },
    { id: 6, name: "Clean Water", description: "SDG 6: Watershed and Aquifers", color: "bg-cyan-500", text: "text-white", funds: 3000000 },
    { id: 3, name: "Good Health", description: "SDG 3: Mobile Health Vans", color: "bg-emerald-500", text: "text-white", funds: 2000000 },
    { id: 13, name: "Climate Action", description: "SDG 13: Afforestation & Reforestation", color: "bg-green-700", text: "text-white", funds: 1000000 }
  ];

  const pieData = [
    { name: "Education", value: getSourcedAmount(allocations.education) },
    { name: "Healthcare", value: getSourcedAmount(allocations.healthcare) },
    { name: "Water Conservation", value: getSourcedAmount(allocations.water) },
    { name: "Environment", value: getSourcedAmount(allocations.environment) }
  ];

  const COLORS = ["#1e3a8a", "#f97316", "#16a34a", "#64748b"];
  const totalAllocatedPercentage = allocations.education + allocations.healthcare + allocations.water + allocations.environment;

  return (
    <div className="px-6 md:px-10 py-8 max-w-7xl mx-auto flex flex-col gap-7 min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-gray-200 pb-4">
        <span className="text-[#f97316] font-extrabold text-[11px] uppercase tracking-widest">Sahyadri Technology Ventures Ltd</span>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900 tracking-tight">Company Console</h1>
      </div>

      {/* 1. Overview */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-7 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard label="CSR Budget Limit" value={`₹${totalBudget.toLocaleString("en-IN")}`} icon={Coins} />
            <StatsCard label="Funds Allocated" value={`₹${(totalBudget * totalAllocatedPercentage / 100).toLocaleString("en-IN")}`} icon={Award} />
            <StatsCard label="Audited Payments" value="₹17.0 Lakhs" icon={FileCheck2} />
            <StatsCard label="Focus SDGs Supported" value="4 Focus SDGs" icon={Compass} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-5">
              <Card>
                <CardHeader>
                  <h3 className="govt-section-header">Focus Sector Budget Spread</h3>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-8 items-center justify-around h-[300px]">
                  <div className="w-[200px] h-[200px] shrink-0">
                    <BudgetPieChart data={pieData} colors={COLORS} />
                  </div>
                  <div className="flex flex-col gap-4 text-xs font-semibold">
                    {pieData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: COLORS[idx] }} />
                        <div className="flex flex-col">
                          <span className="text-gray-500">{item.name}</span>
                          <span className="text-gray-900 font-bold">₹{item.value.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="govt-section-header text-base">
                  <Sparkles size={18} className="text-[#f97316]" />
                  Best Matching Proposal
                </h3>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 rounded-full border-2 border-[#1e3a8a] border-t-transparent animate-spin" />
                  </div>
                ) : matches.length > 0 ? (
                  matches.slice(0, 1).map((m) => (
                    <div key={m.id} className="bg-blue-50/50 border border-blue-200 p-5 rounded-lg flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs font-semibold text-[#f97316]">
                        <span className="govt-badge govt-badge-pending">{m.score}% Match</span>
                        <span className="text-gray-500">{m.district}</span>
                      </div>
                      <h4 className="font-heading font-bold text-sm text-gray-900 leading-tight">{m.title}</h4>
                      <span className="text-xs text-gray-500 font-medium font-sans">NGO: {m.ngo}</span>
                      <Button variant="primary" size="sm" onClick={() => handleTabChange("recommendations")} className="w-full mt-1">
                        Evaluate Match
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center py-6">No matching proposals found</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Budget Sliders */}
      {activeTab === "budget" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header">Set Sector Investment Allocations</h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 max-w-2xl">
            <div className="flex flex-col gap-2 bg-gray-50 p-5 rounded-xl border border-gray-200 text-xs font-medium">
              <span className="text-gray-905 font-bold">Total Budget Cap:</span>
              <input 
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="govt-input font-bold text-base max-w-sm" 
              />
              <span className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">Adjust total budget limits to re-scale investments</span>
            </div>

            <div className="flex flex-col gap-6">
              {[
                { key: "education", label: "Education & Smart Labs", color: "#1e3a8a" },
                { key: "healthcare", label: "Healthcare & Primary Care Mobile Clinics", color: "#f97316" },
                { key: "water", label: "Water Harvesting Dams", color: "#16a34a" },
                { key: "environment", label: "Urban Afforestation", color: "#64748b" }
              ].map((sec) => (
                <div key={sec.key} className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-gray-800">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: sec.color }} />
                      {sec.label}
                    </span>
                    <span>{allocations[sec.key as keyof typeof allocations]}% (₹{getSourcedAmount(allocations[sec.key as keyof typeof allocations]).toLocaleString("en-IN")})</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={allocations[sec.key as keyof typeof allocations]} 
                    onChange={(e) => handleSliderChange(sec.key as any, Number(e.target.value))}
                    className="w-full accent-[#1e3a8a] rounded-lg cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-xs font-bold border-t border-gray-200 pt-4 text-gray-700">
              <span>Combined Allocation: {totalAllocatedPercentage}%</span>
              <span className={totalAllocatedPercentage > 100 ? "text-rose-600 animate-pulse" : "text-emerald-600"}>
                {totalAllocatedPercentage > 100 ? "Limit Exceeded (Over 100%)" : "Within Cap Limit"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Project Directory (Marketplace) */}
      {activeTab === "marketplace" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="govt-section-header flex items-center gap-2">
              <Compass size={22} className="text-[#1e3a8a]" />
              Project Directory
            </h3>
            <span className="text-xs text-gray-500 font-bold bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg">
              Showing {filteredProjectsList.length} of {displayProjects.length} Verified Proposals
            </span>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-xs font-semibold text-gray-600">
            <div className="flex flex-col gap-1.5">
              <span>Search Projects/NGOs:</span>
              <input 
                type="text"
                placeholder="Search..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="govt-input"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span>Filter Focus Area:</span>
              <select 
                value={filterFocus} 
                onChange={(e) => setFilterFocus(e.target.value)}
                className="govt-input"
              >
                <option value="All">All Focus Areas</option>
                <option value="Education">Education & Literacy</option>
                <option value="Water">Water Conservation</option>
                <option value="Healthcare">Healthcare & Nutrition</option>
                <option value="Afforestation">Afforestation</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span>Filter District:</span>
              <select 
                value={filterDistrict} 
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="govt-input"
              >
                <option value="All">All Districts</option>
                <option value="Pune">Pune</option>
                <option value="Gadchiroli">Gadchiroli</option>
                <option value="Nandurbar">Nandurbar</option>
                <option value="Thane">Thane</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span>Max Budget:</span>
                <span className="text-[#1e3a8a]">₹{Number(filterBudget).toLocaleString("en-IN")}</span>
              </div>
              <input 
                type="range"
                min="1000000"
                max="10000000"
                step="500000"
                value={filterBudget}
                onChange={(e) => setFilterBudget(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#1e3a8a]"
              />
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <SectionLoader message="Retrieving active project directory..." />
          ) : filteredProjectsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProjectsList.map((p) => (
                <Card key={p.id} className="flex flex-col justify-between hover:shadow-md hover:border-[#1e3a8a]/30 transition-all border border-gray-200">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-md uppercase">
                        {p.focusArea}
                      </span>
                      <span className="text-[10px] font-extrabold text-[#f97316] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-md">
                        {p.district} • {p.taluka || "Rural"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h4 className="font-heading font-extrabold text-base text-gray-900 leading-snug">{p.title}</h4>
                      <span className="text-xs text-gray-500 font-bold font-sans flex items-center gap-1">
                        <Landmark size={12} className="text-[#1e3a8a]" /> NGO: {p.ngo?.name}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                      {p.description}
                    </p>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50/50 border border-gray-100 p-3 rounded-lg text-[11px] font-semibold text-gray-600">
                      <div className="flex flex-col">
                        <span className="text-gray-400">Budget Requested</span>
                        <span className="text-gray-900 font-extrabold text-sm">₹{Number(p.budgetRequested || p.budget).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-400">Est. Beneficiaries</span>
                        <span className="text-gray-900 font-extrabold text-sm">{p.beneficiaryCount?.toLocaleString("en-IN")} citizens</span>
                      </div>
                    </div>
                  </CardContent>
                  <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex gap-3">
                    <Button 
                      variant="primary" 
                      className="w-full text-xs py-2"
                      onClick={() => alert(`Sponsorship proposal initiated for ${p.title}. Escrow allocation forms sent.`)}
                    >
                      Fund via Escrow
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-xs px-4"
                      onClick={() => alert(`Full detail brief document downloaded for proposal ${p.id}.`)}
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No projects match filters"
              description="Adjust the search string, focus sector, or budget threshold sliders to view matching proposals."
              icon={HelpCircle}
            />
          )}
        </div>
      )}

      {/* 4. AI Matches */}
      {activeTab === "recommendations" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <h3 className="govt-section-header flex items-center gap-2">
            <Sparkles size={20} className="text-[#f97316]" />
            AI Proposal Recommendations
          </h3>

          {loading ? (
            <SectionLoader message="Calculating AI proposal recommendations..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {matches.map((item) => (
                <Card key={item.id} className="flex flex-col justify-between gap-5 border border-gray-200">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="govt-badge govt-badge-pending">{item.score}% Match</span>
                      <span className="text-gray-500 font-medium">NGO: {item.ngo}</span>
                    </div>
                    <h4 className="font-heading font-bold text-lg text-gray-900 leading-tight">{item.title}</h4>
                    <p className="text-gray-600 text-xs font-sans">Target Focus Area: {item.focus} | Location: {item.district}</p>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-900">Budget: ₹{item.budget.toLocaleString("en-IN")}</span>
                    <Button variant="accent" size="sm" onClick={() => alert("Proposal accepted for funding escrow.")}>Accept for Escrow</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Funded Projects */}
      {activeTab === "funded" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <h3 className="govt-section-header flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-600" />
            Funded Projects
          </h3>

          {loading ? (
            <SectionLoader message="Loading funded projects and escrow statuses..." />
          ) : (
            <div className="flex flex-col gap-6">
              {displayProjects.slice(0, 2).map((p) => {
                const total = Number(p.budgetRequested || p.budget);
                const funded = total * 0.4; // assume 40% disbursed so far
                const progressPercent = 40;

                return (
                  <Card key={p.id} className="border border-gray-200">
                    <CardContent className="p-6 flex flex-col gap-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div>
                          <h4 className="font-heading font-extrabold text-lg text-gray-900 leading-snug">{p.title}</h4>
                          <span className="text-xs text-gray-500 font-bold">Partner NGO: {p.ngo?.name}</span>
                        </div>
                        <span className="govt-badge govt-badge-verified text-xs px-3 py-1">Active Escrow</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Escrow Funding Progress</span>
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-gray-100 rounded-full h-3.5 border border-gray-200 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-800">{progressPercent}%</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-bold text-gray-600 mt-1">
                            <span>Disbursed: ₹{funded.toLocaleString("en-IN")}</span>
                            <span>Cap: ₹{total.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 text-xs text-gray-600 font-semibold justify-center">
                          <div>• Active Milestones: <span className="text-[#1e3a8a] font-bold">3 pending</span></div>
                          <div>• Target District: <span className="text-gray-900 font-bold">{p.district}</span></div>
                        </div>

                        <div className="flex items-center gap-3 justify-start md:justify-end">
                          <Button variant="outline" size="sm" onClick={() => handleTabChange("milestones")}>
                            Milestones Escrow Queue
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => alert(`Drawdown agreement pdf downloaded for project ${p.id}.`)}>
                            Drawdown Policy
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Inspection Reviews */}
      {activeTab === "reviews" && (
        <Card className="animate-fadeIn">
          <CardHeader>
            <h3 className="govt-section-header flex items-center gap-2">
              <BookOpen size={20} className="text-[#1e3a8a]" />
              Field Inspection Logs
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>Target Project</th>
                  <th>Government Inspector</th>
                  <th>Audit Date</th>
                  <th>Coordinates Check</th>
                  <th>Audit Result</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((i) => (
                  <tr key={i.id}>
                    <td className="font-bold text-gray-950">{i.project}</td>
                    <td className="text-gray-700 font-medium">{i.inspector}</td>
                    <td className="text-gray-500 font-medium">{i.date}</td>
                    <td className="text-[#1e3a8a] font-bold text-xs">{i.coordinates}</td>
                    <td>
                      <span className="govt-badge govt-badge-verified">{i.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 7. Milestone Approvals */}
      {activeTab === "milestones" && (
        <Card className="animate-fadeIn border border-gray-200">
          <CardHeader>
            <h3 className="govt-section-header">Milestones Tranches Escrow Queue</h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {milestones.length > 0 ? (
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>Project Focus</th>
                    <th>Milestone Description</th>
                    <th>Recipient NGO</th>
                    <th>Amount</th>
                    <th className="text-right">Audit Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => (
                    <tr key={m.id}>
                      <td className="font-bold text-gray-905">{m.project}</td>
                      <td className="text-gray-600">{m.name}</td>
                      <td>{m.ngo}</td>
                      <td>₹{m.amount.toLocaleString("en-IN")}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => alert("Evidence ZIP downloaded.")}>View Evidence</Button>
                          <Button 
                            variant="accent" 
                            size="sm"
                            disabled={releasingId === m.id}
                            onClick={() => handleReleaseMilestone(m.id, m.amount, m.project, m.ngo)}
                          >
                            {releasingId === m.id ? "Releasing..." : "Release Tranche"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState 
                title="Approvals queue clear" 
                description="No active milestone release requests are pending audits." 
                icon={CheckCircle2}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* 8. Verified NGO Registry */}
      {activeTab === "ngos" && (
        <Card className="animate-fadeIn border border-gray-200">
          <CardHeader>
            <h3 className="govt-section-header flex items-center gap-2">
              <Landmark size={20} className="text-[#1e3a8a]" />
              Verified NGO Registry
            </h3>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <SectionLoader message="Retrieving verified NGO register..." />
            ) : (
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>NGO Name</th>
                    <th>Darpan Verification</th>
                    <th>MCA CSR-1 ID</th>
                    <th>Base District</th>
                    <th>Legality Check</th>
                  </tr>
                </thead>
                <tbody>
                  {displayNgos.map((n) => (
                    <tr key={n.id}>
                      <td className="font-bold text-gray-955">
                        <a href={n.website || "#"} target="_blank" rel="noreferrer" className="text-[#1e3a8a] hover:underline flex items-center gap-1.5">
                          {n.name} <ArrowUpRight size={12} />
                        </a>
                      </td>
                      <td className="text-gray-600 font-medium text-xs">{n.darpanNumber || "MH/2021/012345-DARPAN"}</td>
                      <td className="text-[#f97316] font-bold text-xs">{n.csr1Number || "CSR00012345"}</td>
                      <td className="text-gray-700 font-medium">{n.district}</td>
                      <td>
                        <span className="govt-badge govt-badge-verified">MCA Approved</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* 9. Meetings */}
      {activeTab === "meetings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          
          <Card className="lg:col-span-2 border border-gray-200">
            <CardHeader>
              <h3 className="govt-section-header">Scheduled Meetings</h3>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="govt-table">
                <thead>
                  <tr>
                    <th>Grassroots NGO</th>
                    <th>Scheduled Date & Time</th>
                    <th>Meeting Focus Topic</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((meet) => (
                    <tr key={meet.id}>
                      <td className="font-bold text-gray-900">{meet.ngo}</td>
                      <td>{meet.date} at {meet.time}</td>
                      <td>{meet.topic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader>
              <h3 className="govt-section-header text-base">Schedule Meeting</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMeeting} className="flex flex-col gap-4 text-xs font-semibold text-gray-600">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-800">Target NGO Partner:</label>
                  <select 
                    value={mNgo} 
                    onChange={(e) => setMNgo(e.target.value)}
                    className="govt-input"
                  >
                    <option>Sahyadri Eco Foundation</option>
                    <option>Vidarbha Seva Samiti</option>
                    <option>Konkan Sagarmata Mandal</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800">Meeting Date:</label>
                    <input 
                      type="date" 
                      value={mDate} 
                      onChange={(e) => setMDate(e.target.value)}
                      className="govt-input" 
                      required 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-800">Meeting Time:</label>
                    <input 
                      type="text" 
                      value={mTime} 
                      onChange={(e) => setMTime(e.target.value)}
                      placeholder="e.g. 11:30 AM"
                      className="govt-input" 
                      required 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-800">Agenda / Topic:</label>
                  <input 
                    type="text" 
                    value={mTopic} 
                    onChange={(e) => setMTopic(e.target.value)}
                    placeholder="e.g. Discuss dam site audits"
                    className="govt-input" 
                    required 
                  />
                </div>
                <Button type="submit" variant="primary" className="py-2.5">Schedule Meet</Button>
              </form>
            </CardContent>
          </Card>

        </div>
      )}

      {/* 10. Project Documents */}
      {activeTab === "documents" && (
        <Card className="animate-fadeIn border border-gray-200">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="govt-section-header flex items-center gap-2">
              <Folder size={20} className="text-[#1e3a8a]" />
              Project Documents Vault
            </h3>
            <div className="flex gap-2">
              {["All", "Agreement", "Compliance", "Invoice"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDocFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    docFilter === tab 
                      ? "bg-[#1e3a8a] border-[#1e3a8a] text-white" 
                      : "bg-white border-gray-200 text-gray-600 hover:border-[#1e3a8a]/45"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Nature Classification</th>
                  <th>File Size</th>
                  <th>Upload Date</th>
                  <th className="text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents
                  .filter((d) => docFilter === "All" || d.type === docFilter)
                  .map((d, index) => (
                    <tr key={index}>
                      <td className="font-bold text-gray-950 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        {d.name}
                      </td>
                      <td>
                        <span className={`govt-badge ${
                          d.type === "Agreement" ? "govt-badge-funded" :
                          d.type === "Compliance" ? "govt-badge-verified" : "govt-badge-pending"
                        }`}>
                          {d.type}
                        </span>
                      </td>
                      <td className="text-gray-500 font-medium text-xs">{d.size}</td>
                      <td className="text-gray-500 font-medium text-xs">{d.date}</td>
                      <td className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => alert(`Downloading document ${d.name}`)}
                          className="p-1 px-2 text-xs"
                        >
                          <Download size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 11. Compliance Check (CSR Calculator) */}
      {activeTab === "compliance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
          <Card className="lg:col-span-2 border border-gray-200">
            <CardHeader>
              <h3 className="govt-section-header flex items-center gap-2">
                <ShieldAlert size={20} className="text-[#f97316]" />
                Section 135 Eligibility Calculator
              </h3>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 text-xs text-gray-600 font-semibold">
              <p className="leading-relaxed text-gray-500">
                Under Section 135 of the Companies Act, 2013, companies satisfying any of the following parameters during the immediately preceding financial year are mandated to formulate a CSR committee and spend at least 2% of average net profits:
              </p>

              <div className="flex flex-col gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>Company Annual Turnover (INR):</span>
                    <span className="text-[#1e3a8a] font-extrabold">₹{(turnover / 10).toLocaleString()} Crore</span>
                  </div>
                  <input 
                    type="range"
                    min="5000"
                    max="20000"
                    step="500"
                    value={turnover}
                    onChange={(e) => setTurnover(Number(e.target.value))}
                    className="w-full cursor-pointer accent-[#1e3a8a]"
                  />
                  <span className="text-[10px] text-gray-400">Statutory Limit: ≥ ₹1,000 Crore</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>Company Net Worth (INR):</span>
                    <span className="text-[#1e3a8a] font-extrabold">₹{(netWorth / 10).toLocaleString()} Crore</span>
                  </div>
                  <input 
                    type="range"
                    min="2500"
                    max="10000"
                    step="250"
                    value={netWorth}
                    onChange={(e) => setNetWorth(Number(e.target.value))}
                    className="w-full cursor-pointer accent-[#1e3a8a]"
                  />
                  <span className="text-[10px] text-gray-400">Statutory Limit: ≥ ₹500 Crore</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>Company Net Profit (INR):</span>
                    <span className="text-[#1e3a8a] font-extrabold">₹{(netProfit / 10).toLocaleString()} Crore</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={netProfit}
                    onChange={(e) => setNetProfit(Number(e.target.value))}
                    className="w-full cursor-pointer accent-[#1e3a8a]"
                  />
                  <span className="text-[10px] text-gray-400">Statutory Limit: ≥ ₹5 Crore</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border ${isEligible ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"}`}>
            <CardHeader>
              <h4 className="font-heading font-extrabold text-sm text-gray-950 uppercase tracking-wider">Mandate Evaluation</h4>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-xs font-semibold">
              <div className="flex flex-col gap-1">
                <span className="text-gray-500">CSR Compliance Requirement:</span>
                <span className={`text-lg font-extrabold ${isEligible ? "text-emerald-600" : "text-gray-700"}`}>
                  {isEligible ? "Mandatory 2% Spend Required" : "No Statutory Requirement"}
                </span>
              </div>

              {isEligible && (
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800">
                  <span>Minimum CSR Outlay (Annual):</span>
                  <span className="text-xl font-extrabold">₹{(calculatedCSR / 10).toFixed(2)} Crore</span>
                </div>
              )}

              <div className="text-[11px] text-gray-600 leading-relaxed pt-2 border-t border-gray-150 flex flex-col gap-1.5">
                <div className="flex items-start gap-1.5">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Eligible for MahaCSR Matching Algorithm bonus tiers.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Escrow tranche system fully complies with MCA rules.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 12. Executive Reports */}
      {activeTab === "reports" && (
        <Card className="animate-fadeIn max-w-4xl border border-gray-200">
          <CardHeader>
            <h3 className="govt-section-header flex items-center gap-2">
              <FileDown size={22} className="text-[#1e3a8a]" />
              Executive Reports Desk
            </h3>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: "Statutory Board CSR Outlay Report (PDF)", format: "PDF", desc: "Formats average net profit declarations and escrow disbursements for MCA filing." },
              { title: "Sourcing Analytics and SDG Statement (Excel)", format: "Excel", desc: "Detailed Excel grid mapping taluka-level investments and focus sector counts." },
              { title: "Escrow Ledger & Receipt Register (CSV)", format: "CSV", desc: "Raw transacted log values showing NGO milestone completions and release timestamps." },
              { title: "Statewide SDG Impact Summary (PDF)", format: "PDF", desc: "Official government-certified alignment statement showing SDG goals supported." }
            ].map((r, index) => (
              <div key={index} className="p-5 border border-gray-200 rounded-xl bg-white flex flex-col justify-between gap-4 shadow-sm hover:border-[#1e3a8a]/20 transition-all">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{r.format}</span>
                  <h4 className="font-heading font-extrabold text-sm text-gray-905">{r.title}</h4>
                  <p className="text-xs text-gray-600 font-medium font-sans leading-relaxed">{r.desc}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => alert(`Generating and downloading ${r.title}`)}
                  className="flex items-center justify-between text-xs py-2 w-full mt-2"
                >
                  <span>Generate Document</span>
                  <ArrowUpRight size={14} />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 13. Sourcing Analytics */}
      {activeTab === "analytics" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard label="Verified NGOs" value="145" icon={Landmark} />
            <StatsCard label="CSR Companies" value="52" icon={Users} />
            <StatsCard label="Approved Projects" value="420" icon={FolderKanban} />
            <StatsCard label="Audit Pass Rate" value="98.4%" icon={ShieldCheck} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <h3 className="govt-section-header text-sm font-extrabold text-[#1e3a8a]">
                  <Coins size={16} /> District Budget Sourcing
                </h3>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center p-4">
                <DistrictBudgetPieChart />
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <h3 className="govt-section-header text-sm font-extrabold text-[#1e3a8a]">
                  <Sparkles size={16} /> SDG Focus Outlay
                </h3>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center p-4">
                <SdgStatsChart />
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <h3 className="govt-section-header text-sm font-extrabold text-[#1e3a8a]">
                  <TrendingUp size={16} /> Historical Funding Growth
                </h3>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center p-4">
                <FundingGrowthChart />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 14. District Penetration (Coverage) */}
      {activeTab === "coverage" && (
        <Card className="animate-fadeIn border border-gray-200">
          <CardHeader>
            <h3 className="govt-section-header flex items-center gap-2">
              <Compass size={22} className="text-[#1e3a8a]" />
              Geographical Coverage Penetration
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {districtCoverage.map((d) => (
                <div key={d.name} className="p-5 border border-gray-200 rounded-xl bg-gray-50/50 flex flex-col gap-3 font-semibold text-xs text-gray-700">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                    <span className="text-sm font-heading font-extrabold text-gray-950">{d.name} District</span>
                    <span className="text-[#1e3a8a]">{d.projectsCount} Active Projects</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-gray-400">Total Capital Spent:</span>
                      <span className="text-gray-900 font-extrabold">₹{d.fundingSpent.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-full bg-gray-100 rounded-full h-3 border border-gray-200 overflow-hidden">
                        <div className="bg-[#1e3a8a] h-full rounded-full transition-all" style={{ width: `${d.penetration}%` }} />
                      </div>
                      <span className="font-extrabold text-gray-900">{d.penetration}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 15. SDG Dashboard */}
      {activeTab === "sdg" && (
        <div className="flex flex-col gap-6 animate-fadeIn">
          <h3 className="govt-section-header flex items-center gap-2">
            <Sparkles size={22} className="text-[#f97316]" />
            UN Sustainable Development Goals (SDG) Aligned
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sdgGoals.map((g) => (
              <Card key={g.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                <div className={`h-2.5 ${g.color}`} />
                <CardContent className="p-5 flex flex-col justify-between flex-grow gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-extrabold text-[#1e3a8a] uppercase tracking-widest">Goal {g.id}</span>
                    <h4 className="font-heading font-extrabold text-base text-gray-900 leading-snug">{g.name}</h4>
                    <p className="text-xs text-gray-500 font-medium font-sans mt-1 leading-normal">{g.description}</p>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex flex-col gap-0.5 text-xs">
                    <span className="text-gray-400 font-semibold font-sans">Aligned Capital Outlay</span>
                    <span className="text-gray-900 font-extrabold">₹{g.funds.toLocaleString("en-IN")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 16. Activity Audits */}
      {activeTab === "audit" && (
        <Card className="animate-fadeIn border border-gray-200">
          <CardHeader className="flex justify-between items-center sm:flex-row flex-col gap-4">
            <h3 className="govt-section-header">Compliance Audit Ledger</h3>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => alert("Board PDF Summary Downloaded.")}>
              <Download size={14} /> Download Board Summary (PDF)
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="govt-table">
              <thead>
                <tr>
                  <th>Date Sourced</th>
                  <th>Initiative Details</th>
                  <th>Payment Nature</th>
                  <th>Transacted Amount</th>
                  <th className="text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, index) => (
                  <tr key={index}>
                    <td className="text-gray-500">{log.date}</td>
                    <td className="font-bold text-gray-900">{log.project}</td>
                    <td>{log.type}</td>
                    <td>₹{log.amount.toLocaleString("en-IN")}</td>
                    <td className="text-right"><span className="govt-badge govt-badge-verified">{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* 17. Settings Console */}
      {activeTab === "settings" && (
        <Card className="animate-fadeIn border border-gray-200 max-w-2xl">
          <CardHeader>
            <h3 className="govt-section-header flex items-center gap-2">
              <SettingsIcon size={20} className="text-gray-500" />
              Settings Console
            </h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); alert("Corporate settings saved."); }} className="flex flex-col gap-4 text-xs font-semibold text-gray-600">
              <div className="flex flex-col gap-1.5">
                <span className="text-gray-800">CSR Policy Statement Document Link:</span>
                <input 
                  type="text"
                  placeholder="https://sahyadritech.com/csr-policy-statement.pdf"
                  className="govt-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-gray-800">Primary Contact Alternate Email:</span>
                <input 
                  type="email"
                  placeholder="csr@sahyadritech.com"
                  className="govt-input"
                />
              </div>

              <div className="flex flex-col gap-1.5 border-t border-gray-150 pt-4 mt-2">
                <span className="text-gray-850 font-bold text-sm">System Notification Alerts:</span>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="flex items-center gap-2 font-medium cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#1e3a8a]" />
                    <span>Email alert on new milestone evidence uploads.</span>
                  </label>
                  <label className="flex items-center gap-2 font-medium cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#1e3a8a]" />
                    <span>In-app alert on government officer inspections.</span>
                  </label>
                </div>
              </div>

              <Button type="submit" variant="primary" className="py-2.5 mt-4">Save Configuration</Button>
            </form>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
