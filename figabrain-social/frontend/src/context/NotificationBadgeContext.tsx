import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getAccessToken } from "../api/client";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
import { useAuth } from "./AuthContext";

interface BadgeContextValue {
  unread: number;
  clearBadge: () => void;
  refresh: () => void;
}

const BadgeContext = createContext<BadgeContextValue>({ unread: 0, clearBadge: () => {}, refresh: () => {} });

export function NotificationBadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const clearBadge = useCallback(() => setUnread(0), []);

  // Manual refresh — used after marking notifications read
  const refresh = useCallback(() => {
    const token = getAccessToken() ?? "";
    fetch(`${API_BASE}/api/notifications/unread-count`, { credentials: "include", headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body) => setUnread(body?.data?.unread ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    esRef.current?.close();
    if (!user) { setUnread(0); return; }

    const token = getAccessToken() ?? "";
    const es = new EventSource(`${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { unread: number };
        setUnread(data.unread);
      } catch { /* ignore */ }
    };

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    es.onerror = () => {
      es.close();
      esRef.current = null;
      refresh();
      if (!pollInterval) {
        pollInterval = setInterval(refresh, 30_000);
      }
    };

    return () => {
      es.close();
      esRef.current = null;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }, [user, refresh]);

  return (
    <BadgeContext.Provider value={{ unread, clearBadge, refresh }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useNotificationBadge() {
  return useContext(BadgeContext);
}
