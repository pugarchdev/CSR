"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, MapPin, Tag, Compass, Landmark, Coins, Star, 
  List, Grid, Columns, FileText, CheckCircle2, Bookmark, 
  BookmarkCheck, ArrowUpRight, HelpCircle, ShieldCheck, Building2, User, ExternalLink
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiFetch } from "@/lib/api";

type DirectoryTab = "projects" | "ngos" | "companies";

interface Project {
  id: string;
  title: string;
  description: string;
  focusArea: string;
  sdgGoal: string;
  beneficiaryCount: number;
  budgetRequested: number;
  district: string;
  taluka: string;
  ngoName: string;
  ngoRating: number;
  matchScore: number;
  status: string;
}

interface NGO {
  id: string;
  name: string;
  darpanId: string;
  csr1Status: string;
  rating: number;
  district: string;
  taluka: string;
  category: string;
  projectsCount: number;
  totalFundingReceived: number;
  contact: string;
}

interface Company {
  id: string;
  name: string;
  focusArea: string;
  csrBudget: number;
  district: string;
  policyLink: string;
  projectsFunded: number;
  industry: string;
}

const fallbackProjects: Project[] = [
  { id: "demo-project-1", title: "Digital Learning Lab for Zilla Parishad Schools", description: "Smart classroom equipment and teacher orientation for rural government schools.", focusArea: "Education", sdgGoal: "SDG 4", beneficiaryCount: 4500, budgetRequested: 7500000, district: "Pune", taluka: "Mulshi", ngoName: "Verified Education Partner", ngoRating: 4.6, matchScore: 92, status: "PUBLISHED" },
  { id: "demo-project-2", title: "Primary Health Centre Diagnostic Equipment", description: "Basic diagnostic equipment package for high-footfall rural health facilities.", focusArea: "Health", sdgGoal: "SDG 3", beneficiaryCount: 18000, budgetRequested: 12000000, district: "Nandurbar", taluka: "Akkalkuwa", ngoName: "Verified Health Partner", ngoRating: 4.4, matchScore: 88, status: "PUBLISHED" },
  { id: "demo-project-3", title: "Water Conservation and Check Dam Repair", description: "Repair and finishing of community water conservation structures with handover evidence.", focusArea: "Water", sdgGoal: "SDG 6", beneficiaryCount: 9000, budgetRequested: 9800000, district: "Gadchiroli", taluka: "Aheri", ngoName: "Verified Rural Partner", ngoRating: 4.7, matchScore: 90, status: "PUBLISHED" },
];

const fallbackNgos: NGO[] = [
  { id: "demo-ngo-1", name: "Verified Education Partner", darpanId: "MH/2026/DEMO001", csr1Status: "VERIFIED", rating: 4.6, district: "Pune", taluka: "Mulshi", category: "Education", projectsCount: 8, totalFundingReceived: 42000000, contact: "public profile pending" },
  { id: "demo-ngo-2", name: "Verified Health Partner", darpanId: "MH/2026/DEMO002", csr1Status: "VERIFIED", rating: 4.4, district: "Nandurbar", taluka: "Akkalkuwa", category: "Health", projectsCount: 5, totalFundingReceived: 31000000, contact: "public profile pending" },
];

const fallbackCompanies: Company[] = [
  { id: "demo-company-1", name: "Mahindra CSR Trust", focusArea: "Education, Skill Development", csrBudget: 50000000, district: "Mumbai", policyLink: "#", projectsFunded: 12, industry: "Automotive" },
  { id: "demo-company-2", name: "Tata Projects CSR", focusArea: "Water, Rural Development", csrBudget: 65000000, district: "Mumbai", policyLink: "#", projectsFunded: 15, industry: "Infrastructure" },
];

