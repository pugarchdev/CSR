"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock, AlertTriangle, ArrowRight, CheckCircle2,
  FileText
} from "lucide-react";

export interface WorkQueueItem {
  id: string;
  refNumber: string;
  entityType: string;
  title: string;
  organizationName?: string;
  currentStage: string;
  assignedDate: string;
  dueDate?: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "NORMAL";
  primaryActionLabel: string;
  primaryActionHref: string;
  statusBadge: string;
}

interface WorkQueueSectionProps {
  items: WorkQueueItem[];
}

export const WorkQueueSection: React.FC<WorkQueueSectionProps> = ({ items }) => {
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "HIGH">("ALL");

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="mt-3 text-sm font-extrabold text-slate-800">Your Work Queue is Clear</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          No urgent operational cases or approval actions currently require your direct decision.
        </p>
      </div>
    );
  }

  const filteredItems = items.filter(item => {
    if (filter === "ALL") return true;
    if (filter === "CRITICAL") return item.priority === "CRITICAL";
    if (filter === "HIGH") return item.priority === "HIGH" || item.priority === "CRITICAL";
    return true;
  });

  const getPriorityBadge = (priority: WorkQueueItem["priority"]) => {
    switch (priority) {
      case "CRITICAL":
        return <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200"><AlertTriangle size={11} /> Urgent SLA</span>;
      case "HIGH":
        return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200"><Clock size={11} /> High Priority</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Standard</span>;
    }
  };

  return (
    <section aria-labelledby="work-queue-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100/70 text-blue-800">
            <FileText size={16} />
          </div>
          <div>
            <h2 id="work-queue-heading" className="font-heading text-sm font-extrabold text-slate-900">
              Actionable Work Queue ({items.length})
            </h2>
            <p className="text-[11px] text-slate-500">Prioritized cases and tasks requiring your direct decision</p>
          </div>
        </div>

        {/* Priority Filter Tabs */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 p-1">
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${filter === "ALL" ? "bg-white text-blue-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter("HIGH")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${filter === "HIGH" ? "bg-white text-amber-800 shadow-xs" : "text-slate-600 hover:text-amber-800"}`}
          >
            High ({items.filter(i => i.priority === "HIGH" || i.priority === "CRITICAL").length})
          </button>
          <button
            onClick={() => setFilter("CRITICAL")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${filter === "CRITICAL" ? "bg-white text-rose-800 shadow-xs" : "text-slate-600 hover:text-rose-800"}`}
          >
            Urgent ({items.filter(i => i.priority === "CRITICAL").length})
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition hover:bg-slate-50/80"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.refNumber}
                  </span>
                  {getPriorityBadge(item.priority)}
                  <span className="text-[11px] font-medium text-slate-400">· {item.entityType}</span>
                </div>
                <h3 className="truncate text-xs font-extrabold text-slate-900">{item.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span>Stage: <strong className="text-slate-700 font-semibold">{item.currentStage}</strong></span>
                  {item.dueDate && (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <Clock size={12} /> Due: {new Date(item.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={item.primaryActionHref}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-800 hover:no-underline"
                >
                  <span>{item.primaryActionLabel}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
