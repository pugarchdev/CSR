// Access Control API Hooks — React Query + apiFetch
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, invalidateCache } from "@/lib/api";
import type {
  Role,
  Permission,
  Assignment,
  OverviewStats,
  ImpactPreview,
  RolesResponse,
  PermissionsResponse,
  AssignmentsResponse,
  AuditResponse,
  CreateRoleRequest,
  PatchRoleRequest,
  UpdatePermissionsRequest,
  CloneRoleRequest,
  CreateAssignmentRequest,
  PatchAssignmentRequest,
} from "@/types/accessControl";

const KEYS = {
  overview: ["access-control", "overview"] as const,
  roles: ["access-control", "roles"] as const,
  role: (id: number) => ["access-control", "roles", id] as const,
  permissions: ["access-control", "permissions"] as const,
  rolePermissions: (id: number) => ["access-control", "roles", id, "permissions"] as const,
  assignments: ["access-control", "assignments"] as const,
  audit: ["access-control", "audit"] as const,
  effectiveAccess: (userId: string) => ["access-control", "users", userId, "effective-access"] as const,
  impactPreview: (roleId: number) => ["access-control", "roles", roleId, "impact-preview"] as const,
};

// ============================================
// Query Hooks
// ============================================

export function useOverviewStats() {
  return useQuery<OverviewStats>({
    queryKey: KEYS.overview,
    queryFn: () => apiFetch<OverviewStats>("/access-control/overview"),
    staleTime: 30_000,
  });
}

export function useRoles(params?: {
  search?: string;
  status?: string;
  type?: string;
  scope?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.scope) searchParams.set("scope", params.scope);
  const qs = searchParams.toString();
  const path = `/access-control/roles${qs ? `?${qs}` : ""}`;

  return useQuery<Role[]>({
    queryKey: [...KEYS.roles, params],
    queryFn: async () => {
      const res = await apiFetch<RolesResponse | Role[]>(path);
      if (Array.isArray(res)) return res;
      return (res as RolesResponse).data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useRole(id: number | null) {
  return useQuery<Role>({
    queryKey: KEYS.role(id!),
    queryFn: () => apiFetch<Role>(`/access-control/roles/${id}`),
    enabled: id !== null && id !== undefined,
    staleTime: 15_000,
  });
}

export function usePermissions() {
  return useQuery<Permission[]>({
    queryKey: KEYS.permissions,
    queryFn: async () => {
      const res = await apiFetch<PermissionsResponse | Permission[]>("/access-control/permissions");
      if (Array.isArray(res)) return res;
      return (res as PermissionsResponse).data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useRolePermissions(roleId: number | null) {
  return useQuery<string[]>({
    queryKey: KEYS.rolePermissions(roleId!),
    queryFn: async () => {
      const res = await apiFetch<any>(`/access-control/roles/${roleId}/permissions`);
      return res?.data ?? res?.permissions ?? res ?? [];
    },
    enabled: roleId !== null && roleId !== undefined,
    staleTime: 15_000,
  });
}

export function useAssignments(params?: {
  roleId?: number;
  userId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.roleId) searchParams.set("roleId", String(params.roleId));
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  const qs = searchParams.toString();
  const path = `/access-control/assignments${qs ? `?${qs}` : ""}`;

  return useQuery<AssignmentsResponse>({
    queryKey: [...KEYS.assignments, params],
    queryFn: async () => {
      const res = await apiFetch<any>(path);
      return {
        data: res?.data ?? res ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? 25,
      };
    },
    staleTime: 15_000,
  });
}

export function useAuditLogs(params?: {
  roleId?: number;
  actorId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.roleId) searchParams.set("roleId", String(params.roleId));
  if (params?.actorId) searchParams.set("actorId", params.actorId);
  if (params?.action) searchParams.set("action", params.action);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  const qs = searchParams.toString();
  const path = `/access-control/audit${qs ? `?${qs}` : ""}`;

  return useQuery<AuditResponse>({
    queryKey: [...KEYS.audit, params],
    queryFn: async () => {
      const res = await apiFetch<any>(path);
      return {
        data: res?.data ?? res ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? 25,
      };
    },
    staleTime: 10_000,
  });
}

export function useEffectiveAccess(userId: string | null) {
  return useQuery({
    queryKey: KEYS.effectiveAccess(userId!),
    queryFn: () => apiFetch<any>(`/access-control/users/${userId}/effective-access`),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

// ============================================
// Mutation Hooks
// ============================================

function useInvalidateAccessControl() {
  const qc = useQueryClient();
  return () => {
    invalidateCache("/access-control");
    qc.invalidateQueries({ queryKey: ["access-control"] });
  };
}

export function useCreateRole() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<Role, Error & { status?: number }, CreateRoleRequest>({
    mutationFn: (body) =>
      apiFetch<Role>("/access-control/roles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function usePatchRole() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<Role, Error & { status?: number }, { id: number; body: PatchRoleRequest }>({
    mutationFn: ({ id, body }) =>
      apiFetch<Role>(`/access-control/roles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateRolePermissions() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<unknown, Error & { status?: number }, { id: number; body: UpdatePermissionsRequest }>({
    mutationFn: ({ id, body }) =>
      apiFetch(`/access-control/roles/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useCloneRole() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<Role, Error & { status?: number }, { id: number; body: CloneRoleRequest }>({
    mutationFn: ({ id, body }) =>
      apiFetch<Role>(`/access-control/roles/${id}/clone`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useActivateRole() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<unknown, Error & { status?: number }, number>({
    mutationFn: (id) =>
      apiFetch(`/access-control/roles/${id}/activate`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

export function useDeactivateRole() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<unknown, Error & { status?: number }, number>({
    mutationFn: (id) =>
      apiFetch(`/access-control/roles/${id}/deactivate`, { method: "POST" }),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<unknown, Error & { status?: number }, number>({
    mutationFn: (id) =>
      apiFetch(`/access-control/roles/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useCreateAssignment() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<Assignment, Error & { status?: number }, CreateAssignmentRequest>({
    mutationFn: (body) =>
      apiFetch<Assignment>("/access-control/assignments", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function usePatchAssignment() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<unknown, Error & { status?: number }, { id: string; body: PatchAssignmentRequest }>({
    mutationFn: ({ id, body }) =>
      apiFetch(`/access-control/assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteAssignment() {
  const invalidate = useInvalidateAccessControl();
  return useMutation<unknown, Error & { status?: number }, string>({
    mutationFn: (id) =>
      apiFetch(`/access-control/assignments/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useImpactPreview(roleId: number) {
  const qc = useQueryClient();
  return useMutation<ImpactPreview, Error, { permissionsToAdd: string[]; permissionsToRemove: string[] }>({
    mutationFn: (body) =>
      apiFetch<ImpactPreview>(`/access-control/roles/${roleId}/impact-preview`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.setQueryData(KEYS.impactPreview(roleId), data);
    },
  });
}
