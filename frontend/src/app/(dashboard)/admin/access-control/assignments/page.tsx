// Assignments Management Page
"use client";

import { useState, useMemo } from "react";
import { UserPlus, Search, RefreshCw, UserMinus, Eye } from "lucide-react";
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ScopeBadge } from "@/components/access-control/RoleBadges";
import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useRoles,
  useEffectiveAccess,
} from "@/hooks/useAccessControl";
import { useAuthStore } from "@/store/authStore";
import { useToastActions } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { Assignment, DefaultScope } from "@/types/accessControl";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import "@/styles/gov-theme.css";

import AccessControlTabs from "@/components/access-control/AccessControlTabs";

export default function AssignmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { data: assignmentsData, isLoading, refetch } = useAssignments({ page, pageSize: 25, status: statusFilter || undefined });
  const { data: roles = [] } = useRoles();
  const { hasPermission } = useAuthStore();
  const canAssign = hasPermission("user:assign-role");
  const toast = useToastActions();
  const deleteAssignment = useDeleteAssignment();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  // Client-side search filtering
  const filtered = useMemo(() => {
    const list = assignmentsData?.data ?? [];
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter((a) => {
      const userName = a.user ? `${a.user.firstName || ""} ${a.user.lastName || ""}`.toLowerCase() : "";
      const email = (a.user?.email || "").toLowerCase();
      const roleName = (a.role?.name || "").toLowerCase();
      return userName.includes(term) || email.includes(term) || roleName.includes(term);
    });
  }, [assignmentsData, search]);

  const { sortedItems: sortedAssignments, sortKey, sortDirection, requestSort } = useTableSort(filtered, {
    customGetters: {
      user: (a) => a.user ? `${a.user.firstName || ""} ${a.user.lastName || ""} ${a.user.email || ""}` : a.userId,
      role: (a) => a.role?.displayName || a.role?.name || "",
      scope: (a) => a.scope,
      status: (a) => a.status,
      validFrom: (a) => a.validFrom,
      validUntil: (a) => a.validUntil,
    }
  });

  const handleRevoke = async (assignment: Assignment) => {
    try {
      await deleteAssignment.mutateAsync(assignment.id);
      toast.success("Assignment Revoked", `Revoked assignment for ${assignment.user?.email ?? "user"}.`);
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
    <GovPortalLayout>
      <GovPageHeader
        title="Role Assignments"
        breadcrumb="Administration / Access Control"
        actions={
          canAssign ? (
            <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setShowCreateModal(true)}>
              Create Assignment
            </Button>
          ) : undefined
        }
      />

      <AccessControlTabs />

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name, email, or role..."
              className="w-full h-10 pl-9 pr-3 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
              aria-label="Search assignments"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {["", "ACTIVE", "INACTIVE", "EXPIRED", "REVOKED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all min-h-[36px]",
                  statusFilter === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200/60 hover:border-slate-300"
                )}
              >
                {s || "All"}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading assignments...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No assignments found.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-sm">
            <table className="w-full text-sm" role="table">
              <thead className="bg-slate-50/80 border-b border-slate-100/80">
                <tr>
                  <SortableTh sortKey="user" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</SortableTh>
                  <SortableTh sortKey="role" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</SortableTh>
                  <SortableTh sortKey="scope" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scope</SortableTh>
                  <SortableTh sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</SortableTh>
                  <SortableTh sortKey="validFrom" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid From</SortableTh>
                  <SortableTh sortKey="validUntil" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={requestSort} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Until</SortableTh>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {sortedAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {a.user ? `${a.user.firstName} ${a.user.lastName}` : a.userId}
                      </p>
                      {a.user?.email && <p className="text-[10px] text-slate-400">{a.user.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{a.role?.displayName || a.role?.name || `Role ${a.roleId}`}</p>
                      {a.role?.code && <p className="text-[10px] font-mono text-slate-400">{a.role.code}</p>}
                    </td>
                    <td className="px-4 py-3"><ScopeBadge scope={a.scope as DefaultScope} /></td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(a.status)} size="sm" dot>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {a.validFrom ? new Date(a.validFrom).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {a.validUntil ? new Date(a.validUntil).toLocaleDateString() : "No expiry"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setPreviewUserId(a.userId)} title="Preview effective access">
                          <span className="sr-only">Preview</span>
                        </Button>
                        {canAssign && a.status === "ACTIVE" && (
                          <Button
                            variant="ghost" size="sm" icon={UserMinus}
                            onClick={() => handleRevoke(a)}
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

        {/* Pagination */}
        {assignmentsData && assignmentsData.total > 25 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="text-xs text-slate-500">Page {page} of {Math.ceil(assignmentsData.total / 25)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(assignmentsData.total / 25)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <CreateAssignmentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          roles={roles}
          onCreated={() => { setShowCreateModal(false); refetch(); }}
        />
      )}

      {/* Effective Access Preview */}
      {previewUserId && (
        <EffectiveAccessModal userId={previewUserId} onClose={() => setPreviewUserId(null)} />
      )}
    </GovPortalLayout>
  );
}

function CreateAssignmentModal({ isOpen, onClose, roles, onCreated }: {
  isOpen: boolean; onClose: () => void;
  roles: { id: number; code: string; name: string; displayName: string }[];
  onCreated: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState<number | "">("");
  const [scope, setScope] = useState<DefaultScope>("ORGANIZATION");
  const [reason, setReason] = useState("");
  const createAssignment = useCreateAssignment();
  const toast = useToastActions();

  const handleSubmit = async () => {
    if (!userId.trim() || !roleId) return;
    try {
      await createAssignment.mutateAsync({
        userId: userId.trim(),
        roleId: Number(roleId),
        scope,
        reason: reason.trim() || undefined,
      });
      toast.success("Assignment Created", "User assigned to role successfully.");
      onCreated();
    } catch (err) {
      toast.error("Assignment Failed", err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Role Assignment">
      <div className="space-y-4">
        <div>
          <label htmlFor="assign-user" className="block text-xs font-bold text-slate-600 mb-1">User ID *</label>
          <input id="assign-user" type="text" value={userId} onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID" className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10" aria-required="true" />
        </div>
        <div>
          <label htmlFor="assign-role" className="block text-xs font-bold text-slate-600 mb-1">Role *</label>
          <select id="assign-role" value={roleId} onChange={(e) => setRoleId(Number(e.target.value) || "")}
            className="w-full h-10 px-3 bg-white border border-slate-200/60 rounded-xl text-sm focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10" aria-required="true">
            <option value="">Select role...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.displayName || r.name} ({r.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Access Level (Scope)</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { value: "GLOBAL", label: "○ Entire platform" },
              { value: "ORGANIZATION", label: "○ My organization" },
              { value: "ORGANIZATION_AND_CHILDREN", label: "○ Org + Sub-Depts" },
              { value: "DEPARTMENT", label: "○ Specific Department" },
              { value: "DISTRICT", label: "○ Specific District" },
              { value: "PROJECT", label: "○ Assigned Projects" }
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-xl border text-left transition-all",
                  scope === s.value
                    ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Access Hierarchy Tree Preview */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="font-bold text-slate-900">Effective Access Hierarchy Preview:</div>
          <div className="font-mono text-[11px] text-blue-900 font-semibold space-y-0.5 pl-2 border-l-2 border-blue-400">
            <div>Registered Organization</div>
            {scope === "DEPARTMENT" && <div className="pl-3">└── Assigned Department</div>}
            {scope === "DISTRICT" && <div className="pl-3">└── Assigned District Projects</div>}
            {scope === "PROJECT" && <div className="pl-3">└── Specific Assigned Project</div>}
            {scope === "ORGANIZATION_AND_CHILDREN" && <div className="pl-3">└── All Child Sub-Departments</div>}
          </div>
        </div>

        <div>
          <label htmlFor="assign-reason" className="block text-xs font-bold text-slate-600 mb-1">Reason for Assignment</label>
          <textarea id="assign-reason" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Optional justification..." className="w-full h-16 px-3 py-2 bg-white border border-slate-200/60 rounded-xl text-sm resize-none focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100/60 mt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" icon={UserPlus} loading={createAssignment.isPending}
          disabled={!userId.trim() || !roleId} onClick={handleSubmit}>
          Assign
        </Button>
      </div>
    </Modal>
  );
}

function EffectiveAccessModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, isLoading } = useEffectiveAccess(userId);
  return (
    <Modal isOpen={true} onClose={onClose} title="Effective Access Preview">
      {isLoading ? (
        <div className="py-6 text-center text-sm text-slate-400">Loading...</div>
      ) : data ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {(data.roles ?? []).map((r: string) => (<Badge key={r} variant="primary" size="sm">{r}</Badge>))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Permissions ({(data.permissions ?? []).length})</p>
            <div className="flex flex-wrap gap-1 max-h-[40vh] overflow-y-auto" data-lenis-prevent>
              {(data.permissions ?? []).map((p: string) => (
                <span key={p} className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/40">{p}</span>
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
