"use client";

import React, { useState } from "react";
import { Download, FileText, Search, Landmark, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

const templatesList = [
  { id: "TMP-01", title: "Standard Project Proposal Format Template", type: "Word (DOCX)", size: "450 KB", description: "Official proposal template complying with MahaCSR screening protocols. Must be used for all project uploads." },
  { id: "TMP-02", title: "Milestone Verification Audit Sheet", type: "Excel (XLSX)", size: "1.2 MB", description: "Standard spreadsheet format required for logging tranches, ledger accounts, and beneficiary receipts." },
  { id: "GUIDE-03", title: "NGO Darpan & CSR-1 Registration Guide", type: "PDF", size: "2.5 MB", description: "Step-by-step documentation detailing how to obtain verified CSR credentials from federal registry portals." },
  { id: "GUIDE-04", title: "Corporate Tax Deductions under Section 80G", type: "PDF", size: "1.8 MB", description: "Comprehensive tax guide explaining deduction ceilings and state-level audit validations." }
];

export default function DownloadsPage() {
  const [search, setSearch] = useState("");

  const filtered = templatesList.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f7941d] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Download size={14} /> DOCUMENTS & TEMPLATES LEDGER
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Downloads Center</h1>
        <p className="text-slate-400 text-sm">Download official state templates, auditing sheets, policy briefs, and registration guides.</p>
      </div>

      <div className="flex gap-4 items-center relative max-w-md w-full">
        <input 
          type="text" 
          placeholder="Search templates or guides..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500" 
        />
        <Search size={16} className="absolute left-3.5 text-slate-500" />
      </div>

      <div className="flex flex-col gap-6">
        {filtered.map((item) => (
          <div key={item.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-750 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-400 font-bold tracking-wider">{item.id}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{item.type}</span>
                </div>
                <h3 className="font-heading font-bold text-base text-slate-100 leading-tight">{item.title}</h3>
                <p className="text-slate-450 text-xs leading-relaxed max-w-xl">{item.description}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 shrink-0 self-end md:self-auto shadow-sm">
              <Download size={14} /> Download ({item.size})
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
