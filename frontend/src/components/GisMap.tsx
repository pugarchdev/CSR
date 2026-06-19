"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, FolderCheck, HeartHandshake, TrendingUp, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DistrictData {
  name: string;
  funding: number;
  projects: number;
  ngos: number;
  beneficiaries: number;
  level: "low" | "mid" | "high";
  coords: { x: number; y: number; w: number; h: number };
}

const districts: DistrictData[] = [
  { name: "Nandurbar", funding: 8, projects: 6, ngos: 3, beneficiaries: 12000, level: "low", coords: { x: 70, y: 55, w: 72, h: 38 } },
  { name: "Dhule", funding: 7.5, projects: 5, ngos: 4, beneficiaries: 9000, level: "low", coords: { x: 150, y: 55, w: 72, h: 38 } },
  { name: "Jalgaon", funding: 13, projects: 8, ngos: 7, beneficiaries: 15000, level: "mid", coords: { x: 230, y: 55, w: 72, h: 38 } },
  { name: "Buldhana", funding: 8.5, projects: 6, ngos: 5, beneficiaries: 10500, level: "low", coords: { x: 310, y: 15, w: 72, h: 38 } },
  { name: "Akola", funding: 11.5, projects: 7, ngos: 6, beneficiaries: 14000, level: "mid", coords: { x: 390, y: 15, w: 72, h: 38 } },
  { name: "Nagpur", funding: 35, projects: 20, ngos: 16, beneficiaries: 29000, level: "high", coords: { x: 470, y: 15, w: 72, h: 38 } },
  { name: "Wardha", funding: 9.2, projects: 6, ngos: 5, beneficiaries: 11000, level: "low", coords: { x: 550, y: 15, w: 72, h: 38 } },
  { name: "Palghar", funding: 12, projects: 8, ngos: 6, beneficiaries: 14000, level: "mid", coords: { x: 70, y: 105, w: 72, h: 38 } },
  { name: "Nashik", funding: 24, projects: 15, ngos: 12, beneficiaries: 25000, level: "high", coords: { x: 150, y: 105, w: 72, h: 38 } },
  { name: "Aurangabad", funding: 21, projects: 13, ngos: 11, beneficiaries: 22000, level: "high", coords: { x: 230, y: 105, w: 72, h: 38 } },
  { name: "Jalna", funding: 6.5, projects: 4, ngos: 3, beneficiaries: 7000, level: "low", coords: { x: 310, y: 105, w: 72, h: 38 } },
  { name: "Washim", funding: 5, projects: 3, ngos: 2, beneficiaries: 6000, level: "low", coords: { x: 390, y: 65, w: 72, h: 38 } },
  { name: "Yavatmal", funding: 13.5, projects: 9, ngos: 7, beneficiaries: 18000, level: "mid", coords: { x: 470, y: 65, w: 72, h: 38 } },
  { name: "Bhandara", funding: 7.8, projects: 5, ngos: 4, beneficiaries: 9500, level: "low", coords: { x: 550, y: 65, w: 72, h: 38 } },
  { name: "Gondia", funding: 6.2, projects: 4, ngos: 3, beneficiaries: 8000, level: "low", coords: { x: 630, y: 65, w: 72, h: 38 } },
  { name: "Mumbai Suburban", funding: 65, projects: 34, ngos: 28, beneficiaries: 55000, level: "high", coords: { x: 25, y: 155, w: 92, h: 38 } },
  { name: "Thane", funding: 38, projects: 18, ngos: 15, beneficiaries: 28000, level: "high", coords: { x: 125, y: 155, w: 72, h: 38 } },
  { name: "Ahmednagar", funding: 15, projects: 10, ngos: 9, beneficiaries: 17500, level: "mid", coords: { x: 205, y: 155, w: 88, h: 38 } },
  { name: "Beed", funding: 10.5, projects: 7, ngos: 6, beneficiaries: 13500, level: "mid", coords: { x: 300, y: 155, w: 72, h: 38 } },
  { name: "Parbhani", funding: 5.8, projects: 4, ngos: 3, beneficiaries: 6500, level: "low", coords: { x: 380, y: 155, w: 72, h: 38 } },
  { name: "Hingoli", funding: 4.2, projects: 3, ngos: 2, beneficiaries: 5000, level: "low", coords: { x: 460, y: 155, w: 72, h: 38 } },
  { name: "Nanded", funding: 12.5, projects: 8, ngos: 7, beneficiaries: 16000, level: "mid", coords: { x: 540, y: 155, w: 72, h: 38 } },
  { name: "Chandrapur", funding: 19.5, projects: 12, ngos: 9, beneficiaries: 23000, level: "mid", coords: { x: 620, y: 155, w: 82, h: 38 } },
  { name: "Mumbai City", funding: 45, projects: 22, ngos: 18, beneficiaries: 35000, level: "high", coords: { x: 25, y: 205, w: 92, h: 38 } },
  { name: "Raigad", funding: 16, projects: 11, ngos: 9, beneficiaries: 19000, level: "mid", coords: { x: 125, y: 205, w: 72, h: 38 } },
  { name: "Pune", funding: 55, projects: 29, ngos: 24, beneficiaries: 42000, level: "high", coords: { x: 205, y: 205, w: 72, h: 38 } },
  { name: "Osmanabad", funding: 8.2, projects: 5, ngos: 4, beneficiaries: 9500, level: "low", coords: { x: 285, y: 205, w: 88, h: 38 } },
  { name: "Latur", funding: 9.8, projects: 6, ngos: 5, beneficiaries: 11000, level: "low", coords: { x: 380, y: 205, w: 72, h: 38 } },
  { name: "Gadchiroli", funding: 25, projects: 14, ngos: 8, beneficiaries: 32000, level: "high", coords: { x: 620, y: 205, w: 82, h: 38 } },
  { name: "Ratnagiri", funding: 9.5, projects: 6, ngos: 5, beneficiaries: 11000, level: "low", coords: { x: 125, y: 255, w: 72, h: 38 } },
  { name: "Satara", funding: 11, projects: 8, ngos: 7, beneficiaries: 13000, level: "mid", coords: { x: 205, y: 255, w: 72, h: 38 } },
  { name: "Solapur", funding: 14, projects: 9, ngos: 8, beneficiaries: 16000, level: "mid", coords: { x: 285, y: 255, w: 72, h: 38 } },
  { name: "Sindhudurg", funding: 6, projects: 4, ngos: 3, beneficiaries: 7500, level: "low", coords: { x: 125, y: 305, w: 82, h: 38 } },
  { name: "Sangli", funding: 9, projects: 7, ngos: 5, beneficiaries: 11500, level: "low", coords: { x: 215, y: 305, w: 72, h: 38 } },
  { name: "Kolhapur", funding: 18, projects: 12, ngos: 10, beneficiaries: 21000, level: "mid", coords: { x: 135, y: 355, w: 82, h: 38 } },
];

