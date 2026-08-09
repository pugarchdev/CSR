// Create Role Wizard — Multi-step role creation flow
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RiskBadge } from "./RoleBadges";
import { ChevronLeft, ChevronRight, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useCreateRole, usePermissions } from "@/hooks/useAccessControl";
import { useToastActions } from "@/components/ui/Toast";
import type { DefaultScope, Permission } from "@/types/accessControl";

interface CreateRoleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (roleId: number) => void;
}

const STEPS = ["Metadata", "Scope", "Permissions", "Members", "Review"];

const SCOPE_OPTIONS: { value: DefaultScope; label: string; description: string }[] = [
  { value: "GLOBAL", label: "Global", description: "Applies across the entire Maharashtra CSR platform." },
  { value: "ORGANIZATION", label: "Organization", description: "Scoped to the specific registered organization." },
  { value: "ORGANIZATION_AND_CHILDREN", label: "Organization + Children", description: "Scoped to top-level organization and all verified child departments/branches." },
  { value: "DEPARTMENT", label: "Department", description: "Scoped strictly to the user's assigned department." },
  { value: "DISTRICT", label: "District", description: "Scoped to the officer's assigned district." },
  { value: "DIVISION", label: "Division", description: "Scoped to an administrative division." },
  { value: "ASSIGNED", label: "Assigned", description: "Scoped strictly to assigned enquiries, pitches, and projects." },
  { value: "OWN", label: "Own Records", description: "Scoped to records created directly by the user." },
  { value: "MULTI_ORGANIZATION", label: "Multi-Organization", description: "Cross-organization operational access." },
];

