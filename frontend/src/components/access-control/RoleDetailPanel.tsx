// Role Detail Panel — Tabbed interface for role management
"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, Key, Users, Activity } from "lucide-react";
import { RoleSummaryTab } from "./RoleSummaryTab";
import { RolePermissionsTab } from "./RolePermissionsTab";
import { ReviewChangesDialog } from "./ReviewChangesDialog";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";
import { RoleMembersTab } from "./RoleMembersTab";
import { RoleAuditTab } from "./RoleAuditTab";
import { CloneRoleDialog } from "./CloneRoleDialog";
import {
  usePermissions,
  useRolePermissions,
  useUpdateRolePermissions,
  useActivateRole,
  useDeactivateRole,
  useDeleteRole,
  usePatchRole,
  useImpactPreview,
} from "@/hooks/useAccessControl";
import { useToastActions } from "@/components/ui/Toast";
import { useAuthStore } from "@/store/authStore";
import type { Role, Permission } from "@/types/accessControl";

interface RoleDetailPanelProps {
  role: Role;
  onRoleDeleted: () => void;
  onRoleUpdated: () => void;
  onSelectClonedRole: (id: number) => void;
}

const TABS = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "permissions", label: "Permissions", icon: Key },
  { id: "members", label: "Members", icon: Users },
  { id: "audit", label: "Audit History", icon: Activity },
] as const;

type TabId = typeof TABS[number]["id"];

