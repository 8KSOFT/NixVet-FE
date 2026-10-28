import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let idioma = 'pt';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: idioma } }) }));

import { CURRENCY_BY_LANGUAGE, formatCurrency, resolveAppLanguage, useCurrencyFormatter } from './currency';

// O Intl usa espaço não separável entre o símbolo e o número em alguns locales; normaliza para comparar.
const normal = (s: string) => s.replace(/ /g, ' ');

describe('resolveAppLanguage', () => {
  it('usa o idioma base e cai em pt para o que não existe', () => {
    expect(resolveAppLanguage('en-US')).toBe('en');
    expect(resolveAppLanguage('es-AR')).toBe('es');
    expect(resolveAppLanguage('pt-BR')).toBe('pt');
    expect(resolveAppLanguage('fr')).toBe('pt');
    expect(resolveAppLanguage(undefined)).toBe('pt');
    expect(resolveAppLanguage('')).toBe('pt');
  });
});

describe('formatCurrency', () => {
  it('símbolo e separadores de cada idioma', () => {
    expect(normal(formatCurrency(1234.5, 'pt'))).toBe('R$ 1.234,50');
    expect(normal(formatCurrency(1234.5, 'en'))).toBe('U$ 1,234.50');
    expect(normal(formatCurrency(1234.5, 'es'))).toMatch(/^Peso 1\.234,50$/);
  });
  it('aceita número em texto e sempre duas casas', () => {
    expect(normal(formatCurrency('25.5', 'pt'))).toBe('R$ 25,50');
    expect(normal(formatCurrency(0, 'pt'))).toBe('R$ 0,00');
  });
  it('vazio para null, undefined, string vazia e lixo', () => {
    expect(formatCurrency(null, 'pt')).toBe('');
    expect(formatCurrency(undefined, 'pt')).toBe('');
    expect(formatCurrency('', 'pt')).toBe('');
    expect(formatCurrency('abc', 'pt')).toBe('');
  });
  it('tabela cobre os três idiomas do produto', () => {
    expect(Object.keys(CURRENCY_BY_LANGUAGE).sort()).toEqual(['en', 'es', 'pt']);
  });
});

describe('useCurrencyFormatter', () => {
  it('segue o idioma ativo', () => {
    idioma = 'en-US';
    const { result } = renderHook(() => useCurrencyFormatter());
    expect(normal(result.current(10))).toBe('U$ 10.00');
    idioma = 'pt';
    const outro = renderHook(() => useCurrencyFormatter());
    expect(normal(outro.result.current(10))).toBe('R$ 10,00');
  });
});
