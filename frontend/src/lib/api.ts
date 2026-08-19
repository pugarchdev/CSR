export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
    ? "https://csr-backend-five.vercel.app/api"
    : "http://localhost:5000/api");

export const getAccessToken = () => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("mahacsr_access_token");
  if (token) return token;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.token) return parsed.state.token;
      if (parsed?.state?.accessToken) return parsed.state.accessToken;
    }
  } catch {}
  return null;
};

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  try {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      if (parsed?.state?.user) return parsed.state.user;
    }
  } catch {}
  return null;
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

const isBypassedPath = (path: string): boolean => {
  return (
    path.includes("/dashboard") ||
    path.includes("/summary") ||
    path.includes("/onboarding") ||
    path.includes("/auth/me") ||
    path.includes("/organizations") ||
    path.includes("/admin/organizations") ||
    path.includes("/enquiries")
  );
};

const getCachedData = <T>(path: string): CacheHit<T> => {
  if (typeof window === "undefined") return null;
  // Real-time routes must always reflect live operational status from the server
  if (isBypassedPath(path)) return null;

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

export const getCachedApiData = <T>(path: string): T | undefined => {
  if (typeof window === "undefined") return undefined;
  if (isBypassedPath(path)) return undefined;
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + btoa(path));
    if (!cached) return undefined;
    const { data } = JSON.parse(cached);
    return data as T;
  } catch {
    return undefined;
  }
};

const setCachedData = <T>(path: string, data: T): void => {
  if (typeof window === "undefined") return;
  if (isBypassedPath(path)) return;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...init,
      headers,
      credentials: "include",
      signal: init.signal || controller.signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError" || err.message?.includes("aborted")) {
      throw new Error("Network request timed out. Please check your connection and try again.");
    }
    throw new Error(err.message || "Network request failed");
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => null);

  const errorPayload = data?.error;
  const errorMessage = typeof errorPayload === "string"
    ? errorPayload
    : errorPayload?.message || data?.message || "Request failed";

  const isSessionExpired =
    response.status === 401 ||
    (response.status === 403 && /invalid or expired/i.test(errorMessage));

  // If 401 occurs on an authenticated route and user had a token, attempt silent token refresh.
  if (response.status === 401 && Boolean(token) && path !== "/auth/refresh" && path !== "/auth/login" && typeof window !== "undefined") {
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include"
      });
      const refreshData = await refreshRes.json().catch(() => null);
      if (refreshRes.ok && refreshData?.accessToken) {
        localStorage.setItem("accessToken", refreshData.accessToken);
        if (refreshData.user) {
          localStorage.setItem("user", JSON.stringify(refreshData.user));
        }
        headers.set("Authorization", `Bearer ${refreshData.accessToken}`);
        const retryRes = await fetch(`${API_BASE_URL}${path}`, {
          cache: "no-store",
          ...init,
          headers,
          credentials: "include"
        });
        const retryData = await retryRes.json().catch(() => null);
        if (retryRes.ok) {
          if (isCacheable && retryData) setCachedData(path, retryData);
          return retryData as T;
        }
      }
    } catch {
      // Refresh attempt failed; session expired modal will trigger below.
    }
  }

  if (isSessionExpired && typeof window !== "undefined") {
    const hadToken = Boolean(token);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("auth-storage");
    document.cookie = 'mahacsr_auth=; path=/; max-age=0';
    clearApiCache();
    if (hadToken) {
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    }
  }

  if (!response.ok) {
    const error = new Error(errorMessage) as Error & {
      validationErrors?: string[];
      status?: number;
      errorCode?: string;
      meta?: Record<string, unknown>;
    };
    error.validationErrors = data?.validationErrors || errorPayload?.details || data?.details;
    error.status = response.status;
    error.errorCode = data?.errorCode || errorPayload?.code;
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

export const uploadPortalFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const result = await apiFetch<{ url?: string }>("/upload", { method: "POST", body: formData });
  if (!result?.url) throw new Error(`Upload failed for ${file.name}.`);
  return result.url;
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

export const fetchUserPermissions = async () => {
  const res = await apiFetch<any>("/auth/permissions");
  return res?.data ?? res;
};

export const fetchModulePermissions = async (module: string) => {
  const res = await apiFetch<any>(`/auth/permissions/${module}`);
  return res?.data ?? res;
};

export const checkPermission = async (permission: string) => {
  const res = await apiFetch<any>("/auth/check-permission", {
    method: "POST",
    body: JSON.stringify({ permission })
  });
  return res?.data ?? res;
};
