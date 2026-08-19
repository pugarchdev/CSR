import { getStoredUser } from "./api";
import { useAuthStore } from "@/store/authStore";

export interface StoredUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  tenantId?: string;
}

/** Get the current user from localStorage (client-side only). */
export function getCurrentUser(): StoredUser | null {
  const raw = getStoredUser();
  if (!raw || !raw.role) return null;
  return raw as StoredUser;
}

/**
 * Check if the current user's role is in the allowed list.
 * @deprecated Use usePermission() hook or authStore.hasAnyRole() instead
 */
export function hasRoleAccess(allowedRoles: string[]): boolean {
  // Dynamic permission store — but only trust it once roles are actually
  // loaded. Right after login (or if /auth/permissions hasn't resolved yet)
  // the store says isAuthenticated with an empty roles list; falling through
  // to the stored user prevents false Access Denied screens.
  const store = useAuthStore.getState();
  if (store.isAuthenticated) {
    if (store.roles.length > 0 && store.hasAnyRole(allowedRoles)) return true;
    if (store.isAdmin) return true;
    if (store.user?.role && allowedRoles.includes(store.user.role)) return true;
  }

  // Fallback to localStorage
  const user = getCurrentUser();
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/** Admin roles that have global access to most features. */
export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "PORTAL_ADMIN",
  "CSR_ADMIN",
] as const;

/**
 * Check if user is an admin
 * @deprecated Use usePermission() hook or authStore.isAdmin instead
 */
export function isAdmin(): boolean {
  const store = useAuthStore.getState();
  if (store.isAuthenticated) {
    return store.isAdmin;
  }

  const user = getCurrentUser();
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role as any);
}

/**
 * Get current user's permissions
 * Uses the dynamic permission system from authStore
 */
export function getCurrentPermissions(): string[] {
  const store = useAuthStore.getState();
  return store.permissions;
}

/**
 * Check if user has a specific permission
 * Uses the dynamic permission system
 * @deprecated Use usePermission() hook or authStore.hasPermission() instead
 */
export function hasPermission(permission: string): boolean {
  const store = useAuthStore.getState();
  return store.hasPermission(permission);
}

/**
 * Check if user has any of the given permissions
 * @deprecated Use usePermission() hook or authStore.hasAnyPermission() instead
 */
export function hasAnyPermission(permissions: string[]): boolean {
  const store = useAuthStore.getState();
  return store.hasAnyPermission(permissions);
}

/**
 * Check if user has all of the given permissions
 * @deprecated Use usePermission() hook or authStore.hasAllPermissions() instead
 */
export function hasAllPermissions(permissions: string[]): boolean {
  const store = useAuthStore.getState();
  return store.hasAllPermissions(permissions);
}

/**
 * Page/section access check for the dynamic RBAC system. Pass a group of
 * permission keys (see the GROUPS below); the user passes if they are a
 * platform admin OR hold ANY of the keys.
 *
 * Resilience: right after login the permission list may not have resolved yet
 * (store authenticated, `permissions` still empty). In that window we do NOT
 * deny — returning `true` prevents a flash of "Access Denied" before the
 * /auth/permissions call lands. Once permissions are loaded, the real check
 * applies. This mirrors the tolerance the old `hasRoleAccess` had.
 */
export function hasPageAccess(anyOf: string[]): boolean {
  const store = useAuthStore.getState();
  if (!store.isAuthenticated) return false;
  if (store.isAdmin) return true;
  // Permissions not loaded yet — don't flash Access Denied.
  if (store.isLoadingPermissions || store.permissions.length === 0) return true;
  return anyOf.some((p) => store.permissions.includes(p));
}

// ============================================================================
// Permission GROUPS for page/section gating (dynamic RBAC).
//
// Each group is a set of permission keys; a user passes if they hold ANY of
// them (see `hasAnyPermission`), and platform admins bypass via `isAdmin`.
// These replace the old hardcoded role-name arrays. Keys map to the closest
// backend permission that a role must hold to use the feature, so the audience
// is preserved without hardcoding role identities.
//
// NOTE: the backend has no dedicated `grievance:*` permission, so grievance
// gating reuses the nearest workflow permission that matches the intended
// audience (project:assign = nodal/JS actions, project:approve = JS/secretary
// sign-off, dashboard:view = any authenticated portal user).
// ============================================================================

/** Broad access: any authenticated portal user (all seeded roles hold this). */
export const GRIEVANCE_ACCESS_PERMS = ["dashboard:view"];

/** Nodal-officer grievance queue: district officers + JS + admins. */
export const NODAL_GRIEVANCE_PERMS = ["project:assign"];

