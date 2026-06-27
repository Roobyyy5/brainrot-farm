import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
    fetch("/api/notifications/unread-count", { credentials: "include", headers: { Authorization: `Bearer ${localStorage.getItem("accessToken") ?? ""}` } })
      .then((r) => r.json())
      .then((body) => setUnread(body?.data?.unread ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    esRef.current?.close();
    if (!user) { setUnread(0); return; }

    const token = localStorage.getItem("accessToken") ?? "";
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { unread: number };
        setUnread(data.unread);
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      // SSE failed — fall back to 30s polling
      es.close();
      esRef.current = null;
      refresh();
      const t = setInterval(refresh, 30_000);
      return () => clearInterval(t);
    };

    return () => { es.close(); esRef.current = null; };
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
