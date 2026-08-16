// Clone Role Dialog — Uses real /clone endpoint with validation
"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, Copy } from "lucide-react";
import { ScopeBadge } from "./RoleBadges";
import { useCloneRole } from "@/hooks/useAccessControl";
import { useToastActions } from "@/components/ui/Toast";
import type { Role, DefaultScope } from "@/types/accessControl";

interface CloneRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRole: Role;
  onCloned: (roleId: number) => void;
}

const SCOPE_OPTIONS: DefaultScope[] = ["GLOBAL", "ORGANIZATION", "DISTRICT", "PROJECT"];

export function CloneRoleDialog({ isOpen, onClose, sourceRole, onCloned }: CloneRoleDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState(`${sourceRole.displayName || sourceRole.name} (Copy)`);
  const [description, setDescription] = useState(sourceRole.description || "");
  const [scope, setScope] = useState<DefaultScope>(sourceRole.defaultScope);

  const cloneRole = useCloneRole();
  const toast = useToastActions();

  // Scope change warning
  const scopeWarning = useMemo(() => {
    if (sourceRole.defaultScope === "GLOBAL" && scope !== "GLOBAL") {
      return `Cloning a GLOBAL role into ${scope} scope. Permissions not applicable to ${scope} scope may not function as expected. Please review carefully.`;
    }
    return null;
  }, [sourceRole.defaultScope, scope]);

  const isValid = code.trim().length >= 3 && name.trim().length >= 2;

  const handleClone = async () => {
    try {
      const result: any = await cloneRole.mutateAsync({
        id: sourceRole.id,
        body: {
          code: code.trim().toUpperCase().replace(/\s+/g, "_"),
          name: name.trim(),
          displayName: name.trim(),
          description: description.trim(),
          defaultScope: scope,
        },
      });
      toast.success("Role Cloned", `"${name}" created as a clone of "${sourceRole.displayName || sourceRole.name}".`);
      const newId = result?.id ?? result?.data?.id;
      if (newId) onCloned(newId);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to clone role";
      toast.error("Clone Failed", msg);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Clone Role">
      <div className="space-y-4">
        {/* Source info */}
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/40">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cloning From</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{sourceRole.displayName || sourceRole.name}</p>
            <Badge variant="muted" size="sm">{sourceRole.code}</Badge>
            <ScopeBadge scope={sourceRole.defaultScope} />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {sourceRole.permissions.length} permissions will be copied
          </p>
        </div>

        {/* New code */}
        <div>
          <label htmlFor="clone-code" className="block text-xs font-bold text-slate-600 mb-1">
            New Role Code *
          </label>
          <input
            id="clone-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
            placeholder="e.g. CUSTOM_REVIEWER"
            className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
            aria-required="true"
          />
          <p className="text-[10px] text-slate-400 mt-1">Must be unique. Uppercase letters, numbers, underscores.</p>
        </div>

        {/* New name */}
        <div>
          <label htmlFor="clone-name" className="block text-xs font-bold text-slate-600 mb-1">
            New Display Name *
          </label>
          <input
            id="clone-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
            aria-required="true"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="clone-desc" className="block text-xs font-bold text-slate-600 mb-1">
            Description
          </label>
          <textarea
            id="clone-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-16 px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        {/* Scope selection */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Target Scope</label>
          <div className="flex flex-wrap gap-1.5">
            {SCOPE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all min-h-[32px] ${
                  scope === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Scope change warning */}
        {scopeWarning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-amber-700">{scopeWarning}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100/60 mt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={Copy}
          disabled={!isValid}
          loading={cloneRole.isPending}
          loadingText="Cloning..."
          onClick={handleClone}
        >
          Clone Role
        </Button>
      </div>
    </Modal>
  );
}
