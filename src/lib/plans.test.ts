import { describe, expect, it } from 'vitest';
import {
  PLANS,
  PLAN_BY_ID,
  PLAN_RANK,
  PLAN_SELECT_OPTIONS,
  planFullLabel,
  planMeetsRequirement,
  planShortLabel,
} from './plans';

describe('catálogo de planos', () => {
  it('ids, ordem e preços crescentes', () => {
    expect(PLANS.map((p) => p.id)).toEqual(['essencial', 'clinica', 'hospital']);
    const precos = PLANS.map((p) => p.price);
    expect(precos).toEqual([...precos].sort((a, b) => a - b));
  });
  it('só um plano em destaque', () => {
    expect(PLANS.filter((p) => p.highlight)).toHaveLength(1);
  });
  it('PLAN_BY_ID e PLAN_RANK cobrem os mesmos planos do catálogo', () => {
    for (const p of PLANS) {
      expect(PLAN_BY_ID[p.id]).toBe(p);
      expect(PLAN_RANK[p.id]).toBeGreaterThan(0);
    }
    expect(Object.keys(PLAN_RANK).sort()).toEqual(PLANS.map((p) => p.id).sort());
  });
  it('todo plano tem recursos', () => {
    for (const p of PLANS) expect(p.features.length).toBeGreaterThan(0);
  });
  it('as opções do select incluem Enterprise manual', () => {
    expect(PLAN_SELECT_OPTIONS).toHaveLength(PLANS.length + 1);
    expect(PLAN_SELECT_OPTIONS.at(-1)).toEqual({ value: 'enterprise', label: 'Enterprise (manual)' });
  });
});

describe('rótulos', () => {
  it('curto', () => {
    expect(planShortLabel('clinica')).toBe('Clínica');
    expect(planShortLabel('enterprise')).toBe('enterprise');
    expect(planShortLabel(null)).toBe('—');
  });
  it('completo, com preço', () => {
    expect(planFullLabel('clinica')).toBe('Clínica — R$299/mês');
    expect(planFullLabel('enterprise')).toBe('Enterprise');
    expect(planFullLabel('outro')).toBe('outro');
    expect(planFullLabel(undefined)).toBe('—');
  });
});

describe('planMeetsRequirement (mesma regra do PlanGuard)', () => {
  it('trial sem plano conta como essencial', () => {
    expect(planMeetsRequirement(null, 'essencial')).toBe(true);
    expect(planMeetsRequirement(undefined, 'clinica')).toBe(false);
  });
  it('plano maior atende o menor, o inverso não', () => {
    expect(planMeetsRequirement('hospital', 'clinica')).toBe(true);
    expect(planMeetsRequirement('clinica', 'clinica')).toBe(true);
    expect(planMeetsRequirement('clinica', 'hospital')).toBe(false);
    expect(planMeetsRequirement('essencial', 'clinica')).toBe(false);
  });
});

describe('plano Enterprise (manual, fora do catálogo)', () => {
  it('o backend dá acesso total ao Enterprise e o front concorda', () => {
    expect(planMeetsRequirement('enterprise', 'essencial')).toBe(true);
    expect(planMeetsRequirement('enterprise', 'clinica')).toBe(true);
    expect(planMeetsRequirement('enterprise', 'hospital')).toBe(true);
  });
  it('plano desconhecido continua valendo como essencial, nunca como acesso total', () => {
    expect(planMeetsRequirement('inventado', 'clinica')).toBe(false);
    expect(planMeetsRequirement('inventado', 'essencial')).toBe(true);
  });
});
