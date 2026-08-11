"use client";

import { useState, useEffect, useCallback } from "react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { GovCard, GovCardHeader, GovCardTitle, GovCardBody } from "@/components/gov/GovCard";
import GovInput from "@/components/gov/GovInput";
import GovSelect from "@/components/gov/GovSelect";
import GovStatusBadge from "@/components/gov/GovStatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { Activity, Users, ShieldCheck } from "lucide-react";
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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            
            {/* Search Bar - Takes up remaining space */}
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

            {/* Dropdown - Increased width to 380px to fit long action names */}
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
            <div className="w-full md:overflow-x-auto">
              <table className="w-full block md:table text-left border-collapse">
                <thead className="hidden md:table-header-group border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500">TIMESTAMP</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500">USER</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500">ACTION</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500">ENTITY</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500">IP ADDRESS</th>
                    <th className="px-4 py-3 text-left text-[11px] font-extrabold text-slate-500">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y-0 md:divide-y md:divide-slate-100">
                  {filtered.map((log) => {
                    const detail = detailText(log.details);
                    const expanded = expandedId === log.id;
                    return (
                      <tr
                        key={log.id}
                        className={`block md:table-row mb-4 md:mb-0 bg-white border border-slate-200 md:border-none rounded-xl md:rounded-none shadow-sm md:shadow-none transition-colors hover:bg-slate-50/50 ${detail ? "cursor-pointer" : "cursor-default"}`}
                        onClick={() => setExpandedId(expanded ? null : log.id)}
                      >
                        <td 
                          data-label="TIMESTAMP" 
                          className="flex md:table-cell justify-between items-center px-4 py-3 border-b border-slate-100 md:border-none text-xs font-semibold text-slate-600 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden whitespace-nowrap"
                        >
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        
                        <td 
                          data-label="USER" 
                          /* FIX: Added md:w-auto to reset cell width on desktop */
                          className="flex md:table-cell justify-between items-center px-4 py-3 border-b border-slate-100 md:border-none text-[13px] before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden w-full md:w-auto min-w-0"
                        >
                          <div className="text-right md:text-left min-w-0">
                            {/* FIX: Use break-words on desktop, break-all on mobile */}
                            <div className="font-bold text-slate-900 break-all md:break-words">{log.user?.email || "system"}</div>
                            <div className="text-[11px] text-slate-500">{log.user?.role || ""}</div>
                          </div>
                        </td>
                        
                        <td 
                          data-label="ACTION" 
                          className="flex md:table-cell justify-between items-center px-4 py-3 border-b border-slate-100 md:border-none before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                        >
                          <GovStatusBadge variant={actionVariant(log.action)}>
                            {log.action.replace(/_/g, " ")}
                          </GovStatusBadge>
                        </td>
                        
                        <td 
                          data-label="ENTITY" 
                          /* FIX: Added md:w-auto to reset cell width on desktop */
                          className="flex md:table-cell justify-between items-center px-4 py-3 border-b border-slate-100 md:border-none text-xs font-semibold text-slate-600 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden w-full md:w-auto min-w-0"
                        >
                          <div className="text-right md:text-left min-w-0">
                            <div className="text-slate-900 break-all md:break-words">{log.entityType || "—"}</div>
                            {log.entityId && (
                              <div className="text-[11px] text-slate-500 break-all md:break-words">
                                {log.entityId.length > 18 ? `${log.entityId.slice(0, 18)}…` : log.entityId}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td 
                          data-label="IP ADDRESS" 
                          className="flex md:table-cell justify-between items-center px-4 py-3 border-b border-slate-100 md:border-none text-xs font-semibold text-slate-600 before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden"
                        >
                          {log.ipAddress || "—"}
                        </td>
                        
                        <td 
                          data-label="DETAILS" 
                          /* FIX: Added md:w-auto and increased max-w for desktop readability */
                          className="flex md:table-cell flex-col md:flex-row items-start md:items-center px-4 py-3 md:border-none text-xs text-slate-600 w-full md:w-auto min-w-0 md:max-w-[400px] before:content-[attr(data-label)] before:text-[10px] before:uppercase before:font-extrabold before:text-slate-400 before:md:hidden before:mb-1"
                        >
                          {/* FIX: Break-words instead of break-all on desktop so standard text flows naturally */}
                          <span title={detail} className={`w-full ${expanded ? "break-all" : "break-all md:break-words"}`}>
                            {expanded || detail.length <= 80 ? detail || "—" : `${detail.slice(0, 80)}…`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GovCardBody>
      </GovCard>
    </GovPortalLayout>
  );
}
