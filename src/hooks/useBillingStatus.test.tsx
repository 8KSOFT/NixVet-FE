import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/axios', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { publishBillingBlock } from '@/lib/billing-block';
import { useBillingStatus } from './useBillingStatus';

function envolver() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, Wrapper };
}



describe('useBillingStatus', () => {
  it('traduz a resposta do servidor', async () => {
    const futuro = new Date(Date.now() + 5 * 86400000).toISOString();
    get.mockResolvedValue({ data: { status: 'trial', trialEndsAt: futuro, billingPlan: 'clinica' } });
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useBillingStatus(), { wrapper: Wrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.status).toBe('trial'));
    expect(result.current.billingPlan).toBe('clinica');
    expect(result.current.daysLeft).toBe(5);
    expect(result.current.error).toBe(false);
  });

  it('status que o front não conhece vira unknown, nunca trial', async () => {
    get.mockResolvedValue({ data: { status: 'inventado', trialEndsAt: null, billingPlan: null } });
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useBillingStatus(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBe('unknown');
    expect(result.current.daysLeft).toBeNull();
  });

  it('falha na consulta: unknown com error, sem mostrar teste grátis para clínica pagante', async () => {
    get.mockImplementation(async () => {
      throw new Error('500');
    });
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useBillingStatus(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.status).toBe('unknown');
  });

  it('o 402 recebido com a tela aberta atualiza o banner na hora', async () => {
    get.mockResolvedValue({ data: { status: 'active', trialEndsAt: null, billingPlan: 'clinica' } });
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useBillingStatus(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));

    act(() => publishBillingBlock({ code: 'SUBSCRIPTION_READ_ONLY', message: 'Somente leitura' }));
    await waitFor(() => expect(result.current.status).toBe('read_only'));
    // O plano que o servidor informou continua no cache.
    expect(result.current.billingPlan).toBe('clinica');
  });

  it.each([
    ['SUBSCRIPTION_CANCELLED', 'cancelled'],
    ['SUBSCRIPTION_SUSPENDED', 'suspended'],
    ['TRIAL_EXPIRED', 'trial_expired'],
    ['ONBOARDING_EXPIRED', 'onboarding_expired'],
  ] as const)('%s vira %s', async (codigo, esperado) => {
    get.mockResolvedValue({ data: { status: 'active', trialEndsAt: null, billingPlan: null } });
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useBillingStatus(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.status).toBe('active'));
    act(() => publishBillingBlock({ code: codigo, message: 'x' }));
    await waitFor(() => expect(result.current.status).toBe(esperado));
  });
});
