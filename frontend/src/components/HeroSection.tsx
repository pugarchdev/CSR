"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

const ImpactSphere = dynamic(() => import("@/components/ImpactSphere"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Loading interactive sphere...</span>
      </div>
    </div>
  )
});

export default function HeroSection() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[60vh] relative z-10 pt-4">
      <motion.div 
        className="flex flex-col gap-6"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs tracking-wider uppercase border border-indigo-700/20 w-fit px-4 py-1.5 rounded-full bg-indigo-50/50 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-ping" />
          Maharashtra CSR Authority (MahaCSR)
        </div>
        
        <h1 className="font-heading font-extrabold text-5xl md:text-6xl tracking-tight leading-none text-slate-50">
          State-Wide Portal <br />
          for Corporate <br />
          <span className="bg-gradient-to-r from-[#FF9933] via-indigo-750 to-[#138808] text-transparent bg-clip-text">
            Social Responsibility
          </span>
        </h1>
        
        <p className="text-slate-300 text-base leading-relaxed max-w-lg font-sans">
          Empowering development through institutional synergy. Connect corporate capital with verified grassroot NGOs across 36 districts of Maharashtra on a fully audited, milestone-backed platform.
        </p>

        <div className="flex flex-wrap gap-4 mt-2">
          <Link 
            href="/marketplace" 
            className="bg-indigo-700 hover:bg-indigo-650 text-white px-6 py-3.5 rounded-xl font-heading font-bold flex items-center gap-2 group transition-all shadow-md hover:translate-y-[-1px]"
          >
            Explore Project Directory 
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/register" 
            className="bg-slate-900 hover:bg-slate-955 text-slate-100 border border-slate-800 px-6 py-3.5 rounded-xl font-heading font-bold transition-all shadow-sm hover:translate-y-[-1px]"
          >
            Register Organization
          </Link>
        </div>
      </motion.div>

      {/* Interactive ThreeJS Sphere representing network of matching projects */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="w-full flex justify-center lg:justify-end"
      >
        <div className="w-full max-w-[480px]">
          <ImpactSphere />
        </div>
      </motion.div>
    </section>
  );
}
