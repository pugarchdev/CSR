"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";

export default function CitizenCounter() {
  const [citizenCounter, setCitizenCounter] = useState(245380);

  useEffect(() => {
    const interval = setInterval(() => {
      setCitizenCounter(prev => prev + Math.floor(Math.random() * 4) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 z-10 relative shadow-sm">
      <div className="flex flex-col gap-1 text-center md:text-left">
        <h3 className="font-heading font-extrabold text-2xl text-slate-50 flex items-center gap-2 justify-center md:justify-start">
          <Users className="text-[#f7941d]" size={24} />
          Citizen Impact Tracker
        </h3>
        <p className="text-slate-300 text-xs">Real-time count of rural and underserved citizens receiving benefits via verified CSR tranches.</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-slate-955 border border-slate-800 rounded-2xl px-6 py-4 flex gap-1 shadow-inner relative overflow-hidden">
          {citizenCounter.toLocaleString("en-IN").split("").map((char, i) => (
            <span key={i} className={`font-heading font-extrabold text-3xl md:text-4xl px-1.5 ${char === "," ? "text-slate-400" : "text-[#14274e] bg-slate-900 border border-slate-800 rounded shadow-sm"}`}>
              {char}
            </span>
          ))}
        </div>
        <span className="text-[9px] text-[#138808] font-bold mt-2 uppercase tracking-widest flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#138808]" /> Live Beneficiaries Served
        </span>
      </div>
    </section>
  );
}
