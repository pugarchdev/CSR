"use client";

import React, { useState } from "react";
import { HelpCircle, Search, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

const faqsList = [
  { q: "What constitutes eligible CSR spending under Section 135?", a: "Expenditures aligned with Schedule VII activities (Education, Health, Environment, water supply, etc.) targeting marginalized groups are eligible. Routine business expenses and staff salaries cannot be claimed." },
  { q: "How does the Maharashtra CSR verification process audit NGOs?", a: "We audit NGO Darpan registrations, CSR-1 validation, active 12A/80G status, and three years of financial ledger history before authorizing NGOs to submit project proposals." },
  { q: "Is the milestone escrow account mandatory for project matching?", a: "Yes. To prevent fund diversion and project delays, all matched projects release funds in milestone-based tranches. Payouts are triggered by field inspectors checking uploaded photo logs." },
  { q: "Can a corporate claim 80G tax exemptions for MahaCSR deposits?", a: "Absolutely. All verified contributions made to listed NGOs holding active 80G credentials qualify for standard tax deductions according to federal income tax laws." }
];

export default function FaqsPage() {
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = faqsList.filter(f => 
    f.q.toLowerCase().includes(search.toLowerCase()) || 
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <HelpCircle size={14} /> COMPLIANCE KNOWLEDGE DATA
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Frequently Asked Questions</h1>
        <p className="text-slate-400 text-sm">Find answers regarding state audit processes, eligibility rules, escrow release milestones, and tax declarations.</p>
      </div>

      <div className="flex gap-4 items-center relative max-w-md w-full">
        <input 
          type="text" 
          placeholder="Search questions or answers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500" 
        />
        <Search size={16} className="absolute left-3.5 text-slate-500" />
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <button 
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full text-left p-5 flex justify-between items-center gap-4 hover:bg-slate-900/40 transition-colors"
              >
                <span className="font-heading font-bold text-sm text-slate-150 leading-tight">{item.q}</span>
                {isOpen ? <ChevronUp size={16} className="text-[#f97316]" /> : <ChevronDown size={16} className="text-slate-500" />}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-slate-850 pt-4 text-xs text-slate-400 leading-relaxed bg-slate-950/20">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
