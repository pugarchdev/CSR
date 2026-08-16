// Audit Log Page — Full access control audit view
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RefreshCw, ChevronDown, ChevronRight, Clock, User, Activity } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuditLogs } from "@/hooks/useAccessControl";
import { cn } from "@/lib/utils";

import "@/styles/gov-theme.css";

import AccessControlTabs from "@/components/access-control/AccessControlTabs";

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const { data: auditData, isLoading, refetch } = useAuditLogs({ page, pageSize: 30, action: actionFilter || undefined });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = auditData?.data ?? [];
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter((e) =>
      (e.actorEmail || e.actor || "").toLowerCase().includes(term) ||
      e.action.toLowerCase().includes(term) ||
      (e.resourceLabel || "").toLowerCase().includes(term) ||
      (e.correlationId || "").toLowerCase().includes(term)
    );
  }, [auditData, search]);

  const actionVariant = (action: string) => {
    if (action.includes("create") || action.includes("clone")) return "success" as const;
    if (action.includes("delete") || action.includes("remove") || action.includes("revoke")) return "danger" as const;
    if (action.includes("deactivate") || action.includes("archive")) return "warning" as const;
    if (action.includes("activate")) return "primary" as const;
    return "info" as const;
  };

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Access Audit Log"
        breadcrumb="Administration / Access Control"
        actions={
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      <AccessControlTabs />

      <div className="space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by actor, action, resource, or correlation ID..."
              className="w-full h-10 pl-9 pr-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
              aria-label="Search audit logs"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["", "create", "update", "delete", "activate", "deactivate", "clone", "assign"].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => { setActionFilter(a); setPage(1); }}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all min-h-[28px]",
                  actionFilter === a
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-300"
                )}
              >
                {a || "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Audit entries */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No audit entries found.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const isExpanded = expandedId === entry.id;
              return (
                <div key={entry.id} className="border border-slate-200/60 rounded-xl overflow-hidden bg-white/70 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/40 transition-colors min-h-[48px]"
                    aria-expanded={isExpanded}
                  >
                    <span className="shrink-0 text-slate-400">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <Badge variant={actionVariant(entry.action)} size="sm">{entry.action}</Badge>
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {entry.actorEmail || entry.actor}
                      </span>
                      <span className="text-[10px] text-slate-400">→</span>
                      <span className="text-xs text-slate-500 truncate">
                        {entry.resourceLabel || `${entry.resourceType}:${entry.resourceId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.scope && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                          {entry.scope}
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={11} aria-hidden="true" />
                        <time dateTime={entry.timestamp}>
                          {new Date(entry.timestamp).toLocaleString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100/60 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <DetailField label="Actor" value={entry.actorEmail || entry.actor} icon={<User size={11} />} />
                            <DetailField label="Action" value={entry.action} icon={<Activity size={11} />} />
                            <DetailField label="Date/Time" value={new Date(entry.timestamp).toLocaleString()} icon={<Clock size={11} />} />
                            <DetailField label="Resource" value={`${entry.resourceType}:${entry.resourceId}`} />
                            <DetailField label="Scope" value={entry.scope || "—"} />
                            <DetailField label="Correlation ID" value={entry.correlationId || "—"} mono />
                          </div>
                          {entry.reason && (
                            <DetailField label="Reason" value={entry.reason} />
                          )}
                          {entry.ipAddress && (
                            <DetailField label="IP Address" value={entry.ipAddress} mono />
                          )}
                          {(entry.before || entry.after) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {entry.before && (
                                <div className="p-3 bg-red-50/60 rounded-lg border border-red-200/40">
                                  <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Before</p>
                                  <pre className="text-[10px] font-mono text-red-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto" data-lenis-prevent>
                                    {JSON.stringify(entry.before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {entry.after && (
                                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/40">
                                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">After</p>
                                  <pre className="text-[10px] font-mono text-emerald-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto" data-lenis-prevent>
                                    {JSON.stringify(entry.after, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {auditData && auditData.total > 30 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-xs text-slate-500">Page {page} of {Math.ceil(auditData.total / 30)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(auditData.total / 30)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}

function DetailField({ label, value, icon, mono, className }: {
  label: string; value: string; icon?: React.ReactNode; mono?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <p className={`text-xs text-slate-700 ${mono ? "font-mono bg-slate-50 px-1.5 py-0.5 rounded" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
