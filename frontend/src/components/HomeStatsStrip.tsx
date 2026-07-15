"use client";

import { useEffect, useState } from "react";
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
    <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border border-[#e0e4ea] bg-white p-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${c.accent ? "bg-[#fef3e0] text-[#b06000]" : "bg-[#e3f0fa] text-[#14274e]"}`}>
              <c.icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-extrabold text-[#14274e] truncate">{c.value}</div>
              <div className="text-xs font-semibold text-[#6b7280] leading-tight">{c.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
