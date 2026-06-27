import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../api/client";
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ data: { unread: number } }>("/notifications/unread-count");
      setUnread(res.data.unread);
    } catch { /* ignore */ }
  }, [user]);

  const clearBadge = useCallback(() => setUnread(0), []);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    refresh();
    intervalRef.current = setInterval(refresh, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
