"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { Button } from "@/components/ui/Button";
import { Search, MapPin, Coins, Users, Clock, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

interface CSRRequirement {
  id: string;
  title: string;
  category: string;
  description: string;
  district: string;
  taluka: string;
  village?: string;
  estimatedCost: number;
  beneficiaryCount: number;
  priorityLevel: string;
  expectedImpact: string;
  createdAt: string;
  status: string;
  beneficiaryProfile: {
    agencyName: string;
    agencyType: string;
  };
  _count: {
    ngoApplications: number;
    companyInterests: number;
  };
}

export default function CSRMarketplace() {
  const router = useRouter();
  const pathname = usePathname();
  const [requirements, setRequirements] = useState<CSRRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [district, setDistrict] = useState("All");
  const [category, setCategory] = useState("All");
  const [priority, setPriority] = useState("All");
  const [budgetRange, setBudgetRange] = useState("All");

  useEffect(() => {
    fetchMarketplaceRequirements();
  }, []);

  const fetchMarketplaceRequirements = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>("/government-pitches/public?limit=50");
      const pitches = res.data || [];
      setRequirements(pitches.map((pitch: any) => ({
        id: pitch.id,
        title: pitch.csrRequirement,
        category: pitch.department || "PUBLIC_DEVELOPMENT_NEED",
        description: pitch.csrRequirement,
        district: pitch.district,
        taluka: pitch.taluka,
        village: pitch.exactLocation,
        estimatedCost: Number(pitch.estimatedCost || 0),
        beneficiaryCount: 0,
        priorityLevel: "OPEN",
        expectedImpact: "",
        createdAt: pitch.createdAt,
        status: pitch.status,
        beneficiaryProfile: {
          agencyName: pitch.officeName || pitch.department || "Government Department",
          agencyType: pitch.department || "Government"
        },
        _count: {
          ngoApplications: 0,
          companyInterests: pitch._count?.interests || 0
        }
      })));
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load public development needs");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case "OPEN":
      case "PUBLIC_LISTED":
      case "CORPORATE_INTEREST_RECEIVED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 font-bold";
      case "JS_APPROVED":
        return "bg-orange-100 text-orange-700 border-orange-200 font-bold";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.beneficiaryProfile.agencyName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDistrict = district === "All" || req.district === district;
    const matchesCategory = category === "All" || req.category === category;
    const matchesPriority = priority === "All" || req.priorityLevel === priority || req.status === priority;

    let matchesBudget = true;
    const cost = Number(req.estimatedCost);
    if (budgetRange === "UNDER_5L") matchesBudget = cost < 500000;
    else if (budgetRange === "5L_TO_20L") matchesBudget = cost >= 500000 && cost <= 2000000;
    else if (budgetRange === "20L_TO_50L") matchesBudget = cost > 2000000 && cost <= 5000000;
    else if (budgetRange === "OVER_50L") matchesBudget = cost > 5000000;

    return matchesSearch && matchesDistrict && matchesCategory && matchesPriority && matchesBudget;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900 font-sans"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl p-8 shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold font-heading">
          Maharashtra Public Development Needs Marketplace
        </h1>
        <p className="text-blue-100 text-sm mt-2 max-w-3xl leading-relaxed">
          View approved government development needs and express CSR interest through the state-led convergence workflow.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Grid Layout: Filters Left, Cards Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Filters Sidebar */}
        <aside className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Search Filters</h3>
            <button 
              onClick={() => {
                setSearchTerm("");
                setDistrict("All");
                setCategory("All");
                setPriority("All");
                setBudgetRange("All");
              }}
              className="text-xs text-blue-900 hover:underline font-bold"
            >
              Clear All
            </button>
          </div>

          {/* Search text */}
          <div className="space-y-1">
            <label className="text-slate-700 text-xs font-bold block">Keywords Search</label>
            <div className="relative">
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search projects, agency..."
                className="w-full pl-8 pr-3 py-2 border rounded-md text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-900"
              />
              <Search className="absolute left-2.5 top-3 text-slate-400" size={14} />
            </div>
          </div>

          {/* District select */}
          <div className="space-y-1">
            <label className="text-slate-700 text-xs font-bold block">District</label>
            <select
              value={district}
              onChange={e => setDistrict(e.target.value)}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Districts</option>
              <option value="Pune">Pune</option>
              <option value="Gadchiroli">Gadchiroli</option>
              <option value="Thane">Thane</option>
              <option value="Nagpur">Nagpur</option>
              <option value="Solapur">Solapur</option>
            </select>
          </div>

          {/* Category select */}
          <div className="space-y-1">
            <label className="text-slate-700 text-xs font-bold block">Department</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {Array.from(new Set(requirements.map((req) => req.category).filter(Boolean))).map((dept) => (
                <option key={dept} value={dept}>{dept.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Budget Range */}
          <div className="space-y-1">
            <label className="text-slate-700 text-xs font-bold block">Estimated Budget</label>
            <select
              value={budgetRange}
              onChange={e => setBudgetRange(e.target.value)}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Budgets</option>
              <option value="UNDER_5L">Under ₹5 Lakhs</option>
              <option value="5L_TO_20L">₹5 Lakhs - ₹20 Lakhs</option>
              <option value="20L_TO_50L">₹20 Lakhs - ₹50 Lakhs</option>
              <option value="OVER_50L">Over ₹50 Lakhs</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-slate-700 text-xs font-bold block">Status</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full border rounded px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="JS_APPROVED">JS APPROVED</option>
              <option value="PUBLIC_LISTED">PUBLIC LISTED</option>
              <option value="CORPORATE_INTEREST_RECEIVED">CORPORATE INTEREST RECEIVED</option>
            </select>
          </div>
        </aside>

        {/* Requirements Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 bg-white p-3 rounded-lg border shadow-sm">
            <span>{filteredRequirements.length} Development Needs Available</span>
          </div>

          {filteredRequirements.length === 0 ? (
            <div className="bg-white border rounded-xl p-12 text-center text-slate-500">
              <h3 className="font-bold text-lg text-slate-800">No Development Needs Found</h3>
              <p className="text-xs mt-1">Try adjusting the filter criteria or search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequirements.map(req => (
                <div key={req.id} className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-blue-900 transition-colors">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {req.category.replace(/_/g, " ")}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getPriorityColor(req.priorityLevel)}`}>
                        {req.priorityLevel}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">{req.title}</h3>
                    
                    <div className="text-[11px] text-slate-600 font-semibold space-y-0.5">
                      <div className="text-slate-800 font-bold">{req.beneficiaryProfile.agencyName}</div>
                      <div className="text-slate-500">Department Type: {req.beneficiaryProfile.agencyType}</div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 pt-1">{req.description}</p>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 flex items-center gap-1 font-medium">
                        <MapPin size={12} className="text-slate-400" /> {req.district}, {req.taluka}
                      </span>
                      <span className="text-slate-900 font-extrabold flex items-center gap-1">
                        <Coins size={12} className="text-blue-900" /> ₹{Number(req.estimatedCost).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold bg-slate-50 p-2 rounded border border-slate-100">
                      <span>Corporate Interest: <strong className="text-indigo-900">{req._count.companyInterests}</strong></span>
                    </div>

                    <Button
                      onClick={() => {
                        router.push("/public-development-needs");
                      }}
                      className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs py-2 flex items-center justify-center gap-1 shadow-sm"
                    >
                      View Details & Respond
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
