"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useApiQuery } from "@/lib/apiHooks";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  FileText, Download, Filter, Search, CheckCircle2, ShieldCheck, BarChart3, ArrowUpRight, Sparkles, TrendingUp, PieChart, Coins, Activity, Layers, Landmark
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

interface ReportItem {
  id: string;
  code: string;
  name: string;
  category: string;
  format: string;
  period: string;
  updatedAt: string;
}

const defaultReports: ReportItem[] = [
  {
    id: "rpt-1",
    code: "RPT-CSR-2026",
    name: "Statewide CSR Fund Utilization Audit Report",
    category: "Financial Audit",
    format: "PDF / Excel",
    period: "FY 2025-26 Q1-Q4",
    updatedAt: "2026-07-24",
  },
  {
    id: "rpt-2",
    code: "RPT-NGO-882",
    name: "Verified Implementing Agency Due Diligence Summary",
    category: "Compliance",
    format: "PDF",
    period: "Annual 2026",
    updatedAt: "2026-07-22",
  },
  {
    id: "rpt-3",
    code: "RPT-MOU-401",
    name: "Tripartite MoU & Tranche Disbursement Register",
    category: "Project Releases",
    format: "Excel / CSV",
    period: "Monthly",
    updatedAt: "2026-07-25",
  },
  {
    id: "rpt-4",
    code: "RPT-DIST-905",
    name: "Aspirational District CSR Investment Breakdown",
    category: "Impact Analytics",
    format: "PDF / Interactive",
    period: "FY 2025-26",
    updatedAt: "2026-07-20",
  },
];

const sectorAnalytics = [
  { sector: "Healthcare", allocatedCr: 42.5, utilizedPct: 88, projects: 28, fill: "#2563eb" },
  { sector: "Education", allocatedCr: 36.8, utilizedPct: 94, projects: 34, fill: "#7c3aed" },
  { sector: "Rural Water", allocatedCr: 28.2, utilizedPct: 91, projects: 19, fill: "#0891b2" },
  { sector: "Agriculture", allocatedCr: 19.4, utilizedPct: 85, projects: 15, fill: "#059669" },
  { sector: "Livelihoods", allocatedCr: 14.2, utilizedPct: 90, projects: 12, fill: "#d97706" },
];

const districtDistribution = [
  { name: "Gadchiroli", value: 45.2, sharePct: 32, fill: "#2563eb" },
  { name: "Nandurbar", value: 33.9, sharePct: 24, fill: "#7c3aed" },
  { name: "Solapur", value: 25.4, sharePct: 18, fill: "#0891b2" },
  { name: "Chandrapur", value: 19.7, sharePct: 14, fill: "#059669" },
  { name: "Statewide", value: 16.9, sharePct: 12, fill: "#d97706" },
];

const monthlyTrend = [
  { month: "Jan", committedCr: 12.4, escrowDisbursedCr: 11.2 },
  { month: "Feb", committedCr: 16.8, escrowDisbursedCr: 15.0 },
  { month: "Mar", committedCr: 24.5, escrowDisbursedCr: 22.8 },
  { month: "Apr", committedCr: 21.0, escrowDisbursedCr: 19.5 },
  { month: "May", committedCr: 28.6, escrowDisbursedCr: 26.2 },
  { month: "Jun", committedCr: 37.8, escrowDisbursedCr: 35.4 },
];

const sdgAlignmentData = [
  { name: "SDG 3 Health", value: 42.5, sharePct: 30, fill: "#ef4444", code: "SDG 3" },
  { name: "SDG 4 Education", value: 36.8, sharePct: 26, fill: "#f59e0b", code: "SDG 4" },
  { name: "SDG 6 Water", value: 28.2, sharePct: 20, fill: "#3b82f6", code: "SDG 6" },
  { name: "SDG 7 Energy", value: 19.4, sharePct: 14, fill: "#eab308", code: "SDG 7" },
  { name: "SDG 8 Growth", value: 14.2, sharePct: 10, fill: "#a855f7", code: "SDG 8" },
];

