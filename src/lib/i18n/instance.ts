import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, STORAGE_KEY, SUPPORTED_LANGUAGES, type AppLanguage } from './resources';

/** Sempre `pt` no init (SSR + hidratação iguais). Preferência do usuário em `AppProviders` via `changeLanguage`. */
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'pt',
    fallbackLng: 'pt',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function persistLanguage(lng: AppLanguage) {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
}

export default i18n;
