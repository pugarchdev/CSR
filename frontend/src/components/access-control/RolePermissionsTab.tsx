// Role Permissions Tab — Individual permission display with module grouping
"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronRight, AlertTriangle, Link2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskBadge, DelegableBadge } from "./RoleBadges";
import { UnsavedChangesBar } from "./UnsavedChangesBar";
import type { Permission, Role } from "@/types/accessControl";

interface RolePermissionsTabProps {
  role: Role;
  allPermissions: Permission[];
  currentPermissionKeys: string[];
  originalPermissionKeys: string[];
  onPermissionsChange: (keys: string[]) => void;
  onReviewChanges: () => void;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  isReadOnly: boolean;
}

// Dangerous permission combinations to warn about
const DANGEROUS_COMBOS: { keys: string[]; warning: string }[] = [
  { keys: ["role:delete", "role:create"], warning: "Allows deleting and recreating roles — potential privilege escalation path." },
  { keys: ["user:suspend", "user:activate"], warning: "Full user lifecycle control — sensitive administrative power." },
  { keys: ["role:configure", "user:assign-role"], warning: "Can modify roles AND assign them — create and grant arbitrary access." },
];

export function RolePermissionsTab({
  role: _role,
  allPermissions,
  currentPermissionKeys,
  originalPermissionKeys,
  onPermissionsChange,
  onReviewChanges,
  onSave,
  onDiscard,
  isSaving,
  isReadOnly,
}: RolePermissionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  // Group permissions by module
  const modules = useMemo(() => {
    const moduleMap = new Map<string, Permission[]>();
    for (const perm of allPermissions) {
      const mod = perm.module || perm.key.split(":")[0] || "other";
      const list = moduleMap.get(mod) || [];
      list.push(perm);
      moduleMap.set(mod, list);
    }
    // Sort modules alphabetically
    return Array.from(moduleMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  // Initialize all modules as expanded
  useEffect(() => {
    if (expandedModules.size === 0 && modules.length > 0) {
      setExpandedModules(new Set(modules.map(([mod]) => mod)));
    }
  }, [modules, expandedModules.size]);

  // Filter permissions by search term and risk level
  const filteredModules = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return modules
      .map(([mod, perms]) => {
        const filtered = perms.filter((p) => {
          if (riskFilter !== "ALL" && (p.riskLevel || "LOW") !== riskFilter) return false;
          if (!term) return true;
          return (
            p.key.toLowerCase().includes(term) ||
            (p.title || "").toLowerCase().includes(term) ||
            (p.description || "").toLowerCase().includes(term) ||
            mod.toLowerCase().includes(term)
          );
        });
        return [mod, filtered] as [string, Permission[]];
      })
      .filter(([, perms]) => perms.length > 0);
  }, [modules, searchTerm, riskFilter]);

  // Dirty state detection
  const addedKeys = currentPermissionKeys.filter((k) => !originalPermissionKeys.includes(k));
  const removedKeys = originalPermissionKeys.filter((k) => !currentPermissionKeys.includes(k));
  const isDirty = addedKeys.length > 0 || removedKeys.length > 0;

  // Dangerous combos check
  const activeDangerousCombos = DANGEROUS_COMBOS.filter((combo) =>
    combo.keys.every((k) => currentPermissionKeys.includes(k))
  );

  // High-risk check
  const hasHighRiskChanges = useMemo(() => {
    return addedKeys.some((key) => {
      const perm = allPermissions.find((p) => p.key === key);
      return perm?.riskLevel === "HIGH" || perm?.riskLevel === "CRITICAL";
    });
  }, [addedKeys, allPermissions]);

  const togglePermission = useCallback(
    (key: string) => {
      if (isReadOnly) return;
      const newKeys = currentPermissionKeys.includes(key)
        ? currentPermissionKeys.filter((k) => k !== key)
        : [...currentPermissionKeys, key];
      onPermissionsChange(newKeys);
    },
    [currentPermissionKeys, onPermissionsChange, isReadOnly]
  );

  const toggleModule = useCallback(
    (modulePerms: Permission[]) => {
      if (isReadOnly) return;
      const moduleKeys = modulePerms.map((p) => p.key);
      const allSelected = moduleKeys.every((k) => currentPermissionKeys.includes(k));
      let newKeys: string[];
      if (allSelected) {
        newKeys = currentPermissionKeys.filter((k) => !moduleKeys.includes(k));
      } else {
        const toAdd = moduleKeys.filter((k) => !currentPermissionKeys.includes(k));
        newKeys = [...currentPermissionKeys, ...toAdd];
      }
      onPermissionsChange(newKeys);
    },
    [currentPermissionKeys, onPermissionsChange, isReadOnly]
  );

  const toggleExpand = (mod: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Search + Risk filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search permissions..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10 transition-all"
            aria-label="Search permissions"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setRiskFilter(level)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all min-h-[28px]",
                riskFilter === level
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-300"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span><strong className="text-slate-700">{currentPermissionKeys.length}</strong> granted</span>
        <span><strong className="text-slate-700">{allPermissions.length}</strong> total</span>
        <span><strong className="text-slate-700">{filteredModules.length}</strong> modules shown</span>
      </div>

      {/* Dangerous combos warning */}
      {activeDangerousCombos.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} aria-hidden="true" />
            Dangerous Permission Combinations Detected
          </p>
          {activeDangerousCombos.map((combo, i) => (
            <p key={i} className="text-[11px] text-amber-700 ml-5 mt-1">
              <span className="font-mono">{combo.keys.join(" + ")}</span>: {combo.warning}
            </p>
          ))}
        </div>
      )}

      {/* Module groups */}
      {filteredModules.map(([mod, perms]) => {
        const isExpanded = expandedModules.has(mod);
        const selectedCount = perms.filter((p) => currentPermissionKeys.includes(p.key)).length;
        const allSelected = selectedCount === perms.length;
        const someSelected = selectedCount > 0 && !allSelected;

        return (
          <div
            key={mod}
            className="border border-slate-200/60 rounded-xl overflow-hidden bg-white/60"
          >
            {/* Module Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/60 border-b border-slate-100/60">
              <button
                type="button"
                onClick={() => toggleExpand(mod)}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
                aria-label={isExpanded ? `Collapse ${mod} module` : `Expand ${mod} module`}
                aria-expanded={isExpanded}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {/* Module select-all checkbox */}
              {!isReadOnly && (
                <ModuleCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => toggleModule(perms)}
                  label={`Select all ${mod} permissions`}
                />
              )}

              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-700 capitalize">{mod.replace(/[-_]/g, " ")}</span>
                <span className="text-[10px] text-slate-400 ml-2">
                  {selectedCount}/{perms.length}
                </span>
              </div>
            </div>

            {/* Permission List */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="divide-y divide-slate-100/60">
                    {perms.map((perm) => {
                      const isChecked = currentPermissionKeys.includes(perm.key);
                      const isAdded = addedKeys.includes(perm.key);
                      const isRemoved = removedKeys.includes(perm.key);

                      return (
                        <label
                          key={perm.id || perm.key}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer min-h-[48px]",
                            isReadOnly && "cursor-default",
                            isChecked ? "bg-blue-50/30" : "hover:bg-slate-50/40",
                            isAdded && "bg-emerald-50/40",
                            isRemoved && "bg-red-50/40"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm.key)}
                            disabled={isReadOnly}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40 min-w-[16px] min-h-[16px]"
                            aria-label={`${perm.title || perm.key}: ${perm.description || ""}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800">
                                {perm.title || perm.key.split(":").map((p) => p.replace(/[-_]/g, " ")).join(" · ")}
                              </span>
                              <RiskBadge level={perm.riskLevel || "LOW"} />
                              {!perm.isDelegable && <DelegableBadge isDelegable={false} />}
                              {isAdded && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+ADDED</span>
                              )}
                              {isRemoved && (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">−REMOVED</span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-blue-600/80 mt-0.5">{perm.key}</p>
                            {perm.description && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{perm.description}</p>
                            )}
                            {perm.dependencies && perm.dependencies.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Link2 size={10} className="text-slate-400" aria-hidden="true" />
                                <span className="text-[10px] text-slate-400">
                                  Depends on: {perm.dependencies.join(", ")}
                                </span>
                              </div>
                            )}
                            {perm.scopeBehavior && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Info size={10} className="text-slate-400" aria-hidden="true" />
                                <span className="text-[10px] text-slate-400">
                                  Scope: {perm.scopeBehavior}
                                </span>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {filteredModules.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          No permissions match your search.
        </div>
      )}

      {/* Unsaved changes bar */}
      <UnsavedChangesBar
        isVisible={isDirty}
        addedCount={addedKeys.length}
        removedCount={removedKeys.length}
        isSaving={isSaving}
        hasHighRiskChanges={hasHighRiskChanges}
        onReviewChanges={onReviewChanges}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    </div>
  );
}

// Module select-all checkbox with indeterminate state
function ModuleCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40 shrink-0"
      aria-label={label}
    />
  );
}
