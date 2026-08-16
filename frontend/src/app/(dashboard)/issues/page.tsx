"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useApiQuery } from "@/lib/apiHooks";
import { useQueryClient } from "@tanstack/react-query";

interface IssueItem {
  id: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  district: string;
  sector: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED" | "CLOSED";
  responsibleParty: string;
  dueDate: string | null;
  resolvedAt: string | null;
  verificationRemarks: string | null;
  createdAt: string;
}

export default function ProjectIssuesPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [projectId, setProjectId] = useState("");

  const { data: response, refetch } = useApiQuery<{ success: boolean; data: IssueItem[] }>(
    ["issues"],
    "/issues"
  );

  const issues = response?.data || [
    {
      id: "iss-1",
      projectId: "p-1",
      projectCode: "PRJ-2026-001",
      projectTitle: "Melghat School Solar Electrification",
      district: "Amravati",
      sector: "Energy",
      title: "Delayed MSEDCL Power Feasibility Clearance for Ashram Shala",
      description: "Grid interconnection permission pending with local sub-division engineer for 3 weeks.",
      severity: "HIGH" as const,
      status: "OPEN" as const,
      responsibleParty: "MSEDCL / Energy Dept",
      dueDate: "22 Aug 2026",
      resolvedAt: null,
      verificationRemarks: null,
      createdAt: new Date().toISOString()
    }
  ];

  const handleRaiseIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || "PRJ-2026-001",
          title,
          description,
          severity
        })
      });
      setShowAddModal(false);
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      refetch();
    } catch {
      setShowAddModal(false);
    }
  };

  const getSeverityBadge = (sev: IssueItem["severity"]) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 border border-rose-200">Critical</span>;
      case "HIGH":
        return <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 border border-amber-200">High Severity</span>;
      default:
        return <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">Standard</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Project Governance
            </span>
            <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
              Bottlenecks & Escalations
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Project Issues, Field Bottlenecks & Grievances
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Track execution roadblocks, inter-department coordination delays, and administrative resolution workflows
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-800"
        >
          <Plus size={14} />
          <span>Raise Project Issue</span>
        </button>
      </div>

      {/* Issues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                  {issue.projectCode}
                </span>
                {getSeverityBadge(issue.severity)}
              </div>

              <h3 className="mt-2 text-sm font-extrabold text-slate-900">{issue.title}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{issue.projectTitle} · {issue.district}</p>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed">
              {issue.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">
                Party: <strong className="text-slate-800">{issue.responsibleParty}</strong>
              </span>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                Status: {issue.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal to Raise Issue */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-heading text-sm font-extrabold text-slate-950">Raise Project Roadblock / Issue</h3>

            <form onSubmit={handleRaiseIssue} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Project Code / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRJ-2026-001"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Forest clearance NOC pending at sub-division office"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
                >
                  <option value="CRITICAL">Critical (Blocks ground execution)</option>
                  <option value="HIGH">High (Major timeline risk)</option>
                  <option value="MEDIUM">Medium (Moderate delay)</option>
                  <option value="LOW">Low (Minor observation)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Detailed Description & Escalation Need</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the administrative roadblock, stakeholders involved, and needed intervention..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
                />
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
                  type="submit"
                  className="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
                >
                  Submit Roadblock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
