"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search, MapPin, Tag, Compass, Landmark, Coins, Star,
  List, Grid, FileText, CheckCircle2, Bookmark,
  BookmarkCheck, ShieldCheck, Building2, ExternalLink, Filter,
  Eye, X, Calendar, Info, Phone, Mail, Globe, Target
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { ViewToggle, ViewMode } from "@/components/ui/ViewToggle";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiFetch } from "@/lib/api";

type DirectoryTab = "projects" | "ngos" | "companies";

interface BudgetBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
}

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
  duration?: string;
  impactGoals?: string;
  deliverables?: string[];
  budgetBreakdown?: BudgetBreakdownItem[];
  ngoDarpanId?: string;
  contactEmail?: string;
  contactPhone?: string;
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
  about?: string;
  establishedYear?: number;
  tax12A?: boolean;
  tax80G?: boolean;
  fcraStatus?: string;
  operatingDistricts?: string[];
  leadership?: { name: string; title: string }[];
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  completedProjectsCount?: number;
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
  csrPledged?: number;
  targetDistricts?: string[];
  eligibilityCriteria?: string[];
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  csrPolicySummary?: string;
  averageGrantSize?: string;
}

const fallbackProjects: Project[] = [
  {
    id: "demo-project-1",
    title: "Digital Learning Lab for Zilla Parishad Schools",
    description: "Smart classroom equipment, solar-powered tablets, interactive displays, and comprehensive teacher orientation for 15 rural government schools across Mulshi block.",
    focusArea: "Education",
    sdgGoal: "SDG 4: Quality Education",
    beneficiaryCount: 4500,
    budgetRequested: 7500000,
    district: "Pune",
    taluka: "Mulshi",
    ngoName: "Verified Education Partner",
    ngoRating: 4.6,
    ngoDarpanId: "MH/2026/DEMO001",
    matchScore: 92,
    status: "PUBLISHED",
    duration: "12 Months",
    impactGoals: "Bridge the rural-urban digital divide, improve learning retention by 45%, and achieve 100% digital literacy for 4,500 students.",
    deliverables: [
      "15 Interactive Smart Board Displays installed",
      "150 Solar-rechargeable Student Tablets deployed",
      "Offline K-12 Regional Curriculum Content preloaded",
      "30 Teacher Capacity Building & Digital Pedagogy Workshops"
    ],
    budgetBreakdown: [
      { category: "Hardware & Smart Displays", amount: 3500000, percentage: 46.7 },
      { category: "E-Learning Content & Software Licenses", amount: 1500000, percentage: 20.0 },
      { category: "Teacher Capacity Building & Orientation", amount: 1000000, percentage: 13.3 },
      { category: "Solar Power Infrastructure & Battery Backup", amount: 1000000, percentage: 13.3 },
      { category: "Monitoring, Evaluation & Third-Party Audit", amount: 500000, percentage: 6.7 }
    ],
    contactEmail: "proposals@verifiededu.org.in",
    contactPhone: "+91 98230 11223"
  },
  {
    id: "demo-project-2",
    title: "Primary Health Centre Diagnostic Equipment Package",
    description: "Package of basic diagnostic equipment, solar cold-chain storage for vaccines, and telemedicine connectivity kiosks for high-footfall tribal healthcare facilities.",
    focusArea: "Health",
    sdgGoal: "SDG 3: Good Health & Well-Being",
    beneficiaryCount: 18000,
    budgetRequested: 12000000,
    district: "Nandurbar",
    taluka: "Akkalkuwa",
    ngoName: "Verified Health Partner",
    ngoRating: 4.4,
    ngoDarpanId: "MH/2026/DEMO002",
    matchScore: 88,
    status: "PUBLISHED",
    duration: "18 Months",
    impactGoals: "Provide zero-cost point-of-care diagnostic screening for 18,000 tribal villagers and reduce emergency hospital transfer times by 60%.",
    deliverables: [
      "5 Portable ECG & Ultrasound units supplied",
      "Automated Blood Hematology & Chemistry Analyzers",
      "Solar Vaccine Refrigerators for remote PHCs",
      "Tele-consultation Doctor Linkage Application"
    ],
    budgetBreakdown: [
      { category: "Medical & Diagnostic Machinery", amount: 6500000, percentage: 54.2 },
      { category: "Tele-Health Connectivity Infrastructure", amount: 2000000, percentage: 16.7 },
      { category: "Healthcare Staff Training & Onboarding", amount: 1800000, percentage: 15.0 },
      { category: "Solar Power Systems for 24/7 Operations", amount: 1200000, percentage: 10.0 },
      { category: "Administrative & Audit Compliance", amount: 500000, percentage: 4.1 }
    ],
    contactEmail: "health.projects@verifiedhealth.org.in",
    contactPhone: "+91 94221 55667"
  },
  {
    id: "demo-project-3",
    title: "Water Conservation and Check Dam Repair Initiative",
    description: "Desilting, stonework repair, and hydrological finishing of community water conservation structures with Pani Samiti capacity building and geotagged evidence.",
    focusArea: "Water Conservation",
    sdgGoal: "SDG 6: Clean Water & Sanitation",
    beneficiaryCount: 9000,
    budgetRequested: 9800000,
    district: "Gadchiroli",
    taluka: "Aheri",
    ngoName: "Verified Rural Partner",
    ngoRating: 4.7,
    ngoDarpanId: "MH/2026/DEMO003",
    matchScore: 90,
    status: "PUBLISHED",
    duration: "9 Months",
    impactGoals: "Recharge groundwater tables across 6 villages, secure year-round irrigation water for 9,000 farmers, and create 3.5 Crore liters storage capacity.",
    deliverables: [
      "Desilting of 4 Community Percolation Tanks",
      "Masonry Repair of 6 Cement Nalla Bunds",
      "12 Groundwater Artificial Recharge Wells",
      "Pani Samiti Handover & Community Maintenance Plan"
    ],
    budgetBreakdown: [
      { category: "Heavy Machinery & Earthmoving Work", amount: 4800000, percentage: 49.0 },
      { category: "Masonry & Structural Reinforcement", amount: 2500000, percentage: 25.5 },
      { category: "Community Pani Samiti Training & Mobilization", amount: 1200000, percentage: 12.2 },
      { category: "Hydrological Survey & Geotagged Audit", amount: 800000, percentage: 8.2 },
      { category: "Contingency & Project Management", amount: 500000, percentage: 5.1 }
    ],
    contactEmail: "projects@verifiedrural.org.in",
    contactPhone: "+91 98902 44331"
  },
  {
    id: "demo-project-4",
    title: "Tribal Youth Skill Development & Micro-Enterprise Incubator",
    description: "Vocational market-linked skill development, solar technician certification, and micro-grant seed capital for youth micro-entrepreneurs in tribal blocks.",
    focusArea: "Skill Development",
    sdgGoal: "SDG 8: Decent Work & Economic Growth",
    beneficiaryCount: 1200,
    budgetRequested: 8500000,
    district: "Thane",
    taluka: "Shahapur",
    ngoName: "Maharashtra Kaushalya Foundation",
    ngoRating: 4.8,
    ngoDarpanId: "MH/2026/DEMO004",
    matchScore: 95,
    status: "PUBLISHED",
    duration: "12 Months",
    impactGoals: "Train 1,200 tribal youth, achieve 80%+ job placement, and incubate 40 sustainable micro-enterprises with local market linkages.",
    deliverables: [
      "Solar & Electrical Appliance Repair Certification",
      "Organic Agriculture & Agribusiness Modules",
      "Seed Capital Grants for 40 Micro-Enterprises",
      "Industry Apprenticeship & Job Placement Drives"
    ],
    budgetBreakdown: [
      { category: "Vocational Curriculum & Instructor Fees", amount: 3200000, percentage: 37.6 },
      { category: "Practical Workshop Toolkits & Equipment", amount: 2500000, percentage: 29.4 },
      { category: "Micro-Enterprise Incubation Seed Grants", amount: 1800000, percentage: 21.2 },
      { category: "Placement Drives & Market Linkages", amount: 600000, percentage: 7.1 },
      { category: "Administrative & Reporting Expenses", amount: 400000, percentage: 4.7 }
    ],
    contactEmail: "skill.incubation@kaushalya.org.in",
    contactPhone: "+91 97654 32100"
  }
];