export function RoleDetailPanel({ role, onRoleDeleted, onRoleUpdated, onSelectClonedRole }: RoleDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [editPermissions, setEditPermissions] = useState<string[]>(role.permissions);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictServerVersion, setConflictServerVersion] = useState(0);

  const toast = useToastActions();
  const { hasPermission } = useAuthStore();

  // Data queries
  const { data: allPermissions = [] } = usePermissions();
  const updatePermissions = useUpdateRolePermissions();
  const activateRole = useActivateRole();
  const deactivateRole = useDeactivateRole();
  const deleteRole = useDeleteRole();
  const patchRole = usePatchRole();
  const impactPreviewMutation = useImpactPreview(role.id);

  // Reset local permissions when role changes
  useState(() => {
    setEditPermissions(role.permissions);
  });

  // Compute changes
  const addedKeys = editPermissions.filter((k) => !role.permissions.includes(k));
  const removedKeys = role.permissions.filter((k) => !editPermissions.includes(k));

  // High-risk/critical counts
  const permMap = useMemo(() => {
    const map = new Map<string, Permission>();
    allPermissions.forEach((p) => map.set(p.key, p));
    return map;
  }, [allPermissions]);

  const highRiskCount = role.permissions.filter((k) => permMap.get(k)?.riskLevel === "HIGH").length;
  const criticalCount = role.permissions.filter((k) => permMap.get(k)?.riskLevel === "CRITICAL").length;

  const hasHighRiskChanges = addedKeys.some((k) => {
    const perm = permMap.get(k);
    return perm?.riskLevel === "HIGH" || perm?.riskLevel === "CRITICAL";
  });

  const isReadOnly = role.isProtected || !hasPermission("role:configure");

  const handleReviewChanges = useCallback(() => {
    // Trigger impact preview
    impactPreviewMutation.mutate({
      permissionsToAdd: addedKeys,
      permissionsToRemove: removedKeys,
    });
    setShowReviewDialog(true);
  }, [addedKeys, removedKeys, impactPreviewMutation]);

  const handleSavePermissions = useCallback(
    async (reason?: string) => {
      try {
        await updatePermissions.mutateAsync({
          id: role.id,
          body: {
            permissions: editPermissions,
            version: role.version,
            reason: reason || undefined,
          },
        });
        toast.success("Permissions Saved", `Permissions updated for "${role.displayName || role.name}".`);
        setShowReviewDialog(false);
        onRoleUpdated();
      } catch (err: any) {
        if (err?.status === 409) {
          const serverVersion = err?.meta?.serverVersion ?? role.version + 1;
          setConflictServerVersion(serverVersion);
          setShowConflictDialog(true);
          setShowReviewDialog(false);
        } else {
          toast.error("Save Failed", err?.message ?? "Unknown error");
        }
      }
    },
    [editPermissions, role, updatePermissions, toast, onRoleUpdated]
  );

  const handleDirectSave = useCallback(() => {
    if (hasHighRiskChanges) {
      handleReviewChanges();
    } else {
      handleSavePermissions();
    }
  }, [hasHighRiskChanges, handleReviewChanges, handleSavePermissions]);

  const handleDiscard = useCallback(() => {
    setEditPermissions(role.permissions);
  }, [role.permissions]);

  const handleActivate = async () => {
    try {
      await activateRole.mutateAsync(role.id);
      toast.success("Role Activated", `"${role.displayName || role.name}" is now active.`);
      onRoleUpdated();
    } catch (err) {
      toast.error("Activation Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateRole.mutateAsync(role.id);
      toast.success("Role Deactivated", `"${role.displayName || role.name}" is now inactive.`);
      onRoleUpdated();
    } catch (err) {
      toast.error("Deactivation Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success("Role Deleted", `"${role.displayName || role.name}" has been deleted.`);
      onRoleDeleted();
    } catch (err) {
      toast.error("Deletion Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleConflictReload = () => {
    setShowConflictDialog(false);
    onRoleUpdated();
  };

  const handleConflictForce = async () => {
    setShowConflictDialog(false);
    try {
      await updatePermissions.mutateAsync({
        id: role.id,
        body: {
          permissions: editPermissions,
          version: conflictServerVersion,
        },
      });
      toast.success("Permissions Saved", "Forced overwrite successful.");
      onRoleUpdated();
    } catch (err) {
      toast.error("Save Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

return (
    <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight break-words">
              {role.displayName || role.name}
            </h2>
            <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-0.5 break-all">{role.code}</p>
          </div>
        </div>

        {/* Tabs - Added overflow-x-auto to allow horizontal scrolling on small screens without squishing */}
        <div 
          className="flex items-center gap-0 sm:gap-2 mt-4 border-b border-slate-100/80 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
          role="tablist"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-semibold border-b-2 transition-all min-h-[44px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                  isActive
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
                )}
              >
                <Icon size={14} aria-hidden="true" className="shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        {activeTab === "summary" && (
          <RoleSummaryTab
            role={role}
            highRiskCount={highRiskCount}
            criticalCount={criticalCount}
            onEdit={() => {/* TODO: inline edit dialog */}}
            onClone={() => setShowCloneDialog(true)}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onDelete={handleDelete}
          />
        )}

        {activeTab === "permissions" && (
          <RolePermissionsTab
            role={role}
            allPermissions={allPermissions}
            currentPermissionKeys={editPermissions}
            originalPermissionKeys={role.permissions}
            onPermissionsChange={setEditPermissions}
            onReviewChanges={handleReviewChanges}
            onSave={handleDirectSave}
            onDiscard={handleDiscard}
            isSaving={updatePermissions.isPending}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === "members" && <RoleMembersTab role={role} />}
        {activeTab === "audit" && <RoleAuditTab role={role} />}
      </div>

      {/* Dialogs */}
      <ReviewChangesDialog
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        addedPermissions={addedKeys}
        removedPermissions={removedKeys}
        impactPreview={impactPreviewMutation.data ?? null}
        isLoadingImpact={impactPreviewMutation.isPending}
        requiresReason={hasHighRiskChanges}
        onConfirmSave={handleSavePermissions}
        isSaving={updatePermissions.isPending}
      />

      <ConflictResolutionDialog
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        serverVersion={conflictServerVersion}
        clientVersion={role.version}
        resourceLabel={role.displayName || role.name}
        onUseServerVersion={handleConflictReload}
        onForceOverwrite={handleConflictForce}
      />

      {showCloneDialog && (
        <CloneRoleDialog
          isOpen={showCloneDialog}
          onClose={() => setShowCloneDialog(false)}
          sourceRole={role}
          onCloned={onSelectClonedRole}
        />
      )}
    </div>
  );
}
