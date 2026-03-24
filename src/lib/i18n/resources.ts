import ptCommon from '@/locales/pt/common.json';
import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';

export const resources = {
  pt: { common: ptCommon },
  en: { common: enCommon },
  es: { common: esCommon },
} as const;

export type AppLanguage = keyof typeof resources;

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['pt', 'en', 'es'];

export const STORAGE_KEY = 'nixvet-lang';
