const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Injected by AuthProvider so apiFetch can silently refresh an expired token
// without a circular dependency on AuthContext.
type RefreshFn = () => Promise<string | null>;
let _refreshFn: RefreshFn | null = null;

export function setRefreshFn(fn: RefreshFn): void {
  _refreshFn = fn;
}

interface ApiErrorBody {
  error?: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function apiFetchInner<T>(path: string, init: RequestInit, retried: boolean): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // On a first 401, try to silently refresh the access token then retry once.
    if (res.status === 401 && !retried && _refreshFn) {
      const newToken = await _refreshFn();
      if (newToken) {
        return apiFetchInner<T>(path, init, true);
      }
    }
    const errBody = body as ApiErrorBody;
    throw new ApiError(res.status, errBody.error?.code ?? "UNKNOWN", errBody.error?.message ?? "Request failed");
  }

  return body as T;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetchInner<T>(path, init, false);
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
