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
const CACHE_TTL_MS = 60 * 1000;

const getCachedData = <T>(path: string): T | null => {
  if (typeof window === "undefined") return null;
  
  const cached = localStorage.getItem(CACHE_PREFIX + btoa(path));
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      return data as T;
    }
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

export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const method = init.method || "GET";
  const isCacheable = method === "GET";
  
  if (isCacheable) {
    const cached = getCachedData<T>(path);
    if (cached) {
      return cached;
    }
  }

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

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || "Request failed") as Error & { validationErrors?: string[]; status?: number };
    error.validationErrors = data?.validationErrors;
    error.status = response.status;
    throw error;
  }

  if (isCacheable && data) {
    setCachedData(path, data);
  }

  return data as T;
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
