"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, Landmark, MapPin, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PortalStats {
  totalProjects: number;
  completedProjects: number;
  activePitches: number;
  totalCsrCommitted: number | string;
  districtsCovered: number;
}

const fmtNum = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-IN"));

const fmtCrore = (v: number | string | undefined) => {
  if (v === undefined) return "—";
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (!isFinite(num)) return "—";
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
  return num.toLocaleString("en-IN");
};

const cardContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const cardItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function HomeStatsStrip() {
  const [stats, setStats] = useState<PortalStats | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await apiFetch<any>("/public/portal-stats");
        const data = response.data ?? response;
        if (active) setStats(data);
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => { active = false; };
  }, []);

  const cards = [
    { icon: Building2, value: fmtNum(stats?.totalProjects), label: "Projects Onboarded", accent: false },
    { icon: CheckCircle2, value: fmtNum(stats?.completedProjects), label: "Completed Projects", accent: true },
    { icon: Landmark, value: fmtNum(stats?.activePitches), label: "Active Development Needs", accent: false },
    { icon: Wallet, value: fmtCrore(stats?.totalCsrCommitted), label: "CSR Committed (Rs.)", accent: false },
    { icon: MapPin, value: fmtNum(stats?.districtsCovered), label: "Districts Covered", accent: false },
  ];

  return (
    <motion.div 
      variants={cardContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    >
      {cards.map((c) => (
        <motion.div 
          variants={cardItem}
          whileHover={{ y: -4, boxShadow: "0 8px 20px rgba(0,0,0,0.04)", borderColor: "#cbd5e1" }}
          key={c.label} 
          className="rounded-xl border border-slate-150 bg-white p-5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.accent ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-900"}`}>
              <c.icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-800 truncate leading-none mb-1.5">{c.value}</div>
              <div className="text-[11px] font-semibold text-slate-400 leading-tight">{c.label}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
