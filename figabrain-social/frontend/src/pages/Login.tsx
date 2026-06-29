import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { apiFetch, ApiError } from "../api/client";

type Tab = "login" | "register";

interface AuthResponse { data: { accessToken: string; isNewUser: boolean } }
interface ForgotResponse { data: { sent: boolean; devToken?: string } }

const REMEMBER_KEY = "figabrain:remember_username";

export function Login() {
  const { setTokensFromBotAuth } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? "");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();

  // Sync remember-me з localStorage
  useEffect(() => {
    if (rememberMe && username) {
      localStorage.setItem(REMEMBER_KEY, username);
    } else if (!rememberMe) {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, [rememberMe, username]);

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

      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, username.trim().toLowerCase());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      await setTokensFromBotAuth(res.data.accessToken);
      navigate("/");
    } catch (err: unknown) {
      const code = err instanceof ApiError ? err.code : "";
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        code === "USERNAME_TAKEN" ? "Це ім'я вже зайняте" :
        code === "INVALID_CREDENTIALS" ? "Невірний логін або пароль" :
        code === "VALIDATION_ERROR" || status === 400 ? "Перевір правильність даних (мін. 3 символи, лише a-z 0-9 _)" :
        code === "RATE_LIMITED" || status === 429 ? "Забагато спроб. Зачекай хвилину." :
        code === "BANNED" ? "Акаунт заблоковано." :
        "Сервер недоступний. Спробуй ще раз."
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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-brain-accent to-brain-accent2 bg-clip-text text-transparent mb-1 text-center">
          FIGABRAIN
        </h1>
        <p className="text-white/40 text-xs text-center mb-6">Your social profile. Your wallet. Your rewards.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setShowForgot(false); }}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${tab === t ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {t === "login" ? "Вхід" : "Реєстрація"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {showForgot ? (
            <ForgotPasswordForm onBack={() => setShowForgot(false)} />
          ) : (
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onSubmit={handleSubmit}
              className="space-y-3"
            >
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

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs">
                  {error}
                </motion.p>
              )}

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe((v) => !v)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      rememberMe
                        ? "bg-brain-accent border-brain-accent"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {rememberMe && <span className="text-white text-[10px] leading-none">✓</span>}
                  </button>
                  <span className="text-xs text-white/50">Запам'ятати мене</span>
                </label>

                {tab === "login" && (
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(null); }}
                    className="text-xs text-brain-accent/70 hover:text-brain-accent transition-colors"
                  >
                    Забув пароль?
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity mt-2"
              >
                {loading ? "..." : tab === "login" ? "Увійти" : "Створити акаунт"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [login, setLogin] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ForgotResponse>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ login: login.trim().toLowerCase() }),
      });
      setSent(true);
      if (res.data.devToken) setDevToken(res.data.devToken);
    } catch {
      setError("Помилка. Спробуй ще раз.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
        <div className="text-4xl">📬</div>
        <p className="text-sm text-white/70">
          {devToken
            ? "SMTP не налаштовано — скопіюй токен нижче і перейди за посиланням:"
            : "Якщо акаунт з таким логіном або email існує — ми надіслали листа для скидання пароля."}
        </p>

        {devToken && (
          <div className="bg-black/30 rounded-xl p-3">
            <p className="text-xs text-white/40 mb-1">Dev-токен (лише в режимі розробки):</p>
            <a
              href={`/reset-password?token=${devToken}`}
              className="text-xs text-brain-accent2 break-all hover:underline"
            >
              /reset-password?token={devToken}
            </a>
          </div>
        )}

        <button
          onClick={onBack}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Назад до входу
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div>
        <h3 className="text-base font-semibold mb-1">Відновлення пароля</h3>
        <p className="text-xs text-white/40">Вкажи свій логін або email — ми надішлемо посилання для скидання.</p>
      </div>

      <div>
        <label className="text-xs text-white/40 mb-1 block">Логін або email</label>
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="username або you@email.com"
          autoCapitalize="none"
          autoCorrect="off"
          required
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brain-accent/60 transition-colors"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={loading || !login.trim()}
        className="w-full bg-gradient-to-r from-brain-accent to-brain-accent2 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
      >
        {loading ? "..." : "Надіслати посилання"}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-white/40 hover:text-white/70 transition-colors py-1"
      >
        ← Назад до входу
      </button>
    </motion.form>
  );
}
