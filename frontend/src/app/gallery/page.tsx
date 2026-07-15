"use client";

import React, { useState } from "react";
import { Image as ImageIcon, MapPin, Calendar, Tag, Play } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

const galleryItems = [
  { id: "1", title: "Check Dam Construction in Aheri", location: "Gadchiroli", date: "June 2026", tag: "Water", image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=400" },
  { id: "2", title: "Smart Screen Setup at Primary School", location: "Mulshi, Pune", date: "June 2026", tag: "Education", image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=400" },
  { id: "3", title: "Mobile Clinic Delivering Health Packs", location: "Ramtek, Nagpur", date: "May 2026", tag: "Healthcare", image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=400" },
  { id: "4", title: "Afforestation Site Saplings Planting", location: "Shahapur, Thane", date: "April 2026", tag: "Environment", image: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=400" }
];

export default function GalleryPage() {
  const [selectedTag, setSelectedTag] = useState("All");

  const filtered = selectedTag === "All" ? galleryItems : galleryItems.filter(item => item.tag === selectedTag);

  return (
    <div className="px-6 md:px-12 py-12 max-w-5xl mx-auto flex flex-col gap-8 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex flex-col gap-2 border-b border-slate-800 pb-6">
        <span className="text-[#f7941d] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <ImageIcon size={14} /> SITE INSPECTION DATA LEDGER
        </span>
        <h1 className="font-heading font-extrabold text-4xl text-slate-100 tracking-tight">Impact Photo Gallery</h1>
        <p className="text-slate-400 text-sm">Visual index of certified project milestones, audits, and completions uploaded by field officers across Maharashtra.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-850 pb-2 overflow-x-auto">
        {["All", "Water", "Education", "Healthcare", "Environment"].map((tag) => (
          <button 
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              selectedTag === tag 
                ? "border-[#f7941d] text-[#f7941d]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {filtered.map((item) => (
          <div key={item.id} className="glass-card rounded-3xl border border-slate-800 overflow-hidden flex flex-col justify-between group">
            {/* Visual Box Placeholder utilizing local CSS gradient styled as a premium dashboard card */}
            <div className="h-52 w-full bg-[#e3f0fa] flex items-center justify-center relative border-b border-slate-800">
              <div className="w-12 h-12 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
                <ImageIcon size={20} />
              </div>
              <span className="absolute top-4 left-4 bg-slate-950/70 border border-slate-800 text-[10px] font-bold text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1"><MapPin size={10} /> {item.location}</span>
            </div>
            <div className="p-6 flex flex-col gap-1.5 bg-slate-900/30">
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-wider"><Calendar size={12} /> {item.date} • {item.tag}</span>
              <h3 className="font-heading font-bold text-base text-slate-100 leading-tight mt-1">{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
