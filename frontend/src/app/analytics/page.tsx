"use client";

import { useState, useEffect } from "react";
import { Coins, HeartHandshake, FolderHeart, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";

const FundingGrowthChart = dynamic(() => import("@/components/AnalyticsCharts").then(mod => mod.FundingGrowthChart), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-transparent animate-spin" /></div>
});

const SdgStatsChart = dynamic(() => import("@/components/AnalyticsCharts").then(mod => mod.SdgStatsChart), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-transparent animate-spin" /></div>
});

const GisMap = dynamic(() => import("@/components/GisMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[580px] w-full flex items-center justify-center bg-white rounded-lg border border-[#e0e4ea]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#0e2144] border-t-transparent animate-spin" />
        <span className="text-xs text-[#6b7280] font-semibold">Initializing digital GIS network...</span>
      </div>
    </div>
  )
});
import { StatCard } from "@/components/ui/StatCard";

const mockSdgStats = [
  { name: "SDG 4: Quality Education", count: 18 },
  { name: "SDG 6: Clean Water", count: 14 },
  { name: "SDG 3: Good Health", count: 12 },
  { name: "SDG 5: Gender Equality", count: 8 },
  { name: "SDG 13: Climate Action", count: 5 }
];

const mockFundingGrowth = [
  { year: "2022", funding: 42000000 },
  { year: "2023", funding: 78000000 },
  { year: "2024", funding: 112000000 },
  { year: "2025", funding: 145000000 },
  { year: "2026", funding: 184000000 }
];

const COLORS = ["#0e2144", "#1789d6", "#f7941d", "#166534", "#b91c1c"];

export default function AnalyticsDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-10 bg-[#f5f6f8] text-[#14274e] min-h-screen">

      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading font-extrabold text-4xl text-[#14274e] tracking-tight">Maharashtra GIS Analytics</h1>
        <p className="text-[#6b7280]">Real-time statistics detailing funding allocations, project densities, and direct beneficiaries</p>
      </div>

      {/* KPI Counters */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Cumulative CSR Funding Sourced" value="₹18.4 Crore" icon={Coins} trend={{ value: 12, positive: true }} />
        <StatCard label="Direct Beneficiaries Served" value="2.4 Lakhs" icon={HeartHandshake} trend={{ value: 8, positive: true }} />
        <StatCard label="Active Projects Registered" value="420" icon={FolderHeart} />
        <StatCard label="Compliance Audits Passed" value="98.4%" icon={ShieldCheck} />
      </section>

      {/* Interactive GIS Section */}
      <section className="flex flex-col gap-4">
        <h2 className="font-heading font-bold text-xl text-[#14274e]">Interactive Maharashtra GIS Mapping</h2>
        <div className="w-full bg-white border border-[#e0e4ea] p-4 rounded-lg">
          <GisMap />
        </div>
      </section>

      {/* Recharts Analytics Grids */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Cumulative Funding Trend */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-5 shadow-glass">
          <h3 className="font-heading font-bold text-lg text-slate-200">Cumulative Funding Growth (INR)</h3>
          <div className="h-[260px] w-full">
            <FundingGrowthChart />
          </div>
        </div>

        {/* SDG Projects Distribution */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-5 shadow-glass">
          <h3 className="font-heading font-bold text-lg text-slate-200">Top Active SDG Goal Alignments</h3>
          <div className="h-[260px] w-full">
            <SdgStatsChart />
          </div>
        </div>

      </section>

    </div>
  );
}
