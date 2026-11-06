import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { trocarIdioma } from '@/lib/i18n/instance';
import type { BillingStatusData } from '@/hooks/useBillingStatus';
import { TrialBanner } from './TrialBanner';

vi.mock('@/lib/role-permissions', () => ({ getStoredUserRole: () => 'admin' }));

const billing = (over: Partial<BillingStatusData>): BillingStatusData =>
  ({ status: 'trial', daysLeft: 5, loading: false, ...over }) as BillingStatusData;

describe('TrialBanner traduzido', () => {
  afterEach(async () => {
    await trocarIdioma('pt');
  });

  it('em português mantém o texto e o negrito', () => {
    render(<TrialBanner billing={billing({ daysLeft: 5 })} />);
    expect(screen.getByText(/Seu trial expira em/)).toBeInTheDocument();
    expect(screen.getByText('5 dias').tagName).toBe('STRONG');
  });

  it('plural certo em português: 1 dia, não "1 dias"', () => {
    render(<TrialBanner billing={billing({ daysLeft: 1 })} />);
    expect(screen.getByText('1 dia').tagName).toBe('STRONG');
  });

  it.each([
    ['en', 'View plans', '1 day'],
    ['es', 'Ver planes', '1 día'],
  ] as const)('troca para %s: botão, plural e negrito', async (lng, botao, dia) => {
    await trocarIdioma(lng);
    expect(i18n.language).toBe(lng);
    render(<TrialBanner billing={billing({ daysLeft: 1 })} />);
    expect(screen.getByText(botao)).toBeInTheDocument();
    expect(screen.getByText(dia).tagName).toBe('STRONG');
  });

  it('somente leitura em inglês usa o texto em inglês, sem sobra de português', async () => {
    await trocarIdioma('en');
    render(<TrialBanner billing={billing({ status: 'read_only' })} />);
    expect(screen.getByText('read-only').tagName).toBe('STRONG');
    expect(screen.getByText('Settle payment')).toBeInTheDocument();
    expect(screen.queryByText(/Regularizar|somente leitura/)).not.toBeInTheDocument();
  });
});
