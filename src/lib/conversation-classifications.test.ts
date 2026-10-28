import { describe, expect, it } from 'vitest';
import { CLASSIFICATIONS, classificationInfo } from './conversation-classifications';

describe('classificationInfo', () => {
  it('acha pelo valor', () => {
    expect(classificationInfo('scheduled')?.label).toBe('Consulta agendada');
    expect(classificationInfo('lost')?.label).toBe('Desistência');
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
