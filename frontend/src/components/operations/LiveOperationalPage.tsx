"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCcw, Search, Inbox, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { StandardPageHeader } from "@/components/layout/StandardPageHeader";
import { StatCard, StatCardGroup } from "@/components/ui/StatCard";

export interface LiveColumn {
  label: string;
  keys: string[];
}

interface Props {
  title: string;
  description: string;
  eyebrow: string;
  endpoint: string;
  emptyMessage: string;
  columns: LiveColumn[];
  primaryAction?: { label: string; href: string };
}

const read = (record: any, keys: string[]) => {
  for (const key of keys) {
    const value = key.split(".").reduce((item, part) => item?.[part], record);
    if (value !== undefined && value !== null && value !== "") {
      return typeof value === "object" ? JSON.stringify(value) : String(value).replace(/_/g, " ");
    }
  }
  return "—";
};

const statusTone = (status: string) =>
  /APPROV|ACTIVE|COMPLETE|RESOLVED/i.test(status)
    ? "border-emerald-200/80 bg-emerald-50 text-emerald-700 font-bold"
    : /REJECT|OVERDUE|ESCALAT|FAILED/i.test(status)
    ? "border-rose-200/80 bg-rose-50 text-rose-700 font-bold"
    : /PENDING|AWAIT|CLARIF|SUBMIT/i.test(status)
    ? "border-amber-200/80 bg-amber-50 text-amber-800 font-bold"
    : "border-blue-200/80 bg-blue-50 text-blue-700 font-bold";

export default function LiveOperationalPage({
  title,
  description,
  eyebrow,
  endpoint,
  emptyMessage,
  columns,
  primaryAction
}: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [asOf, setAsOf] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response: any = await apiFetch(endpoint);
      const payload = response?.data ?? response;
      const list = Array.isArray(payload) ? payload : Object.values(payload || {}).find(Array.isArray) || [];
      setItems(list as any[]);
      setAsOf(new Date());
    } catch (e: any) {
      setError(e?.message || "Live data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);



  const activeCount = useMemo(() => {
    return items.filter((i) => /APPROV|ACTIVE|COMPLETE|RESOLVED/i.test(String(i.status || i.currentStatus || ""))).length;
  }, [items]);

  const pendingCount = useMemo(() => {
    return items.filter((i) => /PENDING|AWAIT|CLARIF|SUBMIT|IN_REVIEW/i.test(String(i.status || i.currentStatus || ""))).length;
  }, [items]);

  const urgentCount = useMemo(() => {
    return items.filter((i) => /REJECT|OVERDUE|ESCALAT|FAILED/i.test(String(i.status || i.currentStatus || ""))).length;
  }, [items]);

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-6 md:px-8 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <StandardPageHeader
          title={title}
          description={description}
          category={eyebrow}
          actions={
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-2xs">
                <Clock3 size={12} />
                {asOf ? `Synced ${asOf.toLocaleTimeString()}` : "Authoritative Sync"}
              </span>
              {primaryAction && (
                <Link
                  href={primaryAction.href}
                  className="rounded-xl bg-blue-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-950 hover:no-underline"
                >
                  {primaryAction.label}
                </Link>
              )}
            </div>
          }
        />

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-5 shadow-sm">
            <div className="flex gap-3.5">
              <div className="h-fit rounded-xl border border-red-200 bg-white p-2.5 text-red-600 shadow-2xs">
                <AlertCircle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-red-950">Data Unavailable</h2>
                <p className="mt-1 text-xs font-medium text-red-700">{error}.</p>
                <button
                  onClick={load}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-red-800 transition"
                >
                  <RefreshCcw size={13} />
                  Retry Load
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Standard 4-Column KPI Cards */}
            <StatCardGroup columns={4}>
              <StatCard
                label="Total Records"
                value={items.length}
                icon={Inbox}
                colorTheme="blue"
                sublabel="Total scoped records"
                index={0}
              />
              <StatCard
                label="Active & Resolved"
                value={activeCount}
                icon={CheckCircle2}
                colorTheme="emerald"
                sublabel="Operating normally"
                index={1}
              />
              <StatCard
                label="Pending Action"
                value={pendingCount}
                icon={Activity}
                colorTheme="amber"
                sublabel="Awaiting review/decision"
                index={2}
              />
              <StatCard
                label="Attention Needed"
                value={urgentCount}
                icon={ShieldAlert}
                colorTheme="rose"
                sublabel="Escalated / flagged"
                index={3}
              />
            </StatCardGroup>

            {/* Standard Glassmorphism Data Table Container */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/50 to-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 font-heading">Authoritative Records</h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">Scoped to role permissions & organization context</p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    aria-label={`Search ${title}`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search records…"
                    className="w-full rounded-xl border border-slate-200/90 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {loading ? (
                <div className="space-y-3 p-5 animate-pulse">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-10 rounded-xl bg-slate-100/80" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-14 text-center">
                  <CheckCircle2 className="mx-auto text-emerald-600" size={28} />
                  <p className="mt-3 text-sm font-bold text-slate-800">{emptyMessage}</p>
                  <p className="mt-1 text-xs text-slate-400">This is a valid zero state based on authoritative live data.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <tr>
                        {columns.map((column) => (
                          <th key={column.label} className="whitespace-nowrap px-5 py-3.5">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filtered.map((item, index) => (
                        <tr key={item.id || index} className="transition-colors hover:bg-blue-50/40">
                          {columns.map((column, columnIndex) => {
                            const value = read(item, column.keys);
                            const isStatus = column.label.toLowerCase().includes("status");
                            return (
                              <td key={column.label} className="max-w-sm px-5 py-3.5 font-medium text-slate-700">
                                {isStatus ? (
                                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] uppercase shadow-2xs ${statusTone(value)}`}>
                                    {value}
                                  </span>
                                ) : columnIndex === 0 ? (
                                  <span className="font-bold text-slate-950">{value}</span>
                                ) : (
                                  value
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

