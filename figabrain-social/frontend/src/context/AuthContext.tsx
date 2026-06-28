import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setAccessToken, setRefreshFn } from "../api/client";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
import type { UserProfile } from "../api/types";
import i18n from "../i18n";

interface TelegramLoginPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  loginWithTelegram: (payload: TelegramLoginPayload, referralCode?: string) => Promise<void>;
  loginDev: (username: string, displayName?: string) => Promise<void>;
  setTokensFromBotAuth: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { accessToken } = (await api.post<{ data: { accessToken: string } }>("/auth/refresh")).data;
      setAccessToken(accessToken);
      const meUsername = JSON.parse(atob(accessToken.split(".")[1])).username as string;
      const profile = await api.get<{ data: UserProfile }>(`/users/${meUsername}`);
      setUser(profile.data);
      if (profile.data.language) i18n.changeLanguage(profile.data.language);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Register a lightweight refresh handler so apiFetch can silently recover
    // from an expired access token without going through the full AuthContext.
    // Uses raw fetch (not api.*) to avoid triggering another 401 retry loop.
    setRefreshFn(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: "POST", credentials: "include" });
        if (!res.ok) {
          setAccessToken(null);
          setUser(null);
          return null;
        }
        const { data } = (await res.json()) as { data: { accessToken: string } };
        setAccessToken(data.accessToken);
        return data.accessToken;
      } catch {
        setAccessToken(null);
        setUser(null);
        return null;
      }
    });

    refreshUser();
  }, [refreshUser]);

  const loginWithTelegram = useCallback(
    async (payload: TelegramLoginPayload, referralCode?: string) => {
      const deviceFingerprint = await computeDeviceFingerprint();
      const result = await api.post<{ data: { accessToken: string } }>("/auth/telegram", {
        ...payload,
        referralCode,
        deviceFingerprint,
      });
      setAccessToken(result.data.accessToken);
      await refreshUser();
    },
    [refreshUser]
  );

  const loginDev = useCallback(
    async (username: string, displayName?: string) => {
      const result = await api.post<{ data: { accessToken: string } }>("/auth/dev-login", {
        username,
        displayName,
      });
      setAccessToken(result.data.accessToken);
      await refreshUser();
    },
    [refreshUser]
  );

  const setTokensFromBotAuth = useCallback(
    async (accessToken: string) => {
      setAccessToken(accessToken);
      try {
        const meUsername = JSON.parse(atob(accessToken.split(".")[1]!)).username as string;
        const profile = await api.get<{ data: UserProfile }>(`/users/${meUsername}`);
        setUser(profile.data);
        if (profile.data.language) i18n.changeLanguage(profile.data.language);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithTelegram, loginDev, setTokensFromBotAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function computeDeviceFingerprint(): Promise<string> {
  const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, new Date().getTimezoneOffset()].join(
    "|"
  );
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