const fallbackNgos: NGO[] = [
  {
    id: "demo-ngo-1",
    name: "Verified Education Partner",
    darpanId: "MH/2026/DEMO001",
    csr1Status: "VERIFIED",
    rating: 4.6,
    district: "Pune",
    taluka: "Mulshi",
    category: "Education & Literacy",
    projectsCount: 8,
    completedProjectsCount: 24,
    totalFundingReceived: 42000000,
    contact: "contact@verifiededu.org.in",
    about: "Empaneled non-profit focused on digital transformation of rural Zilla Parishad schools, teacher capacity building, and STEM education infrastructure across Western Maharashtra.",
    establishedYear: 2012,
    tax12A: true,
    tax80G: true,
    fcraStatus: "Approved for Foreign Contributions",
    operatingDistricts: ["Pune", "Satara", "Solapur", "Ahmednagar", "Nashik"],
    leadership: [
      { name: "Dr. Aniket Deshmukh", title: "Founder & Executive Director" },
      { name: "Mrs. Meenal Kulkarni", title: "Head of Academic Programs" }
    ],
    phone: "+91 98230 11223",
    email: "contact@verifiededu.org.in",
    website: "https://verifiededu.org.in",
    address: "Plot 42, Baner IT Park Road, Pune, Maharashtra 411045"
  },
  {
    id: "demo-ngo-2",
    name: "Verified Health Partner",
    darpanId: "MH/2026/DEMO002",
    csr1Status: "VERIFIED",
    rating: 4.4,
    district: "Nandurbar",
    taluka: "Akkalkuwa",
    category: "Healthcare & Sanitation",
    projectsCount: 5,
    completedProjectsCount: 16,
    totalFundingReceived: 31000000,
    contact: "info@healthpartner.org.in",
    about: "Dedicated healthcare foundation delivering mobile diagnostic clinics, maternal-child health screening, and primary health centre modernization in tribal regions of Maharashtra.",
    establishedYear: 2015,
    tax12A: true,
    tax80G: true,
    fcraStatus: "Registered",
    operatingDistricts: ["Nandurbar", "Dhule", "Jalgaon", "Nashik", "Palghar"],
    leadership: [
      { name: "Dr. Sunita Kulkarni", title: "Managing Trustee" },
      { name: "Dr. Prakash Varma", title: "Chief Medical Officer" }
    ],
    phone: "+91 94221 55667",
    email: "info@healthpartner.org.in",
    website: "https://healthpartner.org.in",
    address: "Swasthya Bhavan, Civil Lines, Nandurbar, Maharashtra 425412"
  },
  {
    id: "demo-ngo-3",
    name: "Verified Rural Partner",
    darpanId: "MH/2026/DEMO003",
    csr1Status: "VERIFIED",
    rating: 4.7,
    district: "Gadchiroli",
    taluka: "Aheri",
    category: "Water & Environment",
    projectsCount: 11,
    completedProjectsCount: 32,
    totalFundingReceived: 58000000,
    contact: "trust@ruralpartner.org.in",
    about: "Pioneering grassroots trust executing water conservation, check dam restoration, afforestation, and sustainable watershed management in Vidarbha's tribal districts.",
    establishedYear: 2008,
    tax12A: true,
    tax80G: true,
    fcraStatus: "Exempted",
    operatingDistricts: ["Gadchiroli", "Chandrapur", "Gondia", "Bhandara", "Amravati"],
    leadership: [
      { name: "Rajeshwar Patil", title: "Chief Executive Officer" },
      { name: "Suresh Gawande", title: "Director of Hydrology" }
    ],
    phone: "+91 98902 44331",
    email: "trust@ruralpartner.org.in",
    website: "https://ruralpartner.org.in",
    address: "Jal Seva Sadan, Collectorate Road, Gadchiroli, Maharashtra 442605"
  }
];

