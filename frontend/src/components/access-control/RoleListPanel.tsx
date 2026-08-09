// Role List Panel — Searchable, filterable, keyboard-navigable 2-tier role list
"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Users, Lock, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypeBadge, StatusBadge, ScopeBadge, ProtectedIndicator } from "./RoleBadges";
import type { Role, RoleStatus, RoleType, DefaultScope } from "@/types/accessControl";

interface RoleListPanelProps {
  roles: Role[];
  isLoading: boolean;
  selectedRoleId: number | null;
  onSelectRole: (role: Role) => void;
}

type FilterState = {
  search: string;
  type: RoleType | "ALL";
  scope: DefaultScope | "ALL";
  status: RoleStatus | "ALL";
};

const FILTER_CHIPS: { key: keyof FilterState; label: string; options: { value: string; label: string }[] }[] = [
  {
    key: "type",
    label: "Type",
    options: [
      { value: "ALL", label: "All Types" },
      { value: "SYSTEM", label: "System Roles" },
      { value: "CUSTOM", label: "Custom Roles" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "ALL", label: "All Status" },
      { value: "ACTIVE", label: "Active" },
      { value: "INACTIVE", label: "Inactive" },
      { value: "ARCHIVED", label: "Archived" },
    ],
  },
  {
    key: "scope",
    label: "Scope",
    options: [
      { value: "ALL", label: "All Scopes" },
      { value: "GLOBAL", label: "Entire Platform (Global)" },
      { value: "ORGANIZATION", label: "My Organization" },
      { value: "ORGANIZATION_AND_CHILDREN", label: "Org + Sub-Departments" },
      { value: "DEPARTMENT", label: "My Department" },
      { value: "DISTRICT", label: "My District" },
      { value: "PROJECT", label: "Assigned Projects" },
    ],
  },
];

export function RoleListPanel({ roles, isLoading, selectedRoleId, onSelectRole }: RoleListPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "ALL",
    scope: "ALL",
    status: "ALL",
  });
  const [showFilters, setShowFilters] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = roles.filter((role) => {
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const matchesSearch =
        role.name.toLowerCase().includes(term) ||
        role.code.toLowerCase().includes(term) ||
        (role.displayName?.toLowerCase().includes(term));
      if (!matchesSearch) return false;
    }
    if (filters.type !== "ALL" && role.type !== filters.type) return false;
    if (filters.status !== "ALL" && role.status !== filters.status) return false;
    if (filters.scope !== "ALL" && role.defaultScope !== filters.scope) return false;
    return true;
  });

  const systemRoles = filtered.filter((r) => r.isSystemRole || r.type === "SYSTEM");
  const customRoles = filtered.filter((r) => !r.isSystemRole && r.type !== "SYSTEM");

  const userCount = (role: Role) => (role._count?.roleAssignments ?? 0) + (role._count?.users ?? 0);

  const renderRoleButton = (role: Role) => {
    const isSelected = role.id === selectedRoleId;
    const isSystem = role.isSystemRole || role.type === "SYSTEM";

    return (
      <motion.button
        key={role.id}
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => onSelectRole(role)}
        role="option"
        aria-selected={isSelected}
        className={cn(
          "w-full text-left px-4 py-3 border-l-[3px] border-b border-b-slate-100/60 transition-all duration-150 min-h-[60px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-inset",
          isSelected
            ? "bg-blue-50/70 border-l-blue-600 shadow-sm"
            : "border-l-transparent hover:bg-slate-50/60"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={cn("text-xs font-bold truncate flex items-center gap-1.5", isSelected ? "text-blue-900" : "text-slate-900")}>
              {isSystem && <Lock size={12} className="text-amber-600 shrink-0" />}
              <span>{role.displayName || role.name}</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
              {role.code}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <TypeBadge type={role.type} />
            <StatusBadge status={role.status} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <ScopeBadge scope={role.defaultScope} />
          <ProtectedIndicator isProtected={role.isProtected} />
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 ml-auto bg-slate-100 px-2 py-0.5 rounded-full">
            <Users size={11} aria-hidden="true" />
            <span>{userCount(role)} users</span>
          </span>
        </div>
      </motion.button>
    );
  };

  return (
    <div
      className="flex flex-col h-full bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden"
      role="listbox"
      aria-label="Role list"
      tabIndex={0}
    >
      {/* Search + Filter Header */}
      <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={15}
            aria-hidden="true"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search roles by name or code..."
            className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            aria-label="Search roles"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 hover:underline"
          >
            <Filter size={12} aria-hidden="true" />
            <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
          </button>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            {filtered.length} Total Roles
          </span>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-2 pt-1"
            >
              {FILTER_CHIPS.map((chip) => (
                <div key={chip.key} className="flex flex-wrap gap-1">
                  {chip.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, [chip.key]: opt.value }))}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-lg border transition-all",
                        filters[chip.key] === opt.value
                          ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2-Tier Role List */}
      <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-slate-100" data-lenis-prevent>
        {isLoading ? (
          <div className="p-6 text-center text-xs text-slate-400 font-semibold">Loading roles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-semibold">No roles match your filters.</div>
        ) : (
          <div className="space-y-4 py-2">
            {/* System Roles Section */}
            {systemRoles.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-amber-50/80 border-y border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-amber-900">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-amber-600" />
                    <span>🔒 Protected System Roles ({systemRoles.length})</span>
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700">Platform Core</span>
                </div>
                {systemRoles.map(renderRoleButton)}
              </div>
            )}

            {/* Custom Roles Section */}
            {customRoles.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-slate-100/80 border-y border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <ShieldAlert size={13} className="text-blue-600" />
                    <span>Configurable Custom Roles ({customRoles.length})</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">Admin Managed</span>
                </div>
                {customRoles.map(renderRoleButton)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
