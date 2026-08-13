"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getAccessToken } from "@/lib/api";

export function PermissionInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, fetchEffectivePermissions, user, fetchStatus, permissionsFetchedAt, logout } = useAuthStore();
  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (!getAccessToken()) {
      logout();
      return;
    }
    // Public auth screens never need permission hydration. This also prevents a
    // stale persisted session from generating requests while showing /login.
    if (pathname === "/login" || pathname.startsWith("/register")) return;
    // ERROR is recoverable only through the explicit Retry button; LOADING is
    // already in flight. Neither state should recursively launch another call.
    if (fetchStatus === "LOADING" || fetchStatus === "ERROR") return;

    const hasCurrentPermissions = fetchStatus === "SUCCESS";
    const isStale = !permissionsFetchedAt || Date.now() - permissionsFetchedAt > 5 * 60 * 1000;
    if (!hasCurrentPermissions || isStale) fetchEffectivePermissions(hasCurrentPermissions);
  }, [isAuthenticated, userId, pathname, fetchStatus, permissionsFetchedAt, fetchEffectivePermissions, logout]);

  return <>{children}</>;
}

export function useInitializePermissions() {
  const { isAuthenticated, fetchEffectivePermissions, user, fetchStatus } = useAuthStore();
  const userId = user?.id;

  useEffect(() => {
    if (isAuthenticated && userId && getAccessToken() && fetchStatus === "IDLE") {
      fetchEffectivePermissions();
    }
  }, [isAuthenticated, userId, fetchStatus, fetchEffectivePermissions]);
}

export function PermissionRefreshTrigger({ onRefresh }: { onRefresh?: () => void }) {
  const { fetchEffectivePermissions } = useAuthStore();

  useEffect(() => {
    fetchEffectivePermissions().then(() => onRefresh?.());
  }, [fetchEffectivePermissions, onRefresh]);

  return null;
}
