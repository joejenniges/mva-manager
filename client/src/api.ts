interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const TOKEN_KEY = "mva_token";
const EVENT_KEY = "mva_active_event";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredEventId(): string | null {
  return localStorage.getItem(EVENT_KEY);
}

export function setStoredEventId(id: string): void {
  localStorage.setItem(EVENT_KEY, id);
}

export function clearStoredEventId(): void {
  localStorage.removeItem(EVENT_KEY);
}

export async function api<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  // WHY: Dev auth bypass sends X-Dev-User header instead of a real token.
  // The server's requireAuth middleware accepts this in development mode.
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "true") {
    headers["X-Dev-User"] = "user@example.com";
  } else {
    const token = opts.token ?? getStoredToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // WHY: Event scoping header - read from localStorage, same pattern as token.
  // Not pulled from EventContext to avoid circular dependency (api.ts can't import React context).
  const eventId = getStoredEventId();
  if (eventId) {
    headers["X-Event-Id"] = eventId;
  }

  if (opts.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code || "UNKNOWN",
      data?.error?.message || res.statusText,
    );
  }

  return data as T;
}
