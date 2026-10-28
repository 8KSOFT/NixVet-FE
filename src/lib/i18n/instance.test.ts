import { describe, expect, it } from 'vitest';
import i18n, { persistLanguage, trocarIdioma } from './instance';
import { STORAGE_KEY, SUPPORTED_LANGUAGES, carregarIdioma, resources } from './resources';

describe('recursos', () => {
  it('só o português entra no bundle; en e es vêm sob demanda', async () => {
    expect(Object.keys(resources)).toEqual(['pt']);
    expect(await carregarIdioma('pt')).toBeNull();
    expect(await carregarIdioma('en')).toBeTypeOf('object');
    expect(await carregarIdioma('es')).toBeTypeOf('object');
    expect(SUPPORTED_LANGUAGES).toEqual(['pt', 'en', 'es']);
  });
});

describe('trocarIdioma', () => {
  it('começa em português', () => {
    expect(i18n.language).toBe('pt');
    expect(i18n.t('patients.title')).toBe('Pacientes');
  });

  it('carrega o pacote ANTES de trocar: o texto sai no idioma novo, não no fallback em português', async () => {
    expect(i18n.hasResourceBundle('en', 'common')).toBe(false);
    await trocarIdioma('en');
    expect(i18n.language).toBe('en');
    expect(i18n.hasResourceBundle('en', 'common')).toBe(true);
    expect(i18n.t('patients.title')).not.toBe('Pacientes');
    await trocarIdioma('es');
    expect(i18n.language).toBe('es');
    await trocarIdioma('pt');
    expect(i18n.t('patients.title')).toBe('Pacientes');
  });

  it('idioma não suportado é ignorado', async () => {
    await trocarIdioma('pt');
    await trocarIdioma('fr' as never);
    expect(i18n.language).toBe('pt');
  });
});

describe('persistLanguage', () => {
  it('guarda a preferência, e storage bloqueado não quebra', () => {
    persistLanguage('es');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('es');
  });
});
