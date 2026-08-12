"use client";

import { useState } from "react";
import { HelpCircle, CheckCircle2, Clock, Search, MessageSquare, ShieldCheck } from "lucide-react";
import { GovPageHeader } from "@/components/layout/GovPageHeader";

interface Ticket {
  id: string;
  ticketNo: string;
  subject: string;
  raisedBy: string;
  role: string;
  category: "TECHNICAL" | "ONBOARDING" | "FUND_DISBURSEMENT" | "OTHER";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  date: string;
}

const mockTickets: Ticket[] = [
  {
    id: "t-1",
    ticketNo: "TKT-2026-102",
    subject: "Unable to upload Utilization Certificate PDF on milestone 3",
    raisedBy: "Arogya Seva Trust",
    role: "NGO Admin",
    category: "TECHNICAL",
    status: "OPEN",
    date: "2026-07-24",
  },
  {
    id: "t-2",
    ticketNo: "TKT-2026-098",
    subject: "GSTIN verification retry error during organization registration",
    raisedBy: "Tech Mahindra CSR Desk",
    role: "Company Admin",
    category: "ONBOARDING",
    status: "IN_PROGRESS",
    date: "2026-07-23",
  },
];

export default function HelpdeskPage() {
  const [items, setItems] = useState<Ticket[]>(mockTickets);
  const [search, setSearch] = useState("");

  const handleResolve = (id: string) => {
    setItems(prev => prev.map(t => t.id === id ? { ...t, status: "RESOLVED" } : t));
  };

  const filtered = items.filter(t =>
    t.ticketNo.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.raisedBy.toLowerCase().includes(search.toLowerCase())
  );

return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 md:px-8">
      <GovPageHeader
        title="State CSR Cell Helpdesk & Support Queue"
        description="Manage portal technical queries, onboarding assistance, and support tickets submitted by companies, NGOs, and departments."
        eyebrow="Helpdesk Operations Desk"
      />

      {/* --- COMPACT KPI CARDS --- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        
        <div className="flex items-center justify-between rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 backdrop-blur-xl sm:p-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 sm:text-xs">Open Tickets</span>
            <span className="mt-0.5 block text-[9px] font-medium text-amber-700 sm:text-[11px]">Awaiting support response</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-950">
            {items.filter(i => i.status === "OPEN").length}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 backdrop-blur-xl sm:p-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 sm:text-xs">In Progress</span>
            <span className="mt-0.5 block text-[9px] font-medium text-blue-700 sm:text-[11px]">Under tech cell review</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-950">
            {items.filter(i => i.status === "IN_PROGRESS").length}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 backdrop-blur-xl sm:p-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 sm:text-xs">Resolved Queries</span>
            <span className="mt-0.5 block text-[9px] font-medium text-emerald-700 sm:text-[11px]">Closed support cases</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-950">
            {items.filter(i => i.status === "RESOLVED").length}
          </p>
        </div>

      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        {/* Search Input */}
        <div className="mb-4 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by ticket no, subject, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* --- MOBILE VIEW: CARDS (Hidden on md and up) --- */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              {/* Header: Ticket No & Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">{item.ticketNo}</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === "RESOLVED"
                    ? "bg-emerald-100 text-emerald-800"
                    : item.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                  {item.status}
                </span>
              </div>

              {/* Body: Subject & Category */}
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.subject}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{item.category}</p>
              </div>

              {/* Footer: User & Action */}
              <div className="mt-1 flex items-end justify-between border-t border-slate-200 pt-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{item.raisedBy}</p>
                  <p className="text-[10px] text-slate-400">{item.role}</p>
                </div>
                <div>
                  {item.status !== "RESOLVED" ? (
                    <button
                      onClick={() => handleResolve(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-blue-800 active:scale-95"
                    >
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700">Closed</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- DESKTOP VIEW: TABLE (Hidden on mobile, visible on md and up) --- */}
        <div className="hidden overflow-x-auto md:block md:-mx-0">
          <div className="inline-block min-w-full align-middle sm:px-0">
            <table className="min-w-[800px] w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">Ticket No</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="whitespace-nowrap px-4 py-3">Raised By</th>
                  <th className="whitespace-nowrap px-4 py-3">Category</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3.5 font-bold text-blue-900">{item.ticketNo}</td>
                    <td className="min-w-[200px] max-w-xs px-4 py-3.5 font-semibold text-slate-900">{item.subject}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{item.raisedBy}</p>
                      <p className="text-[10px] text-slate-400">{item.role}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-600">{item.category}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${item.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      {item.status !== "RESOLVED" ? (
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-800 active:scale-95"
                        >
                          <CheckCircle2 size={12} /> Resolve Ticket
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700">Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
