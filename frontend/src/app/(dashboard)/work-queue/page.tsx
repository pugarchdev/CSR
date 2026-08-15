"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText, Compass, HeartHandshake, Clock, Search, Filter,
  ArrowRight, CheckCircle2, ShieldAlert, Sparkles, UserCheck
} from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface CaseItem {
  id: string;
  trackingId: string;
  type: string;
  currentStage: string;
  status: string;
  createdAt: string;
  firstContactedAt: string | null;
  lastInteractionAt: string | null;
}

export default function RmWorkQueuePage() {
  const [activeTab, setActiveTab] = useState<"ALL" | "CORPORATE_ENQUIRY" | "GOVERNMENT_PITCH" | "CORPORATE_PITCH_INTEREST">("ALL");
  const [search, setSearch] = useState("");

  const { data: response, isLoading } = useApiQuery<{ success: boolean; data: any }>(
    ["rm", "cases"],
    "/dashboard/summary"
  );

  const cases: CaseItem[] = response?.data?.workQueue || [
    { id: "case-1", trackingId: "ENQ-2026-001", type: "CORPORATE_ENQUIRY", currentStage: "RM_FEASIBILITY", status: "FEASIBILITY_IN_PROGRESS", createdAt: new Date().toISOString(), firstContactedAt: new Date().toISOString(), lastInteractionAt: new Date().toISOString() },
    { id: "case-2", trackingId: "PTCH-2026-014", type: "GOVERNMENT_PITCH", currentStage: "RM_REVIEW", status: "RM_ASSIGNED", createdAt: new Date().toISOString(), firstContactedAt: null, lastInteractionAt: null },
    { id: "case-3", trackingId: "INT-2026-088", type: "CORPORATE_PITCH_INTEREST", currentStage: "JS_REVIEW", status: "SUBMITTED_TO_JS", createdAt: new Date().toISOString(), firstContactedAt: new Date().toISOString(), lastInteractionAt: new Date().toISOString() }
  ];

  const filteredCases = cases.filter((c) => {
    const matchesTab = activeTab === "ALL" || c.type === activeTab;
    const matchesSearch = c.trackingId.toLowerCase().includes(search.toLowerCase()) || (c.type || "").toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Relationship Manager Desk
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Assigned Case Portfolio
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Unified RM Work Queue & Intake Desk
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Assigned corporate enquiries, government pitches, and express interest cases in workflow
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === "ALL" ? "bg-blue-900 text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <span>All Cases ({cases.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("CORPORATE_ENQUIRY")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === "CORPORATE_ENQUIRY" ? "bg-blue-900 text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <FileText size={14} />
          <span>Corporate Enquiries</span>
        </button>
        <button
          onClick={() => setActiveTab("GOVERNMENT_PITCH")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === "GOVERNMENT_PITCH" ? "bg-blue-900 text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <Compass size={14} />
          <span>Government Pitches</span>
        </button>
        <button
          onClick={() => setActiveTab("CORPORATE_PITCH_INTEREST")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${activeTab === "CORPORATE_PITCH_INTEREST" ? "bg-blue-900 text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          <HeartHandshake size={14} />
          <span>Pitch Interests</span>
        </button>
      </div>

      {/* Cases List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredCases.map((c) => (
            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition hover:bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                    {c.trackingId}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    {c.type.replace(/_/g, " ")}
                  </span>
                  {!c.firstContactedAt && (
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                      Uncontacted
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-extrabold text-slate-900">Stage: {c.currentStage.replace(/_/g, " ")}</h4>
                <p className="text-[11px] text-slate-500 font-medium">Status: {c.status.replace(/_/g, " ")}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/assessments?caseId=${c.id}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800 hover:no-underline"
                >
                  <span>Evaluate 13-Point Matrix</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
