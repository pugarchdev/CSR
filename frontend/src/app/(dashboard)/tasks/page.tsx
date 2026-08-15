"use client";

import React, { useState } from "react";
import { CheckSquare, Clock, CheckCircle2, AlertTriangle, Search, Filter } from "lucide-react";

interface TaskItem {
  id: string;
  projectCode: string;
  projectTitle: string;
  taskTitle: string;
  district: string;
  assignedBy: string;
  dueDate: string;
  priority: "HIGH" | "NORMAL" | "CRITICAL";
  status: "PENDING" | "COMPLETED";
}

export default function FieldTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: "tsk-1",
      projectCode: "PRJ-2026-001",
      projectTitle: "Melghat School Solar Electrification",
      taskTitle: "Verify battery bank storage capacity & inverter backup testing",
      district: "Amravati",
      assignedBy: "District Nodal Officer (Amravati Collectorate)",
      dueDate: "Tomorrow, 5:00 PM",
      priority: "CRITICAL",
      status: "PENDING"
    },
    {
      id: "tsk-2",
      projectCode: "PRJ-2026-004",
      projectTitle: "Beed Watershed & Check Dam Project",
      taskTitle: "Capture 4-angle geotagged photos of completed spillway masonry",
      district: "Beed",
      assignedBy: "District Nodal Officer (Beed ZP)",
      dueDate: "20 Aug 2026",
      priority: "HIGH",
      status: "PENDING"
    }
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === "PENDING" ? "COMPLETED" : "PENDING" } : t));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
              Field Execution
            </span>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
              DNC Field Tasks
            </span>
          </div>
          <h1 className="mt-1 font-heading text-xl font-extrabold text-slate-950">
            Assigned Field Tasks & Milestone Inspection Checklist
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Task checklist delegated by District Nodal Officers for ground inspections and photo verifications
          </p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Pending Tasks ({tasks.filter(t => t.status === "PENDING").length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start justify-between gap-3 p-4 transition hover:bg-slate-50/80">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.status === "COMPLETED"}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-600 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                      {task.projectCode}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">{task.district}</span>
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                      {task.priority}
                    </span>
                  </div>
                  <h4 className={`text-xs font-extrabold ${task.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-900"}`}>
                    {task.taskTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Delegated by {task.assignedBy} · Due: {task.dueDate}
                  </p>
                </div>
              </div>

              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${task.status === "COMPLETED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                {task.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
