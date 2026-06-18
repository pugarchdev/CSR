"use client";

import { useState } from "react";
import { 
  BookOpen, HelpCircle, FileText, Download, MessageSquare, 
  Send, ShieldCheck, Landmark, Building2, Ticket, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function KnowledgeCenter() {
  const [ticketForm, setTicketForm] = useState({ name: "", email: "", type: "NGO", query: "" });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "agent", text: "Hello! Welcome to MahaCSR Helpdesk. How can we assist with your compliance filing today?" }
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketForm({ name: "", email: "", type: "NGO", query: "" });
      setTicketSubmitted(false);
    }, 4000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { sender: "user", text: chatInput }]);
    setChatInput("");

    // Simulate agent typing response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        sender: "agent", 
        text: "Thank you for the message. A support executive from Department of Industries is reviewing your profile." 
      }]);
    }, 1500);
  };

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col gap-12 bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#f97316] font-bold text-xs uppercase tracking-wider">
          <BookOpen size={14} /> Knowledge Center & Support Desk
        </div>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">
          Compliance Hub & Help Center
        </h1>
        <p className="text-slate-400 text-base max-w-2xl leading-relaxed">
          Learn Section 135 compliance mandates, download official reporting templates, submit support requests, or chat with our helpdesk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* Left Columns (2/3 width): Guides & Downloads */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Compliance Guides Grid */}
          <section className="flex flex-col gap-4">
            <h2 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
              <ShieldCheck className="text-[#f97316]" size={20} /> Compliance Guide Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <Landmark size={20} className="text-[#f97316]" />
                <h3 className="font-heading font-bold text-base text-slate-150">NGO Darpan Registration</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Step-by-step instructions on mapping your NITI Aayog NGO Darpan unique ID, ensuring compliance data matches state registries.
                </p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <FileText size={20} className="text-[#f97316]" />
                <h3 className="font-heading font-bold text-base text-slate-150">MCA CSR-1 Filing Guide</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Understand how to register Form CSR-1 with the Ministry of Corporate Affairs, creating your mandatory state-level eligibility key.
                </p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <Building2 size={20} className="text-indigo-650" />
                <h3 className="font-heading font-bold text-base text-slate-150">Company Spending Audits</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Guides for company controllers on managing tax exemptions, verifying tranches, and generating board-room ready spend summaries.
                </p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800 flex flex-col gap-3">
                <ShieldCheck size={20} className="text-emerald-600" />
                <h3 className="font-heading font-bold text-base text-slate-150">Milestone Audit Process</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  How to structure milestone completion evidence reports and photos to satisfy statutory audit trails under MCA rules.
                </p>
              </div>

            </div>
          </section>

          {/* Download Center Catalog */}
          <section className="flex flex-col gap-4">
            <h2 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
              <Download className="text-indigo-650" size={20} /> Download Catalog
            </h2>
            <div className="flex flex-col gap-3">
              {[
                { title: "Standard Project Proposal Template (PDF)", desc: "Mandatory structural format for submitting capital proposals to the marketplace.", type: "PDF" },
                { title: "Annual Corporate CSR Compliance Report (Excel)", desc: "Pre-formatted ledger sheets mapped to MCA Section 135 reporting needs.", type: "XLSX" },
                { title: "Escrow Account Setup Agreement Framework", desc: "Sample state escrow agreement for releasing milestone-based tranches.", type: "DOCX" }
              ].map((d, i) => (
                <div key={i} className="glass-card p-4 rounded-xl border border-slate-800/80 flex justify-between items-center gap-4">
                  <div className="flex items-start gap-3">
                    <FileText size={18} className="text-[#f97316] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-200 leading-snug">{d.title}</span>
                      <span className="text-[10px] text-slate-500">{d.desc}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5 shrink-0">
                    <Download size={12} /> {d.type}
                  </Button>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Sidebar (1/3 width): Ticket Desk & Help Chat */}
        <div className="flex flex-col gap-8 h-full justify-between">
          
          {/* Submit Help Ticket Form */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col gap-4 shadow-sm">
            <h3 className="font-heading font-bold text-base text-slate-150 flex items-center gap-2">
              <Ticket size={18} className="text-[#f97316]" /> Support Ticket Desk
            </h3>
            
            {ticketSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Ticket registered! Support team will contact you.</span>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 text-[10px] font-semibold uppercase">Your Name</label>
                  <input 
                    required 
                    value={ticketForm.name}
                    onChange={(e) => setTicketForm({...ticketForm, name: e.target.value})}
                    placeholder="e.g. Anand Kumar" 
                    className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-violet-500 transition-all placeholder-slate-700" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 text-[10px] font-semibold uppercase">Email Address</label>
                  <input 
                    required 
                    type="email"
                    value={ticketForm.email}
                    onChange={(e) => setTicketForm({...ticketForm, email: e.target.value})}
                    placeholder="e.g. anand@domain.org" 
                    className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-violet-500 transition-all placeholder-slate-700" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 text-[10px] font-semibold uppercase">Org Type</label>
                  <select 
                    value={ticketForm.type}
                    onChange={(e) => setTicketForm({...ticketForm, type: e.target.value})}
                    className="bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-violet-500 transition-all"
                  >
                    <option value="NGO">NGO Admin</option>
                    <option value="COMPANY">Corporate Partner</option>
                    <option value="OTHER">Other / Public</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 text-[10px] font-semibold uppercase">Query Description</label>
                  <textarea 
                    required 
                    rows={3}
                    value={ticketForm.query}
                    onChange={(e) => setTicketForm({...ticketForm, query: e.target.value})}
                    placeholder="Briefly explain your compliance concern..." 
                    className="bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-violet-500 transition-all placeholder-slate-700 resize-none" 
                  />
                </div>
                <Button variant="primary" size="sm" type="submit" className="w-full mt-1">
                  Register Support Ticket
                </Button>
              </form>
            )}
          </div>

          {/* Interactive Live Chat Mock */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col gap-4 shadow-sm h-72 justify-between">
            <h3 className="font-heading font-bold text-base text-slate-150 flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-650" /> Live Helpdesk Chat
            </h3>
            
            {/* Messages body */}
            <div className="flex-grow overflow-y-auto flex flex-col gap-2 max-h-40 p-1">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded-xl text-[10px] max-w-[85%] leading-relaxed ${
                    msg.sender === "agent" 
                      ? "bg-slate-900 border border-slate-800 text-slate-300 self-start" 
                      : "bg-[#fff7ed] border border-[#ffedd5] text-[#ea580c] self-end font-bold"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input bar */}
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-slate-800 pt-2 shrink-0">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about compliance..." 
                className="flex-grow bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-3 text-[10px] text-slate-100 focus:outline-none placeholder-slate-700"
              />
              <button type="submit" className="p-2 bg-violet-600 hover:bg-violet-750 text-white rounded-lg transition-all shadow-sm">
                <Send size={12} />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
