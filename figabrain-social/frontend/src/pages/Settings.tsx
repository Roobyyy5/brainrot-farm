import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { LANGUAGES, getLanguageByCode } from "../lib/languages";
import { useImageUpload } from "../hooks/useImageUpload";
import i18n from "../i18n";

export function Settings() {
  const { t } = useTranslation();
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [language, setLanguage] = useState(user?.language ?? "en");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Support
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  async function sendSupport() {
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    setIsSendingSupport(true);
    setSupportError(null);
    try {
      await apiFetch("/support/contact", {
        method: "POST",
        body: JSON.stringify({ subject: supportSubject.trim(), message: supportMessage.trim() }),
      });
      setSupportSent(true);
      setSupportSubject("");
      setSupportMessage("");
      setTimeout(() => setSupportSent(false), 4000);
    } catch {
      setSupportError("Помилка надсилання. Спробуй ще раз.");
    } finally {
      setIsSendingSupport(false);
    }
  }

  // Email / password section
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [isSavingPw, setIsSavingPw] = useState(false);

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const { upload: uploadAvatar, uploading: uploadingAvatar } = useImageUpload();
  const selectedLang = getLanguageByCode(language);

  function pickLanguage(code: string) {
    setLanguage(code);
    i18n.changeLanguage(code);
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      await api.patch("/users/me", {
        displayName,
        bio,
        language,
        ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}),
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(t("settings.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEmail() {
    if (!email.trim()) return;
    setIsSavingEmail(true);
    setEmailError(null);
    try {
      await apiFetch("/auth/me/email", {
        method: "PATCH",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setEmailSaved(true);
      setEmail("");
      setTimeout(() => setEmailSaved(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setEmailError(msg.includes("EMAIL_TAKEN") ? "Цей email вже використовується" : "Помилка збереження email");
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) { setPwError("Паролі не співпадають"); return; }
    if (newPassword.length < 6) { setPwError("Мінімум 6 символів"); return; }
    setIsSavingPw(true);
    setPwError(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setPwSaved(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setPwError(msg.includes("INVALID_CREDENTIALS") ? "Старий пароль невірний" : "Помилка зміни пароля");
    } finally {
      setIsSavingPw(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">

      {/* Профіль */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-bold">{t("settings.title")}</h2>

        <div>
          <label className="text-xs text-white/40 block mb-1">{t("settings.displayName")}</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-1">{t("settings.avatarUrl")}</label>
          <input ref={avatarFileRef} type="file" accept="image/*" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const result = await uploadAvatar(file);
              if (result) setAvatarUrl(result);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2 items-center">
            <div className="relative shrink-0 cursor-pointer group" onClick={() => avatarFileRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-lg">👤</div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs">
                {uploadingAvatar ? "⏳" : "📷"}
              </div>
            </div>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://... або завантаж фото"
              className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-1">{t("settings.bio")}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={280}
            className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-2">
            {t("settings.language")} — <span className="text-white/60">{selectedLang.nativeName}</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {LANGUAGES.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => pickLanguage(lang.code)}
                  className={`text-center px-2 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-brain-accent/20 text-brain-accent font-semibold border border-brain-accent/40"
                      : "bg-black/20 text-white/70 hover:bg-white/5 border border-white/5"
                  }`}
                >
                  {lang.nativeName}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={save}
          disabled={isSaving}
          className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50"
        >
          {saved ? t("settings.saved") : isSaving ? t("settings.saving") : t("settings.save")}
        </button>
      </div>

      {/* Безпека — Email */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold">Безпека</h2>

        <div>
          <label className="text-xs text-white/40 block mb-1">
            Email для відновлення пароля
          </label>
          <p className="text-xs text-white/30 mb-2">
            Потрібен, щоб отримувати посилання для скидання пароля.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={saveEmail}
              disabled={isSavingEmail || !email.trim()}
              className="text-xs bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg disabled:opacity-40 whitespace-nowrap"
            >
              {emailSaved ? "✓ Збережено" : isSavingEmail ? "..." : "Зберегти"}
            </button>
          </div>
          {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
        </div>

        {/* Зміна пароля */}
        <div className="border-t border-white/5 pt-4">
          <label className="text-xs text-white/40 block mb-3">Змінити пароль</label>

          <div className="space-y-2">
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Старий пароль"
              className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Новий пароль (мін. 6 символів)"
              className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повтори новий пароль"
              className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          {pwError && <p className="text-red-400 text-xs mt-2">{pwError}</p>}
          {pwSaved && <p className="text-green-400 text-xs mt-2">✓ Пароль змінено</p>}

          <button
            onClick={changePassword}
            disabled={isSavingPw || !oldPassword || !newPassword || !confirmPassword}
            className="mt-3 text-sm bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full disabled:opacity-40"
          >
            {isSavingPw ? "..." : "Змінити пароль"}
          </button>
        </div>
      </div>

      {/* Підтримка */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold">Підтримка</h2>
          <p className="text-xs text-white/30 mt-0.5">Напиши нам — відповімо на figabrain@gmail.com</p>
        </div>

        {supportSent ? (
          <div className="text-center py-4 space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-sm text-green-400 font-medium">Повідомлення надіслано!</p>
            <p className="text-xs text-white/40">Ми розглянемо його найближчим часом.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/40 block mb-1">Тема</label>
              <input
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                placeholder="Коротко опиши питання..."
                maxLength={120}
                className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Повідомлення</label>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Детально опиши проблему або питання..."
                rows={4}
                maxLength={3000}
                className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none resize-none"
              />
              <p className="text-xs text-white/20 text-right mt-1">{supportMessage.length}/3000</p>
            </div>
            {supportError && <p className="text-red-400 text-xs">{supportError}</p>}
            <button
              onClick={sendSupport}
              disabled={isSendingSupport || !supportSubject.trim() || !supportMessage.trim()}
              className="text-sm bg-gradient-to-r from-brain-accent to-brain-accent2 px-4 py-2 rounded-full font-semibold disabled:opacity-40"
            >
              {isSendingSupport ? "Надсилаємо..." : "Надіслати"}
            </button>
          </div>
        )}
      </div>

      {/* Вийти */}
      <div className="glass-panel rounded-2xl p-4">
        <button onClick={logout} className="text-sm text-red-400/70 hover:text-red-400 transition-colors">
          {t("settings.logout")}
        </button>
      </div>
    </div>
  );
}
