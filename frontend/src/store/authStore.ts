import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiFetch } from "@/lib/api";

export interface PermissionData {
  permissions: string[];
  roles: string[];
  roleDetails: {
    id: string;
    numericId?: number | null;
    name: string;
    slug?: string | null;
    scope: string;
    isSystemRole: boolean;
  }[];
  isAdmin: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  designation?: string | null;
  mobile?: string | null;
  roleNumericId?: number | null;
  roleId?: string | number | null;
  roleSlug?: string | null;
  orgKind?: string | null;
  dynamicRole?: string | null;
  ngoId?: string | null;
  companyId?: string | null;
  organizationId?: string | null;
  assignedDistrict?: string | null;
  beneficiaryProfileId?: string | null;
  tokenVersion?: number | null;
  ngo?: any;
  company?: any;
  organization?: any;
}

export type FetchStatus = "IDLE" | "LOADING" | "SUCCESS" | "ERROR";

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  permissions: string[];
  roles: string[];
  roleDetails: PermissionData["roleDetails"];
  isAdmin: boolean;
  accessVersion: number;
  fetchStatus: FetchStatus;
  fetchError: string | null;
  isLoadingPermissions: boolean;

  // Actions
  login: (user: UserProfile, permissionData?: PermissionData) => void;
  logout: () => void;
  setPermissions: (data: PermissionData) => void;
  clearPermissions: () => void;
  setLoadingPermissions: (loading: boolean) => void;
  fetchEffectivePermissions: () => Promise<void>;

  // Permission checkers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      permissions: [],
      roles: [],
      roleDetails: [],
      isAdmin: false,
      accessVersion: 1,
      fetchStatus: "IDLE",
      fetchError: null,
      isLoadingPermissions: false,

      login: (user, permissionData) => {
        if (permissionData && Array.isArray(permissionData.permissions)) {
          set({
            user,
            isAuthenticated: true,
            permissions: permissionData.permissions,
            roles: permissionData.roles || [],
            roleDetails: permissionData.roleDetails || [],
            isAdmin: Boolean(permissionData.isAdmin),
            fetchStatus: "SUCCESS",
            fetchError: null,
            accessVersion: get().accessVersion + 1,
            isLoadingPermissions: false,
          });
        } else {
          set({
            user,
            isAuthenticated: true,
            permissions: [],
            roles: [],
            roleDetails: [],
            isAdmin: false,
            fetchStatus: "IDLE",
            fetchError: null,
            isLoadingPermissions: true,
          });
          get().fetchEffectivePermissions();
        }
      },

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          permissions: [],
          roles: [],
          roleDetails: [],
          isAdmin: false,
          fetchStatus: "IDLE",
          fetchError: null,
          accessVersion: get().accessVersion + 1,
          isLoadingPermissions: false,
        }),

      setPermissions: (data) =>
        set({
          permissions: data.permissions || [],
          roles: data.roles || [],
          roleDetails: data.roleDetails || [],
          isAdmin: Boolean(data.isAdmin),
          fetchStatus: "SUCCESS",
          fetchError: null,
          accessVersion: get().accessVersion + 1,
          isLoadingPermissions: false,
        }),

      clearPermissions: () =>
        set({
          permissions: [],
          roles: [],
          roleDetails: [],
          isAdmin: false,
          fetchStatus: "IDLE",
          fetchError: null,
          accessVersion: get().accessVersion + 1,
        }),

      setLoadingPermissions: (loading) => set({ isLoadingPermissions: loading }),

      fetchEffectivePermissions: async () => {
        const state = get();
        if (!state.isAuthenticated || !state.user?.id) {
          set({ fetchStatus: "IDLE", permissions: [], isAdmin: false });
          return;
        }

        set({ fetchStatus: "LOADING", isLoadingPermissions: true, fetchError: null });

        try {
          const payload: any = await apiFetch("/auth/me");

          if (payload) {
            set({
              permissions: payload.permissions || payload.access?.permissions || [],
              roles: payload.roles || (payload.role ? [payload.role] : []),
              roleDetails: payload.roleDetails || [],
              isAdmin: Boolean(payload.isAdmin || payload.role === 1 || payload.role === "SUPER_ADMIN"),
              fetchStatus: "SUCCESS",
              fetchError: null,
              accessVersion: state.accessVersion + 1,
              isLoadingPermissions: false,
            });
          }
        } catch (error: any) {
          set({
            fetchStatus: "ERROR",
            fetchError: error?.response?.data?.error || "Failed to load authorization permissions",
            isLoadingPermissions: false,
          });
        }
      },

      hasPermission: (permission) => {
        const state = get();
        if (state.fetchStatus === "ERROR") return false; // Fail closed on error
        if (state.isAdmin) return true;
        return (state.permissions || []).includes(permission);
      },

      hasAnyPermission: (permissions) => {
        const state = get();
        if (state.fetchStatus === "ERROR") return false; // Fail closed on error
        if (state.isAdmin) return true;
        return permissions.some((p) => (state.permissions || []).includes(p));
      },

      hasAllPermissions: (permissions) => {
        const state = get();
        if (state.fetchStatus === "ERROR") return false; // Fail closed on error
        if (state.isAdmin) return true;
        return permissions.every((p) => (state.permissions || []).includes(p));
      },

      hasRole: (role) => {
        const state = get();
        return (state.roles || []).includes(role);
      },

      hasAnyRole: (roles) => {
        const state = get();
        return roles.some((r) => (state.roles || []).includes(r));
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const usePermissions = () => useAuthStore((state) => state.permissions);
export const useRoles = () => useAuthStore((state) => state.roles);
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin);
export const usePermissionChecker = () => ({
  hasPermission: useAuthStore((state) => state.hasPermission),
  hasAnyPermission: useAuthStore((state) => state.hasAnyPermission),
  hasAllPermissions: useAuthStore((state) => state.hasAllPermissions),
});
export const useRoleChecker = () => ({
  hasRole: useAuthStore((state) => state.hasRole),
  hasAnyRole: useAuthStore((state) => state.hasAnyRole),
});
