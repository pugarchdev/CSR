export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const getAccessToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

export const clearApiCache = () => {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter(key => key.startsWith("api_cache_"))
    .forEach(key => localStorage.removeItem(key));
};

const CACHE_PREFIX = "api_cache_";
const CACHE_FRESH_MS = 60 * 1000;       // serve without refetch
const CACHE_STALE_MS = 5 * 60 * 1000;   // serve instantly + revalidate in background

type CacheHit<T> = { data: T; isStale: boolean } | null;

const getCachedData = <T>(path: string): CacheHit<T> => {
  if (typeof window === "undefined") return null;

  const cached = localStorage.getItem(CACHE_PREFIX + btoa(path));
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    if (age < CACHE_FRESH_MS) return { data: data as T, isStale: false };
    if (age < CACHE_STALE_MS) return { data: data as T, isStale: true };
    localStorage.removeItem(CACHE_PREFIX + btoa(path));
  } catch {
    localStorage.removeItem(CACHE_PREFIX + btoa(path));
  }
  return null;
};

const setCachedData = <T>(path: string, data: T): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_PREFIX + btoa(path), JSON.stringify({ data, timestamp: Date.now() }));
};

// In-flight GET dedup — concurrent components requesting the same path share one network call.
const inflight = new Map<string, Promise<unknown>>();

const networkFetch = async <T>(path: string, init: RequestInit, isCacheable: boolean): Promise<T> => {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  const data = await response.json().catch(() => null);

  const isSessionExpired =
    response.status === 401 ||
    (response.status === 403 && /invalid or expired/i.test(data?.error || ""));

  if (isSessionExpired && typeof window !== "undefined") {
    const hadToken = Boolean(token);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    // Only prompt re-login if the user actually had a session that expired.
    if (hadToken) {
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Request failed") as Error & {
      validationErrors?: string[];
      status?: number;
      errorCode?: string;
      meta?: Record<string, unknown>;
    };
    error.validationErrors = data?.validationErrors || data?.details;
    error.status = response.status;
    error.errorCode = data?.errorCode;
    error.meta = data?.meta;
    throw error;
  }

  if (isCacheable && data) {
    setCachedData(path, data);
  } else if (!isCacheable) {
    clearApiCache();
  }

  return data as T;
};

export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const method = init.method || "GET";
  const isCacheable = method === "GET";

  if (isCacheable) {
    const cached = getCachedData<T>(path);
    if (cached) {
      if (cached.isStale && !inflight.has(path)) {
        // Stale-while-revalidate: return instantly, refresh in background.
        const refresh = networkFetch<T>(path, init, true)
          .catch(() => {})
          .finally(() => inflight.delete(path));
        inflight.set(path, refresh as Promise<unknown>);
      }
      return cached.data;
    }

    const pending = inflight.get(path);
    if (pending) return pending as Promise<T>;

    const request = networkFetch<T>(path, init, true).finally(() => inflight.delete(path));
    inflight.set(path, request as Promise<unknown>);
    return request;
  }

  return networkFetch<T>(path, init, false);
};

export const invalidateCache = (pathPattern?: string): void => {
  if (typeof window === "undefined") return;
  
  if (pathPattern) {
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_PREFIX) && key.includes(btoa(pathPattern)))
      .forEach(key => localStorage.removeItem(key));
  } else {
    clearApiCache();
  }
};

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

// Permission API functions
export interface PermissionResponse {
  permissions: string[];
  roles: string[];
  roleDetails: {
    id: string;
    name: string;
    scope: string;
    isSystemRole: boolean;
  }[];
  isAdmin: boolean;
}

export interface ModulePermissionResponse {
  module: string;
  permissions: string[];
}

export interface CheckPermissionResponse {
  hasPermission: boolean;
  permission: string;
}

/**
 * Fetch current user's permissions from the server
 */
export const fetchUserPermissions = async (): Promise<PermissionResponse> => {
  return apiFetch<PermissionResponse>("/auth/permissions");
};

/**
 * Fetch permissions for a specific module
 */
export const fetchModulePermissions = async (module: string): Promise<ModulePermissionResponse> => {
  return apiFetch<ModulePermissionResponse>(`/auth/permissions/${module}`);
};

/**
 * Check if user has a specific permission
 */
export const checkPermission = async (permission: string): Promise<CheckPermissionResponse> => {
  return apiFetch<CheckPermissionResponse>("/auth/check-permission", {
    method: "POST",
    body: JSON.stringify({ permission }),
  });
};

