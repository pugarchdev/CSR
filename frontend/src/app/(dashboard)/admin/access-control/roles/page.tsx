// Roles Management Page — Master-detail layout
"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import AccessControlTabs from "@/components/access-control/AccessControlTabs";
import { Button } from "@/components/ui/Button";
import { RoleListPanel } from "@/components/access-control/RoleListPanel";
import { RoleDetailPanel } from "@/components/access-control/RoleDetailPanel";
import { CreateRoleWizard } from "@/components/access-control/CreateRoleWizard";
import { useRoles } from "@/hooks/useAccessControl";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types/accessControl";
import "@/styles/gov-theme.css";

export default function RolesPage() {
  const { data: roles = [], isLoading, refetch } = useRoles();
  const { hasPermission, isAdmin } = useAuthStore();
  const canCreate = isAdmin || hasPermission("role:create");

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  // Auto-select first role on load
  useEffect(() => {
    if (roles.length > 0 && selectedRoleId === null) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  const handleSelectRole = useCallback((role: Role) => {
    setSelectedRoleId(role.id);
  }, []);

  const handleRoleDeleted = useCallback(() => {
    setSelectedRoleId(null);
    refetch();
  }, [refetch]);

  const handleRoleUpdated = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleRoleCreated = useCallback(
    (newId: number) => {
      refetch().then(() => setSelectedRoleId(newId));
    },
    [refetch]
  );

  const handleSelectClonedRole = useCallback(
    (newId: number) => {
      refetch().then(() => setSelectedRoleId(newId));
    },
    [refetch]
  );

  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Roles"
        breadcrumb="Administration / Access Control"
        actions={
          canCreate ? (
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowCreateWizard(true)}>
              Create Role
            </Button>
          ) : undefined
        }
      />

      <AccessControlTabs />

      {/* Master-Detail Layout */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-140px)]">
        {/* Left: Role List (280-320px on desktop, full width on mobile) */}
        <div className="w-full lg:w-[300px] lg:min-w-[280px] lg:max-w-[320px] shrink-0">
          <RoleListPanel
            roles={roles}
            isLoading={isLoading}
            selectedRoleId={selectedRoleId}
            onSelectRole={handleSelectRole}
          />
        </div>

        {/* Right: Role Detail */}
        <div className="flex-1 min-w-0">
          {selectedRole ? (
            <RoleDetailPanel
              key={selectedRole.id}
              role={selectedRole}
              onRoleDeleted={handleRoleDeleted}
              onRoleUpdated={handleRoleUpdated}
              onSelectClonedRole={handleSelectClonedRole}
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-sm">
              <p className="text-sm text-slate-400">Select a role from the list to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Wizard */}
      <CreateRoleWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onCreated={handleRoleCreated}
      />
    </GovPortalLayout>
  );
}
