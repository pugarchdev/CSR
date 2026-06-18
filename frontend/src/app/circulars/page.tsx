"use client";

import React, { useState } from "react";
import { FileText, Download, Search, Calendar, Landmark, Tag } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const circularsList = [
  { id: "GR-2026-05", title: "GR-2026/05: Allocation of CSR funds to aspirational talukas in Maharashtra", department: "Industries & Social Welfare", date: "June 12, 2026", size: "1.4 MB", tag: "Aspirational Talukas" },
  { id: "DIR-43", title: "Directive 43: Exemption limits & audit guidelines for self-funded CSR trusts", department: "Finance Department", date: "May 28, 2026", size: "850 KB", tag: "Taxation & Audit" },
  { id: "NOTIF-12", title: "Notification 12/2026: Mandatory S3 file evidence upload for escrow releases", department: "Planning Authority", date: "May 10, 2026", size: "2.1 MB", tag: "Escrow Guidelines" },
  { id: "GR-2026-02", title: "GR-2026/02: Tribal Area Primary School Digitisation Incentives", department: "Tribal Development", date: "April 02, 2026", size: "1.8 MB", tag: "Education" },
  { id: "POL-01", title: "Maharashtra CSR Policy Guidelines 2025-2030 (Second Revision)", department: "Industries Commissionerate", date: "January 15, 2026", size: "4.5 MB", tag: "Policy" }
];

export default function CircularsPage() {
  const [search, setSearch] = useState("");

  const filtered = circularsList.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Landmark size={14} /> महाराष्ट्र शासन • Government Resolution Desk
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Official State Circulars</h1>
        <p className="text-slate-400 text-sm">Download and audit official resolutions, directives, and policy announcements regarding corporate social contributions in Maharashtra.</p>
      </div>

      <div className="flex gap-4 items-center relative max-w-md w-full">
        <input 
          type="text" 
          placeholder="Search circulars by code, title, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500" 
        />
        <Search size={16} className="absolute left-3.5 text-slate-500" />
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((item) => (
          <div key={item.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[#fff7ed] border border-[#ffedd5] text-[#f97316] flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-400 w-fit font-bold uppercase tracking-wider">{item.id}</span>
                <h3 className="font-heading font-bold text-base text-slate-100 leading-tight">{item.title}</h3>
                <div className="flex items-center gap-4 text-slate-500 text-[10px] font-semibold">
                  <span className="flex items-center gap-1"><Landmark size={12} /> {item.department}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                  <span className="flex items-center gap-1"><Tag size={12} /> {item.tag}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 self-end md:self-auto shadow-sm">
              <Download size={14} /> Download ({item.size})
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-slate-500 py-10 font-bold text-xs">No circulars match your search query.</div>
        )}
      </div>
    </div>
  );
}
