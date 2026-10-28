import { describe, expect, it, vi } from 'vitest';
import { getLastBillingBlock, isBillingBlockCode, publishBillingBlock, subscribeBillingBlock } from './billing-block';

describe('isBillingBlockCode', () => {
  it('reconhece os códigos do BillingActiveGuard', () => {
    for (const c of [
      'SUBSCRIPTION_READ_ONLY',
      'SUBSCRIPTION_CANCELLED',
      'SUBSCRIPTION_SUSPENDED',
      'TRIAL_EXPIRED',
      'ONBOARDING_EXPIRED',
    ]) {
      expect(isBillingBlockCode(c)).toBe(true);
    }
  });
  it('recusa o resto', () => {
    expect(isBillingBlockCode('FORBIDDEN')).toBe(false);
    expect(isBillingBlockCode(402)).toBe(false);
    expect(isBillingBlockCode(undefined)).toBe(false);
  });
});

describe('canal de bloqueio', () => {
  it('avisa quem assinou, guarda o último e para de avisar depois do cancelamento', () => {
    const ouvinte = vi.fn();
    const cancelar = subscribeBillingBlock(ouvinte);

    publishBillingBlock({ code: 'TRIAL_EXPIRED', message: 'Teste acabou' });
    expect(ouvinte).toHaveBeenCalledWith({ code: 'TRIAL_EXPIRED', message: 'Teste acabou' });
    expect(getLastBillingBlock()?.code).toBe('TRIAL_EXPIRED');

    cancelar();
    publishBillingBlock({ code: 'SUBSCRIPTION_SUSPENDED', message: 'Suspensa' });
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(getLastBillingBlock()?.code).toBe('SUBSCRIPTION_SUSPENDED');
  });
});
