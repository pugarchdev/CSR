"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HelpCircle, CheckCircle2, Clock, Search, MessageSquare, Loader2, AlertCircle, Send } from "lucide-react";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import GovModal from "@/components/gov/GovModal";
import { Button } from "@/components/ui/Button";

interface HelpdeskTicket {
  id: string;
  trackingId: string;
  subject: string;
  message: string;
  name: string;
  email: string;
  mobile?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  resolution?: string | null;
  resolutionDueAt: string;
  resolvedAt?: string | null;
  createdAt: string;
  isOverdue?: boolean;
}

export default function HelpdeskPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolvingTicket, setResolvingTicket] = useState<HelpdeskTicket | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: response, isLoading, error, refetch } = useApiQuery<any>(
    ["helpdesk-queries", statusFilter],
    statusFilter === "all" ? "/helpdesk" : `/helpdesk?status=${statusFilter}`,
    { staleTime: 15 * 1000 }
  );

  const rawQueries: HelpdeskTicket[] = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  const openCount = rawQueries.filter((q) => q.status === "OPEN").length;
  const inProgressCount = rawQueries.filter((q) => q.status === "IN_PROGRESS").length;
  const resolvedCount = rawQueries.filter((q) => q.status === "RESOLVED" || q.status === "CLOSED").length;

  const filtered = rawQueries.filter((t) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      (t.trackingId && t.trackingId.toLowerCase().includes(term)) ||
      (t.subject && t.subject.toLowerCase().includes(term)) ||
      (t.name && t.name.toLowerCase().includes(term)) ||
      (t.email && t.email.toLowerCase().includes(term)) ||
      (t.message && t.message.toLowerCase().includes(term))
    );
  });

  const handleOpenResolve = (ticket: HelpdeskTicket) => {
    setResolvingTicket(ticket);
    setResolutionText(ticket.resolution || "");
    setActionError(null);
  };

  const handleCloseResolve = () => {
    setResolvingTicket(null);
    setResolutionText("");
    setActionError(null);
  };

  const handleSubmitResolve = async () => {
    if (!resolvingTicket) return;
    if (!resolutionText.trim()) {
      setActionError("Please provide a resolution note before resolving this ticket.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiFetch(`/helpdesk/${resolvingTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "RESOLVED",
          resolution: resolutionText.trim(),
        }),
      });

      await queryClient.invalidateQueries({ queryKey: ["helpdesk-queries"] });
      handleCloseResolve();
    } catch (err: any) {
      setActionError(err.message || "Failed to update ticket resolution.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 md:px-8">
      <GovPageHeader
        title="State CSR Cell Helpdesk & Support Queue"
        description="Manage portal technical queries, onboarding assistance, and support tickets submitted by companies, NGOs, and departments."
        eyebrow="Helpdesk Operations Desk"
      />

      {/* --- COMPACT KPI CARDS --- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="flex items-center justify-between rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 backdrop-blur-xl sm:p-4 shadow-2xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 sm:text-xs">Open Tickets</span>
            <span className="mt-0.5 block text-[9px] font-medium text-amber-700 sm:text-[11px]">Awaiting support response</span>
          </div>
          <p className="text-2xl font-extrabold text-amber-950">{openCount}</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 backdrop-blur-xl sm:p-4 shadow-2xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 sm:text-xs">In Progress</span>
            <span className="mt-0.5 block text-[9px] font-medium text-blue-700 sm:text-[11px]">Under tech cell review</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-950">{inProgressCount}</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 backdrop-blur-xl sm:p-4 shadow-2xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 sm:text-xs">Resolved Queries</span>
            <span className="mt-0.5 block text-[9px] font-medium text-emerald-700 sm:text-[11px]">Closed support cases</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-950">{resolvedCount}</p>
        </div>
      </div>

      {/* --- FILTER & SEARCH TOOLBAR --- */}
      <div className="flex flex-col md:flex-row items-center gap-2.5 p-2.5 sm:p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ticket tracking no, subject, citizen or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium"
          />
        </div>

        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-blue-900" />
            <p className="text-xs font-semibold text-slate-500">Loading helpdesk queue...</p>
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle size={36} className="text-rose-500" />
            <p className="text-sm font-bold text-slate-800">Failed to load helpdesk tickets</p>
            <p className="text-xs text-slate-500">{(error as any)?.message || "Please check your network and try again."}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <HelpCircle size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">No Helpdesk Tickets Found</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {search || statusFilter !== "all"
                ? "No support tickets match the current filter criteria."
                : "There are currently no active support queries or tickets in the helpdesk queue."}
            </p>
          </div>
        ) : (
          <>
            {/* --- MOBILE CARDS --- */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filtered.map((item) => (
                <div key={item.id} className="flex flex-col gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-900">{item.trackingId || item.id.slice(0, 8)}</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        item.status === "RESOLVED" || item.status === "CLOSED"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.subject}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{item.message}</p>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-200/80 pt-2 text-[11px]">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.email}</p>
                    </div>
                    <div>
                      {item.status !== "RESOLVED" && item.status !== "CLOSED" ? (
                        <button
                          onClick={() => handleOpenResolve(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-800 transition-colors"
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

            {/* --- DESKTOP TABLE --- */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tracking ID</th>
                    <th className="px-4 py-3">Subject & Details</th>
                    <th className="px-4 py-3">Raised By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-blue-900">
                        {item.trackingId || item.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3.5 max-w-sm">
                        <p className="font-bold text-slate-900">{item.subject}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.message}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            item.status === "RESOLVED" || item.status === "CLOSED"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        {item.status !== "RESOLVED" && item.status !== "CLOSED" ? (
                          <button
                            onClick={() => handleOpenResolve(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-2xs active:scale-95"
                          >
                            <CheckCircle2 size={13} /> Resolve Ticket
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* --- RESOLUTION MODAL --- */}
      <GovModal
        open={Boolean(resolvingTicket)}
        onClose={handleCloseResolve}
        title={`Resolve Helpdesk Ticket - ${resolvingTicket?.trackingId || ""}`}
        width={560}
      >
        {resolvingTicket && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-900">{resolvingTicket.subject}</p>
              <p className="text-xs text-slate-600 mt-1">{resolvingTicket.message}</p>
              <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Submitted by: <strong>{resolvingTicket.name}</strong> ({resolvingTicket.email})</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Resolution Remarks / Action Taken <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="Detail the technical or administrative resolution provided to the user..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
              />
            </div>

            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseResolve} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-blue-900 hover:bg-blue-800 text-white"
                onClick={handleSubmitResolve}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={13} className="mr-1.5" />
                    Confirm Resolution
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </GovModal>
    </div>
  );
}
