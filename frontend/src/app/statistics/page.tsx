"use client";

import { Coins, HeartHandshake, FolderHeart, ShieldCheck, MapPin, Landmark, BarChart2, Star } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import dynamic from "next/dynamic";

const GisMap = dynamic(() => import("@/components/GisMap"), {
  ssr: false,
  loading: () => <div className="h-[580px] w-full flex items-center justify-center text-slate-400">Loading maps...</div>
});

const FundingGrowthChart = dynamic(() => import("@/components/AnalyticsCharts").then(mod => mod.FundingGrowthChart), {
  ssr: false,
  loading: () => <div className="h-[260px] w-full flex items-center justify-center text-slate-400">Loading charts...</div>
});

export default function StatisticsPage() {
  return (
    <div className="px-6 md:px-12 py-12 max-w-6xl mx-auto flex flex-col gap-10 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f7941d] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <BarChart2 size={14} /> महाराष्ट्र शासन • PUBLIC ANALYTICS CABINET
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">CSR Sourcing Statistics</h1>
        <p className="text-slate-400 text-sm">Statewide audit registers mapping total funds raised, project densities, and direct beneficiaries across 36 districts.</p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Aggregate Sourced CSR Funds" value="₹18.40 Cr" icon={Coins} />
        <StatCard label="Direct Beneficiaries Served" value="2.4 Lakhs" icon={HeartHandshake} />
        <StatCard label="Active Approved Projects" value="420 Projects" icon={FolderHeart} />
        <StatCard label="Compliance Audits Passed" value="98.4%" icon={ShieldCheck} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading font-bold text-xl text-slate-200">Interactive GIS Map & District Rankings</h2>
        <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-glass">
          <GisMap />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-5 shadow-glass">
          <h3 className="font-heading font-bold text-lg text-slate-200">Cumulative Sourcing Growth (INR)</h3>
          <div className="h-[260px] w-full">
            <FundingGrowthChart />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col gap-5 shadow-glass">
          <h3 className="font-heading font-bold text-lg text-slate-200">District Compliance Index</h3>
          <div className="flex flex-col gap-3.5 text-xs font-semibold text-slate-400">
            {[
              { district: "Pune", funding: "₹5.50 Cr", score: 98, level: "High" },
              { district: "Mumbai City", funding: "₹4.50 Cr", score: 96, level: "High" },
              { district: "Nagpur", funding: "₹3.50 Cr", score: 92, level: "High" },
              { district: "Gadchiroli", funding: "₹2.50 Cr", score: 85, level: "High" }
            ].map((d, index) => (
              <div key={index} className="flex justify-between items-center p-3.5 bg-slate-950 border border-slate-850 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[#f7941d] text-[10px]">{index + 1}</span>
                  <span className="text-slate-200 font-bold">{d.district}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>{d.funding}</span>
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold">{d.score}% Score</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
