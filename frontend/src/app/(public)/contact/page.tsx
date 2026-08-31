"use client";

import React, { useState } from "react";
import {
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Headphones,
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 5000);
    }, 600);
  };

  const DESKS = [
    {
      title: "State CSR Cell",
      detail: "State-level CSR convergence coordination, escalated grievances, and inter-departmental policy support.",
      email: "statecell.user@mahacsr.gov.in",
      phone: "022-2202 1234",
      icon: Building2,
      badge: "Apex Desk"
    },
    {
      title: "CSR Relationship Manager Desk",
      detail: "Corporate enquiry response, development pitch verification, feasibility assessment, and MoU coordination.",
      email: "rm.user@mahacsr.gov.in",
      phone: "022-2202 1240",
      icon: ShieldCheck,
      badge: "5-Day SLA"
    },
    {
      title: "Citizen & Partner Public Helpdesk",
      detail: "General portal queries, tracking assistance, document guidance, and technical helpdesk queries.",
      email: "helpdesk@mahacsr.gov.in",
      phone: "1800-123-4567",
      icon: Headphones,
      badge: "Toll-Free"
    }
  ];

  return (
    <GovPortalLayout showSidebar={false}>
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-8 sm:px-6 md:py-10 text-slate-900 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Public Portal</span>
              <span>/</span>
              <span className="text-blue-600 font-extrabold">Support Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Contact &amp; Assistance Desk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Reach the Maharashtra State CSR Cell, CSR Relationship Manager desk, District Nodal Officer coordination network, or the 24/7 public helpdesk.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck size={14} className="text-blue-600" />
              <span>Government of Maharashtra</span>
            </span>
          </div>
        </div>

        {/* Contact Desks 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DESKS.map((desk) => {
            const Icon = desk.icon;
            const isCopied = copiedEmail === desk.email;

            return (
              <div
                key={desk.title}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                      <Icon size={18} />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                      {desk.badge}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {desk.title}
                  </h3>

                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {desk.detail}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 truncate font-mono text-[11px] text-slate-700 font-bold">
                      <Mail size={13} className="text-blue-600 shrink-0" />
                      <span className="truncate">{desk.email}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(desk.email)}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copy email"
                    >
                      {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 px-2 text-slate-600 font-semibold text-[11px]">
                    <Phone size={13} className="text-emerald-600 shrink-0" />
                    <span>{desk.phone}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2-Column: Support Form & Office Reference */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Support Query Form (7 Cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Send size={16} className="text-blue-600" />
                Submit Citizen / Partner Enquiry
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Submit your query directly to the Maharashtra CSR State IT Support Cell.
              </p>
            </div>

            {sent && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2.5 shadow-2xs animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Message successfully registered. The helpdesk officer will respond within the statutory SLA.</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Subject / Topic *</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Enquiry regarding project onboarding or tracking"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase">Message Description *</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Provide detailed description of your request or question..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 px-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-60"
              >
                <Send size={14} />
                <span>{loading ? "Submitting Request..." : "Submit Message"}</span>
              </button>
            </form>
          </div>

          {/* Office Reference (5 Cols) */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin size={16} className="text-rose-600" />
                Headquarters &amp; Governance
              </h2>

              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">State Administrative Office</span>
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  Maharashtra CSR Authority
                </p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Planning Department, Mantralaya Annexe, Madam Cama Road, Nariman Point, Mumbai - 400032.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Clock size={13} className="text-blue-600" />
                    <span>Corporate Enquiry 5-Day SLA</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Relationship Managers initiate dialogue and record feasibility within 5 working days.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>Public Helpdesk 2-Day SLA</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    General queries and document guidance addressed within 48 hours.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
              Grievance escalation hierarchy: District Nodal Officer ➔ State CSR Cell ➔ Planning Secretary.
            </div>
          </div>

        </div>

      </div>
    </GovPortalLayout>
  );
}