export function CreateRoleWizard({ isOpen, onClose, onCreated }: CreateRoleWizardProps) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<DefaultScope>("ORGANIZATION");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState("");

  const { data: allPermissions = [], isLoading: loadingPerms } = usePermissions();
  const createRole = useCreateRole();
  const toast = useToastActions();

  const resetForm = () => {
    setStep(0);
    setCode("");
    setName("");
    setDisplayName("");
    setDescription("");
    setScope("ORGANIZATION");
    setSelectedPermissions([]);
    setPermSearch("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Validation per step
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return code.trim().length >= 3 && name.trim().length >= 2;
      case 1: return true;
      case 2: return true;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  }, [step, code, name]);

  const handleSubmit = async () => {
    try {
      const result: any = await createRole.mutateAsync({
        code: code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: name.trim(),
        displayName: displayName.trim() || name.trim(),
        description: description.trim(),
        defaultScope: scope,
        permissions: selectedPermissions,
      });
      toast.success("Role Created", `Role "${name}" created successfully.`);
      const newId = result?.id ?? result?.data?.id;
      if (newId) onCreated(newId);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create role";
      toast.error("Creation Failed", msg);
    }
  };

  // Permission modules for step 3
  const modules = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPermissions) {
      const mod = p.module || p.key.split(":")[0] || "other";
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  const filteredModules = useMemo(() => {
    if (!permSearch) return modules;
    const term = permSearch.toLowerCase();
    return modules
      .map(([mod, perms]) => [
        mod,
        perms.filter((p) =>
          p.key.toLowerCase().includes(term) ||
          (p.title || "").toLowerCase().includes(term) ||
          mod.toLowerCase().includes(term)
        ),
      ] as [string, Permission[]])
      .filter(([, perms]) => perms.length > 0);
  }, [modules, permSearch]);

  const togglePerm = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleModuleAll = (perms: Permission[]) => {
    const keys = perms.map((p) => p.key);
    const allSelected = keys.every((k) => selectedPermissions.includes(k));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !keys.includes(k)));
    } else {
      setSelectedPermissions((prev) => [...prev, ...keys.filter((k) => !prev.includes(k))]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Role" className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all min-h-[28px] ${
                i === step
                  ? "bg-blue-600 text-white"
                  : i < step
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {i < step ? <Check size={10} /> : null}
              {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
          </div>
        ))}
      </div>

      <div className="min-h-[300px] max-h-[55vh] overflow-y-auto pr-1" data-lenis-prevent>
        <AnimatePresence mode="wait">
          {/* Step 0: Metadata */}
          {step === 0 && (
            <motion.div key="step-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label htmlFor="role-code" className="block text-xs font-bold text-slate-600 mb-1">Role Code *</label>
                <input
                  id="role-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                  placeholder="e.g. DISTRICT_COORDINATOR"
                  className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                  aria-required="true"
                />
                <p className="text-[10px] text-slate-400 mt-1">Uppercase letters, numbers, underscores only. Minimum 3 characters.</p>
              </div>
              <div>
                <label htmlFor="role-name" className="block text-xs font-bold text-slate-600 mb-1">Name *</label>
                <input
                  id="role-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. District Coordinator"
                  className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                  aria-required="true"
                />
              </div>
              <div>
                <label htmlFor="role-display" className="block text-xs font-bold text-slate-600 mb-1">Display Name</label>
                <input
                  id="role-display"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Optional — defaults to Name"
                  className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label htmlFor="role-desc" className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                <textarea
                  id="role-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this role is used for..."
                  className="w-full h-20 px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </motion.div>
          )}

          {/* Step 1: Scope */}
          {step === 1 && (
            <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <p className="text-sm text-slate-600 mb-2">Select the default scope for this role:</p>
              {SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all min-h-[48px] ${
                    scope === opt.value
                      ? "bg-blue-50/60 border-blue-300/60 shadow-sm"
                      : "bg-white border-slate-200/60 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={() => setScope(opt.value)}
                    className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500/40"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </motion.div>
          )}

          {/* Step 2: Permissions */}
          {step === 2 && (
            <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder="Search permissions..."
                  className="w-full h-9 pl-3 pr-3 bg-slate-50/80 border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
                  aria-label="Search permissions"
                />
              </div>
              <p className="text-xs text-slate-500">{selectedPermissions.length} permissions selected</p>
              {loadingPerms ? (
                <div className="py-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Loading permissions...
                </div>
              ) : (
                filteredModules.map(([mod, perms]) => {
                  const allSelected = perms.every((p) => selectedPermissions.includes(p.key));
                  const someSelected = perms.some((p) => selectedPermissions.includes(p.key)) && !allSelected;
                  return (
                    <div key={mod} className="border border-slate-200/60 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50/60">
                        <ModuleCheckboxWizard
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={() => toggleModuleAll(perms)}
                          label={`Select all ${mod}`}
                        />
                        <span className="text-xs font-bold text-slate-700 capitalize">{mod.replace(/[-_]/g, " ")}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{perms.filter((p) => selectedPermissions.includes(p.key)).length}/{perms.length}</span>
                      </div>
                      <div className="divide-y divide-slate-100/40">
                        {perms.map((perm) => (
                          <label key={perm.key} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50/40 cursor-pointer min-h-[40px]">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.key)}
                              onChange={() => togglePerm(perm.key)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-slate-700">{perm.title || perm.key}</span>
                              <span className="text-[10px] font-mono text-slate-400 ml-2">{perm.key}</span>
                            </div>
                            <RiskBadge level={perm.riskLevel || "LOW"} />
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* Step 3: Members (optional) */}
          {step === 3 && (
            <motion.div key="step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="p-6 bg-slate-50/60 rounded-xl border border-slate-200/40 text-center">
                <p className="text-sm text-slate-500">
                  Member assignment is optional during creation. You can assign users after the role is created from the Members tab.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <motion.div key="step-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700">Review Role Configuration</h4>
              <div className="grid grid-cols-2 gap-3">
                <ReviewField label="Code" value={code.toUpperCase().replace(/\s+/g, "_")} mono />
                <ReviewField label="Name" value={name} />
                <ReviewField label="Display Name" value={displayName || name} />
                <ReviewField label="Scope" value={scope} />
              </div>
              {description && <ReviewField label="Description" value={description} />}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Permissions ({selectedPermissions.length})
                </p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto" data-lenis-prevent>
                  {selectedPermissions.length === 0 ? (
                    <span className="text-xs text-slate-400">No permissions selected</span>
                  ) : (
                    selectedPermissions.map((key) => (
                      <span key={key} className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/40">
                        {key}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100/60 mt-4">
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          {step < STEPS.length - 1 ? (
            <Button variant="primary" size="sm" icon={ChevronRight} onClick={() => setStep(step + 1)} disabled={!canProceed}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Check}
              loading={createRole.isPending}
              loadingText="Creating..."
              onClick={handleSubmit}
            >
              Create Role
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ReviewField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-slate-800 mt-0.5 ${mono ? "font-mono bg-slate-50 px-1.5 py-0.5 rounded inline-block" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ModuleCheckboxWizard({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/40" aria-label={label} />
  );
}
