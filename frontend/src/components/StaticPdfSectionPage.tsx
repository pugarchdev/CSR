"use client";

import { useMemo, useState } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import {
  Search,
  X,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Layers,
  Award,
  ChevronRight,
  ExternalLink
} from "lucide-react";

interface StaticPdfSectionPageProps {
  title: string;
  description: string;
  items: string[];
  eyebrow?: string;
  metrics?: Array<{ label: string; value: string; note?: string }>;
  sections?: Array<{ title: string; items: string[] }>;
  records?: Array<{ title: string; detail: string; meta?: string; tag?: string }>;
  table?: { columns: string[]; rows: string[][] };
}

export default function StaticPdfSectionPage({
  title,
  description,
  items,
  eyebrow,
  metrics = [],
  sections = [],
  records = [],
  table
}: StaticPdfSectionPageProps) {
  const [recordSearch, setRecordSearch] = useState("");

  const filteredRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      [record.title, record.detail, record.meta, record.tag]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [recordSearch, records]);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">{eyebrow || "Documentation"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Government of Maharashtra</span>
            </span>
          </div>
        </div>

        {/* Metrics Row */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {metrics.map((metric, idx) => (
              <div key={metric.label || idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {metric.label}
                </span>
                <div className="mt-1 text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {metric.value}
                </div>
                {metric.note && (
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{metric.note}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Primary Items / Key Highlights Grid */}
        {items.length > 0 && (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              Core Framework Provisions &amp; Principles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs sm:text-sm font-medium text-slate-700 leading-relaxed flex items-start gap-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                    {index + 1}
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thematic Sections */}
        {sections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sections.map((section) => (
              <div key={section.title} className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-3.5">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers size={16} className="text-amber-600" />
                  {section.title}
                </h3>
                <div className="space-y-2.5">
                  {section.items.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-xs text-slate-700 font-medium leading-relaxed flex items-start gap-2.5"
                    >
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Searchable Records / Notices / Circulars */}
        {records.length > 0 && (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award size={16} className="text-purple-600" />
                Official Records &amp; Advisories
              </h2>

              {/* Search Box */}
              <div className="relative min-w-[260px]">
                <input
                  type="text"
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Search by title, tag, or keyword..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-1.5 pl-8 pr-7 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {recordSearch && (
                  <button
                    onClick={() => setRecordSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4.5 space-y-2 hover:border-slate-300 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                        {record.title}
                      </h3>
                      {record.tag && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold shrink-0">
                          {record.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {record.detail}
                    </p>
                  </div>

                  {record.meta && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <ChevronRight size={12} className="text-blue-500" />
                      <span>{record.meta}</span>
                    </div>
                  )}
                </div>
              ))}

              {filteredRecords.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs font-semibold text-slate-400">
                  No records match "{recordSearch}". Try a different keyword.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Structured Reference Table */}
        {table && (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4 overflow-hidden">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Layers size={16} className="text-blue-600" />
              Operational Roles &amp; Responsibilities Reference
            </h2>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200">
                    {table.columns.map((col, index) => (
                      <th
                        key={col}
                        className={`py-3 px-4 font-extrabold text-slate-800 uppercase tracking-wider text-[11px] ${
                          index === 0 ? "rounded-tl-xl" : index === table.columns.length - 1 ? "rounded-tr-xl" : ""
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {table.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td
                          key={`${cell}-${cIdx}`}
                          className={`py-3 px-4 text-slate-700 font-medium ${cIdx === 0 ? "font-bold text-slate-900" : ""}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </GovPortalLayout>
  );
}
