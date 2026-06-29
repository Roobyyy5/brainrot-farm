export interface Language {
  code: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", nativeName: "English" },
  { code: "zh", nativeName: "中文" },
  { code: "es", nativeName: "Español" },
  { code: "hi", nativeName: "हिन्दी" },
  { code: "ar", nativeName: "العربية" },
  { code: "bn", nativeName: "বাংলা" },
  { code: "pt", nativeName: "Português" },
  { code: "ru", nativeName: "Русский" },
  { code: "ja", nativeName: "日本語" },
  { code: "fr", nativeName: "Français" },
  { code: "de", nativeName: "Deutsch" },
  { code: "ko", nativeName: "한국어" },
  { code: "tr", nativeName: "Türkçe" },
  { code: "uk", nativeName: "Українська" },
  { code: "id", nativeName: "Indonesia" },
];

export function getLanguageByCode(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? { code, nativeName: code };
}
