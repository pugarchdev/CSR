"use client";

import React, { useState } from "react";
import { MapPin, Layers, Building2, CheckCircle2 } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface MasterDataResponse {
  success: boolean;
  data: {
    districts: string[];
    sectors: string[];
    organizationTypes: Array<{ code: string; label: string; level: string }>;
    state: string;
  };
}

export default function PlatformMasterDataPage() {
  const [activeTab, setActiveTab] = useState<"DISTRICTS" | "SECTORS" | "ORG_TYPES">("DISTRICTS");

  const { data: response } = useApiQuery<MasterDataResponse>(
    ["platform", "master-data"],
    "/platform-admin/master-data"
  );

  const data = response?.data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Super Admin Management
            </span>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
              Platform Master Data
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            System Dictionaries & Master Data Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            36 Maharashtra districts, standard CSR sector taxonomy, and government organization classification models
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("DISTRICTS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === "DISTRICTS" ? "bg-blue-900 text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <MapPin size={14} />
          <span>Districts of Maharashtra ({data?.districts?.length || 36})</span>
        </button>
        <button
          onClick={() => setActiveTab("SECTORS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === "SECTORS" ? "bg-blue-900 text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <Layers size={14} />
          <span>CSR Sectors & Schedule VII ({data?.sectors?.length || 8})</span>
        </button>
        <button
          onClick={() => setActiveTab("ORG_TYPES")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === "ORG_TYPES" ? "bg-blue-900 text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <Building2 size={14} />
          <span>Government Org Types ({data?.organizationTypes?.length || 5})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "DISTRICTS" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(data?.districts || []).map((dist, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-[10px] font-bold text-blue-900">
                {idx + 1}
              </span>
              <span className="text-xs font-bold text-slate-800">{dist}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "SECTORS" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.sectors || []).map((sec, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Sector #{idx + 1}</span>
                <h3 className="text-xs font-extrabold text-slate-900 mt-1">{sec}</h3>
              </div>
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
          ))}
        </div>
      )}

      {activeTab === "ORG_TYPES" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.organizationTypes || []).map((orgType, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {orgType.code}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  Level: {orgType.level}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">{orgType.label}</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {orgType.level === "MAIN" ? "Max 3 active instances permitted per district" : "Direct child or state cell unit"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
