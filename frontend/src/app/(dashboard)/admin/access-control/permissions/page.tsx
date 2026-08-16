// Permissions Catalog & System Role Matrix Page
"use client";

import { useState, useMemo } from "react";
import { Search, Key, Check, Minus, LayoutGrid, List } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { usePermissions } from "@/hooks/useAccessControl";
import type { Permission } from "@/types/accessControl";
import "@/styles/gov-theme.css";

import AccessControlTabs from "@/components/access-control/AccessControlTabs";

const SYSTEM_ROLES_HEADERS = [
  { code: "SA", name: "Super Admin" },
  { code: "PS", name: "Planning Secretary" },
  { code: "JS", name: "Joint Secretary" },
  { code: "DNO", name: "District Nodal Officer" },
  { code: "DNC", name: "District Nodal Consultant" },
  { code: "RM", name: "Relationship Manager" },
  { code: "GOVT", name: "Government Officer" },
  { code: "COMP", name: "Company Admin" },
  { code: "IA", name: "NGO / IA Admin" },
];

const MATRIX_MODULE_OVERVIEW = [
  { module: "Corporate Enquiry", sa: true, ps: true, js: true, dno: false, dnc: true, rm: true, govt: false, comp: true, ia: false },
  { module: "Government Pitch", sa: true, ps: true, js: true, dno: true, dnc: true, rm: true, govt: true, comp: false, ia: false },
  { module: "Feasibility Assessment", sa: true, ps: true, js: true, dno: true, dnc: true, rm: true, govt: false, comp: true, ia: false },
  { module: "Convergence Project", sa: true, ps: true, js: true, dno: true, dnc: true, rm: true, govt: true, comp: true, ia: true },
  { module: "Milestone Execution", sa: true, ps: true, js: true, dno: true, dnc: true, rm: false, govt: true, comp: true, ia: true },
  { module: "MoU & Agreements", sa: true, ps: true, js: true, dno: false, dnc: true, rm: true, govt: false, comp: true, ia: true },
];

export default function PermissionsPage() {
  const { data: permissions = [], isLoading } = usePermissions();
  const [search, setSearch] = useState("");

  const [viewMode, setViewMode] = useState<"catalog" | "matrix">("catalog");

  const modules = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const mod = p.module || p.key.split(":")[0] || "other";
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const filtered = useMemo(() => {
    return modules
      .map(([mod, perms]) => {
        const f = perms.filter((p) => {
          if (!search.trim()) return true;
          const term = search.toLowerCase();
          return (
            p.key.toLowerCase().includes(term) ||
            (p.title || "").toLowerCase().includes(term) ||
            (p.description || "").toLowerCase().includes(term) ||
            mod.toLowerCase().includes(term)
          );
        });
        return [mod, f] as [string, Permission[]];
      })
      .filter(([, perms]) => perms.length > 0);
  }, [modules, search]);

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Permission Catalog & System Role Matrix"
        description="Master catalog of platform permission keys and 9 System Roles capability matrix."
      />

      <div className="space-y-6">
        <AccessControlTabs />

        {/* View Selector & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("catalog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                viewMode === "catalog" ? "bg-blue-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <List size={14} />
              <span>Permission Catalog</span>
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                viewMode === "matrix" ? "bg-blue-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <LayoutGrid size={14} />
              <span>9 System Roles Matrix</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search permissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* MATRIX VIEW */}
        {viewMode === "matrix" && (
          <Card variant="outlined" hover={false} tilt={false}>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">System Roles Capability Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Platform Module</th>
                      {SYSTEM_ROLES_HEADERS.map((h) => (
                        <th key={h.code} className="p-3 text-center" title={h.name}>{h.code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MATRIX_MODULE_OVERVIEW.map((row) => (
                      <tr key={row.module} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{row.module}</td>
                        <td className="p-3 text-center">{row.sa ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.ps ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.js ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.dno ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.dnc ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.rm ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.govt ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.comp ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                        <td className="p-3 text-center">{row.ia ? <Check size={14} className="mx-auto text-emerald-600 font-bold" /> : <Minus size={14} className="mx-auto text-slate-300" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CATALOG VIEW */}
        {viewMode === "catalog" && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-semibold">Loading permission catalog...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-semibold">No permissions found matching search criteria.</div>
            ) : (
              filtered.map(([mod, perms]) => (
                <Card key={mod} variant="outlined" hover={false} tilt={false}>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 capitalize flex items-center gap-2">
                      <Key size={15} className="text-blue-900" />
                      <span>{mod.replace(/_/g, " ")} Module</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      {perms.map((p) => (
                        <div key={p.id || p.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <div className="font-bold text-slate-900">{p.title || p.key}</div>
                          <div className="font-mono text-[10px] text-blue-900 font-semibold">{p.key}</div>
                          <div className="text-[11px] text-slate-500">{p.description || "System permission key."}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </GovPortalLayout>
  );
}
