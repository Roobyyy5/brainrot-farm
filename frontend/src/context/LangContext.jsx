import { createContext, useContext, useState, useCallback } from 'react';
import { getLang, t as translate, LANGS } from '../i18n';

const LangContext = createContext({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
  setDetectedLang: () => {},
});

const STORAGE_KEY = 'figabrain_lang';

function resolveLang(code) {
  if (!code) return null;
  if (LANGS[code]) return code;
  const prefix = code.split(/[-_]/)[0];
  if (LANGS[prefix]) return prefix;
  return null;
}

function hasExplicitLang() {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => getLang());

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  // Explicit user choice (LanguageSwitcher): apply and persist it.
  const setLang = useCallback((code) => {
    const resolved = resolveLang(code);
    if (resolved && resolved !== lang) {
      setLangState(resolved);
      try { localStorage.setItem(STORAGE_KEY, resolved); } catch {}
    }
  }, [lang]);

  // Auto-detected language (e.g. from Telegram's language_code): apply ONLY
  // when the user has NOT explicitly chosen a language, and never persist it.
  // Previously App called setLang(tg_lang) unconditionally after the initial
  // data fetch, which (a) overrode the user's saved choice and (b) switched
  // the language after first paint, causing the visible UI flicker.
  const setDetectedLang = useCallback((code) => {
    if (hasExplicitLang()) return;
    const resolved = resolveLang(code);
    if (resolved && resolved !== lang) setLangState(resolved);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, t, setLang, setDetectedLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext).lang;
export const useT = () => useContext(LangContext).t;
export const useSetLang = () => useContext(LangContext).setLang;
export const useSetDetectedLang = () => useContext(LangContext).setDetectedLang;