export default function GisMap() {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData>(
    districts.find((district) => district.name === "Pune") || districts[0]
  );

  const getHeatColor = (level: DistrictData["level"], isSelected: boolean) => {
    if (isSelected) return "fill-[#0a3f92] stroke-[#ff8a1d] stroke-[3]";
    if (level === "high") return "fill-[#1557c4] hover:fill-[#0a3f92] stroke-white";
    if (level === "mid") return "fill-[#3f7ee8] hover:fill-[#2563eb] stroke-white";
    return "fill-[#b9d5fb] hover:fill-[#8db9f5] stroke-white";
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-[#d8e2ef] bg-white text-[#10244a]">
      <div className="grid gap-5 p-4 lg:grid-cols-[1fr_300px] lg:p-5">
        <div className="flex min-w-0 flex-col rounded-md border border-[#d8e2ef] bg-[#f8fbff] p-4">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-heading text-base font-extrabold text-[#102c60]">Territorial CSR Distribution Heatmap</h3>
              <p className="mt-1 text-xs font-medium text-[#5b6b80]">Click a district to view budget, projects, NGOs, and beneficiaries.</p>
            </div>
            <div className="flex flex-wrap gap-3 rounded-md border border-[#d8e2ef] bg-white px-3 py-2 text-[10px] font-extrabold text-[#516986]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#1557c4]" /> High</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#3f7ee8]" /> Medium</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#b9d5fb]" /> Low</span>
            </div>
          </div>

          <div className="relative mt-4 flex aspect-[1.62/1] min-h-[300px] items-center justify-center rounded-md border border-[#d8e2ef] bg-white p-2 sm:p-4">
            <svg viewBox="0 0 730 420" className="h-full w-full max-h-[430px]" role="img" aria-label="Maharashtra CSR heat map">
              {districts.map((district) => {
                const isSelected = selectedDistrict.name === district.name;

                return (
                  <g key={district.name} className="group cursor-pointer" onClick={() => setSelectedDistrict(district)}>
                    <rect
                      x={district.coords.x}
                      y={district.coords.y}
                      width={district.coords.w}
                      height={district.coords.h}
                      rx="7"
                      className={cn("transition-all duration-200 stroke-[1.5] drop-shadow-sm", getHeatColor(district.level, isSelected))}
                    />
                    <text
                      x={district.coords.x + district.coords.w / 2}
                      y={district.coords.y + district.coords.h / 2 + 4}
                      textAnchor="middle"
                      className={cn(
                        "pointer-events-none select-none text-[9px] font-bold transition-colors duration-200",
                        isSelected ? "fill-white" : district.level === "low" ? "fill-[#10305e]" : "fill-white"
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

        <AnimatePresence mode="wait">
          <motion.aside
            key={selectedDistrict.name}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            className="flex min-w-0 flex-col justify-between rounded-md border border-[#d8e2ef] bg-white p-5 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#456aa4]">Territory Details</span>
                  <h4 className="mt-1 font-heading text-2xl font-extrabold leading-none tracking-tight text-[#102c60]">
                    {selectedDistrict.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDistrict(districts[0])}
                  className="rounded-md p-1.5 text-[#5b6b80] transition-colors hover:bg-[#eef4fb] hover:text-[#102c60]"
                  aria-label="Reset selected district"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="my-5 h-px w-full bg-[#d8e2ef]" />

              <div className="space-y-4">
                <Metric icon={Coins} label="Allocated CSR Funds" value={`Rs ${selectedDistrict.funding.toFixed(2)} Cr`} tone="orange" />
                <Metric icon={FolderCheck} label="Active Approved Projects" value={`${selectedDistrict.projects} Projects`} tone="blue" />
                <Metric icon={HeartHandshake} label="Active Impact NGOs" value={`${selectedDistrict.ngos} NGOs`} tone="green" />
              </div>
            </div>

            <div className="group relative mt-6 flex flex-col gap-1.5 overflow-hidden rounded-md border border-[#d8e2ef] bg-[#f8fbff] p-5">
              <div className="z-10 flex items-center justify-between gap-3 text-xs font-semibold text-[#5b6b80]">
                <span className="flex items-center gap-1"><Users size={12} /> Beneficiaries Served</span>
                <span className="flex items-center gap-0.5 text-emerald-700"><TrendingUp size={10} /> +8% YoY</span>
              </div>
              <span className="z-10 font-heading text-3xl font-extrabold text-[#0a3f92]">
                {selectedDistrict.beneficiaries.toLocaleString()}
              </span>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-emerald-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          </motion.aside>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  tone: "orange" | "blue" | "green";
}) {
  const tones = {
    orange: "border-orange-200 bg-orange-50 text-orange-600",
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    green: "border-emerald-200 bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border", tones[tone])}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <span className="block text-[10px] font-semibold text-[#5b6b80]">{label}</span>
        <span className="block truncate font-heading text-base font-bold text-[#102c60]">{value}</span>
      </div>
    </div>
  );
}