const fallbackCompanies: Company[] = [
  {
    id: "demo-company-1",
    name: "Mahindra CSR Trust",
    focusArea: "Education & Skill Development",
    csrBudget: 50000000,
    csrPledged: 38000000,
    district: "Mumbai",
    policyLink: "https://www.mahindra.com/csr-policy",
    projectsFunded: 12,
    industry: "Automotive & Manufacturing",
    targetDistricts: ["Pune", "Nashik", "Thane", "Nagpur", "Chhatrapati Sambhajinagar"],
    eligibilityCriteria: [
      "Minimum 3 years active operational existence with NITI Aayog Darpan registration",
      "Valid 12A and 80G Tax Exemption Certificates issued by Income Tax Dept.",
      "Audited financial statements for past 3 consecutive fiscal years",
      "Mandatory active CSR-1 filing with Ministry of Corporate Affairs (MCA)"
    ],
    contactPerson: "Rahul Shirke (Head of CSR - Maharashtra)",
    contactEmail: "csr.trust@mahindra.example.com",
    contactPhone: "+91 22 6677 8899",
    csrPolicySummary: "Focuses on empowering youth and women through quality digital education, STEM learning labs, vocational skill centers, and sustainable rural livelihood initiatives across Maharashtra.",
    averageGrantSize: "₹40 Lakhs - ₹1.2 Crore"
  },
  {
    id: "demo-company-2",
    name: "Tata Projects CSR Foundation",
    focusArea: "Water Conservation & Environment",
    csrBudget: 65000000,
    csrPledged: 52000000,
    district: "Mumbai",
    policyLink: "https://www.tataprojects.com/csr-policy",
    projectsFunded: 15,
    industry: "Infrastructure & Engineering",
    targetDistricts: ["Gadchiroli", "Nandurbar", "Palghar", "Yavatmal", "Nanded"],
    eligibilityCriteria: [
      "Empaneled Grassroots NGO with proven track record in water resource management",
      "Direct ground presence and local community Pani Samiti engagement",
      "Commitment to geotagged progress tracking and quarterly milestone reporting",
      "CSR-1 registration with active MCA verification"
    ],
    contactPerson: "Priya Nambiar (General Manager - CSR)",
    contactEmail: "csr@tataprojects.example.com",
    contactPhone: "+91 22 6665 8282",
    csrPolicySummary: "Dedicated to water security, check dam construction, solar drinking water systems, and environmental conservation in aspirational and tribal districts of Maharashtra.",
    averageGrantSize: "₹50 Lakhs - ₹2.0 Crore"
  },
  {
    id: "demo-company-3",
    name: "Bajaj Auto Social Responsibility Trust",
    focusArea: "Healthcare & Technical Skills",
    csrBudget: 80000000,
    csrPledged: 60000000,
    district: "Pune",
    policyLink: "https://www.bajajauto.com/csr",
    projectsFunded: 22,
    industry: "Consumer Mobility & Manufacturing",
    targetDistricts: ["Pune", "Chhatrapati Sambhajinagar", "Wardha", "Raigad"],
    eligibilityCriteria: [
      "Registered NGO with valid NITI Aayog ID and clean compliance track record",
      "Clear impact metrics with zero litigation or adverse regulatory findings",
      "Capability to execute technical skill centers or healthcare equipment deployment",
      "Quarterly transparent fund utilization reporting"
    ],
    contactPerson: "Amit Varma (CSR Lead Trustee)",
    contactEmail: "csr@bajajauto.example.com",
    contactPhone: "+91 20 6610 6500",
    csrPolicySummary: "Priority funding for rural primary healthcare enhancement, ITI skill lab modernization, road safety education, and sustainable community infrastructure.",
    averageGrantSize: "₹30 Lakhs - ₹1.5 Crore"
  }
];

