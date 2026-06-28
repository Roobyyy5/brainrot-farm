import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/client";

type Tab = "login" | "register";

interface AuthResponse { data: { accessToken: string; isNewUser: boolean } }

export function Login() {
  const { setTokensFromBotAuth } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const body = tab === "login"
        ? { username: username.trim().toLowerCase(), password }
        : { username: username.trim().toLowerCase(), displayName: displayName.trim(), password };
      const res = await apiFetch<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await setTokensFromBotAuth(res.data.accessToken);
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Помилка";
      setError(
        msg.includes("USERNAME_TAKEN") ? "Це ім'я вже зайняте" :
        msg.includes("INVALID_CREDENTIALS") ? "Невірний логін або пароль" :
        msg.includes("VALIDATION_ERROR") ? "Перевір правильність даних" :
        "Помилка з'єднання з сервером"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brain-950 bg-brain-glow">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-8 w-full max-w-sm"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-brain-accent to-brain-accent2 bg-clip-text text-transparent mb-1 text-center">
          FIGABRAIN
        </h1>
        <p className="text-white/40 text-xs text-center mb-6">Your social profile. Your wallet. Your rewards.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${tab === t ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {t === "login" ? "Вхід" : "Реєстрація"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Логін</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="лише a-z, 0-9, _"
              autoCapitalize="none"
              autoCorrect="off"
              required
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brain-accent/60 transition-colors"
            />
          </div>

          {tab === "register" && (
            <div>
              <label className="text-xs text-white/40 mb-1 block">Ім'я</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Як тебе звати?"
                required
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brain-accent/60 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 mb-1 block">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "register" ? "мінімум 6 символів" : "••••••••"}
              required
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brain-accent/60 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity mt-2"
          >
            {loading ? "..." : tab === "login" ? "Увійти" : "Створити акаунт"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
