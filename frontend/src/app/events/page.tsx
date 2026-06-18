"use client";

import React, { useState } from "react";
import { Calendar, MapPin, Users, Ticket, ArrowRight, Clock } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const eventsList = [
  { id: "1", title: "Maharashtra State CSR Conclave 2026", type: "State Summit", location: "YASHADA Auditorium, Pune", date: "June 28, 2026", time: "10:00 AM - 05:00 PM", description: "Interact with CSR Commissioner IAS Pravin Darade and top corporate officers. Discussion topics cover Section 135 compliance, digital audits, and rural outreach goals." },
  { id: "2", title: "NGO Darpan & CSR-1 Compliance Workshop", type: "Training Webinar", location: "Online (Zoom Link)", date: "July 05, 2026", time: "02:00 PM - 04:00 PM", description: "A technical walk-through detailing how grassroots NGOs can audit and upload compliance reports on MahaCSR to clear background checks." },
  { id: "3", title: "Tribal Talukas Investment Matching Webinar", type: "B2B Meetup", location: "World Trade Center, Mumbai", date: "July 12, 2026", time: "11:00 AM - 03:00 PM", description: "Direct matching meet between corporate sustainability trust managers and verified NGOs working in Gadchiroli, Nandurbar, and Palghar." }
];

export default function EventsPage() {
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  const handleRegister = (id: string) => {
    setRegisteredId(id);
    setTimeout(() => {
      alert("Registration Successful! Entry pass has been dispatched to your email address.");
      setRegisteredId(null);
    }, 1000);
  };

  return (
    <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Calendar size={14} /> COLLABORATION & SEMINARS BOARD
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Events & Workshops</h1>
        <p className="text-slate-400 text-sm">Register for upcoming policy training conclaves, regional NGO workshops, and corporate matching events.</p>
      </div>

      <div className="flex flex-col gap-6">
        {eventsList.map((item) => (
          <div key={item.id} className="glass-card p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
            <div className="flex flex-col gap-3 max-w-2xl">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] bg-slate-900 border border-slate-800 px-3 py-0.5 rounded-full text-slate-450 font-bold uppercase tracking-wider">{item.type}</span>
                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Clock size={12} /> {item.date} • {item.time}</span>
              </div>
              <h3 className="font-heading font-bold text-xl text-slate-150 leading-tight">{item.title}</h3>
              <p className="text-slate-450 text-xs leading-relaxed">{item.description}</p>
              <span className="text-[11px] text-[#f97316] font-semibold flex items-center gap-1"><MapPin size={12} /> {item.location}</span>
            </div>
            <Button 
              variant="primary" 
              onClick={() => handleRegister(item.id)}
              disabled={registeredId === item.id}
              className="flex items-center gap-1.5 shrink-0 self-end md:self-auto py-2.5 px-5 shadow-md"
            >
              <Ticket size={16} /> 
              {registeredId === item.id ? "Processing..." : "Register Now"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
