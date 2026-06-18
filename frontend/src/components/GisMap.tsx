"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, HeartHandshake, FolderCheck, X, TrendingUp, Users, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DistrictData {
  name: string;
  funding: number;
  projects: number;
  ngos: number;
  beneficiaries: number;
  level: "low" | "mid" | "high";
  coords: { x: number; y: number; w: number; h: number }; // Box layout coordinates for schematic grid
}

// Full list of 36 Maharashtra Districts schematically mapped to coordinate offsets
const maharashtraDistrictsList: DistrictData[] = [
  // Konkan Division
  { name: "Mumbai City", funding: 45000000, projects: 22, ngos: 18, beneficiaries: 35000, level: "high", coords: { x: 20, y: 200, w: 50, h: 40 } },
  { name: "Mumbai Suburban", funding: 65000000, projects: 34, ngos: 28, beneficiaries: 55000, level: "high", coords: { x: 20, y: 150, w: 50, h: 40 } },
  { name: "Thane", funding: 38000000, projects: 18, ngos: 15, beneficiaries: 28000, level: "high", coords: { x: 80, y: 150, w: 60, h: 40 } },
  { name: "Palghar", funding: 12000000, projects: 8, ngos: 6, beneficiaries: 14000, level: "mid", coords: { x: 80, y: 100, w: 60, h: 40 } },
  { name: "Raigad", funding: 16000000, projects: 11, ngos: 9, beneficiaries: 19000, level: "mid", coords: { x: 80, y: 200, w: 60, h: 40 } },
  { name: "Ratnagiri", funding: 9500000, projects: 6, ngos: 5, beneficiaries: 11000, level: "low", coords: { x: 80, y: 250, w: 60, h: 40 } },
  { name: "Sindhudurg", funding: 6000000, projects: 4, ngos: 3, beneficiaries: 7500, level: "low", coords: { x: 80, y: 300, w: 60, h: 40 } },

  // Pune Division
  { name: "Pune", funding: 55000000, projects: 29, ngos: 24, beneficiaries: 42000, level: "high", coords: { x: 150, y: 200, w: 60, h: 40 } },
  { name: "Satara", funding: 11000000, projects: 8, ngos: 7, beneficiaries: 13000, level: "mid", coords: { x: 150, y: 250, w: 60, h: 40 } },
  { name: "Sangli", funding: 9000000, projects: 7, ngos: 5, beneficiaries: 11500, level: "low", coords: { x: 150, y: 300, w: 60, h: 40 } },
  { name: "Kolhapur", funding: 18000000, projects: 12, ngos: 10, beneficiaries: 21000, level: "mid", coords: { x: 150, y: 350, w: 60, h: 40 } },
  { name: "Solapur", funding: 14000000, projects: 9, ngos: 8, beneficiaries: 16000, level: "mid", coords: { x: 220, y: 250, w: 60, h: 40 } },

  // Nashik Division
  { name: "Nashik", funding: 24000000, projects: 15, ngos: 12, beneficiaries: 25000, level: "high", coords: { x: 150, y: 100, w: 60, h: 40 } },
  { name: "Ahmednagar", funding: 15000000, projects: 10, ngos: 9, beneficiaries: 17500, level: "mid", coords: { x: 150, y: 150, w: 60, h: 40 } },
  { name: "Dhule", funding: 7500000, projects: 5, ngos: 4, beneficiaries: 9000, level: "low", coords: { x: 150, y: 50, w: 60, h: 40 } },
  { name: "Nandurbar", funding: 8000000, projects: 6, ngos: 3, beneficiaries: 12000, level: "low", coords: { x: 80, y: 50, w: 60, h: 40 } },
  { name: "Jalgaon", funding: 13000000, projects: 8, ngos: 7, beneficiaries: 15000, level: "mid", coords: { x: 220, y: 50, w: 60, h: 40 } },

  // Aurangabad (Chhatrapati Sambhajinagar) Division
  { name: "Aurangabad", funding: 21000000, projects: 13, ngos: 11, beneficiaries: 22000, level: "high", coords: { x: 220, y: 100, w: 60, h: 40 } },
  { name: "Jalna", funding: 6500000, projects: 4, ngos: 3, beneficiaries: 7000, level: "low", coords: { x: 290, y: 100, w: 60, h: 40 } },
  { name: "Parbhani", funding: 5800000, projects: 4, ngos: 3, beneficiaries: 6500, level: "low", coords: { x: 290, y: 150, w: 60, h: 40 } },
  { name: "Hingoli", funding: 4200000, projects: 3, ngos: 2, beneficiaries: 5000, level: "low", coords: { x: 360, y: 100, w: 60, h: 40 } },
  { name: "Beed", funding: 10500000, projects: 7, ngos: 6, beneficiaries: 13500, level: "mid", coords: { x: 220, y: 150, w: 60, h: 40 } },
  { name: "Nanded", funding: 12500000, projects: 8, ngos: 7, beneficiaries: 16000, level: "mid", coords: { x: 360, y: 150, w: 60, h: 40 } },
  { name: "Osmanabad", funding: 8200000, projects: 5, ngos: 4, beneficiaries: 9500, level: "low", coords: { x: 220, y: 200, w: 60, h: 40 } },
  { name: "Latur", funding: 9800000, projects: 6, ngos: 5, beneficiaries: 11000, level: "low", coords: { x: 290, y: 200, w: 60, h: 40 } },

  // Amravati Division
  { name: "Amravati", funding: 17500000, projects: 11, ngos: 8, beneficiaries: 20000, level: "mid", coords: { x: 290, y: 50, w: 60, h: 40 } },
  { name: "Buldhana", funding: 8500000, projects: 6, ngos: 5, beneficiaries: 10500, level: "low", coords: { x: 290, y: 0, w: 60, h: 40 } },
  { name: "Akola", funding: 11500000, projects: 7, ngos: 6, beneficiaries: 14000, level: "mid", coords: { x: 360, y: 0, w: 60, h: 40 } },
  { name: "Washim", funding: 5000000, projects: 3, ngos: 2, beneficiaries: 6000, level: "low", coords: { x: 360, y: 50, w: 60, h: 40 } },
  { name: "Yavatmal", funding: 13500000, projects: 9, ngos: 7, beneficiaries: 18000, level: "mid", coords: { x: 430, y: 50, w: 60, h: 40 } },

  // Nagpur Division
  { name: "Nagpur", funding: 35000000, projects: 20, ngos: 16, beneficiaries: 29000, level: "high", coords: { x: 430, y: 0, w: 60, h: 40 } },
  { name: "Wardha", funding: 9200000, projects: 6, ngos: 5, beneficiaries: 11000, level: "low", coords: { x: 500, y: 0, w: 60, h: 40 } },
  { name: "Bhandara", funding: 7800000, projects: 5, ngos: 4, beneficiaries: 9500, level: "low", coords: { x: 500, y: 50, w: 60, h: 40 } },
  { name: "Gondia", funding: 6200000, projects: 4, ngos: 3, beneficiaries: 8000, level: "low", coords: { x: 570, y: 50, w: 60, h: 40 } },
  { name: "Chandrapur", funding: 19500000, projects: 12, ngos: 9, beneficiaries: 23000, level: "mid", coords: { x: 500, y: 100, w: 60, h: 40 } },
  { name: "Gadchiroli", funding: 25000000, projects: 14, ngos: 8, beneficiaries: 32000, level: "high", coords: { x: 570, y: 100, w: 60, h: 40 } }
];

