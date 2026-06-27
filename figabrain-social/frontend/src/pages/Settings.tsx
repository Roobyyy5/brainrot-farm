import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { LANGUAGES, getLanguageByCode } from "../lib/languages";
import i18n from "../i18n";

export function Settings() {
  const { t } = useTranslation();
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [language, setLanguage] = useState(user?.language ?? "en");
  const [langSearch, setLangSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredLanguages = useMemo(() => {
    const q = langSearch.toLowerCase().trim();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.englishName.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase() === q
    );
  }, [langSearch]);

  const selectedLang = getLanguageByCode(language);

  function pickLanguage(code: string) {
    setLanguage(code);
    setLangSearch("");
    // Change UI language immediately so the user sees feedback right away.
    i18n.changeLanguage(code);
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      await api.patch("/users/me", { displayName, bio, language, ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}) });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(t("settings.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-5 max-w-md">
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
        <div className="flex gap-2 items-center">
          {avatarUrl && (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
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
        <label className="text-xs text-white/40 block mb-1">{t("settings.language")}</label>

        {/* Current selection badge */}
        <div className="flex items-center gap-2 mb-2 bg-brain-accent/10 border border-brain-accent/30 rounded-lg px-3 py-2">
          <span className="font-semibold text-sm">{selectedLang.nativeName}</span>
          <span className="text-white/40 text-xs">— {selectedLang.englishName}</span>
          <span className="ml-auto text-xs text-white/30 font-mono">{selectedLang.code}</span>
        </div>

        {/* Filter input */}
        <input
          value={langSearch}
          onChange={(e) => setLangSearch(e.target.value)}
          placeholder={t("settings.searchLanguage")}
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none mb-1"
        />

        {/* Scrollable language list — using buttons, not <select>, for reliable touch/click handling */}
        <div className="h-44 overflow-y-auto rounded-lg bg-black/20 border border-white/5">
          {filteredLanguages.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-4">{t("settings.noLanguages")}</p>
          ) : (
            filteredLanguages.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => pickLanguage(lang.code)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                    active
                      ? "bg-brain-accent/20 text-brain-accent font-semibold"
                      : "text-white/70 hover:bg-white/5 active:bg-white/10"
                  }`}
                >
                  <span>{lang.nativeName}</span>
                  <span className="text-xs text-white/30 ml-2 flex-shrink-0">{lang.englishName}</span>
                </button>
              );
            })
          )}
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

      <button onClick={logout} className="block text-xs text-white/40 hover:text-white">
        {t("settings.logout")}
      </button>
    </div>
  );
}
