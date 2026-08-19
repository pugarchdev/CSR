"use client";

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  HelpCircle, CheckCircle2, Clock, Search, MessageSquare, Loader2,
  AlertCircle, Send, Plus, LifeBuoy, Copy, Check, ChevronRight
} from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import { GovPageHeader } from "@/components/layout/GovPageHeader";
import { useApiQuery } from "@/lib/apiHooks";
import { apiFetch } from "@/lib/api";
import GovModal from "@/components/gov/GovModal";
import { Button } from "@/components/ui/Button";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import { useAuthStore } from "@/store/authStore";

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

const FAQ_ITEMS = [
  {
    category: "Onboarding & Access",
    question: "How do I complete entity KYC and corporate/NGO onboarding?",
    answer:
      "Navigate to the Organization Onboarding portal. Fill out the corporate CIN or NGO Darpan number, upload certified 12A/80G documents, and submit for State CSR Cell approval within the 3-day SLA window.",
  },
  {
    category: "Projects & Proposals",
    question: "How does a Department or Nodal Officer publish a CSR Pitch?",
    answer:
      "Select 'Pitches' → 'Submit Government Pitch'. Select the convergence sector, taluka/district location, approved DPR budget, and attach preliminary project documentation.",
  },
  {
    category: "Milestones & Funds",
    question: "How are milestone tranche disbursements and UC verification approved?",
    answer:
      "Implementing agencies upload geotagged site inspection photos and CA-certified Utilization Certificates (UC). The District Nodal Officer verifies the submission before triggering the automated escrow fund release.",
  },
  {
    category: "Grievances & Escalations",
    question: "What is the escalation timeline for field grievances?",
    answer:
      "Grievances are logged with Level 1 assignment to the District CSR Cell / Org Head (15-day SLA). Unresolved matters are automatically escalated to Level 2 with the State CSR Cell / Joint Secretary.",
  },
];