const esgRadarData = [
  { subject: "Environmental", score: 94, fullMark: 100 },
  { subject: "Social Impact", score: 98, fullMark: 100 },
  { subject: "Governance", score: 100, fullMark: 100 },
  { subject: "MCA Sec 135", score: 96, fullMark: 100 },
  { subject: "Audit Ledger", score: 95, fullMark: 100 },
];

export default function ReportsPage() {
  const { data: envelope } = useApiQuery<any>(
    ["reports"],
    "/reports"
  );

  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ANALYTICS" | "REPORTS">("ANALYTICS");

  const apiReports = envelope?.data?.reports || envelope?.data || envelope?.reports || [];
  const reportsList: ReportItem[] = apiReports.length > 0 ? apiReports.map((r: any) => ({
    id: r.id || r.code,
    code: r.code || "RPT-CSR",
    name: r.name || r.title || "CSR Compliance Summary",
    category: r.category || "CSR Compliance",
    format: "PDF / CSV",
    period: "FY 2025-26",
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString().split("T")[0] : "2026-07-25",
  })) : defaultReports;

  const filtered = reportsList.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (id: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      alert("Official compliance report generated & downloaded!");
    }, 1200);
  };

 return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 sm:gap-6 px-3 sm:px-4 py-6 md:px-8">
      <GovPageHeader
        title="CSR Analytical Dashboard & Audit Reports"
        eyebrow="State Governance & Analytics"
        actions={
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 w-full sm:w-auto rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              onClick={() => setActiveTab("ANALYTICS")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ANALYTICS"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={14} className="shrink-0" /> <span className="whitespace-nowrap">Analytics & Graphs</span>
            </button>
            <button
              onClick={() => setActiveTab("REPORTS")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "REPORTS"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={14} className="shrink-0" /> <span className="whitespace-nowrap">Reports ({reportsList.length})</span>
            </button>
          </div>
        }
      />

      {/* 3D KPI Key Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total CSR Committed"
          value="₹141.1 Cr"
          icon={Coins}
          index={0}
          badge="+24% YoY"
          sublabel="Outlay Growth"
        />
        <StatCard
          label="Utilization Rate"
          value="91.4%"
          icon={Activity}
          index={1}
          badge="Verified"
          sublabel="Tranche Releases"
        />
        <StatCard
          label="Aspirational Priority"
          value="56%"
          icon={Landmark}
          index={2}
          badge="Tribal Focus"
          sublabel="Tribal Districts Outlay"
        />
        <StatCard
          label="MCA Compliance"
          value="100%"
          icon={Sparkles}
          index={3}
          badge="Sec 135 OK"
          sublabel="Section 135 Compliant"
        />
      </div>

      {activeTab === "ANALYTICS" && (
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Top Charts Row: Sector Bar Chart & District Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Sector Allocation Recharts Horizontal Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-w-0 lg:col-span-2 rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-4 sm:p-6 shadow-glass flex flex-col justify-between"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-600 shrink-0" /> Sector-Wise Allocation
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Budget outlays (₹ Crores) & utilization rate</p>
                </div>
                <span className="w-fit text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                  FY 2025-26
                </span>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorAnalytics} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" fontSize={10} fontWeight="bold" unit=" Cr" />
                    <YAxis dataKey="sector" type="category" fontSize={10} fontWeight="bold" width={80} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`₹${val} Cr`, "Allocated Budget"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", fontSize: "12px" }}
                    />
                    <Bar dataKey="allocatedCr" radius={[0, 8, 8, 0]}>
                      {sectorAnalytics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* District Distribution Interactive Recharts Donut */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="min-w-0 rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-4 sm:p-6 shadow-glass flex flex-col justify-between"
            >
              <div className="border-b border-slate-100 pb-4 mb-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <PieChart size={18} className="text-purple-600 shrink-0" /> District Distribution
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">CSR allocation breakdown</p>
              </div>

              <div className="h-[260px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={districtDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {districtDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`₹${val} Cr`, "Outlay"]} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Row 2: UN SDG Alignment Donut & ESG Radar Scorecard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* UN SDG Target Alignment Bar & Donut Chart */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="min-w-0 lg:col-span-2 rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-4 sm:p-6 shadow-glass flex flex-col justify-between"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500 shrink-0" /> UN SDG Capital Alignment
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Allocation aligned with NITI Aayog</p>
                </div>
                <span className="w-fit text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  NITI Aayog Vetted
                </span>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sdgAlignmentData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="code" fontSize={10} fontWeight="bold" angle={-45} textAnchor="end" />
                    <YAxis fontSize={10} fontWeight="bold" unit=" Cr" />
                    <Tooltip formatter={(val: any) => [`₹${val} Cr`, "Allocated Capital"]} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {sdgAlignmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* ESG Health Recharts Radar Scorecard */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="min-w-0 rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-4 sm:p-6 shadow-glass flex flex-col justify-between"
            >
              <div className="border-b border-slate-100 pb-4 mb-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0" /> ESG Due Diligence Radar
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Environmental, Social & Governance compliance</p>
              </div>

              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={esgRadarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" fontSize={9} fontWeight="bold" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={8} />
                    <Radar name="ESG Rating Score" dataKey="score" stroke="#059669" fill="#10b981" fillOpacity={0.4} />
                    <Tooltip formatter={(val: any) => [`${val}/100`, "Score"]} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Bottom Graph: Recharts Spline Area Curve Chart for Escrow Velocity */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="min-w-0 rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-4 sm:p-6 shadow-glass flex flex-col gap-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-600 shrink-0" /> Monthly Escrow Fund Velocity (Jan - Jun)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Milestone tranche disbursement curve (₹ Crores)</p>
              </div>
              <span className="w-fit text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
                +192% Growth
              </span>
            </div>

            {/* Smooth Recharts Area Spline Curve Chart */}
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCommitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorEscrow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" fontSize={10} fontWeight="bold" />
                  <YAxis fontSize={10} fontWeight="bold" unit=" Cr" />
                  <Tooltip formatter={(val: any) => [`₹${val} Cr`]} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} />
                  <Area type="monotone" dataKey="committedCr" name="Committed Budget" stroke="#1e3a8a" fillOpacity={1} fill="url(#colorCommitted)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="escrowDisbursedCr" name="Escrow Disbursed" stroke="#059669" fillOpacity={1} fill="url(#colorEscrow)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === "REPORTS" && (
        <div className="rounded-3xl border border-white/80 bg-white/90 backdrop-blur-2xl p-4 sm:p-6 shadow-glass">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search reports by name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="w-full md:overflow-x-auto md:rounded-xl md:border md:border-slate-200/80">
            <table className="w-full block md:table text-left border-collapse">
              <thead className="hidden md:table-header-group bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Report Code</th>
                  <th className="py-3 px-4">Report Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100 text-xs">
                {filtered.map((rpt) => (
                  <tr key={rpt.id} className="block md:table-row mb-4 md:mb-0 bg-white md:bg-transparent border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none hover:bg-blue-50/40 transition-colors">
                    <td data-label="Report Code" className="flex md:table-cell justify-between items-center py-3.5 px-4 border-b border-slate-100 md:border-none font-mono font-bold text-blue-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left">
                      {rpt.code}
                    </td>
                    <td data-label="Report Name" className="flex md:table-cell justify-between items-center py-3.5 px-4 border-b border-slate-100 md:border-none font-bold text-slate-900 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left break-words">
                      {rpt.name}
                    </td>
                    <td data-label="Category" className="flex md:table-cell justify-between items-center py-3.5 px-4 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {rpt.category}
                      </span>
                    </td>
                    <td data-label="Coverage" className="flex md:table-cell justify-between items-center py-3.5 px-4 border-b border-slate-100 md:border-none text-slate-500 font-medium before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden text-right md:text-left">
                      {rpt.period}
                    </td>
                    <td className="block md:table-cell py-3.5 px-4 text-right bg-slate-50/50 md:bg-transparent rounded-b-xl md:rounded-none">
                      <button
                        onClick={() => handleDownload(rpt.id)}
                        disabled={downloadingId === rpt.id}
                        className="w-full md:w-auto justify-center inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-2 md:py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 transition-all hover:scale-105"
                      >
                        <Download size={13} />
                        {downloadingId === rpt.id ? "Generating..." : "Export Report"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
