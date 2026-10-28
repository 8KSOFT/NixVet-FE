import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/axios', () => ({ default: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));

import { useNotificationsListQuery, useUnreadNotificationsCountQuery } from './useNotifications';

function envolver() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return Wrapper;
}

beforeEach(() => get.mockReset());

/**
 * Regressão de 25/08/2026: o contador do sino (montado em toda página logada) fazia
 * `Number({ count: 3 })`, que é NaN. NaN !== NaN, então o React Query achava que o resultado
 * mudava a cada checagem e re-renderizava ~280 vezes por segundo, sem erro nenhum.
 */
describe('useUnreadNotificationsCountQuery', () => {
  it('devolve o número, não NaN', async () => {
    get.mockResolvedValue({ data: { count: 3 } });
    const { result } = renderHook(() => useUnreadNotificationsCountQuery(), { wrapper: envolver() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
    expect(Number.isNaN(result.current.data)).toBe(false);
  });

  it('sem count vira 0', async () => {
    get.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useUnreadNotificationsCountQuery(), { wrapper: envolver() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it('não entra em laço de renderização: poucos renders para uma resposta', async () => {
    get.mockResolvedValue({ data: { count: 2 } });
    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;
        return useUnreadNotificationsCountQuery();
      },
      { wrapper: envolver() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await new Promise((r) => setTimeout(r, 150));
    expect(renders).toBeLessThan(10);
  });

  it('pede só o que precisa atenção e para de perguntar com a aba escondida', async () => {
    get.mockResolvedValue({ data: { count: 0 } });
    const { result } = renderHook(() => useUnreadNotificationsCountQuery(), { wrapper: envolver() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/notifications/unread-count', { params: { attention_only: true } });
  });
});

describe('useNotificationsListQuery', () => {
  it('só busca quando o painel está aberto', async () => {
    get.mockResolvedValue({ data: [] });
    renderHook(() => useNotificationsListQuery(false), { wrapper: envolver() });
    await new Promise((r) => setTimeout(r, 50));
    expect(get).not.toHaveBeenCalled();
  });

  it('aceita array cru e objeto paginado', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 'a' }] });
    const cru = renderHook(() => useNotificationsListQuery(true), { wrapper: envolver() });
    await waitFor(() => expect(cru.result.current.isSuccess).toBe(true));
    expect(cru.result.current.data).toEqual([{ id: 'a' }]);

    get.mockResolvedValueOnce({ data: { data: [{ id: 'b' }], total: 1 } });
    const paginado = renderHook(() => useNotificationsListQuery(true), { wrapper: envolver() });
    await waitFor(() => expect(paginado.result.current.isSuccess).toBe(true));
    expect(paginado.result.current.data).toEqual([{ id: 'b' }]);
  });

  it('formato inesperado vira lista vazia', async () => {
    get.mockResolvedValue({ data: { algo: 1 } });
    const { result } = renderHook(() => useNotificationsListQuery(true), { wrapper: envolver() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
