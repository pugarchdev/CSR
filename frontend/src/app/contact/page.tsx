"use client";

import React, { useState } from "react";
import { Landmark, Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSending(true);
    setTimeout(() => {
      alert("Message Sent! Our support desks will reply to your registered email within 24 hours.");
      setName("");
      setEmail("");
      setMessage("");
      setSending(false);
    }, 1200);
  };

  return (
    <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto flex flex-col gap-10 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Landmark size={14} /> महाराष्ट्र शासन • DIRECT CONTACT CHANNEL
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Contact Us</h1>
        <p className="text-slate-400 text-sm">Reach out to the CSR Commissionerate, Industries Department, or file support requests regarding the portal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        
        {/* Contact info */}
        <div className="flex flex-col gap-8">
          <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col gap-5">
            <h3 className="font-heading font-bold text-lg text-slate-200">State CSR Office (Pune)</h3>
            <div className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-3"><MapPin size={16} className="text-[#f97316]" /> <span>CSR Commissionerate Office, YASHADA campus, Raj Bhavan Road, Pune - 411007</span></div>
              <div className="flex items-center gap-3"><Phone size={16} className="text-[#f97316]" /> <span>+91 20 2560 1350</span></div>
              <div className="flex items-center gap-3"><Mail size={16} className="text-[#f97316]" /> <span>commissioner.csr@maharashtra.gov.in</span></div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col gap-5">
            <h3 className="font-heading font-bold text-lg text-slate-200">Main Industries Desk (Mumbai)</h3>
            <div className="flex flex-col gap-4 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-3"><MapPin size={16} className="text-indigo-650" /> <span>Department of Industries, Mantralaya, Nariman Point, Mumbai - 400032</span></div>
              <div className="flex items-center gap-3"><Phone size={16} className="text-indigo-650" /> <span>+91 22 2202 5000</span></div>
              <div className="flex items-center gap-3"><Mail size={16} className="text-indigo-650" /> <span>sec.industries@maharashtra.gov.in</span></div>
            </div>
          </div>
        </div>

        {/* Message form */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col gap-5">
          <h3 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
            <MessageSquare size={18} className="text-[#f97316]" />
            Send Support Query
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs font-medium text-slate-400">
            <div className="flex flex-col gap-1.5">
              <span>Full Name:</span>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-violet-500" 
                required 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span>Registered Email Address:</span>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-violet-500" 
                required 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span>Description / Query:</span>
              <textarea 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 h-28 focus:outline-none focus:border-violet-500" 
                required 
              />
            </div>
            <Button 
              type="submit" 
              disabled={sending} 
              className="flex items-center justify-center gap-2 mt-2 py-3 shadow-md"
            >
              <Send size={14} /> {sending ? "Sending..." : "Submit Message"}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
