import { useState } from 'react';
import { useLang, useSetLang } from '../context/LangContext';
import './LanguageSwitcher.css';

const LANGS_META = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'uk', flag: '🇺🇦', name: 'Українська' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'pt', flag: '🇧🇷', name: 'Português' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
];

export default function LanguageSwitcher() {
  const lang = useLang();
  const setLang = useSetLang();
  const [open, setOpen] = useState(false);

  const current = LANGS_META.find(l => l.code === lang) || LANGS_META[0];

  function pick(code) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div className="lang-switcher">
      <button className="lang-btn" onClick={() => setOpen(o => !o)} aria-label="Select language">
        <span className="lang-flag">{current.flag}</span>
      </button>
      {open && (
        <>
          <div className="lang-overlay" onClick={() => setOpen(false)} />
          <div className="lang-dropdown">
            {LANGS_META.map(l => (
              <button
                key={l.code}
                className={`lang-option${l.code === lang ? ' active' : ''}`}
                onClick={() => pick(l.code)}
              >
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-name">{l.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