export default function ProjectMarketplace({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DirectoryTab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as DirectoryTab);
    }
  }, [params?.tab]);

  useEffect(() => {
    const loadDirectories = async () => {
      setLoading(true);
      try {
        const [projectRows, ngoRows, companyRows] = await Promise.all([
          apiFetch<any[]>("/projects"),
          apiFetch<any[]>("/ngos"),
          apiFetch<any[]>("/companies")
        ]);

        if (projectRows.length > 0) {
          setProjects(projectRows.map((project) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            focusArea: project.focusArea,
            sdgGoal: project.sdgGoal,
            beneficiaryCount: project.beneficiaryCount,
            budgetRequested: Number(project.budgetRequested),
            district: project.district,
            taluka: project.taluka,
            ngoName: project.ngo?.name || project.ngoName || "Verified NGO",
            ngoRating: 4.5,
            matchScore: 0,
            status: project.status
          })));
        }

        if (ngoRows.length > 0) {
          setNgos(ngoRows.map((ngo) => ({
            id: ngo.id,
            name: ngo.name,
            darpanId: ngo.darpanNumber,
            csr1Status: ngo.status,
            rating: 4.5,
            district: ngo.district,
            taluka: ngo.taluka,
            category: ngo.impactStatistics?.category || "Verified NGO",
            projectsCount: ngo.projects?.length || 0,
            totalFundingReceived: Number(ngo.impactStatistics?.totalFundingReceived || 0),
            contact: ngo.website || "Not published"
          })));
        }

        if (companyRows.length > 0) {
          setCompanies(companyRows.map((company) => ({
            id: company.id,
            name: company.name,
            focusArea: company.focusAreas?.join(", ") || "CSR",
            csrBudget: Number(company.csrBudget),
            district: company.contactInfo?.district || "Maharashtra",
            policyLink: company.csrPolicyUrl || "#",
            shadowMatches: 0,
            projectsFunded: 0,
            industry: company.contactInfo?.industry || "Corporate"
          })));
        }
      } catch {
        setProjects(fallbackProjects);
        setNgos(fallbackNgos);
        setCompanies(fallbackCompanies);
      } finally {
        setLoading(false);
      }
    };

    loadDirectories();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedFocus, setSelectedFocus] = useState("All");
  const [minBudget, setMinBudget] = useState(0);

  // States for comparisons
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // Detailed Modal Views
  const [selectedNgoDetail, setSelectedNgoDetail] = useState<NGO | null>(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<Company | null>(null);

  const filteredProjects = projects.filter((proj) => {
    const matchesSearch = proj.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          proj.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          proj.ngoName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || proj.district === selectedDistrict;
    const matchesFocus = selectedFocus === "All" || proj.focusArea === selectedFocus;
    const matchesBudget = proj.budgetRequested >= minBudget;
    return matchesSearch && matchesDistrict && matchesFocus && matchesBudget;
  });

  const filteredNGOs = ngos.filter((ngo) => {
    const matchesSearch = ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ngo.darpanId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || ngo.district === selectedDistrict;
    const matchesCategory = selectedFocus === "All" || ngo.category.includes(selectedFocus);
    return matchesSearch && matchesDistrict && matchesCategory;
  });

  const filteredCompanies = companies.filter((comp) => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          comp.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || comp.district === selectedDistrict;
    const matchesFocus = selectedFocus === "All" || comp.focusArea.includes(selectedFocus);
    return matchesSearch && matchesDistrict && matchesFocus;
  });

  const handleToggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(cid => cid !== id));
    } else {
      if (compareIds.length >= 3) {
        alert("You can compare a maximum of 3 projects.");
        return;
      }
      setCompareIds([...compareIds, id]);
    }
  };

  const handleToggleBookmark = (id: string) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds(bookmarkedIds.filter(bid => bid !== id));
    } else {
      setBookmarkedIds([...bookmarkedIds, id]);
    }
  };

  const comparedProjects = projects.filter(p => compareIds.includes(p.id));

  return (
    <div className="csr-directory-page px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-8 bg-[#f4f5f7] text-gov-ink min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading font-extrabold text-4xl text-[#14274e] tracking-tight">Directory</h1>
        <p className="text-slate-600">Search verified projects, registered NGOs, and active corporate donors in Maharashtra.</p>
      </div>

      {/* Directory Tab Switcher */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-px">
        {[
          { id: "projects", label: "Active Project Proposals", icon: Compass },
          { id: "ngos", label: "Verified Grassroots NGOs", icon: Landmark },
          { id: "companies", label: "Registered Corporate Donors", icon: Building2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as DirectoryTab);
                setSearchTerm("");
                setSelectedDistrict("All");
                setSelectedFocus("All");
                router.push(`/marketplace/${tab.id}`);
              }}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                isActive 
                  ? "border-[#f7941d] text-[#f7941d] bg-slate-900/50" 
                  : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/25"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Sidebar: Unified Filters */}
        <aside className="w-full lg:w-72 bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-6 shrink-0 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="font-heading font-bold text-sm text-slate-200 uppercase tracking-wider">Search Filters</h3>
            <button 
              onClick={() => {
                setSelectedDistrict("All");
                setSelectedFocus("All");
                setMinBudget(0);
                setSearchTerm("");
              }}
              className="text-[10px] text-slate-500 hover:text-[#f7941d] font-bold"
            >
              Reset
            </button>
          </div>

          {/* Search Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs font-semibold">Search Name / Keywords</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-100 focus:outline-none focus:border-violet-500 transition-all placeholder-slate-600"
              />
              <Search size={14} className="absolute left-3 top-3.5 text-slate-500" />
            </div>
          </div>

          {/* District Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs font-semibold">District (Maharashtra)</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-955 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-350 focus:outline-none focus:border-violet-500 transition-all"
            >
              <option value="All">All Districts</option>
              <option value="Pune">Pune</option>
              <option value="Gadchiroli">Gadchiroli</option>
              <option value="Thane">Thane</option>
              <option value="Nagpur">Nagpur</option>
            </select>
          </div>

          {/* Focus Area Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs font-semibold">Sector Focus Area</label>
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value)}
              className="bg-slate-955 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-350 focus:outline-none focus:border-violet-500 transition-all"
            >
              <option value="All">All Sectors</option>
              <option value="Water Conservation">Water Conservation</option>
              <option value="Education & Literacy">Education & Literacy</option>
              <option value="Healthcare & Sanitation">Healthcare & Sanitation</option>
              <option value="Skill Development">Skill Development</option>
            </select>
          </div>

          {/* Budget Filter (Only applicable for projects) */}
          {activeTab === "projects" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 text-xs font-semibold">Minimum Budget (INR)</label>
              <input 
                type="number"
                value={minBudget}
                onChange={(e) => setMinBudget(Number(e.target.value))}
                placeholder="e.g. 1000000"
                className="bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-violet-500 transition-all placeholder-slate-600"
              />
            </div>
          )}

        </aside>

        {/* Right Area: Results Grid */}
        <div className="flex-grow flex flex-col gap-6 w-full">
          
          {/* Header count bar */}
          <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl shadow-sm flex justify-between items-center text-xs font-bold text-slate-400">
            <span>
              {activeTab === "projects" && `${filteredProjects.length} Projects found`}
              {activeTab === "ngos" && `${filteredNGOs.length} NGOs registered`}
              {activeTab === "companies" && `${filteredCompanies.length} Corporate donors`}
            </span>
          </div>

          {/* Directory Listings */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 w-full bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-[#f7941d] border-t-transparent animate-spin" />
              <span className="text-sm text-slate-500 font-semibold">Loading public directories...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Projects View */}
            {activeTab === "projects" && filteredProjects.map((project) => {
              const isComparing = compareIds.includes(project.id);
              const isBookmarked = bookmarkedIds.includes(project.id);
              return (
                <div key={project.id} className="glass-card p-6 rounded-3xl flex flex-col justify-between gap-6 relative">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                        {project.focusArea}
                      </span>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => handleToggleBookmark(project.id)} className="text-slate-500 hover:text-slate-200 transition-colors">
                          {isBookmarked ? <BookmarkCheck size={16} className="text-[#f7941d]" /> : <Bookmark size={16} />}
                        </button>
                        <span className="text-xs text-violet-450 bg-[#fef3e0] border border-[#fdeacd] px-2 py-0.5 rounded font-extrabold">{project.matchScore}% Match</span>
                      </div>
                    </div>

                    <h3 className="font-heading font-bold text-lg text-slate-100 leading-tight">{project.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Landmark size={12} className="text-[#f7941d]" /> NGO: {project.ngoName} • {project.ngoRating} ★
                    </p>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{project.description}</p>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
                    <div className="w-full h-px bg-slate-800" />
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500 flex items-center gap-1 font-medium"><MapPin size={12} /> {project.district}, {project.taluka}</span>
                      <span className="text-slate-200 flex items-center gap-1"><Coins size={12} className="text-[#f7941d]" /> ₹{project.budgetRequested.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="primary" size="sm" className="flex-grow">Fund Initiative</Button>
                      <Button 
                        variant={isComparing ? "secondary" : "outline"} 
                        size="sm"
                        onClick={() => handleToggleCompare(project.id)}
                        className="px-3"
                      >
                        {isComparing ? "Remove Compare" : "Compare"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 2. NGOs View */}
            {activeTab === "ngos" && filteredNGOs.map((ngo) => (
              <div key={ngo.id} className="glass-card p-6 rounded-3xl flex flex-col justify-between gap-6 relative">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                      {ngo.category}
                    </span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <ShieldCheck size={10} /> {ngo.csr1Status}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-slate-100 leading-tight">{ngo.name}</h3>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-semibold">
                    <span>NITI Aayog Darpan: <strong className="text-slate-350">{ngo.darpanId}</strong></span>
                    <span>District scope: <strong className="text-slate-350">{ngo.district}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <div className="w-full h-px bg-slate-800" />
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-500 flex items-center gap-1 font-medium"><Star size={12} className="text-[#f7941d]" /> Rated {ngo.rating} ★</span>
                    <span className="text-slate-200">₹{(ngo.totalFundingReceived / 100000).toFixed(1)} Lakhs Sourced</span>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => setSelectedNgoDetail(ngo)} className="w-full">
                    View Compliance Profile
                  </Button>
                </div>
              </div>
            ))}

            {/* 3. Companies View */}
            {activeTab === "companies" && filteredCompanies.map((comp) => (
              <div key={comp.id} className="glass-card p-6 rounded-3xl flex flex-col justify-between gap-6 relative">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                      {comp.industry}
                    </span>
                    <span className="text-[10px] text-indigo-750 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded font-bold">
                      Corporate Partner
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-lg text-slate-100 leading-tight">{comp.name}</h3>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 font-semibold">
                    <span>Target focus: <strong className="text-slate-350">{comp.focusArea}</strong></span>
                    <span>HQ Location: <strong className="text-slate-350">{comp.district}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-2">
                  <div className="w-full h-px bg-slate-800" />
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-500">Funded {comp.projectsFunded} Initiatives</span>
                    <span className="text-slate-200">Cap: ₹{(comp.csrBudget / 10000000).toFixed(1)} Cr</span>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => setSelectedCompanyDetail(comp)} className="w-full">
                    View CSR Policy Detail
                  </Button>
                </div>
              </div>
            ))}

            {((activeTab === "projects" && filteredProjects.length === 0) ||
              (activeTab === "ngos" && filteredNGOs.length === 0) ||
              (activeTab === "companies" && filteredCompanies.length === 0)) && (
              <div className="md:col-span-2 border border-gov-line bg-white p-8 text-center shadow-sm flex flex-col gap-2">
                <h3 className="font-heading font-bold text-lg text-gov-ink">No approved records published yet</h3>
                <p className="text-sm text-gov-muted max-w-xl mx-auto">
                  Public directory entries will appear after onboarding, statutory document verification, and administrative approval.
                </p>
              </div>
            )}

          </div>
          )}
        </div>

      </div>

      {/* Floating Compare Action Bar for Projects */}
      {activeTab === "projects" && compareIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-6 shadow-sm max-w-lg w-full justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-100 font-extrabold">{compareIds.length} Projects Selected</span>
            <span className="text-[10px] text-slate-500">Compare budgets and location metrics side-by-side</span>
          </div>

          <div className="flex gap-2">
            <Button variant="accent" size="sm" onClick={() => setShowCompareModal(true)}>
              Compare Matrix
            </Button>
            <button onClick={() => setCompareIds([])} className="text-xs text-slate-400 hover:text-white font-bold px-2">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Project Comparison Modal */}
      <Modal isOpen={showCompareModal} onClose={() => setShowCompareModal(false)} title="Proposal Comparison Matrix" className="max-w-3xl">
        <div className="grid grid-cols-4 gap-4 text-xs font-semibold items-stretch">
          <div className="flex flex-col justify-around text-slate-500 uppercase tracking-widest text-[10px] border-r border-slate-800 py-4">
            <div className="h-16 flex items-center font-extrabold">Project Title</div>
            <div className="h-12 flex items-center border-t border-slate-800">District</div>
            <div className="h-12 flex items-center border-t border-slate-800">Budget</div>
            <div className="h-12 flex items-center border-t border-slate-800">NGO Rating</div>
            <div className="h-12 flex items-center border-t border-slate-800">Match Score</div>
          </div>

          {comparedProjects.map((p) => (
            <div key={p.id} className="flex flex-col justify-around py-4 px-2 bg-slate-900/40 rounded-2xl border border-slate-800">
              <div className="h-16 font-heading font-extrabold text-sm text-slate-100 leading-tight line-clamp-3">{p.title}</div>
              <div className="h-12 flex items-center text-slate-350 border-t border-slate-800">{p.district}</div>
              <div className="h-12 flex items-center text-[#f7941d] font-bold border-t border-slate-800">₹{p.budgetRequested.toLocaleString("en-IN")}</div>
              <div className="h-12 flex items-center text-slate-350 border-t border-slate-800">{p.ngoRating} ★</div>
              <div className="h-12 flex items-center text-indigo-700 font-extrabold border-t border-slate-800">{p.matchScore}%</div>
            </div>
          ))}
        </div>
      </Modal>

      {/* NGO Detail compliance Modal */}
      <Modal isOpen={!!selectedNgoDetail} onClose={() => setSelectedNgoDetail(null)} title="NGO Compliance Ledger Profile" className="max-w-xl">
        {selectedNgoDetail && (
          <div className="flex flex-col gap-6 text-xs font-medium text-slate-400">
            <div className="flex flex-col gap-1">
              <h3 className="font-heading font-bold text-xl text-slate-100">{selectedNgoDetail.name}</h3>
              <span className="text-[10px] text-[#f7941d] font-bold uppercase tracking-wider">{selectedNgoDetail.category}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-800 py-4">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">NITI Darpan ID</span>
                <span className="text-slate-200 text-sm font-bold mt-1 block">{selectedNgoDetail.darpanId}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">CSR-1 MCA Status</span>
                <span className="text-emerald-600 text-sm font-bold mt-1 block flex items-center gap-1"><ShieldCheck size={14} /> Active / Verified</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">District Operation</span>
                <span className="text-slate-200 text-sm font-bold mt-1 block">{selectedNgoDetail.district} ({selectedNgoDetail.taluka})</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Official Email</span>
                <span className="text-slate-200 text-sm font-bold mt-1 block">{selectedNgoDetail.contact}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="font-heading font-bold text-sm text-slate-100">Audit Checkpoints Verification</h4>
              <ul className="flex flex-col gap-2">
                <li className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span>12A Tax Exemption status</span>
                  <span className="text-emerald-600 font-bold">Verified</span>
                </li>
                <li className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span>80G Tax Exemption status</span>
                  <span className="text-emerald-600 font-bold">Verified</span>
                </li>
                <li className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span>Three-year audited ledger filings</span>
                  <span className="text-emerald-600 font-bold">Verified</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Corporate Detail Modal */}
      <Modal isOpen={!!selectedCompanyDetail} onClose={() => setSelectedCompanyDetail(null)} title="Corporate CSR Profile" className="max-w-xl">
        {selectedCompanyDetail && (
          <div className="flex flex-col gap-6 text-xs font-medium text-slate-400">
            <div className="flex flex-col gap-1">
              <h3 className="font-heading font-bold text-xl text-slate-100">{selectedCompanyDetail.name}</h3>
              <span className="text-[10px] text-indigo-750 font-bold uppercase tracking-wider">{selectedCompanyDetail.industry} Industry</span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-800 py-4">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">HQ Location</span>
                <span className="text-slate-200 text-sm font-bold mt-1 block">{selectedCompanyDetail.district}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Active CSR Budget Limit</span>
                <span className="text-slate-200 text-sm font-bold mt-1 block">₹{(selectedCompanyDetail.csrBudget / 10000000).toFixed(1)} Cr</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Primary Focus Sector</span>
                <span className="text-slate-200 text-sm font-bold mt-1 block">{selectedCompanyDetail.focusArea}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Funded Initiatives Count</span>
                <span className="text-slate-200 text-sm font-bold mt-1 block">{selectedCompanyDetail.projectsFunded} Projects</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-slate-100 font-bold">CSR Board Policy Circular</span>
              <a 
                href={selectedCompanyDetail.policyLink} 
                target="_blank" 
                rel="noreferrer" 
                className="bg-slate-900 border border-slate-800 hover:bg-slate-800 p-3 rounded-xl flex items-center justify-between text-slate-200 transition-colors"
              >
                <span>Read Board approved CSR Policy statement</span>
                <ExternalLink size={14} className="text-[#f7941d]" />
              </a>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
