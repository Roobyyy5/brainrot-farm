import { createContext, useContext, useMemo, useCallback } from 'react';
import { getLang, t as translate } from '../i18n';

const LangContext = createContext({ lang: 'en', t: (key) => key });

export function LangProvider({ children }) {
  const lang = useMemo(() => getLang(), []);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  return <LangContext.Provider value={{ lang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext).lang;
export const useT = () => useContext(LangContext).t;
