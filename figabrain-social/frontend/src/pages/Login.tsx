import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/client";

const DEV_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_DEV_LOGIN === "true";

interface InitResponse { data: { token: string; url: string } }
interface VerifyResponse { data: { pending?: boolean; accessToken?: string; isNewUser?: boolean } }

export function Login() {
  const { loginWithTelegram, loginDev, setTokensFromBotAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [devUsername, setDevUsername] = useState("");
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function handleTelegramLogin() {
    setIsLoggingIn(true);
    setError(null);
    try {
      const { data } = await apiFetch<InitResponse>("/auth/telegram-bot/init", { method: "POST" });
      window.open(data.url, "_blank");

      pollRef.current = setInterval(async () => {
        try {
          const result = await apiFetch<VerifyResponse>("/auth/telegram-bot/verify", {
            method: "POST",
            body: JSON.stringify({ token: data.token }),
          });
          if (!result.data.pending && result.data.accessToken) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setTokensFromBotAuth(result.data.accessToken);
            navigate("/");
          }
        } catch {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsLoggingIn(false);
          setError("Авторизація не вдалась. Спробуй ще раз.");
        }
      }, 2000);

      // Stop polling after 10 min
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setIsLoggingIn(false);
          setError("Час очікування вийшов. Спробуй ще раз.");
        }
      }, 10 * 60 * 1000);
    } catch {
      setIsLoggingIn(false);
      setError("Помилка підключення до сервера.");
    }
  }

  async function handleDevLogin() {
    if (!devUsername.trim()) return;
    setIsDevLoggingIn(true);
    setError(null);
    try {
      await loginDev(devUsername.trim().toLowerCase());
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dev login failed");
    } finally {
      setIsDevLoggingIn(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brain-950 bg-brain-glow">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-10 text-center max-w-sm"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-brain-accent to-brain-accent2 bg-clip-text text-transparent mb-2">
          FIGABRAIN
        </h1>
        <p className="text-white/50 text-sm mb-8">Your social profile. Your wallet. Your rewards.</p>

        <button
          onClick={handleTelegramLogin}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 bg-[#229ED9] hover:bg-[#1a8bbf] disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.14 13.748l-2.97-.924c-.645-.203-.658-.645.136-.953l11.57-4.461c.537-.194 1.006.131.686.838z"/>
          </svg>
          {isLoggingIn ? "Очікування підтвердження..." : "Увійти через Telegram"}
        </button>

        {isLoggingIn && (
          <p className="text-white/40 text-xs mt-3">
            Підтвердь вхід у боті @figabrain_bot, потім повернись сюди
          </p>
        )}

        {DEV_LOGIN_ENABLED && (
          <div className="mt-8 pt-6 border-t border-white/10 text-left">
            <p className="text-xs text-white/30 mb-2">Dev login</p>
            <input
              value={devUsername}
              onChange={(e) => setDevUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDevLogin()}
              placeholder="username"
              className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none mb-2"
            />
            <button
              onClick={handleDevLogin}
              disabled={isDevLoggingIn || !devUsername.trim()}
              className="w-full bg-white/10 hover:bg-white/20 text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-40"
            >
              {isDevLoggingIn ? "Logging in..." : "Continue as dev user"}
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
      </motion.div>
    </div>
  );
}
