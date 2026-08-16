"use client";

import React from "react";
import { Clock, Video, Users, Plus, CheckCircle2 } from "lucide-react";

export default function MeetingsPage() {

  const meetings = [
    {
      id: "meet-1",
      title: "Tripartite Kickoff: Melghat Solar Electrification",
      project: "Solar Micro-Grids for Tribal Schools",
      date: "Tomorrow, 11:00 AM",
      mode: "Virtual (MahaGov VC)",
      participants: ["CSR Lead (Tata Power)", "Collectorate Focal SPOC", "RM (State CSR Cell)"],
      status: "CONFIRMED"
    },
    {
      id: "meet-2",
      title: "13-Point Feasibility Review with District Health Officer",
      project: "Telemedicine Rural Clinics in Thane",
      date: "18 Aug 2026, 3:00 PM",
      mode: "In-Person (Collectorate Office)",
      participants: ["Civil Surgeon Thane", "RM (State CSR Cell)"],
      status: "SCHEDULED"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              RM Workflow
            </span>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
              Stakeholder Meetings
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Stakeholder Alignment Meetings & Calendar
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Scheduled feasibility reviews, corporate alignment calls, and district tripartite meetings
          </p>
        </div>

        <button
          onClick={() => alert("Schedule meeting feature coming soon!")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800"
        >
          <Plus size={14} />
          <span>Schedule Meeting</span>
        </button>
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meetings.map((m) => (
          <div key={m.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 size={11} /> {m.status}
                </span>
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                  <Clock size={12} /> {m.date}
                </span>
              </div>
              <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">{m.title}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{m.project}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Video size={13} className="text-slate-400" />
                <span>{m.mode}</span>
              </div>
              <div className="flex items-start gap-1.5 text-slate-600">
                <Users size={13} className="text-slate-400 mt-0.5 shrink-0" />
                <span className="text-[11px] leading-relaxed">{m.participants.join(" · ")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
