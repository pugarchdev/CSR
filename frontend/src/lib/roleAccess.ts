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
 * Roles that can access grievance list (raise/view own).
 * @deprecated Use permission checks instead: 'grievance:view', 'grievance:create'
 */
export const GRIEVANCE_ACCESS_ROLES = [
  ...ADMIN_ROLES,
  "CORPORATE_USER",
  "COMPANY_ADMIN",
  "COMPANY_MEMBER",
  "IMPLEMENTING_AGENCY_USER",
  "NGO_ADMIN",
  "NGO_MEMBER",
  "DISTRICT_NODAL_OFFICER",
  "DISTRICT_ADMIN",
  "STATE_CSR_CELL",
  "JOINT_SECRETARY",
  "PLANNING_SECRETARY",
  "CSR_RELATIONSHIP_MANAGER",
  "GOVERNMENT_OFFICER",
  "BENEFICIARY_AGENCY",
];

/** 
 * Roles that see the Nodal Officer grievance queue.
 * @deprecated Use permission check instead: 'grievance:nodal-queue'
 */
export const NODAL_GRIEVANCE_ROLES = [
  ...ADMIN_ROLES,
  "DISTRICT_NODAL_OFFICER",
  "DISTRICT_ADMIN",
];

/** 
 * Roles that see the State CSR Cell grievance queue.
 * @deprecated Use permission check instead: 'grievance:state-queue'
 */
export const STATE_CELL_GRIEVANCE_ROLES = [
  ...ADMIN_ROLES,
  "STATE_CSR_CELL",
  "JOINT_SECRETARY",
  "PLANNING_SECRETARY",
];

/** 
 * Roles that can access convergence projects.
 * @deprecated Use permission check instead: 'convergence:view'
 */
export const CONVERGENCE_PROJECT_ROLES = [
  ...ADMIN_ROLES,
  "CORPORATE_USER",
  "COMPANY_ADMIN",
  "COMPANY_MEMBER",
  "IMPLEMENTING_AGENCY_USER",
  "NGO_ADMIN",
  "NGO_MEMBER",
  "DISTRICT_NODAL_OFFICER",
  "DISTRICT_ADMIN",
  "CSR_RELATIONSHIP_MANAGER",
  "JOINT_SECRETARY",
  "PLANNING_SECRETARY",
  "STATE_CSR_CELL",
  "GOVERNMENT_OFFICER",
  "BENEFICIARY_AGENCY",
];

/** 
 * Roles that can respond to grievances (nodal/state cell/JS).
 * @deprecated Use permission check instead: 'grievance:respond'
 */
export const GRIEVANCE_RESPOND_ROLES = [
  ...ADMIN_ROLES,
  "DISTRICT_NODAL_OFFICER",
  "DISTRICT_ADMIN",
  "STATE_CSR_CELL",
  "JOINT_SECRETARY",
];

/** 
 * Roles that can escalate grievances.
 * @deprecated Use permission check instead: 'grievance:escalate'
 */
export const GRIEVANCE_ESCALATE_ROLES = [
  ...ADMIN_ROLES,
  "DISTRICT_NODAL_OFFICER",
  "STATE_CSR_CELL",
  "JOINT_SECRETARY",
];

/** 
 * Roles that can close grievances.
 * @deprecated Use permission check instead: 'grievance:close'
 */
export const GRIEVANCE_CLOSE_ROLES = [
  ...ADMIN_ROLES,
  "STATE_CSR_CELL",
  "JOINT_SECRETARY",
];

/** 
 * Check if user is logged in.
 */
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

/** 
 * Joint Secretary role access list.
 * @deprecated Use permission checks instead
 */
export const JS_ROLES = [
  ...ADMIN_ROLES,
  "JOINT_SECRETARY",
];

// ============================================================================
// Permission Constants (for use with the new dynamic system)
// ============================================================================

export const PERMISSIONS = {
  // Requirement permissions
  REQUIREMENT: {
    CREATE: "requirement:create",
    VIEW: "requirement:view",
    UPDATE: "requirement:update",
    DELETE: "requirement:delete",
    SUBMIT: "requirement:submit",
    APPROVE: "requirement:approve",
    PUBLISH: "requirement:publish",
  },
  
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
