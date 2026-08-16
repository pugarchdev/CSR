// Role Summary Tab — Metadata, module access summary bars, risk summary, and protected actions
"use client";

import { Shield, User, Copy, Pencil, Power, Trash2, Lock, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TypeBadge, StatusBadge, ScopeBadge } from "./RoleBadges";
import { useAuthStore } from "@/store/authStore";
import type { Role } from "@/types/accessControl";

interface RoleSummaryTabProps {
  role: Role;
  highRiskCount: number;
  criticalCount: number;
  onEdit: () => void;
  onClone: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

export function RoleSummaryTab({
  role,
  highRiskCount: _highRiskCount,
  criticalCount: _criticalCount,
  onEdit,
  onClone,
  onActivate,
  onDeactivate,
  onDelete,
}: RoleSummaryTabProps) {
  const { hasPermission } = useAuthStore();
  const canConfigure = hasPermission("role:configure");
  const canCreate = hasPermission("role:create");
  const canDelete = hasPermission("role:delete");
  const userCount = (role._count?.roleAssignments ?? 0) + (role._count?.users ?? 0);
  const isSystemRole = role.isSystemRole || role.type === "SYSTEM" || role.isProtected;

  // Calculate module access summary bars
  const moduleSummary = [
    { label: "Enquiries", count: role.permissions.filter((p) => p.startsWith("enquiry:")).length, total: 5, desc: "View, Create, Assign" },
    { label: "Pitches", count: role.permissions.filter((p) => p.startsWith("pitch:")).length, total: 6, desc: "View, Submit, Approve" },
    { label: "Feasibility", count: role.permissions.filter((p) => p.startsWith("feasibility:") || p.startsWith("assessment:")).length, total: 5, desc: "Create, Review, Decide" },
    { label: "Projects", count: role.permissions.filter((p) => p.startsWith("project:")).length, total: 8, desc: "View, Track, Manage" },
    { label: "Milestones", count: role.permissions.filter((p) => p.startsWith("milestone:")).length, total: 5, desc: "Draft, Submit, Verify" },
    { label: "Documents", count: role.permissions.filter((p) => p.startsWith("document:") || p.startsWith("mou:")).length, total: 6, desc: "Upload, Sign, Verify" },
  ];

return (
    <div className="space-y-4 md:space-y-5 text-xs">
      {/* Protected System Role Warning Banner */}
      {isSystemRole && (
        // Changed to flex-col on mobile, md:flex-row on desktop
        <div className="bg-amber-50 border border-amber-200/80 p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-950">🔒 Protected Platform System Role</div>
              <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                This is a core workflow role required by the MahaCSR governance engine. System identity cannot be deleted or renamed.
              </div>
            </div>
          </div>
          {/* Made button full width on mobile */}
          <Button size="sm" variant="outline" onClick={onClone} disabled={!canCreate} className="w-full md:w-auto shrink-0 font-bold border-amber-300 text-amber-900 bg-white justify-center">
            <Copy size={13} className="mr-1.5 shrink-0" /> Clone into Custom Role
          </Button>
        </div>
      )}

      {/* Role Identity Card */}
      <Card variant="outlined" hover={false} tilt={false}>
        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 break-words">
                {role.displayName || role.name}
              </h2>
              <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">{role.description || "No description provided."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <TypeBadge type={role.type} />
              <StatusBadge status={role.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-1">
            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">Role Code</div>
              <div className="font-mono font-bold text-slate-800 mt-0.5 truncate" title={role.code}>{role.code}</div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">Assigned Users</div>
              <div className="font-bold text-blue-900 text-xs sm:text-sm mt-0.5 flex items-center gap-1">
                <User size={13} className="shrink-0" /> {userCount} Users
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">Default Access Level</div>
              <div className="mt-0.5">
                <ScopeBadge scope={role.defaultScope} />
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase truncate">Total Permissions</div>
              <div className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5 flex items-center gap-1">
                <Layers size={13} className="shrink-0" /> {role.permissions.length} Grants
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Access Summary Bar Chart Card */}
      <Card variant="outlined" hover={false} tilt={false}>
        <CardContent className="p-4 md:p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield size={16} className="text-blue-900 shrink-0" />
              <span>Module Access Summary</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Summary of granted capabilities across key platform modules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {moduleSummary.map((mod) => {
              const pct = Math.min(100, Math.round((mod.count / mod.total) * 100));
              return (
                <div key={mod.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800 gap-2">
                    <span className="truncate">{mod.label}</span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 shrink-0">{mod.count} / {mod.total} grants</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-900 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate" title={mod.desc}>{mod.desc}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {!isSystemRole && (
            <Button size="sm" variant="outline" onClick={onEdit} disabled={!canConfigure} className="font-bold w-full sm:w-auto justify-center">
              <Pencil size={13} className="mr-1.5 shrink-0" /> Edit Custom Role
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClone} disabled={!canCreate} className="font-bold w-full sm:w-auto justify-center">
            <Copy size={13} className="mr-1.5 shrink-0" /> Duplicate Role
          </Button>
        </div>

        {!isSystemRole && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {role.status === "ACTIVE" ? (
              <Button size="sm" variant="outline" onClick={onDeactivate} disabled={!canConfigure} className="font-bold text-amber-800 border-amber-200 hover:bg-amber-50 w-full sm:w-auto justify-center">
                <Power size={13} className="mr-1.5 text-amber-600 shrink-0" /> Deactivate
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onActivate} disabled={!canConfigure} className="font-bold text-emerald-800 border-emerald-200 hover:bg-emerald-50 w-full sm:w-auto justify-center">
                <Power size={13} className="mr-1.5 text-emerald-600 shrink-0" /> Activate
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={onDelete} disabled={!canDelete} className="font-bold text-red-700 border-red-200 hover:bg-red-50 w-full sm:w-auto justify-center">
              <Trash2 size={13} className="mr-1.5 text-red-500 shrink-0" /> Delete Role
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
