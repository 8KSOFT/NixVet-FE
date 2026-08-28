import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  carregarIdioma,
  resources,
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from './resources';

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
  // Só percorre o que está de fato em `resources` (hoje, `pt`) — os demais
  // idiomas chegam por `trocarIdioma` e o Fast Refresh não os mantém presos.
  for (const [lng, pacote] of Object.entries(resources)) {
    i18n.addResourceBundle(lng, 'common', pacote.common, true, true);
  }
}

/**
 * Troca de idioma carregando o pacote antes, quando ele não está em memória.
 *
 * Todo lugar que muda idioma deve passar por aqui em vez de chamar
 * `i18n.changeLanguage` direto: só `pt` vem no bundle, e trocar para `en`/`es`
 * sem carregar o pacote antes cai no fallback e a tela fica em português sem
 * nenhum erro visível.
 */
export async function trocarIdioma(lng: AppLanguage): Promise<void> {
  if (!SUPPORTED_LANGUAGES.includes(lng)) return;
  if (!i18n.hasResourceBundle(lng, 'common')) {
    const pacote = await carregarIdioma(lng);
    if (pacote) i18n.addResourceBundle(lng, 'common', pacote, true, true);
  }
  await i18n.changeLanguage(lng);
}

export function persistLanguage(lng: AppLanguage) {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
}

export default i18n;
