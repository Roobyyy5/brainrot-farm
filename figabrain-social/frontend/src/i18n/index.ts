import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    // Language is set after profile load via i18n.changeLanguage()
    lng: "en",
    fallbackLng: "en",
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      // Fetches /api/i18n/{lang} — proxied by Vite in dev, served directly in prod
      loadPath: "/api/i18n/{{lng}}",
      // Parse the backend response (it's already a flat/nested JSON object)
      parse: (data: string) => JSON.parse(data),
    },
    interpolation: { escapeValue: false },
    // Don't block rendering — show keys while loading, then swap in translations
    react: { useSuspense: false },
  });

export default i18n;