/** State-cell / secretariat grievance queue: JS + planning secretary + admins. */
export const STATE_CELL_GRIEVANCE_PERMS = ["project:approve"];

/** Convergence projects: anyone who can view projects or dashboard. */
export const CONVERGENCE_PROJECT_PERMS = ["project:view", "project:read", "dashboard:view"];

/** Respond to a grievance: nodal officers + JS + admins. */
export const GRIEVANCE_RESPOND_PERMS = ["project:assign"];

/** Escalate a grievance: nodal officers + JS + admins. */
export const GRIEVANCE_ESCALATE_PERMS = ["project:assign"];

/** Close a grievance: JS + planning secretary + admins. */
export const GRIEVANCE_CLOSE_PERMS = ["project:approve"];

/**
 * Joint-Secretary workspace pages (assignments, pitches, feasibility, nodal
 * appointments). JS holds `enquiry:assign`/`project:approve`; planning
 * secretary holds `project:approve`; admins bypass.
 */
export const JS_ACCESS_PERMS = ["enquiry:assign", "project:approve"];

/** Platform-administration pages: admin-only (bypass via isAdmin). */
export const ADMIN_ACCESS_PERMS = ["organization:approve"];

/**
 * Check if user is logged in.
 */
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

// ============================================================================
// Permission Constants (for use with the new dynamic system)
// ============================================================================

export const PERMISSIONS = {
  // Interest permissions
  INTEREST: {
    CREATE: "interest:create",
    VIEW: "interest:view",
    APPROVE: "interest:approve",
  },

  // Project permissions
  PROJECT: {
    VIEW: "project:view",
    CREATE: "project:create",
    UPDATE: "project:update",
    APPROVE: "project:approve",
  },

  // Milestone permissions
  MILESTONE: {
    CREATE: "milestone:create",
    UPDATE: "milestone:update",
    VERIFY: "milestone:verify",
  },

  // Fund permissions
  FUND: {
    VIEW: "fund:view",
    COMMIT: "fund:commit",
    RELEASE: "fund:release",
    VERIFY_UTILIZATION: "fund:verify-utilization",
  },

  // Report permissions
  REPORT: {
    VIEW: "report:view",
    EXPORT: "report:export",
  },

  // Organization permissions
  ORGANIZATION: {
    VIEW: "organization:view",
    UPDATE: "organization:update",
    APPROVE: "organization:approve",
    REJECT: "organization:reject",
    SUSPEND: "organization:suspend",
  },

  // User permissions
  USER: {
    INVITE: "user:invite",
    UPDATE: "user:update",
  },

  // Role permissions
  ROLE: {
    CREATE: "role:create",
    UPDATE: "role:update",
    DELETE: "role:delete",
  },

  // Feature toggle permissions
  FEATURE_TOGGLE: {
    VIEW: "feature-toggle:view",
    UPDATE: "feature-toggle:update",
  },

  // Tenant permissions
  TENANT: {
    CREATE: "tenant:create",
    UPDATE: "tenant:update",
    DISABLE: "tenant:disable",
    DELETE: "tenant:delete",
  },

  // Audit permissions
  AUDIT: {
    VIEW: "audit:view",
  },

  // Marketplace permissions
  MARKETPLACE: {
    VIEW: "marketplace:view",
  },
} as const;

// ============================================================================
// Migration Guide
// ============================================================================

/**
 * MIGRATION GUIDE: From Hardcoded Roles to Dynamic Permissions
 *
 * OLD WAY (using hardcoded role lists):
 * ```tsx
 * import { GRIEVANCE_ACCESS_ROLES, hasRoleAccess } from "@/lib/roleAccess";
 *
 * if (hasRoleAccess(GRIEVANCE_ACCESS_ROLES)) {
 *   // Show grievance section
 * }
 * ```
 *
 * NEW WAY (using dynamic permissions):
 * ```tsx
 * import { usePermission } from "@/hooks/usePermission";
 * import { ProtectedComponent } from "@/components/auth/ProtectedComponent";
 *
 * // Option 1: Using the hook
 * function MyComponent() {
 *   const { hasPermission } = usePermission();
 *
 *   if (hasPermission("grievance:view")) {
 *     return <GrievanceSection />;
 *   }
 * }
 *
 * // Option 2: Using the ProtectedComponent
 * function MyComponent() {
 *   return (
 *     <ProtectedComponent permission="grievance:view">
 *       <GrievanceSection />
 *     </ProtectedComponent>
 *   );
 * }
 *
 * // Option 3: Using permission constants
 * import { PERMISSIONS } from "@/lib/roleAccess";
 *
 * <ProtectedComponent permission={PERMISSIONS.GRIEVANCE.VIEW}>
 *   <GrievanceSection />
 * </ProtectedComponent>
 * ```
 */
