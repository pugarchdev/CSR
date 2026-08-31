"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import {
  FileText,
  Search,
  X,
  ExternalLink,
  ShieldCheck,
  Download,
  BookOpen,
  Scale,
  FileSpreadsheet,
  Layers,
  ChevronRight
} from "lucide-react";

interface DocItem {
  title: string;
  category: "Legal" | "Rules" | "Schedule VII" | "Annexures" | "Formats" | "Advisories";
  description: string;
  href: string;
  type: string;
  isExternal?: boolean;
}

const DOCUMENTS: DocItem[] = [
  {
    title: "Companies Act, 2013 - Section 135 CSR Applicability",
    category: "Legal",
    description: "Statutory thresholds (Net Worth ₹500 Cr, Turnover ₹1000 Cr, Net Profit ₹5 Cr), CSR committee governance and mandate.",
    href: "/csr-policy",
    type: "Legislation"
  },
  {
    title: "Companies (CSR Policy) Rules 2014 & MCA Amendments",
    category: "Rules",
    description: "Rules governing CSR expenditure, ongoing projects, CSR registration (CSR-1), impact assessment, and annual reporting.",
    href: "/csr-policy",
    type: "MCA Rules"
  },
  {
    title: "Schedule VII Eligible CSR Activities Classification",
    category: "Schedule VII",
    description: "Comprehensive categorization of approved social, health, education, rural development, environment, and sports initiatives.",
    href: "/csr-policy",
    type: "Framework"
  },
  {
    title: "Annexure A: Assessment Report & 13-Point Feasibility Checklist",
    category: "Annexures",
    description: "Relationship Manager statutory verification checklist submitted to Joint Secretary for convergence clearance.",
    href: "/workflow",
    type: "Checklist"
  },
  {
    title: "Annexure B: Standard Tripartite MoU Template",
    category: "Annexures",
    description: "Standard model agreement between Corporate Partner, Government Department/DNO, and Implementing Agency.",
    href: "/standard-mou-template",
    type: "Legal Template"
  },
  {
    title: "Milestone, UC & Progress Tracking Formats",
    category: "Formats",
    description: "Official formats for physical progress tracking, geo-tagged photo evidence logs, and Utilisation Certificate (UC) verification.",
    href: "/resources",
    type: "Operating Format"
  },
  {
    title: "Government Pitch Submission & HOD Certification Formats",
    category: "Formats",
    description: "Standardized templates for department pitch generation, non-availability of state funds declaration, and site validation.",
    href: "/resources",
    type: "Operating Format"
  },
  {
    title: "State Public Grievance Redressal & SLA Operating Standard",
    category: "Advisories",
    description: "3-tier resolution SLA rules (15-day DNO, 30-day State CSR Cell, and Planning Secretary apex review).",
    href: "/workflow",
    type: "Operating SLA"
  }
];

export default function DocumentLibraryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    return ["All", "Legal", "Rules", "Schedule VII", "Annexures", "Formats", "Advisories"];
  }, []);

  const filteredDocs = useMemo(() => {
    return DOCUMENTS.filter((doc) => {
      const matchSearch =
        search.trim() === "" ||
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.description.toLowerCase().includes(search.toLowerCase()) ||
        doc.category.toLowerCase().includes(search.toLowerCase());

      const matchCategory = category === "All" || doc.category === category;
      return matchSearch && matchCategory;
    });
  }, [search, category]);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Documentation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Official Document &amp; Policy Library
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-extrabold border border-blue-200">
                {DOCUMENTS.length} Statutory Resources
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Permanent public repository of Companies Act Section 135 regulations, Schedule VII themes, State Government Resolutions (GRs), standard MoU templates, and Utilisation Certificate formats.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Verified Legal Repository</span>
            </span>
          </div>
        </div>

        {/* 4 Stat Overview Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Legal Base</span>
            <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 font-mono">Section 135</div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Companies Act, 2013</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Schedule VII</span>
            <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 font-mono">12+ Themes</div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Approved CSR domains</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Portal Annexures</span>
            <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 font-mono">Annex A + B</div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Checklist &amp; Model MoU</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Resolution SLA</span>
            <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 font-mono">5-Day RM SLA</div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">State escalation standard</p>
          </div>
        </div>

        {/* Compact Search & Category Toolbar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents by title, keyword, or category..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    category === cat
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.title}
              className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100">
                    {doc.category}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{doc.type}</span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {doc.title}
                </h3>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {doc.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <FileText size={13} />
                  Official Guidance
                </span>

                <Link
                  href={doc.href}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-800 group-hover:text-white text-xs font-bold transition-all shadow-2xs"
                >
                  <span>Open Resource</span>
                  <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="col-span-full py-12 text-center rounded-3xl border border-dashed border-slate-300 bg-white space-y-2">
              <FileText size={32} className="text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No documents found matching "{search}"</p>
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Reset search filters
              </button>
            </div>
          )}
        </div>

      </div>
    </GovPortalLayout>
  );
}
