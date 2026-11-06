import { describe, expect, it } from 'vitest';
import en from '@/locales/en/common.json';
import es from '@/locales/es/common.json';
import pt from '@/locales/pt/common.json';
import { CLASSIFICATIONS, classificationInfo } from './conversation-classifications';

describe('classificationInfo', () => {
  it('acha pelo valor', () => {
    expect(classificationInfo('scheduled')?.labelKey).toBe('whatsapp.classifications.scheduled');
    expect(classificationInfo('lost')?.labelKey).toBe('whatsapp.classifications.lost');
  });
  it('null para vazio e para valor desconhecido', () => {
    expect(classificationInfo(null)).toBeNull();
    expect(classificationInfo(undefined)).toBeNull();
    expect(classificationInfo('')).toBeNull();
    expect(classificationInfo('inventado')).toBeNull();
  });
  it('valores únicos e todos com classe de cor', () => {
    const valores = CLASSIFICATIONS.map((c) => c.value);
    expect(new Set(valores).size).toBe(valores.length);
    for (const c of CLASSIFICATIONS) expect(c.badgeClass).toMatch(/^bg-/);
  });
});

describe('rótulos das classificações nos três idiomas', () => {
  it.each([
    ['pt', pt],
    ['en', en],
    ['es', es],
  ] as const)('%s traduz todas as classificações', (_lng, locale) => {
    const textos = (locale as unknown as { whatsapp: { classifications: Record<string, string> } }).whatsapp.classifications;
    for (const c of CLASSIFICATIONS) expect(textos[c.value]?.trim(), c.value).toBeTruthy();
  });
});
