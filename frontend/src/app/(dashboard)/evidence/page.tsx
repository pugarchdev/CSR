"use client";

import React, { useState } from "react";
import { Camera, MapPin, Search, CheckCircle2, ShieldCheck, Filter, UploadCloud, Eye } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface EvidenceItem {
  id: string;
  milestoneId: string;
  milestoneName: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  district: string;
  fileUrl: string;
  title: string;
  description: string | null;
  isGeoTagged: boolean;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: string;
  createdAt: string;
}

export default function EvidenceRepositoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: response, isLoading } = useApiQuery<{ success: boolean; data: EvidenceItem[] }>(
    ["evidence"],
    "/evidence"
  );

  const evidences = response?.data || [
    {
      id: "ev-1",
      milestoneId: "m-1",
      milestoneName: "Solar Inverter Installation & Wiring",
      projectId: "p-1",
      projectCode: "PRJ-2026-001",
      projectTitle: "Melghat School Solar Electrification",
      district: "Amravati",
      fileUrl: "/evidence/solar-install.jpg",
      title: "Completed Inverter Assembly & Safety Grounding",
      description: "Physical inspection of 5kW hybrid solar inverter installed at Ashram Shala.",
      isGeoTagged: true,
      latitude: 21.2682,
      longitude: 77.3486,
      verificationStatus: "VERIFIED",
      createdAt: new Date().toISOString()
    },
    {
      id: "ev-2",
      milestoneId: "m-2",
      milestoneName: "Check Dam Foundation Pouring",
      projectId: "p-2",
      projectCode: "PRJ-2026-004",
      projectTitle: "Beed Watershed & Check Dam Project",
      district: "Beed",
      fileUrl: "/evidence/check-dam.jpg",
      title: "Reinforced Concrete Core Wall Pouring",
      description: "Excavation and base foundation verified by DNC field consultant.",
      isGeoTagged: true,
      latitude: 18.9891,
      longitude: 75.7601,
      verificationStatus: "PENDING_VERIFICATION",
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    }
  ];

  const filtered = evidences.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.district.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Field Monitoring
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              GPS Verified Evidence
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Geotagged Evidence & Ground Photo Repository
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Verified execution photos, GPS coordinates, and milestone completion documentation
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <Search size={15} className="text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Search by photo title, project, or district..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((e) => (
          <div
            key={e.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {e.projectCode}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${e.verificationStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                  <CheckCircle2 size={11} /> {e.verificationStatus.replace(/_/g, " ")}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-extrabold text-slate-900">{e.title}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{e.milestoneName}</p>
            </div>

            {e.description && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium leading-relaxed">
                {e.description}
              </p>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-600">
                <span className="flex items-center gap-1 font-bold text-emerald-800">
                  <MapPin size={12} /> {e.district}
                </span>
                {e.latitude && e.longitude && (
                  <span className="text-slate-500">
                    {e.latitude.toFixed(4)}° N, {e.longitude.toFixed(4)}° E
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
