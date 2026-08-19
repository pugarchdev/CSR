// Role Members Tab — Assigned users with scope, validity, and actions
"use client";

import { useState } from "react";
import { Users, Eye, UserMinus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ScopeBadge } from "./RoleBadges";
import { useAssignments, useDeleteAssignment, useEffectiveAccess } from "@/hooks/useAccessControl";
import { useAuthStore } from "@/store/authStore";
import { useToastActions } from "@/components/ui/Toast";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import type { Role, Assignment } from "@/types/accessControl";

interface RoleMembersTabProps {
  role: Role;
}

export function RoleMembersTab({ role }: RoleMembersTabProps) {
  const { data: assignmentsData, isLoading, refetch } = useAssignments({ roleId: role.id });
  const deleteAssignment = useDeleteAssignment();
  const { hasPermission } = useAuthStore();
  const toast = useToastActions();
  const canAssignRole = hasPermission("user:assign-role");
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  const assignments = assignmentsData?.data ?? [];

  const { sortedItems: sortedAssignments, sortKey, sortDirection, requestSort } = useTableSort(assignments, {
    customGetters: {
      user: (a) => a.user ? `${a.user.firstName || ""} ${a.user.lastName || ""} ${a.user.email || ""}` : a.userId,
      scope: (a) => a.scope,
      status: (a) => a.status,
      validFrom: (a) => a.validFrom,
      validUntil: (a) => a.validUntil,
      scopeDetail: (a) => a.organizationId || a.districtId || "",
    }
  });

  const handleRevoke = async (assignment: Assignment) => {
    try {
      await deleteAssignment.mutateAsync(assignment.id);
      toast.success("Assignment Revoked", `Revoked ${assignment.user?.email ?? "user"}'s assignment.`);
      refetch();
    } catch (err) {
      toast.error("Revocation Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE": return "success" as const;
      case "EXPIRED": return "warning" as const;
      case "REVOKED": return "danger" as const;
      default: return "muted" as const;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Users size={14} className="text-blue-500" aria-hidden="true" />
          Assigned Members ({assignments.length})
        </h4>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-slate-400">Loading members...</div>
      ) : assignments.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">
          No users are currently assigned to this role.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/60">
          <table className="w-full text-sm" role="table">
            <thead className="bg-slate-50/80 border-b border-slate-100/80">
              <tr>
                <SortableTh sortKey="user" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</SortableTh>
                <SortableTh sortKey="scope" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scope</SortableTh>
                <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</SortableTh>
                <SortableTh sortKey="validFrom" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid From</SortableTh>
                <SortableTh sortKey="validUntil" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Until</SortableTh>
                <SortableTh sortKey="scopeDetail" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Org / District</SortableTh>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {sortedAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {assignment.user
                          ? `${assignment.user.firstName} ${assignment.user.lastName}`
                          : assignment.userId}
                      </p>
                      {assignment.user?.email && (
                        <p className="text-[11px] text-slate-400">{assignment.user.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ScopeBadge scope={assignment.scope as any} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(assignment.status)} size="sm" dot>
                      {assignment.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {assignment.validFrom
                      ? new Date(assignment.validFrom).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {assignment.validUntil
                      ? new Date(assignment.validUntil).toLocaleDateString()
                      : "No expiry"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                    {assignment.organizationId || assignment.districtId || assignment.projectId || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={() => setPreviewUserId(assignment.userId)}
                        title="Preview effective access"
                      >
                        <span className="sr-only">Preview</span>
                      </Button>
                      {canAssignRole && assignment.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={UserMinus}
                          onClick={() => handleRevoke(assignment)}
                          title="Revoke assignment"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <span className="sr-only">Revoke</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Effective Access Preview Modal */}
      {previewUserId && (
        <EffectiveAccessPreviewModal
          userId={previewUserId}
          onClose={() => setPreviewUserId(null)}
        />
      )}
    </div>
  );
}

function EffectiveAccessPreviewModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useEffectiveAccess(userId);

  return (
    <Modal isOpen={true} onClose={onClose} title="Effective Access Preview">
      {isLoading ? (
        <div className="py-6 text-center text-sm text-slate-400">Loading effective access...</div>
      ) : data ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {(data.roles ?? []).map((r: string) => (
                <Badge key={r} variant="primary" size="sm">{r}</Badge>
              ))}
              {(!data.roles || data.roles.length === 0) && (
                <span className="text-xs text-slate-400">No roles assigned</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">
              Permissions ({(data.permissions ?? []).length})
            </p>
            <div className="flex flex-wrap gap-1 max-h-[40vh] overflow-y-auto" data-lenis-prevent>
              {(data.permissions ?? []).map((p: string) => (
                <span key={p} className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/40">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-slate-400">Unable to load effective access.</div>
      )}
    </Modal>
  );
}
