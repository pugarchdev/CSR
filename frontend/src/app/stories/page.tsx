"use client";

import React from "react";
import { Award, Heart, ShieldCheck, MapPin, Calendar, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

const stories = [
  { id: "1", title: "Transforming Aheri: How check dams restored farming in Gadchiroli", location: "Aheri, Gadchiroli", date: "May 2026", ngo: "Sahyadri Eco Foundation", corporate: "Tata Projects Limited", metric: "35,000+ villagers secured water", content: "Through a structured ₹1.2 Cr CSR funding matching cycle, Sahyadri Eco Foundation built 12 check dams. The project completed 4 months ahead of schedule thanks to dynamic milestone audits. Groundwater tables have risen by 2.4 meters, allowing local farmers to cultivate a second crop cycle." },
  { id: "2", title: "Empowering Rural Classrooms in Mulshi Zilla Parishad schools", location: "Mulshi, Pune", date: "April 2026", ngo: "Udan Welfare Society", corporate: "Mahindra CSR Trust", metric: "4,500 children with digital labs", content: "By integrating digital smart screens, science labs, and offline educational packages into 24 Zilla Parishad primary schools in Mulshi, secondary school drop-out rates decreased by 18% in the first term. Milestones were monitored via digital photo logs on MahaCSR." }
];

export default function StoriesPage() {
  return (
    <div className="px-6 md:px-12 py-12 max-w-4xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f97316] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Award size={14} /> CSR AUDIT SUCCESS GALLERY
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Success Stories</h1>
        <p className="text-slate-400 text-sm">Read verified case studies of high-impact CSR partnerships transforming local communities in rural and tribal Maharashtra.</p>
      </div>

      <div className="flex flex-col gap-8">
        {stories.map((story) => (
          <div key={story.id} className="glass-card p-8 rounded-3xl border border-slate-800 flex flex-col gap-4">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-wider"><MapPin size={12} /> {story.location} • {story.date}</span>
                <h3 className="font-heading font-bold text-2xl text-slate-100 tracking-tight leading-tight mt-1">{story.title}</h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 shrink-0 shadow-sm">
                <TrendingUp size={14} /> {story.metric}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 uppercase tracking-widest text-[9px]">Grassroots Partner</span>
                <span className="text-slate-350">{story.ngo}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-slate-800 pl-4">
                <span className="text-slate-500 uppercase tracking-widest text-[9px]">Corporate Donor</span>
                <span className="text-slate-350">{story.corporate}</span>
              </div>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed">{story.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
