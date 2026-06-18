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

const mockProjects: Project[] = [
  {
    id: "proj-1",
    title: "Gadchiroli Watershed & Afforestation Initiative",
    description: "Building check dams, bunds, and reforestation to restore groundwater levels in Aheri taluka, Gadchiroli.",
    focusArea: "Water Conservation",
    sdgGoal: "SDG 6: Clean Water and Sanitation",
    beneficiaryCount: 12000,
    budgetRequested: 2500000,
    district: "Gadchiroli",
    taluka: "Aheri",
    ngoName: "Sahyadri Eco Foundation",
    ngoRating: 4.8,
    matchScore: 92,
    status: "Approved"
  },
  {
    id: "proj-2",
    title: "Pune Rural Digital Smart-Classrooms",
    description: "Equipping 15 Zilla Parishad schools in Haveli and Mulshi talukas with smart interactive screens and content.",
    focusArea: "Education & Literacy",
    sdgGoal: "SDG 4: Quality Education",
    beneficiaryCount: 6500,
    budgetRequested: 3500000,
    district: "Pune",
    taluka: "Haveli",
    ngoName: "Sahyadri Eco Foundation",
    ngoRating: 4.8,
    matchScore: 95,
    status: "Submitted"
  },
  {
    id: "proj-3",
    title: "Nagpur Mobile Medical Clinics",
    description: "Operating mobile primary health vehicles serving remote farming villages in Ramtek and Hingna districts.",
    focusArea: "Healthcare & Sanitation",
    sdgGoal: "SDG 3: Good Health and Well-being",
    beneficiaryCount: 18000,
    budgetRequested: 4800000,
    district: "Nagpur",
    taluka: "Ramtek",
    ngoName: "Vidarbha Seva Samiti",
    ngoRating: 4.2,
    matchScore: 78,
    status: "Approved"
  },
  {
    id: "proj-4",
    title: "Thane Women Vocational Training Centers",
    description: "Empowering underemployed tribal women in Shahapur with tailoring, computer skills, and handicraft training.",
    focusArea: "Skill Development",
    sdgGoal: "SDG 8: Decent Work and Economic Growth",
    beneficiaryCount: 3500,
    budgetRequested: 1800000,
    district: "Thane",
    taluka: "Shahapur",
    ngoName: "Udan Welfare Society",
    ngoRating: 4.5,
    matchScore: 90,
    status: "Approved"
  }
];

const mockNGOs: NGO[] = [
  {
    id: "ngo-1",
    name: "Sahyadri Eco Foundation",
    darpanId: "MH/2021/012345",
    csr1Status: "Verified",
    rating: 4.8,
    district: "Pune",
    taluka: "Haveli",
    category: "Environment & Water",
    projectsCount: 18,
    totalFundingReceived: 8500000,
    contact: "contact@sahyadri.org"
  },
  {
    id: "ngo-2",
    name: "Vidarbha Seva Samiti",
    darpanId: "MH/2019/045612",
    csr1Status: "Verified",
    rating: 4.2,
    district: "Nagpur",
    taluka: "Ramtek",
    category: "Healthcare & Social",
    projectsCount: 12,
    totalFundingReceived: 6200000,
    contact: "info@vidarbhaseva.org"
  },
  {
    id: "ngo-3",
    name: "Udan Welfare Society",
    darpanId: "MH/2020/098765",
    csr1Status: "Verified",
    rating: 4.5,
    district: "Thane",
    taluka: "Shahapur",
    category: "Skill Development",
    projectsCount: 22,
    totalFundingReceived: 12500000,
    contact: "office@udan.org"
  }
];

const mockCompanies: Company[] = [
  {
    id: "comp-1",
    name: "Tata Projects Limited",
    focusArea: "Water & Infrastructure",
    csrBudget: 120000000,
    district: "Mumbai City",
    policyLink: "https://tata.com/csr-policy",
    projectsFunded: 45,
    industry: "Construction"
  },
  {
    id: "comp-2",
    name: "Reliance Foundation",
    focusArea: "Education & Health",
    csrBudget: 180000000,
    district: "Mumbai Suburban",
    policyLink: "https://reliance.com/csr",
    projectsFunded: 98,
    industry: "Conglomerate"
  },
  {
    id: "comp-3",
    name: "Mahindra CSR Trust",
    focusArea: "Environment & Rural",
    csrBudget: 80000000,
    district: "Pune",
    policyLink: "https://mahindra.com/csr",
    projectsFunded: 32,
    industry: "Automotive"
  }
];

export default function ProjectMarketplace({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DirectoryTab>("projects");

  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as DirectoryTab);
    }
  }, [params?.tab]);
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

  const filteredProjects = mockProjects.filter((proj) => {
    const matchesSearch = proj.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          proj.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          proj.ngoName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || proj.district === selectedDistrict;
    const matchesFocus = selectedFocus === "All" || proj.focusArea === selectedFocus;
    const matchesBudget = proj.budgetRequested >= minBudget;
    return matchesSearch && matchesDistrict && matchesFocus && matchesBudget;
  });

  const filteredNGOs = mockNGOs.filter((ngo) => {
    const matchesSearch = ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ngo.darpanId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || ngo.district === selectedDistrict;
    const matchesCategory = selectedFocus === "All" || ngo.category.includes(selectedFocus);
    return matchesSearch && matchesDistrict && matchesCategory;
  });

  const filteredCompanies = mockCompanies.filter((comp) => {
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

  const comparedProjects = mockProjects.filter(p => compareIds.includes(p.id));

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Public CSR Directories</h1>
        <p className="text-slate-400">Search verified grassroots projects, registered NGOs, and active corporate donors in Maharashtra.</p>
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
                  ? "border-[#f97316] text-[#f97316] bg-slate-900/50" 
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
              className="text-[10px] text-slate-500 hover:text-[#f97316] font-bold"
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
                          {isBookmarked ? <BookmarkCheck size={16} className="text-[#f97316]" /> : <Bookmark size={16} />}
                        </button>
                        <span className="text-xs text-violet-450 bg-[#fff7ed] border border-[#ffedd5] px-2 py-0.5 rounded font-extrabold">{project.matchScore}% Match</span>
                      </div>
                    </div>

                    <h3 className="font-heading font-bold text-lg text-slate-100 leading-tight">{project.title}</h3>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Landmark size={12} className="text-[#f97316]" /> NGO: {project.ngoName} • {project.ngoRating} ★
                    </p>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{project.description}</p>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
                    <div className="w-full h-px bg-slate-800" />
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500 flex items-center gap-1 font-medium"><MapPin size={12} /> {project.district}, {project.taluka}</span>
                      <span className="text-slate-200 flex items-center gap-1"><Coins size={12} className="text-[#f97316]" /> ₹{project.budgetRequested.toLocaleString("en-IN")}</span>
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
                    <span className="text-slate-500 flex items-center gap-1 font-medium"><Star size={12} className="text-[#f97316]" /> Rated {ngo.rating} ★</span>
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

          </div>
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
              <div className="h-12 flex items-center text-[#f97316] font-bold border-t border-slate-800">₹{p.budgetRequested.toLocaleString("en-IN")}</div>
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
              <span className="text-[10px] text-[#f97316] font-bold uppercase tracking-wider">{selectedNgoDetail.category}</span>
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
                <ExternalLink size={14} className="text-[#f97316]" />
              </a>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
