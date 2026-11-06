import type { ReactNode } from 'react';

/**
 * Substituto de `react-i18next` para testes que conferem LÓGICA e não texto:
 * `t(chave)` devolve a própria chave, então o teste não quebra quando uma
 * tradução é reescrita. Use com
 * `vi.mock('react-i18next', () => import('@/test-utils/react-i18next-eco'))`.
 */
export const useTranslation = () => ({
  t: (chave: string) => chave,
  i18n: { language: 'pt', changeLanguage: async () => undefined },
});

export const Trans = ({ i18nKey }: { i18nKey: string }) => i18nKey;

export const I18nextProvider = ({ children }: { children: ReactNode }) => children;

/** `instance.ts` registra isto com `i18n.use(...)`. */
export const initReactI18next = { type: '3rdParty' as const, init: () => undefined };
