"use client";

import { Building2, Landmark, CheckCircle2 } from "lucide-react";

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#14274e]"
      style={{
        backgroundImage: "url('/setu_hero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "520px",
        display: "flex",
        alignItems: "center"
      }}
    >
      {/* Light navy overlay — keeps image visible while text stays legible */}
      <div className="absolute inset-0 bg-[#0e2144]/40" />

      <div className="relative mx-auto max-w-[1380px] w-full px-4 py-16 sm:px-6 md:px-8 flex flex-col items-center text-center">

        {/* Saffron accent bar */}
        <div className="w-24 h-1 bg-[#f7941d] mb-8" />

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight max-w-3xl">
          One Platform. Many Partners. Greater Impact.
        </h1>

        <p className="mt-4 text-sm sm:text-base md:text-lg text-white/95 font-medium max-w-2xl leading-relaxed">
          MahaCSR Setu is the official convergence platform connecting Government, Corporates and Implementing Agencies to drive sustainable and inclusive development across Maharashtra.
        </p>

        {/* Stats Row */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 md:gap-12 w-full max-w-4xl">
          {/* Corporates KPI */}
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#0e2144]/60 text-white border border-white/30 shrink-0">
              <Building2 size={20} />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white leading-none">2,145+</div>
              <div className="text-[11px] font-semibold text-white/90 uppercase tracking-wider mt-1">Registered Corporates</div>
            </div>
          </div>

          {/* Agencies KPI */}
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#0e2144]/60 text-white border border-white/30 shrink-0">
              <Landmark size={20} />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white leading-none">1,734+</div>
              <div className="text-[11px] font-semibold text-white/90 uppercase tracking-wider mt-1">Implementing Agencies</div>
            </div>
          </div>

          {/* Projects KPI */}
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#f7941d] text-white border border-[#f7941d] shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-white leading-none">4,812+</div>
              <div className="text-[11px] font-semibold text-white/90 uppercase tracking-wider mt-1">Projects Onboarded</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
