import { describe, expect, it } from 'vitest';
import en from '@/locales/en/common.json';
import es from '@/locales/es/common.json';
import pt from '@/locales/pt/common.json';
import { PLANS } from '@/lib/plans';

type TextoDoPlano = { name: string; tagline: string; features: Record<string, string> };
const idiomas = { pt, en, es } as unknown as Record<string, { plans: Record<string, TextoDoPlano> }>;

describe('textos dos planos nos três idiomas', () => {
  it.each(Object.keys(idiomas))('%s traduz nome, descrição e cada recurso de todos os planos', (lng) => {
    for (const plano of PLANS) {
      const texto = idiomas[lng].plans[plano.id];
      expect(texto, `${lng}: falta plans.${plano.id}`).toBeDefined();
      expect(texto.name.trim()).not.toBe('');
      expect(texto.tagline.trim()).not.toBe('');
      expect(Object.keys(texto.features), `${lng}: recursos de ${plano.id}`).toHaveLength(plano.features.length);
    }
  });

  it('em português o texto é o mesmo do catálogo (a tradução não pode divergir do original)', () => {
    for (const plano of PLANS) {
      const texto = idiomas.pt.plans[plano.id];
      expect(texto.name).toBe(plano.name);
      expect(texto.tagline).toBe(plano.tagline);
      plano.features.forEach((f, i) => expect(texto.features[String(i)]).toBe(f));
    }
  });
});
