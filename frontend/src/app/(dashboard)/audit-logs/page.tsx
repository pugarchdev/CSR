"use client";

import { useState, useEffect, useCallback } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { Activity, Users, ShieldCheck, ArrowUp, ArrowDown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import "@/styles/gov-theme.css";

interface AuditLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  details: unknown;
  createdAt: string;
  user?: { id: string; email: string; role: string } | null;
}

// 1. Added SortableTh Component
interface SortableThProps {
  sortKey: string;
  currentSortKey: string;
  currentSortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
  children: React.ReactNode;
}

function SortableTh({ sortKey, currentSortKey, currentSortDirection, onSort, className, children }: SortableThProps) {
  return (
    <th
      className={`${className} cursor-pointer hover:bg-slate-50 transition-colors select-none`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {currentSortKey === sortKey && (
          currentSortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        )}
      </div>
    </th>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 2. Added Sorting State
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const envelope = await apiFetch<any>("/audit-logs?limit=250");
      const list = envelope?.data?.logs || envelope?.data || envelope?.logs || (Array.isArray(envelope) ? envelope : []);
      setLogs(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 3. Added Sorting Handler
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortKey === key && sortDirection === "asc") {
      direction = "desc";
    }
    setSortKey(key);
    setSortDirection(direction);
  };

  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();
  const distinctUsers = new Set(logs.map((l) => l.user?.email).filter(Boolean)).size;

  const filtered = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (log.user?.email || "").toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.entityType || "").toLowerCase().includes(term) ||
      (log.entityId || "").toLowerCase().includes(term);
    const matchesAction = filterAction === "ALL" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  // 4. Added sorting computation (sortedLogs)
  const sortedLogs = [...filtered].sort((a, b) => {
    let aValue: any = a[sortKey as keyof AuditLog];
    let bValue: any = b[sortKey as keyof AuditLog];

    // Handle nested or derived sorting keys
    if (sortKey === "user") {
      aValue = a.user?.email || "";
      bValue = b.user?.email || "";
    } else if (sortKey === "entity") {
      aValue = a.entityType || "";
      bValue = b.entityType || "";
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const actionVariant = (action: string): "success" | "warning" | "danger" | "info" | "muted" => {
    const a = action.toUpperCase();
    if (a.includes("FAIL") || a.includes("REJECT") || a.includes("DELETE") || a.includes("SUSPEND")) return "danger";
    if (a.includes("APPROVE") || a.includes("VERIF") || a.includes("CREATE")) return "success";
    if (a.includes("LOGIN") || a.includes("ACCESS")) return "info";
    return "muted";
  };

  const detailText = (details: unknown) => {
    if (details == null) return "";
    if (typeof details === "string") return details;
    try {
      return JSON.stringify(details);
    } catch {
      return String(details);
    }
  };

  return (
    <GovPortalLayout userRole="PORTAL_ADMIN">
      <GovPageHeader
        breadcrumb="Admin / Audit Logs"
        title="System Audit Logs"
        description="Immutable record of user actions, entity modifications, and system events"
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Logged Events"
          value={logs.length}
          icon={Activity}
          index={0}
          badge="Audit Logged"
          sublabel="System events recorded"
        />
        <StatCard
          label="Distinct Active Users"
          value={distinctUsers}
          icon={Users}
          index={1}
          badge="Active Users"
          sublabel="Unique active accounts"
        />
        <StatCard
          label="Action Categories"
          value={actions.length}
          icon={ShieldCheck}
          index={2}
          badge="Audit Operations"
          sublabel="Tracked operation types"
        />
      </div>

      {/* Log Search and Filters */}
      <GovCard className="mb-6">
        <GovCardBody className="!p-4 md:!p-5">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4 w-full">
            {/* Search Bar */}
            <div className="w-full flex-1 min-w-0">
              <label className="block mb-1.5 text-xs font-bold text-slate-700">
                Search Audit Logs
              </label>
              <GovInput
                type="text"
                placeholder="Search by user email, action name, or entity ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Dropdown */}
            <div className="w-full md:w-[380px] shrink-0">
              <GovSelect
                label="Filter by Action"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="ALL">All Actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                ))}
              </GovSelect>
            </div>
          </div>
        </GovCardBody>
      </GovCard>

      {/* Log Table */}
      <GovCard>
        <GovCardHeader className="!px-4 !py-4 md:!px-5">
          <GovCardTitle>System Audit Events ({filtered.length})</GovCardTitle>
        </GovCardHeader>
        <GovCardBody className="!p-3 md:!p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-[13px]">
              Loading audit events from database…
            </div>
          ) : error ? (
            <div className="gov-alert danger m-4">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-[13px]">
              No audit events found in database.
            </div>
          ) : (
            <div className="w-full">
              {/* ================= DESKTOP TABLE ================= */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b-2 border-slate-200">
                    <tr>
                      <SortableTh
                        sortKey="createdAt"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={requestSort}
                        className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500"
                      >
                        TIMESTAMP
                      </SortableTh>

                      <SortableTh
                        sortKey="user"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={requestSort}
                        className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500"
                      >
                        USER
                      </SortableTh>

                      <SortableTh
                        sortKey="action"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={requestSort}
                        className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500"
                      >
                        ACTION
                      </SortableTh>

                      <SortableTh
                        sortKey="entity"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={requestSort}
                        className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500"
                      >
                        ENTITY
                      </SortableTh>

                      <SortableTh
                        sortKey="ipAddress"
                        currentSortKey={sortKey}
                        currentSortDirection={sortDirection}
                        onSort={requestSort}
                        className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500"
                      >
                        IP ADDRESS
                      </SortableTh>

                      <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500">
                        DETAILS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {sortedLogs.map((log) => {
                      const detail = detailText(log.details);
                      const expanded = expandedId === log.id;

                      return (
                        <tr
                          key={log.id}
                          onClick={() => detail && setExpandedId(expanded ? null : log.id)}
                          className={`transition-colors hover:bg-slate-50/50 ${detail ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <td className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>

                          <td className="px-4 py-3 text-[13px]">
                            <div className="font-bold text-slate-900 break-words">
                              {log.user?.email || "system"}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {log.user?.role || ""}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <GovStatusBadge variant={actionVariant(log.action)}>
                              {log.action.replace(/_/g, " ")}
                            </GovStatusBadge>
                          </td>

                          <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                            <div className="text-slate-900 break-words">
                              {log.entityType || "—"}
                            </div>
                            {log.entityId && (
                              <div className="text-[11px] text-slate-500 break-words">
                                {log.entityId.length > 18
                                  ? `${log.entityId.slice(0, 18)}…`
                                  : log.entityId}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                            {log.ipAddress || "—"}
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600 max-w-[400px]">
                            <span title={detail}>
                              {expanded || detail.length <= 80
                                ? detail || "—"
                                : `${detail.slice(0, 80)}…`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ================= MOBILE CARD VIEW ================= */}
              <div className="md:hidden space-y-3">
                {sortedLogs.map((log) => {
                  const detail = detailText(log.details);
                  const expanded = expandedId === log.id;

                  return (
                    <div
                      key={log.id}
                      onClick={() => detail && setExpandedId(expanded ? null : log.id)}
                      className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all ${detail ? "cursor-pointer active:scale-[0.99]" : ""}`}
                    >
                      <div className="px-4 py-3.5 border-b border-slate-100">
                        {/* Added flex-wrap and adjusted the gap */}
                        <div className="flex flex-wrap items-start justify-between gap-3">

                          {/* Changed min-w-0 to min-w-[120px] to prevent crushing */}
                          <div className="min-w-[120px] flex-1">
                            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                              User
                            </p>
                            {/* Changed break-all to break-words */}
                            <p className="mt-1 text-xs font-bold text-slate-900 break-words">
                              {log.user?.email || "system"}
                            </p>
                            {log.user?.role && (
                              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                                {log.user.role}
                              </p>
                            )}
                          </div>

                          {/* Added max-w-full to prevent the badge from overflowing the card */}
                          <div className="shrink-0 max-w-full">
                            <GovStatusBadge variant={actionVariant(log.action)}>
                              {log.action.replace(/_/g, " ")}
                            </GovStatusBadge>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                          <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="px-4 py-3 grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                            Entity
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-800 break-words">
                            {log.entityType || "—"}
                          </p>
                          {log.entityId && (
                            <p className="mt-0.5 text-[10px] font-medium text-slate-500 break-all">
                              {log.entityId.length > 18
                                ? `${log.entityId.slice(0, 18)}…`
                                : log.entityId}
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl bg-slate-50 px-3 py-2.5 min-w-0">
                          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                            IP Address
                          </p>
                          <p className="mt-1 text-xs font-mono font-semibold text-slate-700 break-all">
                            {log.ipAddress || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 pb-3.5">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                              Details
                            </p>
                            {detail && detail.length > 80 && (
                              <span className="text-[9px] font-bold text-blue-600">
                                {expanded ? "Tap to collapse" : "Tap to expand"}
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] leading-relaxed text-slate-600 ${expanded ? "break-words" : "break-words"}`}>
                            {expanded || detail.length <= 80
                              ? detail || "—"
                              : `${detail.slice(0, 80)}…`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </GovCardBody>
      </GovCard>
    </GovPortalLayout>
  );
} 