export default function GisMap() {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(maharashtraDistrictsList.find(d => d.name === "Pune") || null);

  const getHeatColor = (level: "low" | "mid" | "high", isSelected: boolean) => {
    if (isSelected) return "fill-violet-600/60 stroke-violet-400 stroke-[2.5]";
    if (level === "high") return "fill-[#8b5cf6] hover:fill-[#7c3aed] stroke-slate-950";
    if (level === "mid") return "fill-[#3b82f6] hover:fill-[#2563eb] stroke-slate-950";
    return "fill-slate-900 hover:fill-slate-850 stroke-slate-950";
  };

  return (
    <div className="w-full flex flex-col xl:flex-row gap-8 items-stretch h-full min-h-[580px] bg-slate-950/40 text-slate-100">
      
      {/* Map Canvas Frame */}
      <div className="flex-grow bg-slate-900 border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between relative min-h-[480px] shadow-glass">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
          <div className="flex flex-col gap-1">
            <h3 className="font-heading font-bold text-lg text-slate-200 flex items-center gap-2">
              Territorial CSR Distribution Heatmap
            </h3>
            <p className="text-xs text-slate-500">Schematic spatial grid detailing budget density across 36 districts</p>
          </div>
          
          {/* Legend */}
          <div className="flex gap-4 text-[10px] text-slate-400 font-bold bg-slate-950/70 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" /> High (15Cr+)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Mid (10Cr+)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-800" /> Low (Under 10Cr)</span>
          </div>
        </div>

        {/* Dynamic Schematic Map Grid */}
        <div className="flex-grow flex items-center justify-center p-2 relative bg-slate-950/50 rounded-2xl border border-slate-800/50 mt-4">
          <svg viewBox="0 0 660 420" className="w-full h-full max-h-[380px]">
            {maharashtraDistrictsList.map((district) => {
              const isSelected = selectedDistrict?.name === district.name;
              return (
                <g 
                  key={district.name}
                  className="cursor-pointer group"
                  onClick={() => setSelectedDistrict(district)}
                >
                  {/* Schematic Box Representation */}
                  <rect
                    x={district.coords.x}
                    y={district.coords.y}
                    width={district.coords.w}
                    height={district.coords.h}
                    rx="8"
                    className={cn(
                      "transition-all duration-300 stroke-[1.5]",
                      getHeatColor(district.level, isSelected)
                    )}
                  />
                  
                  {/* District Text label */}
                  <text
                    x={district.coords.x + district.coords.w / 2}
                    y={district.coords.y + district.coords.h / 2 + 4}
                    textAnchor="middle"
                    className={cn(
                      "text-[9px] font-bold select-none transition-colors duration-300 pointer-events-none",
                      isSelected ? "fill-white font-extrabold" : 
                      district.level === "high" ? "fill-slate-100" : 
                      district.level === "mid" ? "fill-slate-100" : "fill-slate-400 group-hover:fill-slate-200"
                    )}
                  >
                    {district.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Slide-out Details Drawer (1/3 width when widescreen) */}
      <AnimatePresence mode="wait">
        {selectedDistrict && (
          <motion.div
            key={selectedDistrict.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="w-full xl:w-96 bg-slate-900 border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden shrink-0 shadow-glass"
          >
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Territory Details</span>
                  <h4 className="font-heading font-extrabold text-2xl text-slate-100 tracking-tight leading-none">
                    {selectedDistrict.name}
                  </h4>
                </div>
                <button 
                  onClick={() => setSelectedDistrict(null)}
                  className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="w-full h-px bg-slate-800" />

              <div className="flex flex-col gap-4">
                
                {/* Stats 1: Funding */}
                <div className="flex items-center gap-3">
                  <div className="bg-violet-650/10 w-9 h-9 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20">
                    <Coins size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-semibold">Allocated CSR Funds</span>
                    <span className="font-heading font-bold text-base text-slate-200">
                      ₹{(selectedDistrict.funding / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                </div>

                {/* Stats 2: Projects */}
                <div className="flex items-center gap-3">
                  <div className="bg-violet-650/10 w-9 h-9 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20">
                    <FolderCheck size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-semibold">Active Approved Projects</span>
                    <span className="font-heading font-bold text-base text-slate-200">
                      {selectedDistrict.projects} Projects
                    </span>
                  </div>
                </div>

                {/* Stats 3: NGOs */}
                <div className="flex items-center gap-3">
                  <div className="bg-violet-650/10 w-9 h-9 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/20">
                    <HeartHandshake size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-semibold">Active Impact NGOs</span>
                    <span className="font-heading font-bold text-base text-slate-200">
                      {selectedDistrict.ngos} NGOs
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Beneficiaries highlight badge */}
            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl flex flex-col gap-1.5 mt-6 relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 z-10">
                <span className="flex items-center gap-1"><Users size={12} /> Beneficiaries Served</span>
                <span className="text-emerald-400 flex items-center gap-0.5"><TrendingUp size={10} /> +8% YoY</span>
              </div>
              <span className="font-heading font-extrabold text-3xl text-violet-400 z-10">
                {selectedDistrict.beneficiaries.toLocaleString()}
              </span>
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
