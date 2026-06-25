import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TelegramLoginButton } from "../components/TelegramLoginButton";
import { useAuth } from "../context/AuthContext";

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "figabrain_bot";
const DEV_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_DEV_LOGIN === "true";

export function Login() {
  const { loginWithTelegram, loginDev } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [devUsername, setDevUsername] = useState("");
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false);
  const navigate = useNavigate();

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

        <TelegramLoginButton
          botUsername={BOT_USERNAME}
          onAuth={(payload) => {
            loginWithTelegram(payload)
              .then(() => navigate("/"))
              .catch((err) => setError(err instanceof Error ? err.message : "Login failed"));
          }}
        />

        {DEV_LOGIN_ENABLED && (
          <div className="mt-8 pt-6 border-t border-white/10 text-left">
            <p className="text-xs text-white/30 mb-2">Dev login (local testing only, no Telegram bot needed)</p>
            <input
              value={devUsername}
              onChange={(e) => setDevUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDevLogin()}
              placeholder="username (a-z, 0-9, _)"
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
