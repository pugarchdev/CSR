"use client";

import React, { useState } from "react";
import { MessageSquare, Phone, Mail, Calendar, Plus, Clock, Search, CheckCircle2 } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";

interface Interaction {
  id: string;
  caseId: string;
  trackingId: string;
  actorName: string;
  interactionType: "CALL" | "EMAIL" | "MEETING" | "PORTAL_NOTE";
  summary: string;
  budgetDiscussion?: string;
  notes?: string;
  occurredAt: string;
}

export default function InteractionsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<"CALL" | "EMAIL" | "MEETING" | "PORTAL_NOTE">("CALL");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");

  const interactions: Interaction[] = [
    {
      id: "int-1",
      caseId: "c-1",
      trackingId: "ENQ-2026-001",
      actorName: "Relationship Manager (State CSR Cell)",
      interactionType: "CALL",
      summary: "Preliminary Feasibility Call with CSR Head",
      budgetDiscussion: "Proposed ₹2.5 Cr for Melghat solar micro-grids",
      notes: "Corporate partner confirmed willingness to fund 100% of equipment cost if Collectorate provides land NOC.",
      occurredAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: "int-2",
      caseId: "c-2",
      trackingId: "PTCH-2026-014",
      actorName: "Relationship Manager (State CSR Cell)",
      interactionType: "MEETING",
      summary: "ZP Health Officer Consultation on Digital Clinic",
      notes: "Reviewed telemedicine equipment specifications and medical officer staffing commitment.",
      occurredAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  ];

  const getTypeIcon = (type: Interaction["interactionType"]) => {
    switch (type) {
      case "CALL": return <Phone size={14} className="text-blue-700" />;
      case "EMAIL": return <Mail size={14} className="text-indigo-700" />;
      case "MEETING": return <Calendar size={14} className="text-purple-700" />;
      default: return <MessageSquare size={14} className="text-slate-700" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              RM Workflow
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              Stakeholder Communications
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Case Interaction Logs & Call Notes
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Chronological notes of stakeholder calls, meetings, budget discussions, and feasibility interactions
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800"
        >
          <Plus size={14} />
          <span>Log Interaction</span>
        </button>
      </div>

      {/* Interactions Stream */}
      <div className="space-y-3">
        {interactions.map((int) => (
          <div
            key={int.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-100 p-1.5">{getTypeIcon(int.interactionType)}</div>
                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {int.trackingId}
                </span>
                <span className="text-xs font-bold text-slate-900">{int.summary}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {new Date(int.occurredAt).toLocaleString()}
              </span>
            </div>

            {int.budgetDiscussion && (
              <div className="rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-200/60 text-xs font-medium text-emerald-900">
                <strong>Financial Note:</strong> {int.budgetDiscussion}
              </div>
            )}

            {int.notes && (
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {int.notes}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              <span>Logged by {int.actorName}</span>
              <span className="font-medium text-slate-500">Immutable Audit Record</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to log interaction */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-heading text-sm font-extrabold text-slate-950">Log Stakeholder Interaction</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Channel / Type</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {(["CALL", "EMAIL", "MEETING", "PORTAL_NOTE"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      className={`rounded-xl border p-2 text-center text-xs font-bold transition ${selectedType === t ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-600"}`}
                    >
                      {t.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Summary / Subject</label>
                <input
                  type="text"
                  placeholder="e.g., Feasibility discussion on budget NOC"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Detailed Notes & Discussion Outcomes</label>
                <textarea
                  rows={4}
                  placeholder="Record stakeholder commitments, timelines, and next steps..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSummary("");
                  setNotes("");
                }}
                className="rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
              >
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
