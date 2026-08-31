"use client";

import { useState, useMemo } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Download,
  Send,
  Building2,
  Layers,
  Search,
  X,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Check,
  Clock,
  Sparkles
} from "lucide-react";

export default function KnowledgeCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [ticketForm, setTicketForm] = useState({ name: "", email: "", type: "NGO", query: "" });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "agent", text: "Welcome to MahaCSR Compliance Helpdesk. How can we assist with your Section 135 compliance or filing today?" }
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
    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setChatInput("");

    setTimeout(() => {
      let reply = "Thank you for reaching out. Under Maharashtra CSR regulations, Section 135 mandates 2% CSR allocation, Schedule VII thematic eligibility, and tripartite MoU tracking.";
      if (userText.toLowerCase().includes("darpan")) {
        reply = "NGO Darpan unique ID registration with NITI Aayog is mandatory for all non-corporate implementing agencies in Maharashtra.";
      } else if (userText.toLowerCase().includes("csr-1")) {
        reply = "Form CSR-1 must be filed electronically with the Ministry of Corporate Affairs (MCA) before receiving state CSR convergence funding.";
      } else if (userText.toLowerCase().includes("uc") || userText.toLowerCase().includes("utilisation")) {
        reply = "Utilisation Certificates (UC) must be uploaded with geo-tagged photographic evidence and verified by the District Nodal Officer.";
      }
      setChatMessages((prev) => [...prev, { sender: "agent", text: reply }]);
    }, 800);
  };

  const guides = [
    {
      title: "NGO Darpan Registration & Mapping",
      category: "REGISTRATION",
      desc: "Step-by-step instructions on mapping your NITI Aayog NGO Darpan unique ID, ensuring compliance data matches state registries.",
      badge: "Mandatory"
    },
    {
      title: "MCA CSR-1 Filing & Verification Guide",
      category: "COMPLIANCE",
      desc: "Understand how to register Form CSR-1 with the Ministry of Corporate Affairs, creating your mandatory state-level eligibility key.",
      badge: "Statutory"
    },
    {
      title: "Corporate Spending & Tranche Audits",
      category: "FINANCIAL",
      desc: "Guides for company controllers on managing tax exemptions, verifying tranches, and generating board-room ready spend summaries.",
      badge: "Audits"
    },
    {
      title: "Milestone Evidence & Geotagged Proofs",
      category: "MONITORING",
      desc: "How to structure milestone completion evidence reports and geo-tagged site photos to satisfy statutory audit trails under MCA rules.",
      badge: "M&E"
    }
  ];

  const downloads = [
    {
      title: "Aspirational Districts Framework (PDF)",
      desc: "Framework guidelines for focusing CSR activities in underdeveloped and aspirational districts across Maharashtra.",
      type: "PDF",
      category: "POLICY",
      href: "/docs/aspirational_district.pdf"
    },
    {
      title: "Development Sectors in CSR (PDF)",
      desc: "Official schedule and guidelines of developmental sectors covered under Maharashtra CSR convergence.",
      type: "PDF",
      category: "SCHEDULE_VII",
      href: "/docs/DEVELOPMENT_SECTORS_IN_CSR.pdf"
    },
    {
      title: "Section 135 Companies Act Compliance (PDF)",
      desc: "Statutory provisions, MCA threshold rules, and compliance mandates of Section 135 of the Companies Act, 2013.",
      type: "PDF",
      category: "LEGAL",
      href: "/docs/Section_135_CSR.pdf"
    },
    {
      title: "Standard Project Proposal Template (PDF)",
      desc: "Mandatory structural format for submitting capital proposals to the MahaCSR Opportunity Marketplace.",
      type: "PDF",
      category: "TEMPLATES",
      href: ""
    },
    {
      title: "Annual Corporate CSR Compliance Report (Excel)",
      desc: "Pre-formatted ledger sheets mapped to MCA Section 135 reporting and board approval needs.",
      type: "XLSX",
      category: "FORMATS",
      href: ""
    },
    {
      title: "Escrow Account Setup Agreement Framework",
      desc: "Sample state escrow agreement for releasing milestone-based project tranches seamlessly.",
      type: "DOCX",
      category: "LEGAL",
      href: ""
    }
  ];

  const recommendations = [
    "Keep NGO Darpan, CSR-1, PAN, 12A, 80G, and audited financial statements in one verified credential packet.",
    "Require geo-tagged milestone photos, beneficiary registers, invoices, and officer notes before tranche release.",
    "Use district priority tags on every proposal so corporates can route funds toward underserved talukas.",
    "Publish plain-language help articles for CSR applicability, report exports, and rejection appeal steps."
  ];

  const filteredGuides = useMemo(() => {
    return guides.filter((g) => {
      const matchSearch = !searchTerm || g.title.toLowerCase().includes(searchTerm.toLowerCase()) || g.desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === "ALL" || g.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [guides, searchTerm, selectedCategory]);

  const filteredDownloads = useMemo(() => {
    return downloads.filter((d) => {
      const matchSearch = !searchTerm || d.title.toLowerCase().includes(searchTerm.toLowerCase()) || d.desc.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [downloads, searchTerm]);

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Knowledge Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Compliance Hub &amp; Knowledge Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Comprehensive reference guides for Section 135 compliance mandates, official downloadable formats, NGO Darpan mapping, and direct support desk assistance.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Government of Maharashtra</span>
            </span>
          </div>
        </div>

        {/* 4 Metric Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Compliance Modules</span>
              <BookOpen size={16} className="text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">4 Guides</p>
            <p className="text-[11px] text-slate-500 font-medium">Darpan, CSR-1, M&amp;E &amp; Audits</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Download Toolkits</span>
              <Download size={16} className="text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-900">6 Formats</p>
            <p className="text-[11px] text-slate-500 font-medium">PDF, XLSX &amp; DOCX Models</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Statutory Act</span>
              <FileText size={16} className="text-purple-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">Sec 135</p>
            <p className="text-[11px] text-slate-500 font-medium">Companies Act 2013 Aligned</p>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Helpdesk Desk</span>
              <MessageSquare size={16} className="text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">Live Support</p>
            <p className="text-[11px] text-slate-500 font-medium">Interactive Compliance Chat</p>
          </div>
        </div>

        {/* Compact Search & Category Bar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full min-w-[240px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search knowledge articles, guidelines, or downloadable formats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {["ALL", "REGISTRATION", "COMPLIANCE", "FINANCIAL", "MONITORING"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Area: Compliance Guides & Downloads (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Compliance Guide Modules */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-600" />
                  Compliance Guide Modules
                </h2>
                <span className="text-[11px] font-bold text-slate-400">
                  {filteredGuides.length} Modules Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredGuides.map((guide) => (
                  <div
                    key={guide.title}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50/30 hover:border-blue-200 transition-all flex flex-col justify-between space-y-2 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-900 text-[10px] font-extrabold">
                          {guide.badge}
                        </span>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {guide.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Portal Operational Recommendations */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-3.5">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                State Best Practices &amp; Operational Recommendations
              </h2>

              <div className="space-y-2.5">
                {recommendations.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Download Catalog */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Download size={16} className="text-purple-600" />
                  Statutory Download Catalog &amp; Formats
                </h2>
                <span className="text-[11px] font-bold text-slate-400">
                  {filteredDownloads.length} Resources
                </span>
              </div>

              <div className="space-y-2.5">
                {filteredDownloads.map((d) => (
                  <div
                    key={d.title}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                          {d.type}
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {d.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">
                        {d.desc}
                      </p>
                    </div>

                    {d.href ? (
                      <a
                        href={d.href}
                        download={d.href.split("/").pop()}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all border border-purple-200 shrink-0 no-underline cursor-pointer shadow-2xs"
                      >
                        <Download size={13} />
                        <span>Download {d.type}</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => alert("This document template is currently being finalized by the State CSR Coordinating Unit.")}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 shrink-0 cursor-pointer shadow-2xs"
                      >
                        <Download size={13} />
                        <span>Model {d.type}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Area: Interactive Support Desk & Live Chat (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Live Chat / Assistant Box */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  MahaCSR Interactive Compliance Desk
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                  Online
                </span>
              </div>

              {/* Chat Message Box */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 h-[260px] overflow-y-auto space-y-2.5 flex flex-col scrollbar-none">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[88%] shadow-2xs ${
                      msg.sender === "agent"
                        ? "bg-white text-slate-800 border border-slate-100 self-start"
                        : "bg-blue-600 text-white font-semibold self-end"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a compliance question (e.g. Darpan, CSR-1, UC)..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Send size={13} />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Support Ticket Desk Form */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <HelpCircle size={16} className="text-amber-600" />
                  Support Ticket Registration
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Register a formal ticket with the Department of Industries &amp; Planning.
                </p>
              </div>

              {ticketSubmitted ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Support ticket registered! An officer will contact your registered email within the statutory SLA.</span>
                </div>
              ) : (
                <form onSubmit={handleTicketSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={ticketForm.name}
                      onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                      placeholder="e.g. Anand Patil"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-all shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={ticketForm.email}
                      onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                      placeholder="e.g. contact@organization.org"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-all shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Organization Type *</label>
                    <select
                      value={ticketForm.type}
                      onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
                    >
                      <option value="NGO">Implementing Agency / NGO</option>
                      <option value="COMPANY">Corporate CSR Partner</option>
                      <option value="GOVT">Government Department Official</option>
                      <option value="OTHER">Citizen / Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Query Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={ticketForm.query}
                      onChange={(e) => setTicketForm({ ...ticketForm, query: e.target.value })}
                      placeholder="Briefly describe your compliance or portal issue..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-all shadow-2xs leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Register Support Ticket</span>
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

      </div>
    </GovPortalLayout>
  );
}

// Made with Bob
