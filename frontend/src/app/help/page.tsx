"use client";

import React, { useState } from "react";
import { HelpCircle, Search, FileQuestion, BookOpen, Send, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HelpCenterPage() {
  const [topic, setTopic] = useState("NGO Compliance");
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !desc) return;
    const tid = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(tid);
  };

  return (
    <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto flex flex-col gap-10 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f7941d] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <HelpCircle size={14} /> USER COMPLIANCE HELP DESK
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Help Center</h1>
        <p className="text-slate-400 text-sm">Resolve system access queries, submit verification support tickets, or read user tutorials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Guides */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h3 className="font-heading font-bold text-xl text-slate-200">Self Help Guides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <span className="text-[#f7941d] font-bold text-xs uppercase tracking-wider">Guide 1</span>
              <h4 className="font-heading font-bold text-base text-slate-100">NGO Registration Steps</h4>
              <p className="text-slate-450 text-xs leading-relaxed">Detailed checklist for matching your PAN card, NGO Darpan filings, and getting verified on MahaCSR.</p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col gap-3">
              <span className="text-indigo-650 font-bold text-xs uppercase tracking-wider">Guide 2</span>
              <h4 className="font-heading font-bold text-base text-slate-100">Milestone Tranche Escrows</h4>
              <p className="text-slate-450 text-xs leading-relaxed">Understanding how to log beneficiary databases and upload site photos to approve milestone tranches.</p>
            </div>
          </div>
        </div>

        {/* Submit Ticket */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col gap-5">
          <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
            <Ticket size={18} className="text-[#f7941d]" />
            Generate Support Ticket
          </h3>
          
          {ticketId ? (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-3 text-center text-xs font-semibold text-slate-400">
              <span className="text-emerald-600 font-extrabold text-sm flex justify-center items-center gap-1.5">Ticket Created Successfully</span>
              <span className="text-slate-200 font-extrabold text-base bg-slate-950 py-2 rounded-xl">{ticketId}</span>
              <span>Please save this ID. An auditor will respond via the communication module within 24 hours.</span>
              <Button onClick={() => setTicketId(null)} className="mt-2 py-2">Create another ticket</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-medium text-slate-400">
              <div className="flex flex-col gap-1.5">
                <span>Select Category:</span>
                <select 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none"
                >
                  <option>NGO Compliance</option>
                  <option>Corporate Sliders</option>
                  <option>Payment Release</option>
                  <option>Account Access</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span>Subject:</span>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summary of issue"
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-violet-500" 
                  required 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span>Detailed Description:</span>
                <textarea 
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Explain your problem..."
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 h-24 focus:outline-none focus:border-violet-500" 
                  required 
                />
              </div>
              <Button type="submit" className="w-full mt-2 py-2.5 shadow-md">Submit Support Ticket</Button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