export default function ProjectMarketplace({ params }: { params?: { tab?: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DirectoryTab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    if (params?.tab && ["projects", "ngos", "companies"].includes(params.tab)) {
      setActiveTab(params.tab as DirectoryTab);
    }
  }, [params?.tab]);

  useEffect(() => {
    const loadDirectories = async () => {
      setLoading(true);
      try {
        const [projectRows, pitchRows, ngoRows, companyRows] = await Promise.all([
          apiFetch<any[]>("/projects").catch(() => []),
          apiFetch<any[]>("/government-pitches/public").catch(() => []),
          apiFetch<any[]>("/ngos").catch(() => []),
          apiFetch<any[]>("/companies").catch(() => [])
        ]);

        const mappedPitches = Array.isArray(pitchRows) ? pitchRows.map((pitch: any) => ({
          id: pitch.id || pitch.pitchReferenceId,
          title: pitch.title || pitch.csrRequirement?.slice(0, 100) || "Live Government Development Need",
          description: pitch.csrRequirement || pitch.title || "Government department requirement open for CSR partnership.",
          focusArea: pitch.sector || pitch.department || "Government Development Need",
          sdgGoal: "SDG Goal",
          beneficiaryCount: pitch.beneficiaryCount || 2500,
          budgetRequested: Number(pitch.estimatedCost || pitch.budget || 0),
          district: Array.isArray(pitch.districts) && pitch.districts.length > 0 ? pitch.districts[0] : (pitch.district || "Maharashtra"),
          taluka: Array.isArray(pitch.talukas) && pitch.talukas.length > 0 ? pitch.talukas[0] : "Statewide",
          ngoName: pitch.department || pitch.officeName || "Government Department Need",
          ngoRating: 5.0,
          ngoDarpanId: pitch.pitchReferenceId || "GOV-MH-NEED",
          matchScore: 95,
          status: "PUBLIC_LISTED",
          duration: "12 Months",
          impactGoals: "Direct community infrastructure and public development impact.",
          deliverables: [
            "Government Department Requirement",
            "Verified Site Geotagging & Approval",
            "Joint Secretariat MoU Alignment"
          ],
          budgetBreakdown: [
            { category: "Capital Outlay & Works", amount: Number(pitch.estimatedCost || 0) * 0.8, percentage: 80 },
            { category: "Supervision & Quality Inspection", amount: Number(pitch.estimatedCost || 0) * 0.2, percentage: 20 }
          ],
          contactEmail: pitch.email || "partner@mahacsr.gov.in",
          contactPhone: pitch.mobile || "+91 22 2202 5500"
        })) : [];

        const mappedProjects = Array.isArray(projectRows) ? projectRows.map((project) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          focusArea: project.focusArea || "Education",
          sdgGoal: project.sdgGoal || "SDG Goal",
          beneficiaryCount: project.beneficiaryCount || 1500,
          budgetRequested: Number(project.budgetRequested || project.budget || 0),
          district: project.district || "Maharashtra",
          taluka: project.taluka || "Statewide",
          ngoName: project.ngo?.name || project.ngoName || "Empaneled Partner",
          ngoRating: project.ngoRating || 4.5,
          ngoDarpanId: project.ngo?.darpanNumber || project.ngoDarpanId || "MH/2026/REG",
          matchScore: project.matchScore || 90,
          status: project.status || "PUBLISHED",
          duration: project.duration || "12 Months",
          impactGoals: project.impactGoals || "Improve community indicators and sustainable outcome metrics.",
          deliverables: project.deliverables || [
            "Equipment procurement & installation",
            "Community stakeholder orientation",
            "Milestone execution & geotagged audit"
          ],
          budgetBreakdown: project.budgetBreakdown || [
            { category: "Equipment & Hardware", amount: Number(project.budgetRequested || 0) * 0.5, percentage: 50 },
            { category: "Implementation & Operations", amount: Number(project.budgetRequested || 0) * 0.3, percentage: 30 },
            { category: "Capacity Building & Orientation", amount: Number(project.budgetRequested || 0) * 0.15, percentage: 15 },
            { category: "Audit & Administration", amount: Number(project.budgetRequested || 0) * 0.05, percentage: 5 }
          ],
          contactEmail: project.contactEmail || "proposals@mahacsr.gov.in",
          contactPhone: project.contactPhone || "+91 22 2202 5500"
        })) : [];

        const combinedProjects = [...mappedPitches, ...mappedProjects];
        if (combinedProjects.length > 0) {
          setProjects(combinedProjects);
        } else {
          setProjects(fallbackProjects);
        }

        if (Array.isArray(ngoRows) && ngoRows.length > 0) {
          setNgos(ngoRows.map((ngo) => ({
            id: ngo.id,
            name: ngo.name,
            darpanId: ngo.darpanNumber || ngo.darpanId || "MH/2026/REG",
            csr1Status: ngo.status || "VERIFIED",
            rating: ngo.rating || 4.5,
            district: ngo.district || "Maharashtra",
            taluka: ngo.taluka || "Statewide",
            category: ngo.impactStatistics?.category || ngo.category || "Education & Literacy",
            projectsCount: ngo.projects?.length || 4,
            completedProjectsCount: ngo.completedProjectsCount || 12,
            totalFundingReceived: Number(ngo.impactStatistics?.totalFundingReceived || 25000000),
            contact: ngo.website || ngo.email || "contact@ngo.org.in",
            about: ngo.about || "Empaneled non-profit working on rural development and CSR implementation in Maharashtra.",
            establishedYear: ngo.establishedYear || 2012,
            tax12A: true,
            tax80G: true,
            fcraStatus: ngo.fcraStatus || "Registered",
            operatingDistricts: ngo.operatingDistricts || [ngo.district || "Pune", "Thane", "Nashik"],
            leadership: ngo.leadership || [{ name: "Managing Trustee", title: "Head of Operations" }],
            phone: ngo.phone || "+91 98200 12345",
            email: ngo.email || "info@ngo.org.in",
            website: ngo.website || "https://ngo.org.in",
            address: ngo.address || "Maharashtra, India"
          })));
        } else {
          setNgos(fallbackNgos);
        }

        if (Array.isArray(companyRows) && companyRows.length > 0) {
          setCompanies(companyRows.map((company) => ({
            id: company.id,
            name: company.name,
            focusArea: company.focusAreas?.join(", ") || company.focusArea || "CSR Development",
            csrBudget: Number(company.csrBudget || 50000000),
            csrPledged: Number(company.csrPledged || 35000000),
            district: company.contactInfo?.district || company.district || "Mumbai",
            policyLink: company.csrPolicyUrl || "#",
            projectsFunded: company.projectsFunded || 8,
            industry: company.contactInfo?.industry || company.industry || "Corporate",
            targetDistricts: company.targetDistricts || ["Pune", "Thane", "Nagpur"],
            eligibilityCriteria: company.eligibilityCriteria || [
              "Registered NGO with active NITI Aayog Darpan ID",
              "Valid 12A and 80G Tax Exemption Certificates",
              "Active CSR-1 filing with Ministry of Corporate Affairs"
            ],
            contactPerson: company.contactPerson || "CSR Officer",
            contactEmail: company.contactEmail || "csr@company.com",
            contactPhone: company.contactPhone || "+91 22 2200 0000",
            csrPolicySummary: company.csrPolicySummary || "Dedicated to impactful community development and sustainable CSR initiatives across Maharashtra.",
            averageGrantSize: company.averageGrantSize || "₹25 Lakhs - ₹1.0 Crore"
          })));
        } else {
          setCompanies(fallbackCompanies);
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
  const [budgetFilter, setBudgetFilter] = useState("All");
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  const [selectedProjectDetail, setSelectedProjectDetail] = useState<Project | null>(null);
  const [selectedNgoDetail, setSelectedNgoDetail] = useState<NGO | null>(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<Company | null>(null);

  const activeFilterCount = (searchTerm ? 1 : 0) + (selectedDistrict !== "All" ? 1 : 0) + (selectedFocus !== "All" ? 1 : 0) + (budgetFilter !== "All" ? 1 : 0);

  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedDistrict("All");
    setSelectedFocus("All");
    setBudgetFilter("All");
  };

  const filteredProjects = projects.filter((proj) => {
    const matchesSearch = proj.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          proj.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          proj.ngoName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || proj.district === selectedDistrict;
    const matchesFocus = selectedFocus === "All" || proj.focusArea.includes(selectedFocus) || selectedFocus.includes(proj.focusArea);
    
    let matchesBudget = true;
    if (budgetFilter === "under50L") matchesBudget = proj.budgetRequested < 5000000;
    else if (budgetFilter === "50Lto1Cr") matchesBudget = proj.budgetRequested >= 5000000 && proj.budgetRequested <= 10000000;
    else if (budgetFilter === "above1Cr") matchesBudget = proj.budgetRequested > 10000000;

    return matchesSearch && matchesDistrict && matchesFocus && matchesBudget;
  });

  const filteredNGOs = ngos.filter((ngo) => {
    const matchesSearch = ngo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ngo.darpanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ngo.about && ngo.about.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDistrict = selectedDistrict === "All" || ngo.district === selectedDistrict || (ngo.operatingDistricts && ngo.operatingDistricts.includes(selectedDistrict));
    const matchesCategory = selectedFocus === "All" || ngo.category.includes(selectedFocus) || selectedFocus.includes(ngo.category);
    return matchesSearch && matchesDistrict && matchesCategory;
  });

  const filteredCompanies = companies.filter((comp) => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          comp.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDistrict = selectedDistrict === "All" || comp.district === selectedDistrict || (comp.targetDistricts && comp.targetDistricts.includes(selectedDistrict));
    const matchesFocus = selectedFocus === "All" || comp.focusArea.includes(selectedFocus) || selectedFocus.includes(comp.focusArea);
    return matchesSearch && matchesDistrict && matchesFocus;
  });

  const handleToggleBookmark = (id: string) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds(bookmarkedIds.filter(bid => bid !== id));
    } else {
      setBookmarkedIds([...bookmarkedIds, id]);
    }
  };

  return (
    <div className="space-y-6 pb-12">

      <GovPageHeader
        breadcrumb="Home / Marketplace Directory"
        title="Marketplace Directory"
        description="Search verified project proposals, empaneled Grassroots NGOs, and registered corporate CSR donors in Maharashtra."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Project Proposals"
          value={projects.length}
          icon={Compass}
          index={0}
          colorTheme="blue"
          sublabel="Statewide Development Needs"
          badge="Live Proposals"
        />
        <StatCard
          label="Verified Grassroots NGOs"
          value={ngos.length}
          icon={Landmark}
          index={1}
          colorTheme="emerald"
          sublabel="Empaneled & Verified"
          badge="NITI Aayog Verified"
        />
        <StatCard
          label="Registered Corporate Donors"
          value={companies.length}
          icon={Building2}
          index={2}
          colorTheme="purple"
          sublabel="Active CSR Foundations"
          badge="Corporate Partners"
        />
        <StatCard
          label="Total CSR Allocation"
          value="₹141.5 Cr"
          icon={Coins}
          index={3}
          colorTheme="amber"
          sublabel="Pledged CSR Capital"
          badge="Statewide Budget"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "projects", label: "Active Project Proposals", icon: Compass, count: projects.length },
            { id: "ngos", label: "Verified Grassroots NGOs (Implementing Agencies)", icon: Landmark, count: ngos.length },
            { id: "companies", label: "Registered Corporate Donors", icon: Building2, count: companies.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as DirectoryTab);
                  resetAllFilters();
                  window.history.replaceState(null, "", `/marketplace/${tab.id}`);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white shadow-md"
                    : "text-slate-600 hover:text-blue-900 hover:bg-slate-100/80 font-bold"
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          
          <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <label className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <Search size={13} className="text-blue-600" />
              <span>Search Keywords / Name</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === "projects"
                    ? "Search proposal title, NGO..."
                    : activeTab === "ngos"
                    ? "Search NGO name, Darpan ID..."
                    : "Search corporate, industry..."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-semibold placeholder:text-slate-400 shadow-2xs"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="w-full sm:w-auto min-w-[160px] flex flex-col gap-1.5">
            <label className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <MapPin size={13} className="text-blue-600" />
              <span>District (Maharashtra)</span>
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-semibold cursor-pointer shadow-2xs"
            >
              <option value="All">All Districts</option>
              <option value="Pune">Pune</option>
              <option value="Nandurbar">Nandurbar</option>
              <option value="Gadchiroli">Gadchiroli</option>
              <option value="Thane">Thane</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Nagpur">Nagpur</option>
              <option value="Nashik">Nashik</option>
              <option value="Palghar">Palghar</option>
              <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
            </select>
          </div>

          <div className="w-full sm:w-auto min-w-[160px] flex flex-col gap-1.5">
            <label className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <Tag size={13} className="text-blue-600" />
              <span>Sector Focus Area</span>
            </label>
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-semibold cursor-pointer shadow-2xs"
            >
              <option value="All">All Focus Sectors</option>
              <option value="Education">Education & Literacy</option>
              <option value="Health">Healthcare & Sanitation</option>
              <option value="Water Conservation">Water Conservation</option>
              <option value="Skill Development">Skill Development</option>
              <option value="Environment">Environment & Forestry</option>
              <option value="Rural Infrastructure">Rural Infrastructure</option>
            </select>
          </div>

          <div className="w-full sm:w-auto min-w-[150px] flex flex-col gap-1.5">
            <label className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
              <Coins size={13} className="text-blue-600" />
              <span>Budget Scope</span>
            </label>
            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-semibold cursor-pointer shadow-2xs"
            >
              <option value="All">All Budget Ranges</option>
              <option value="under50L">Under ₹50 Lakhs</option>
              <option value="50Lto1Cr">₹50 Lakhs - ₹1 Crore</option>
              <option value="above1Cr">Above ₹1 Crore</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <ViewToggle view={viewMode} onChange={setViewMode} />

            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="text-xs text-slate-700 hover:text-red-600 font-bold flex items-center gap-1 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-xl border border-slate-200 transition-all h-[36px]"
                title="Reset filters"
              >
                <X size={14} /> <span className="hidden md:inline">Reset</span>
              </button>
            )}
          </div>

        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-900 font-extrabold text-xs sm:text-sm">
              {activeTab === "projects" && `${filteredProjects.length} Project Proposals Found`}
              {activeTab === "ngos" && `${filteredNGOs.length} Empaneled Grassroots NGOs Registered`}
              {activeTab === "companies" && `${filteredCompanies.length} Corporate Donors Found`}
            </span>
            <span className="text-slate-400 font-medium text-[11px]">| Showing verified Maharashtra directory listings</span>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedDistrict !== "All" && (
                <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                  District: {selectedDistrict}
                  <button onClick={() => setSelectedDistrict("All")} className="hover:text-blue-950"><X size={12} /></button>
                </span>
              )}
              {selectedFocus !== "All" && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                  Sector: {selectedFocus}
                  <button onClick={() => setSelectedFocus("All")} className="hover:text-indigo-950"><X size={12} /></button>
                </span>
              )}
              {budgetFilter !== "All" && (
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                  Budget: {budgetFilter === "under50L" ? "< ₹50L" : budgetFilter === "50Lto1Cr" ? "₹50L - ₹1Cr" : "> ₹1Cr"}
                  <button onClick={() => setBudgetFilter("All")} className="hover:text-amber-950"><X size={12} /></button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="hover:text-black"><X size={12} /></button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 w-full bg-white border border-slate-200/90 rounded-2xl shadow-xs">
          <div className="w-10 h-10 rounded-full border-3 border-blue-900 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-semibold">Loading public directory records...</span>
        </div>
      ) : viewMode === "list" ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-4">{activeTab === "projects" ? "Proposal Title" : activeTab === "ngos" ? "NGO Legal Name" : "Corporate Donor Name"}</th>
                  <th className="py-4 px-4">{activeTab === "projects" ? "Focus Sector" : activeTab === "ngos" ? "Darpan ID" : "Industry Sector"}</th>
                  <th className="py-4 px-4">District Scope</th>
                  <th className="py-4 px-4">{activeTab === "projects" ? "Budget Requested" : activeTab === "ngos" ? "Total CSR Sourced" : "Active CSR Budget Limit"}</th>
                  <th className="py-4 px-4">{activeTab === "projects" ? "Match Score" : "Compliance Status"}</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {activeTab === "projects" && filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{p.title}</div>
                      <div className="text-[11px] text-slate-500 font-medium">NGO: {p.ngoName} • {p.ngoRating} ★</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-extrabold">
                        {p.focusArea}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{p.district}, {p.taluka}</td>
                    <td className="py-3.5 px-4 font-black text-amber-700 text-sm">₹{p.budgetRequested.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                        {p.matchScore}% Match
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedProjectDetail(p)}
                        className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold py-1.5 px-3 shadow-2xs"
                      >
                        <Eye size={14} className="mr-1" /> View Details
                      </Button>
                    </td>
                  </tr>
                ))}

                {activeTab === "ngos" && filteredNGOs.map((n) => (
                  <tr key={n.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{n.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{n.category} • Est. {n.establishedYear || 2012}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-900">{n.darpanId}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{n.district} ({n.taluka})</td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">₹{(n.totalFundingReceived / 100000).toFixed(1)} Lakhs</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 w-fit">
                        <ShieldCheck size={13} /> {n.csr1Status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedNgoDetail(n)}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-1.5 px-3 shadow-2xs"
                      >
                        <Eye size={14} className="mr-1" /> View Details
                      </Button>
                    </td>
                  </tr>
                ))}

                {activeTab === "companies" && filteredCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-purple-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{c.focusArea}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{c.industry}</td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{c.district}</td>
                    <td className="py-3.5 px-4 font-black text-purple-950 text-sm">₹{(c.csrBudget / 10000000).toFixed(1)} Cr</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700">
                      <span className="bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-mono">
                        Active Donor
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedCompanyDetail(c)}
                        className="bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold py-1.5 px-3 shadow-2xs"
                      >
                        <Eye size={14} className="mr-1" /> View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === "projects" && filteredProjects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="group relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 p-5 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800" />
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                    {project.focusArea}
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono font-extrabold">
                    {project.matchScore}% Match
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-base text-slate-900 leading-snug group-hover:text-blue-900 transition-colors">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <Landmark size={14} className="text-blue-700 shrink-0" />
                  <span>NGO: <strong className="text-slate-900">{project.ngoName}</strong> • {project.ngoRating} ★</span>
                </p>
                <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 font-medium">
                  {project.description}
                </p>
              </div>
              <div className="flex flex-col gap-3.5 pt-2 border-t border-slate-200/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-600 flex items-center gap-1 font-medium">
                    <MapPin size={13} className="text-slate-400" /> {project.district}, {project.taluka}
                  </span>
                  <span className="text-amber-700 font-black text-sm flex items-center gap-1">
                    <Coins size={14} className="text-amber-600" /> ₹{project.budgetRequested.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedProjectDetail(project)}
                    className="w-full bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs py-2 shadow-2xs"
                  >
                    <Eye size={14} className="mr-1" /> View Details
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full font-bold text-xs py-2 bg-gradient-to-r from-blue-700 to-indigo-700 text-white"
                  >
                    Fund Initiative
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}

          {activeTab === "ngos" && filteredNGOs.map((ngo) => (
            <motion.div
              key={ngo.id}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="group relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/20 p-5 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800" />
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                    {ngo.category}
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-base text-slate-900 leading-snug group-hover:text-emerald-950 transition-colors">
                  {ngo.name}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 font-medium">
                  {ngo.about || "Empaneled Grassroots NGO partner implementing high-impact CSR projects across Maharashtra."}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/80">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedNgoDetail(ngo)}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs py-2 shadow-2xs"
                >
                  <Eye size={14} className="mr-1" /> View Details
                </Button>
              </div>
            </motion.div>
          ))}

          {activeTab === "companies" && filteredCompanies.map((comp) => (
            <motion.div
              key={comp.id}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="group relative rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-purple-50/20 p-5 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between gap-5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800" />
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-800 px-2.5 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                    {comp.industry}
                  </span>
                </div>
                <h3 className="font-heading font-extrabold text-base text-slate-900 leading-snug group-hover:text-purple-950 transition-colors">
                  {comp.name}
                </h3>
                <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 font-medium">
                  {comp.csrPolicySummary || "Active corporate CSR donor committing capital to verified grassroots initiatives in Maharashtra."}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/80">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCompanyDetail(comp)}
                  className="w-full bg-purple-900 hover:bg-purple-950 text-white font-extrabold text-xs py-2 shadow-2xs"
                >
                  <Eye size={14} className="mr-1" /> View Details
                </Button>
              </div>
            </motion.div>
          ))}

          {((activeTab === "projects" && filteredProjects.length === 0) ||
            (activeTab === "ngos" && filteredNGOs.length === 0) ||
            (activeTab === "companies" && filteredCompanies.length === 0)) && (
            <div className="md:col-span-2 lg:col-span-3 border border-slate-200 bg-white p-10 rounded-2xl text-center shadow-xs flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Search size={22} />
              </div>
              <h3 className="font-heading font-extrabold text-base text-slate-900">No matching records found</h3>
              <p className="text-xs text-slate-500 max-w-xl mx-auto font-medium">
                Try broadening your search query or clearing district/sector filters. All marketplace listings undergo administrative verification before public publishing.
              </p>
              <Button variant="outline" size="sm" onClick={resetAllFilters} className="mt-2 font-bold text-xs">
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={!!selectedProjectDetail}
        onClose={() => setSelectedProjectDetail(null)}
        title="Project Proposal Detail Overview"
        className="max-w-4xl"
      >
        {selectedProjectDetail && (
          <div className="flex flex-col gap-6 text-xs text-slate-700">
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 rounded-2xl text-white flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedProjectDetail.focusArea}
                  </span>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    {selectedProjectDetail.sdgGoal}
                  </span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono font-extrabold text-xs px-3 py-1 rounded-full">
                  {selectedProjectDetail.matchScore}% Match Score
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-black leading-snug">
                {selectedProjectDetail.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium pt-1 border-t border-white/10">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-400" />
                  <strong>District Scope:</strong> {selectedProjectDetail.district}, {selectedProjectDetail.taluka}
                </span>
                <span className="flex items-center gap-1.5">
                  <Landmark size={14} className="text-blue-400" />
                  <strong>Empaneled NGO:</strong> {selectedProjectDetail.ngoName} ({selectedProjectDetail.ngoRating} ★)
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-400" />
                  <strong>Duration:</strong> {selectedProjectDetail.duration || "12 Months"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/90 text-center">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Total Budget Requested</span>
                <span className="text-amber-700 text-base font-black mt-0.5 block">
                  ₹{selectedProjectDetail.budgetRequested.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Target Beneficiaries</span>
                <span className="text-slate-900 text-base font-extrabold mt-0.5 block">
                  {selectedProjectDetail.beneficiaryCount.toLocaleString()} Individuals
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Verification Status</span>
                <span className="text-emerald-700 text-xs font-bold mt-1 block flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} /> Verified Proposal
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Cost Per Beneficiary</span>
                <span className="text-indigo-900 text-base font-extrabold mt-0.5 block">
                  ₹{Math.round(selectedProjectDetail.budgetRequested / selectedProjectDetail.beneficiaryCount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={16} className="text-blue-700" /> Project Objective & Scope
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    {selectedProjectDetail.description}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Target size={16} className="text-emerald-700" /> Target Social Impact Goals
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/80">
                    {selectedProjectDetail.impactGoals || "Comprehensive social transformation, community empowerment, and measurable outcome indicators."}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-700" /> Key Project Deliverables
                  </h4>
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <ul className="flex flex-col gap-2.5">
                      {(selectedProjectDetail.deliverables || [
                        "Equipment procurement and ground deployment",
                        "Community orientation and training workshops",
                        "Geotagged execution audit and completion certificate"
                      ]).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 font-semibold">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {selectedProjectDetail.budgetBreakdown && selectedProjectDetail.budgetBreakdown.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="font-heading font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Coins size={16} className="text-amber-600" /> Budget Allocation Breakdown
                    </h4>
                    <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Cost Component</th>
                            <th className="p-3 text-right">Amount (INR)</th>
                            <th className="p-3 text-right">Share %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 font-medium">
                          {selectedProjectDetail.budgetBreakdown.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-900">{item.category}</td>
                              <td className="p-3 text-right font-bold text-amber-800">₹{item.amount.toLocaleString("en-IN")}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-700">{item.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/90 flex flex-col gap-3">
                  <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                    Empaneled Implementing NGO
                  </h4>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{selectedProjectDetail.ngoName}</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">Rating: {selectedProjectDetail.ngoRating} ★ Rating</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProjectDetail(null)}
                className="font-bold text-slate-700"
              >
                Close Window
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="font-extrabold bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 shadow-md"
              >
                Fund Initiative Now
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedNgoDetail}
        onClose={() => setSelectedNgoDetail(null)}
        title="Implementing Agency (NGO) Compliance Ledger"
        className="max-w-4xl"
      >
        {selectedNgoDetail && (
          <div className="flex flex-col gap-6 text-xs text-slate-700">
            <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-5 rounded-2xl text-white flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {selectedNgoDetail.category}
                  </span>
                  <span className="bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 font-mono">
                    <ShieldCheck size={12} /> {selectedNgoDetail.csr1Status} MCA
                  </span>
                </div>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <Star size={13} className="fill-amber-400 text-amber-400" /> Rated {selectedNgoDetail.rating} ★
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-black leading-snug">
                {selectedNgoDetail.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium pt-1 border-t border-white/10">
                <span>NITI Aayog Darpan ID: <strong className="text-white font-mono">{selectedNgoDetail.darpanId}</strong></span>
                <span>District HQ: <strong className="text-white">{selectedNgoDetail.district}</strong> ({selectedNgoDetail.taluka})</span>
                <span>Established: <strong className="text-white">{selectedNgoDetail.establishedYear || 2012}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/90 text-center">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Total CSR Funds Sourced</span>
                <span className="text-emerald-800 text-base font-black mt-0.5 block">
                  ₹{(selectedNgoDetail.totalFundingReceived / 100000).toFixed(1)} Lakhs
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Completed CSR Projects</span>
                <span className="text-slate-900 text-base font-extrabold mt-0.5 block">
                  {selectedNgoDetail.completedProjectsCount || 24} Projects
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Active Proposal Count</span>
                <span className="text-blue-900 text-base font-extrabold mt-0.5 block">
                  {selectedNgoDetail.projectsCount} Active
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">FCRA Status</span>
                <span className="text-slate-900 font-bold text-xs mt-1 block">
                  {selectedNgoDetail.fcraStatus || "Approved"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Info size={15} className="text-emerald-700" /> Organizational Profile & Background
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    {selectedNgoDetail.about || "Empaneled Grassroots NGO implementing high-impact CSR projects in digital education, rural health, and water conservation across Maharashtra."}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={15} className="text-emerald-700" /> Mandatory Audit Checkpoints Ledger
                  </h4>
                  <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs">
                    <ul className="flex flex-col gap-2">
                      <li className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-800">12A Tax Exemption Certificate</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Verified Active</span>
                      </li>
                      <li className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-800">80G Tax Exemption Certificate</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Verified Active</span>
                      </li>
                      <li className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-800">CSR-1 MCA Registration Filing</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> MCA Approved</span>
                      </li>
                      <li className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-800">3-Year Audited Balance Sheet Filings</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Verified</span>
                      </li>
                      <li className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                        <span className="font-bold text-slate-800">NITI Aayog Darpan Empanelment</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> Empaneled</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={15} className="text-blue-700" /> Operational Districts in Maharashtra
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedNgoDetail.operatingDistricts || [selectedNgoDetail.district, "Pune", "Thane", "Nashik"]).map((d, i) => (
                      <span key={i} className="bg-slate-100 border border-slate-200/90 text-slate-800 font-bold px-3 py-1 rounded-lg text-xs">
                        📍 {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex flex-col gap-3">
                  <h4 className="font-heading font-extrabold text-xs text-emerald-950 uppercase tracking-wider border-b border-emerald-200 pb-2">
                    Leadership & Management
                  </h4>
                  <ul className="flex flex-col gap-2 text-xs">
                    {(selectedNgoDetail.leadership || [
                      { name: "Executive Director", title: "Head of Operations" }
                    ]).map((l, i) => (
                      <li key={i} className="flex flex-col">
                        <strong className="text-slate-900 font-bold">{l.name}</strong>
                        <span className="text-slate-500 text-[11px]">{l.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedNgoDetail(null)} className="font-bold text-slate-700">
                Close Window
              </Button>
              <Button variant="primary" size="sm" className="font-extrabold bg-emerald-800 hover:bg-emerald-900 text-white px-6 shadow-md">
                Request Proposal / Contact NGO
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedCompanyDetail}
        onClose={() => setSelectedCompanyDetail(null)}
        title="Corporate CSR Donor Profile"
        className="max-w-4xl"
      >
        {selectedCompanyDetail && (
          <div className="flex flex-col gap-6 text-xs text-slate-700">
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-5 rounded-2xl text-white flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  {selectedCompanyDetail.industry} Industry
                </span>
                <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 font-mono font-extrabold text-xs px-3 py-1 rounded-full">
                  Corporate CSR Partner
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-black leading-snug">
                {selectedCompanyDetail.name}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium pt-1 border-t border-white/10">
                <span>Corporate HQ: <strong className="text-white">{selectedCompanyDetail.district}</strong></span>
                <span>Primary Sector: <strong className="text-white">{selectedCompanyDetail.focusArea}</strong></span>
                <span>Funded Initiatives: <strong className="text-white">{selectedCompanyDetail.projectsFunded} Projects</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/90 text-center">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">CSR Budget Limit</span>
                <span className="text-purple-950 text-base font-black mt-0.5 block">
                  ₹{(selectedCompanyDetail.csrBudget / 10000000).toFixed(1)} Crore
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Pledged CSR Capital</span>
                <span className="text-indigo-900 text-base font-extrabold mt-0.5 block">
                  ₹{((selectedCompanyDetail.csrPledged || 35000000) / 10000000).toFixed(1)} Crore
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Average Grant Size</span>
                <span className="text-slate-900 font-extrabold text-xs mt-1 block">
                  {selectedCompanyDetail.averageGrantSize || "₹40L - ₹1.2 Cr"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Funded Projects</span>
                <span className="text-slate-900 font-extrabold text-base mt-0.5 block">
                  {selectedCompanyDetail.projectsFunded} Initiatives
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={15} className="text-purple-700" /> CSR Vision & Strategic Policy Statement
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    {selectedCompanyDetail.csrPolicySummary || "Committed to driving sustainable social impact in Maharashtra through strategic grants in education, healthcare, and water security."}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-purple-700" /> Mandatory NGO Eligibility Prerequisites
                  </h4>
                  <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
                    <ul className="flex flex-col gap-2.5">
                      {(selectedCompanyDetail.eligibilityCriteria || [
                        "Minimum 3 years operational existence with NITI Aayog Darpan registration",
                        "Valid 12A and 80G Tax Exemption Certificates issued by Income Tax Dept.",
                        "Mandatory active CSR-1 filing with Ministry of Corporate Affairs"
                      ]).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 font-semibold">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="font-heading font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={15} className="text-blue-700" /> Priority Target Districts
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedCompanyDetail.targetDistricts || [selectedCompanyDetail.district, "Pune", "Thane", "Nagpur"]).map((d, i) => (
                      <span key={i} className="bg-slate-100 border border-slate-200/90 text-slate-800 font-bold px-3 py-1 rounded-lg text-xs">
                        🎯 {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 flex flex-col gap-3">
                  <h4 className="font-heading font-extrabold text-xs text-purple-950 uppercase tracking-wider border-b border-purple-200 pb-2">
                    CSR Officer & Contact
                  </h4>
                  <div className="flex flex-col gap-2 text-xs text-slate-800 font-medium">
                    <strong className="text-slate-900 font-bold">{selectedCompanyDetail.contactPerson || "CSR Head"}</strong>
                    <span className="flex items-center gap-2">
                      <Mail size={14} className="text-purple-700 shrink-0" />
                      {selectedCompanyDetail.contactEmail || "csr@company.com"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Phone size={14} className="text-purple-700 shrink-0" />
                      {selectedCompanyDetail.contactPhone || "+91 22 2200 0000"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedCompanyDetail(null)} className="font-bold text-slate-700">
                Close Window
              </Button>
              <Button variant="primary" size="sm" className="font-extrabold bg-purple-900 hover:bg-purple-950 text-white px-6 shadow-md">
                Submit Proposal to Corporate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