export default function HelpdeskPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [activeTab, setActiveTab] = useState<"tickets" | "faqs">("tickets");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCategory, setNewCategory] = useState("TECHNICAL");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdTicketInfo, setCreatedTicketInfo] = useState<{ trackingId: string; message: string } | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);

  // Track Query by ID Modal State
  const [trackQueryModal, setTrackQueryModal] = useState(false);
  const [trackInputId, setTrackInputId] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<HelpdeskTicket | null>(null);
  const [trackError, setTrackError] = useState("");

  // Officer Resolution Modal State
  const [resolvingTicket, setResolvingTicket] = useState<HelpdeskTicket | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<"IN_PROGRESS" | "RESOLVED" | "CLOSED">("RESOLVED");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);
  const [actionError, setActionError] = useState("");

  // Determine if current user is an authorized officer
  const isResolver = useMemo(() => {
    if (isAdmin) return true;
    const userRoles = roles || (user?.role ? [user.role] : []);
    return userRoles.some((r) =>
      ["SUPER_ADMIN", "PLANNING_SECRETARY", "JOINT_SECRETARY", "CSR_RELATIONSHIP_MANAGER", "RELATIONSHIP_MANAGER", "PORTAL_ADMIN", "STATE_CSR_CELL", "DISTRICT_NODAL", "CSR_ADMIN"].includes(
        String(r).toUpperCase()
      )
    );
  }, [isAdmin, roles, user]);

  // Prepopulate authenticated user info
  useEffect(() => {
    if (user) {
      if (!newName && (user.name || user.email)) {
        setNewName(user.name || user.email.split("@")[0]);
      }
      if (!newEmail && user.email) {
        setNewEmail(user.email);
      }
    }
  }, [user, newName, newEmail]);

  // Fetch helpdesk queries
  const { data: ticketsData, isLoading, error, refetch } = useApiQuery<any>(
    ["helpdesk-tickets"],
    "/helpdesk"
  );

  const rawTickets = useMemo(() => {
    if (Array.isArray(ticketsData)) return ticketsData;
    if (ticketsData && typeof ticketsData === "object" && "data" in ticketsData && Array.isArray((ticketsData as any).data)) {
      return (ticketsData as any).data as HelpdeskTicket[];
    }
    return [];
  }, [ticketsData]);

  // Filter tickets
  const filtered = useMemo(() => {
    return rawTickets.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.subject?.toLowerCase().includes(term) ||
        item.message?.toLowerCase().includes(term) ||
        item.trackingId?.toLowerCase().includes(term) ||
        item.name?.toLowerCase().includes(term) ||
        item.email?.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [rawTickets, statusFilter, search]);

  // Table sorting
  const { sortedItems: sortedTickets, sortKey, sortDirection, requestSort } = useTableSort(filtered, {
    customGetters: {
      trackingId: (item) => item.trackingId || item.id,
      subject: (item) => item.subject,
      raisedBy: (item) => item.name,
      status: (item) => item.status,
      createdAt: (item) => item.createdAt,
    },
  });

  // Calculate 4 KPI Metrics
  const totalCount = rawTickets.length;
  const openCount = rawTickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = rawTickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedCount = rawTickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  const handleOpenCreate = () => {
    setShowCreateModal(true);
    setCreatedTicketInfo(null);
    setCreateError("");
    setNewSubject("");
    setNewMessage("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || !newName.trim() || !newEmail.trim()) {
      setCreateError("Please fill out all required fields.");
      return;
    }

    setCreateSubmitting(true);
    setCreateError("");

    try {
      const payload = {
        subject: `[${newCategory}] ${newSubject.trim()} (${newPriority})`,
        message: newMessage.trim(),
        name: newName.trim(),
        email: newEmail.trim(),
      };

      const res = await apiFetch<any>("/helpdesk", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const trackingId = res?.data?.trackingId || res?.trackingId || "HD-MH-2026-PENDING";
      setCreatedTicketInfo({
        trackingId,
        message: "Your support query has been successfully logged with the State Helpdesk.",
      });

      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to log support ticket. Please try again.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTrackingId(true);
    setTimeout(() => setCopiedTrackingId(false), 2000);
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInputId.trim()) return;

    setTrackLoading(true);
    setTrackError("");
    setTrackResult(null);

    try {
      const res = await apiFetch<any>(`/helpdesk/${encodeURIComponent(trackInputId.trim())}`);
      const data = res?.data || res;
      if (data && (data.trackingId || data.id)) {
        setTrackResult(data);
      } else {
        setTrackError("No support ticket found with this tracking ID.");
      }
    } catch (err: unknown) {
      setTrackError(err instanceof Error ? err.message : "Ticket not found or network error.");
    } finally {
      setTrackLoading(false);
    }
  };

  const handleOpenResolve = (ticket: HelpdeskTicket) => {
    setResolvingTicket(ticket);
    setResolutionText(ticket.resolution || "");
    setResolutionStatus(ticket.status === "OPEN" ? "IN_PROGRESS" : (ticket.status as any));
    setActionError("");
  };

  const handleCloseResolve = () => {
    setResolvingTicket(null);
    setResolutionText("");
    setActionError("");
  };

  const handleSubmitResolve = async () => {
    if (!resolvingTicket) return;
    if (!resolutionText.trim() && resolutionStatus === "RESOLVED") {
      setActionError("Please provide resolution notes before marking as resolved.");
      return;
    }

    setIsSubmittingResolve(true);
    setActionError("");

    try {
      await apiFetch(`/helpdesk/${resolvingTicket.id}/resolve`, {
        method: "PUT",
        body: JSON.stringify({
          status: resolutionStatus,
          resolution: resolutionText.trim() || undefined,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["helpdesk-tickets"] });
      handleCloseResolve();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update resolution status.");
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  return (
    <GovPortalLayout>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 px-3 py-5 sm:px-6 sm:py-6 md:px-8 text-slate-900">
        {/* --- PAGE HEADER --- */}
        <GovPageHeader
          title="State CSR Helpdesk & Stakeholder Support"
          description="Submit inquiries, request technical assistance, track ticket resolutions, and access knowledge resources."
          eyebrow="Government of Maharashtra • Citizen & Partner Support Desk"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTrackQueryModal(true)}
                className="bg-white text-slate-700 border-slate-300 font-bold text-xs shadow-2xs hover:bg-slate-50"
              >
                <Search size={13} className="mr-1.5" />
                Track Ticket
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-2xs"
              >
                <Plus size={14} className="mr-1.5" />
                Raise Support Request
              </Button>
            </div>
          }
        />

        {/* --- 4 STANDARD KPI METRIC CARDS --- */}
        <StatCardGroup columns={4}>
          <StatCard
            label="Total Support Tickets"
            value={isLoading ? "…" : totalCount}
            icon={HelpCircle}
            index={0}
            colorTheme="blue"
            sublabel="All logged queries & issues"
          />
          <StatCard
            label="Open & Awaiting Action"
            value={isLoading ? "…" : openCount}
            icon={AlertCircle}
            index={1}
            colorTheme="amber"
            sublabel="Pending officer assignment"
          />
          <StatCard
            label="Under Tech Review"
            value={isLoading ? "…" : inProgressCount}
            icon={Clock}
            index={2}
            colorTheme="blue"
            sublabel="Active investigation by IT cell"
          />
          <StatCard
            label="Resolved & Closed"
            value={isLoading ? "…" : resolvedCount}
            icon={CheckCircle2}
            index={3}
            colorTheme="emerald"
            sublabel="Solutions delivered within SLA"
          />
        </StatCardGroup>

        {/* --- TAB SWITCHER & TOOLBAR --- */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl">
            <button
              onClick={() => setActiveTab("tickets")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "tickets"
                  ? "bg-white text-blue-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Support Tickets Queue ({filtered.length})
            </button>
            <button
              onClick={() => setActiveTab("faqs")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === "faqs"
                  ? "bg-white text-blue-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Knowledge Base & FAQs
            </button>
          </div>

          {activeTab === "tickets" && (
            <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 md:max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search ticket #, subject, citizen, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-36 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* --- CONTENT AREA --- */}
        {activeTab === "faqs" ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold text-slate-900">Frequently Asked Questions & Solution Library</h3>
              <p className="text-xs text-slate-500">Quick answers to common questions about onboarding, verification, and portal features.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FAQ_ITEMS.map((faq, index) => (
                <div key={index} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white transition-colors">
                  <span className="text-[10px] font-bold uppercase text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    {faq.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 mt-2">{faq.question}</h4>
                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-blue-900" />
                <p className="text-xs font-semibold text-slate-500">Loading support queue...</p>
              </div>
            ) : error ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                <AlertCircle size={36} className="text-rose-500" />
                <p className="text-sm font-bold text-slate-800">Failed to load support tickets</p>
                <p className="text-xs text-slate-500">{(error as any)?.message || "Please check your network connection."}</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-900">
                  <LifeBuoy size={26} />
                </div>
                <p className="text-sm font-bold text-slate-900">No Support Tickets Found</p>
                <p className="text-xs text-slate-500 max-w-md">
                  {search || statusFilter !== "all"
                    ? "No tickets match your filter criteria. Try clearing search filters."
                    : "You haven't submitted any support requests yet. If you have any questions or face technical bottlenecks, click 'Raise Support Request' above."}
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs"
                >
                  <Plus size={13} className="mr-1.5" />
                  Submit First Request
                </Button>
              </div>
            ) : (
              <>
                {/* --- MOBILE CARDS VIEW --- */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filtered.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-900">{item.trackingId || item.id.slice(0, 8)}</span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            item.status === "RESOLVED" || item.status === "CLOSED"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.subject}</p>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{item.message}</p>
                      </div>

                      {item.resolution && (
                        <div className="p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-900 font-medium">
                          <span className="font-bold">Official Resolution: </span>
                          {item.resolution}
                        </div>
                      )}

                      <div className="flex items-end justify-between border-t border-slate-200/80 pt-2 text-[11px]">
                        <div>
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.email}</p>
                        </div>
                        <div>
                          {isResolver && item.status !== "RESOLVED" && item.status !== "CLOSED" ? (
                            <button
                              onClick={() => handleOpenResolve(item)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-800 transition-colors"
                            >
                              <CheckCircle2 size={12} /> Resolve
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* --- DESKTOP TABLE VIEW --- */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <SortableTh sortKey="trackingId" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                          Tracking ID
                        </SortableTh>
                        <SortableTh sortKey="subject" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                          Subject & Query Summary
                        </SortableTh>
                        <SortableTh sortKey="raisedBy" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                          Submitted By
                        </SortableTh>
                        <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                          Status
                        </SortableTh>
                        <SortableTh sortKey="createdAt" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort}>
                          Date Logged
                        </SortableTh>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {sortedTickets.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-blue-900">
                            {item.trackingId || item.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3.5 max-w-sm">
                            <p className="font-bold text-slate-900">{item.subject}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.message}</p>
                            {item.resolution && (
                              <p className="text-[10px] text-emerald-700 font-semibold line-clamp-1 mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Resolution: {item.resolution}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.email}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                                item.status === "RESOLVED" || item.status === "CLOSED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : item.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right">
                            {isResolver && item.status !== "RESOLVED" && item.status !== "CLOSED" ? (
                              <button
                                onClick={() => handleOpenResolve(item)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-2xs active:scale-95"
                              >
                                <CheckCircle2 size={13} /> Resolve
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTrackInputId(item.trackingId || item.id);
                                  setTrackResult(item);
                                  setTrackQueryModal(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View Details
                              </button>
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
        )}

        {/* --- MODAL 1: RAISE SUPPORT REQUEST --- */}
        <GovModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Raise Helpdesk Support Ticket"
          width={580}
        >
          {createdTicketInfo ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Support Request Registered</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {createdTicketInfo.message}
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between max-w-sm mx-auto">
                <span className="font-mono text-sm font-bold text-blue-900">{createdTicketInfo.trackingId}</span>
                <button
                  onClick={() => handleCopyCode(createdTicketInfo.trackingId)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-900"
                >
                  {copiedTrackingId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copiedTrackingId ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You will receive email updates and a resolution from the State CSR Helpdesk within 2 business days.
              </p>
              <Button
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs"
                onClick={() => setShowCreateModal(false)}
              >
                Done & Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {createError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Query Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  >
                    <option value="TECHNICAL">Technical Bug / Portal Error</option>
                    <option value="ONBOARDING">Onboarding & KYC Assistance</option>
                    <option value="MILESTONE">Milestone & UC Submission</option>
                    <option value="PAYMENT">Fund Disbursement & Escrow</option>
                    <option value="ACCESS">Role / Sub-Login Access</option>
                    <option value="GENERAL">General Policy & CSR Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Urgency / Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  >
                    <option value="NORMAL">Normal (Standard SLA)</option>
                    <option value="HIGH">High (Project Critical)</option>
                    <option value="URGENT">Urgent (System Blocked)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of the issue or question..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Message / Problem Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Please describe the issue, specific error messages, or assistance needed in detail..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin mr-1.5" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={13} className="mr-1.5" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </GovModal>

        {/* --- MODAL 2: TRACK TICKET BY ID --- */}
        <GovModal
          open={trackQueryModal}
          onClose={() => setTrackQueryModal(false)}
          title="Track Support Ticket Status"
          width={520}
        >
          <form onSubmit={handleTrackSubmit} className="space-y-3.5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Ticket ID (e.g., HD-MH-2026-000001)"
                value={trackInputId}
                onChange={(e) => setTrackInputId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-mono"
              />
              <Button
                type="submit"
                size="sm"
                disabled={trackLoading}
                className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
              >
                {trackLoading ? <Loader2 size={14} className="animate-spin" /> : "Check Status"}
              </Button>
            </div>

            {trackError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {trackError}
              </div>
            )}

            {trackResult && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="font-mono text-xs font-extrabold text-blue-900">{trackResult.trackingId}</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                      trackResult.status === "RESOLVED" || trackResult.status === "CLOSED"
                        ? "bg-emerald-100 text-emerald-800"
                        : trackResult.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {trackResult.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">{trackResult.subject}</p>
                  {trackResult.message && (
                    <p className="text-[11px] text-slate-600 mt-1">{trackResult.message}</p>
                  )}
                </div>

                {trackResult.resolution ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                    <p className="font-bold mb-0.5">Official Resolution Remarks:</p>
                    <p className="text-[11px] leading-relaxed">{trackResult.resolution}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                    This query is currently under review by the State CSR Cell. Resolution will be provided shortly.
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Created: {new Date(trackResult.createdAt).toLocaleDateString()}</span>
                  {trackResult.resolutionDueAt && (
                    <span>SLA Due: {new Date(trackResult.resolutionDueAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )}
          </form>
        </GovModal>

        {/* --- MODAL 3: RESOLVE TICKET --- */}
        <GovModal
          open={Boolean(resolvingTicket)}
          onClose={handleCloseResolve}
          title={`Resolve Helpdesk Ticket - ${resolvingTicket?.trackingId || ""}`}
          width={560}
        >
          {resolvingTicket && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-900">{resolvingTicket.subject}</p>
                <p className="text-xs text-slate-600 mt-1">{resolvingTicket.message}</p>
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Submitted by: <strong>{resolvingTicket.name}</strong> ({resolvingTicket.email})</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Update Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                >
                  <option value="RESOLVED">Mark as Resolved</option>
                  <option value="IN_PROGRESS">Set to In Progress / Under Review</option>
                  <option value="CLOSED">Formally Close Ticket</option>
                </select>
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
                <Button type="button" variant="outline" size="sm" onClick={handleCloseResolve} disabled={isSubmittingResolve}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-bold"
                  onClick={handleSubmitResolve}
                  disabled={isSubmittingResolve}
                >
                  {isSubmittingResolve ? (
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
    </GovPortalLayout>
  );
}
