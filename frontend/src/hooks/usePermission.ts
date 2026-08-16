"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { fetchUserPermissions, fetchModulePermissions, checkPermission } from "@/lib/api";

interface UsePermissionReturn {
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  // Role checks
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;

  // State
  permissions: string[];
  roles: string[];
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;

  // Actions
  refreshPermissions: () => Promise<void>;
}

/**
 * Hook to check permissions dynamically
 * Automatically fetches permissions on mount if authenticated
 */
export function usePermission(): UsePermissionReturn {
  const {
    permissions,
    roles,
    isAdmin,
    isLoadingPermissions,
    setPermissions,
    setLoadingPermissions,
    hasPermission: storeHasPermission,
    hasAnyPermission: storeHasAnyPermission,
    hasAllPermissions: storeHasAllPermissions,
    hasRole: storeHasRole,
    hasAnyRole: storeHasAnyRole,
    isAuthenticated,
  } = useAuthStore();

  const [error, setError] = useState<Error | null>(null);

  const refreshPermissions = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoadingPermissions(true);
    setError(null);

    try {
      const data = await fetchUserPermissions();
      setPermissions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch permissions"));
      console.error("Failed to fetch permissions:", err);
    } finally {
      setLoadingPermissions(false);
    }
  }, [isAuthenticated, setPermissions, setLoadingPermissions]);

  // Fetch permissions on mount if authenticated and no permissions cached
  useEffect(() => {
    if (isAuthenticated && permissions.length === 0 && !isLoadingPermissions) {
      refreshPermissions();
    }
  }, [isAuthenticated, permissions.length, isLoadingPermissions, refreshPermissions]);

  return {
    hasPermission: storeHasPermission,
    hasAnyPermission: storeHasAnyPermission,
    hasAllPermissions: storeHasAllPermissions,
    hasRole: storeHasRole,
    hasAnyRole: storeHasAnyRole,
    permissions,
    roles,
    isAdmin,
    isLoading: isLoadingPermissions,
    error,
    refreshPermissions,
  };
}

/**
 * Hook to check a specific permission
 * Returns boolean indicating if user has the permission
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermission();
  return hasPermission(permission);
}

/**
 * Hook to check if user has any of the given permissions
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { hasAnyPermission } = usePermission();
  return hasAnyPermission(permissions);
}

/**
 * Hook to check if user has all of the given permissions
 */
export function useHasAllPermissions(permissions: string[]): boolean {
  const { hasAllPermissions } = usePermission();
  return hasAllPermissions(permissions);
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string): boolean {
  const { hasRole } = usePermission();
  return hasRole(role);
}

/**
 * Hook to check if user has any of the given roles
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { hasAnyRole } = usePermission();
  return hasAnyRole(roles);
}

/**
 * Hook to fetch module-specific permissions
 */
export function useModulePermissions(module: string) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const loadModulePermissions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchModulePermissions(module);
        setPermissions(data.permissions);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch module permissions"));
        console.error(`Failed to fetch permissions for module ${module}:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    loadModulePermissions();
  }, [module, isAuthenticated]);

  const hasModulePermission = useCallback(
    (permission: string) => {
      const { isAdmin } = useAuthStore.getState();
      if (isAdmin) return true;
      return permissions.includes(permission);
    },
    [permissions]
  );

  return {
    permissions,
    isLoading,
    error,
    hasPermission: hasModulePermission,
  };
}

/**
 * Hook to check a specific permission server-side
 * Useful for critical permission checks before actions
 */
export function useCheckPermissionServer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkServerPermission = useCallback(async (permission: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkPermission(permission);
      return result.hasPermission;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to check permission"));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    checkPermission: checkServerPermission,
    isLoading,
    error,
  };
}
