import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '@/lib/i18n/resources';

/**
 * Símbolo exibido e locale usado pra separador de milhar/decimal, por idioma
 * da plataforma (não é sobre o país do usuário — é o idioma ativo em
 * LanguageSwitcher). "es" mira genericamente América espanhola por ora
 * (ptBR-like: vírgula decimal); ajuste `locale` aqui se precisar mirar um
 * país específico (ex.: México usa ponto decimal, como o inglês).
 */
export const CURRENCY_BY_LANGUAGE: Record<AppLanguage, { symbol: string; locale: string }> = {
  pt: { symbol: 'R$', locale: 'pt-BR' },
  en: { symbol: 'U$', locale: 'en-US' },
  es: { symbol: 'Peso', locale: 'es-AR' },
};

export function resolveAppLanguage(raw: string | undefined): AppLanguage {
  const base = ((raw || 'pt').split('-')[0]) as AppLanguage;
  return CURRENCY_BY_LANGUAGE[base] ? base : 'pt';
}

/** Formata um número decimal (ex: 25.5) no símbolo + separadores do idioma ativo (ex: "R$ 25,50" / "U$ 25.50"). */
export function formatCurrency(value: number | string | null | undefined, lang: AppLanguage): string {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  const { symbol, locale } = CURRENCY_BY_LANGUAGE[lang];
  const number = n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${number}`;
}

/** Hook: retorna uma função `format(valor)` que já usa o idioma ativo da plataforma. Substitui os antigos `fmt`/`fmtBRL` locais hardcoded em 'pt-BR'. */
export function useCurrencyFormatter() {
  const { i18n } = useTranslation();
  const lang = resolveAppLanguage(i18n.language);
  return (value: number | string | null | undefined) => formatCurrency(value, lang);
}
