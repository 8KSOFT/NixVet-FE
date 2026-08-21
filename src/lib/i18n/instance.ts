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
} else if (process.env.NODE_ENV !== 'production') {
  // Dev only: a instância do i18next (do pacote, não deste módulo) sobrevive
  // ao Fast Refresh, então o guard acima nunca roda de novo — editar um
  // locales/*.json ficava "preso" nos textos de quando a aba abriu, exigindo
  // reload manual pra cada chave nova. addResourceBundle empurra o JSON
  // atualizado pra dentro da instância viva e dispara o re-render de quem usa
  // t(), sem precisar re-inicializar o i18next inteiro.
  for (const lng of Object.keys(resources) as AppLanguage[]) {
    i18n.addResourceBundle(lng, 'common', resources[lng].common, true, true);
  }
}

export function persistLanguage(lng: AppLanguage) {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
}

export default i18n;
