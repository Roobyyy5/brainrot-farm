import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiFetch } from "../api/client";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Паролі не співпадають"); return; }
    if (password.length < 6) { setError("Пароль має бути мінімум 6 символів"); return; }

    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("INVALID_RESET_TOKEN")
          ? "Посилання для скидання недійсне або вичерпане. Запроси нове."
          : "Помилка. Спробуй ще раз."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brain-950 bg-brain-glow p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-8 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold bg-gradient-to-r from-brain-accent to-brain-accent2 bg-clip-text text-transparent mb-1 text-center">
          FIGABRAIN
        </h1>

        {done ? (
          <div className="text-center mt-6 space-y-4">
            <div className="text-5xl">✅</div>
            <p className="text-sm font-semibold">Пароль успішно змінено!</p>
            <p className="text-xs text-white/40">Тепер можеш увійти з новим паролем.</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-white font-semibold py-3 rounded-xl mt-2"
            >
              Увійти
            </button>
          </div>
        ) : (
          <>
            <p className="text-white/40 text-xs text-center mb-6 mt-1">Введи новий пароль</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Новий пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="мінімум 6 символів"
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brain-accent/60 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Повтори пароль</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brain-accent/60 transition-colors"
                />
              </div>

              {/* Індикатор надійності пароля */}
              {password && (
                <PasswordStrength password={password} />
              )}

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-white font-semibold py-3 rounded-xl disabled:opacity-50 mt-2"
              >
                {loading ? "..." : "Зберегти новий пароль"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full text-sm text-white/40 hover:text-white/70 transition-colors py-1"
              >
                ← Назад до входу
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ["Дуже слабкий", "Слабкий", "Середній", "Надійний", "Відмінний"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-green-400"];

  return (
    <div>
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score] : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="text-xs text-white/30">{labels[score]}</p>
    </div>
  );
}
