// Role Badges — Reusable badge components for access control UI
"use client";

import { Badge } from "@/components/ui/Badge";
import { Lock } from "lucide-react";
import type { RoleType, RoleStatus, DefaultScope, RiskLevel } from "@/types/accessControl";

export function TypeBadge({ type }: { type: RoleType }) {
  return (
    <Badge variant={type === "SYSTEM" ? "warning" : "primary"} size="sm">
      {type}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: RoleStatus }) {
  const variant = status === "ACTIVE" ? "success" : status === "ARCHIVED" ? "muted" : "danger";
  return (
    <Badge variant={variant} size="sm" dot={status === "ACTIVE"}>
      {status}
    </Badge>
  );
}

export function ScopeBadge({ scope }: { scope: DefaultScope }) {
  const scopeColors: Partial<Record<DefaultScope, "info" | "primary" | "muted" | "warning" | "glass">> = {
    GLOBAL: "info",
    ORGANIZATION: "primary",
    DISTRICT: "warning",
    PROJECT: "muted",
    ASSIGNED_RESOURCE: "glass",
  };
  return (
    <Badge variant={scopeColors[scope] ?? "muted"} size="sm">
      {String(scope || "").replace(/_/g, " ")}
    </Badge>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const variant = level === "CRITICAL" ? "danger" : level === "HIGH" ? "warning" : level === "MEDIUM" ? "info" : "success";
  return (
    <Badge variant={variant} size="sm">
      {level}
    </Badge>
  );
}

export function ProtectedIndicator({ isProtected }: { isProtected: boolean }) {
  if (!isProtected) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-md"
      title="Protected role — cannot be modified or deleted"
      aria-label="Protected role"
    >
      <Lock size={10} aria-hidden="true" />
      PROTECTED
    </span>
  );
}

export function DelegableBadge({ isDelegable }: { isDelegable: boolean }) {
  return (
    <Badge variant={isDelegable ? "success" : "muted"} size="sm">
      {isDelegable ? "Delegable" : "Non-Delegable"}
    </Badge>
  );
}
