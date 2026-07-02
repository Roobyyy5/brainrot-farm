import { createContext, useContext, useState, useCallback } from 'react';
import { getLang, t as translate, LANGS } from '../i18n';

const LangContext = createContext({ lang: 'en', t: (key) => key, setLang: () => {} });

function resolveLang(code) {
  if (!code) return null;
  if (LANGS[code]) return code;
  const prefix = code.split(/[-_]/)[0];
  if (LANGS[prefix]) return prefix;
  return null;
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => getLang());

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const setLang = useCallback((code) => {
    const resolved = resolveLang(code);
    if (resolved && resolved !== lang) setLangState(resolved);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext).lang;
export const useT = () => useContext(LangContext).t;
export const useSetLang = () => useContext(LangContext).setLang;
