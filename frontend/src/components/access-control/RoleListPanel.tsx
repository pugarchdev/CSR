// Role List Panel — Searchable, filterable, keyboard-navigable role list
"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Users } from "lucide-react";
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
      { value: "SYSTEM", label: "System" },
      { value: "CUSTOM", label: "Custom" },
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
      { value: "GLOBAL", label: "Global (Statewide)" },
      { value: "ORGANIZATION", label: "Organization" },
      { value: "ORGANIZATION_AND_CHILDREN", label: "Org + Children" },
      { value: "DEPARTMENT", label: "Department" },
      { value: "DISTRICT", label: "District" },
      { value: "DIVISION", label: "Division" },
      { value: "ASSIGNED", label: "Assigned" },
      { value: "OWN", label: "Own Records" },
      { value: "MULTI_ORGANIZATION", label: "Multi-Org" },
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
  const [focusIndex, setFocusIndex] = useState(-1);

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (filtered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(focusIndex + 1, filtered.length - 1);
        setFocusIndex(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(focusIndex - 1, 0);
        setFocusIndex(prev);
      } else if (e.key === "Enter" && focusIndex >= 0) {
        e.preventDefault();
        onSelectRole(filtered[focusIndex]);
      }
    },
    [filtered, focusIndex, onSelectRole]
  );

  const userCount = (role: Role) => (role._count?.roleAssignments ?? 0) + (role._count?.users ?? 0);

  return (
    <div
      className="flex flex-col h-full bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden"
      role="listbox"
      aria-label="Role list"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Search + Filter Header */}
      <div className="p-3 border-b border-slate-100/80 space-y-2.5">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={15}
            aria-hidden="true"
          />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setFocusIndex(-1); }}
            placeholder="Search roles..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10 transition-all"
            aria-label="Search roles"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          aria-expanded={showFilters}
        >
          <Filter size={12} aria-hidden="true" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-2"
            >
              {FILTER_CHIPS.map((chip) => (
                <div key={chip.key} className="flex flex-wrap gap-1">
                  {chip.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, [chip.key]: opt.value }))}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-lg border transition-all min-h-[28px]",
                        filters[chip.key] === opt.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-300"
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

        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {filtered.length} role{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Role List */}
      <div ref={listRef} className="flex-1 overflow-y-auto" data-lenis-prevent>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-400">Loading roles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No roles match your filters.</div>
        ) : (
          filtered.map((role, index) => {
            const isSelected = role.id === selectedRoleId;
            const isFocused = index === focusIndex;

            return (
              <motion.button
                key={role.id}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.015, duration: 0.15 }}
                onClick={() => onSelectRole(role)}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "w-full text-left px-4 py-3 border-l-[3px] border-b border-b-slate-100/60 transition-all duration-150 min-h-[60px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-inset",
                  isSelected
                    ? "bg-blue-50/60 border-l-blue-600"
                    : isFocused
                    ? "bg-slate-50/80 border-l-slate-300"
                    : "border-l-transparent hover:bg-slate-50/40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={cn("text-sm font-semibold truncate", isSelected ? "text-blue-700" : "text-slate-800")}>
                      {role.displayName || role.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                      {role.code}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1">
                      <TypeBadge type={role.type} />
                      <StatusBadge status={role.status} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <ScopeBadge scope={role.defaultScope} />
                  <ProtectedIndicator isProtected={role.isProtected} />
                  <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-auto">
                    <Users size={10} aria-hidden="true" />
                    {userCount(role)}
                  </span>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
