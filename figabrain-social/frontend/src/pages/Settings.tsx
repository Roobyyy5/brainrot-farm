import { useState, useMemo } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { LANGUAGES, getLanguageByCode } from "../lib/languages";

export function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
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
        l.code.toLowerCase().includes(q)
    );
  }, [langSearch]);

  const selectedLang = getLanguageByCode(language);

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      await api.patch("/users/me", { displayName, bio, language });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-5 max-w-md">
      <h2 className="text-lg font-bold">Profile Settings</h2>

      <div>
        <label className="text-xs text-white/40 block mb-1">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
        />
      </div>

      <div>
        <label className="text-xs text-white/40 block mb-1">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={280}
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-white/40 block mb-1">Language</label>
        <div className="mb-2 text-sm font-semibold">
          {selectedLang.nativeName}
          <span className="text-white/40 font-normal ml-2">— {selectedLang.englishName}</span>
        </div>
        <input
          value={langSearch}
          onChange={(e) => setLangSearch(e.target.value)}
          placeholder="Search language..."
          className="w-full bg-black/30 rounded-lg px-3 py-2 text-sm outline-none mb-1"
        />
        <select
          size={6}
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setLangSearch("");
          }}
          className="w-full bg-black/30 rounded-lg text-sm outline-none"
          style={{ scrollbarWidth: "thin" }}
        >
          {filteredLanguages.map((lang) => (
            <option key={lang.code} value={lang.code} className="px-3 py-1">
              {lang.nativeName} — {lang.englishName}
            </option>
          ))}
        </select>
        {filteredLanguages.length === 0 && (
          <p className="text-white/40 text-xs mt-1">No languages found.</p>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={save}
        disabled={isSaving}
        className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50"
      >
        {saved ? "Saved!" : isSaving ? "Saving..." : "Save changes"}
      </button>

      <button onClick={logout} className="block text-xs text-white/40 hover:text-white">
        Log out
      </button>
    </div>
  );
}
