/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/axios', () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { SEM_PERMISSOES, permissoesDoLocalStorage, useMinhasPermissoesQuery } from './useMinhasPermissoes';

function envolver() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, Wrapper };
}

const entrarComo = (role: string, permissions: string[]) =>
  localStorage.setItem('user', JSON.stringify({ role, permissions }));

beforeEach(() => {
  localStorage.clear();
  // Zera o cache do snapshot entre testes (o módulo guarda o último valor).
  permissoesDoLocalStorage();
});

/**
 * Regressão de 28/10/2026: o menu do último login vinha do localStorage já no primeiro render do
 * cliente, e o servidor renderizava vazio. Resultado: erro de hidratação (React #418) em toda tela
 * logada. O render do servidor TEM de ser igual ao primeiro render do cliente.
 */
describe('hidratação', () => {
  it('o render no servidor ignora o localStorage e sai sem menu', () => {
    entrarComo('admin', ['dashboard', 'patients']);
    const { Wrapper } = envolver();
    function Tela() {
      const { data } = useMinhasPermissoesQuery();
      return <span data-testid="menu">{data?.menu.join(',') ?? ''}</span>;
    }
    const html = renderToString(
      <Wrapper>
        <Tela />
      </Wrapper>,
    );
    expect(html).toContain('<span data-testid="menu"></span>');
    expect(html).not.toContain('dashboard');
  });
});

describe('useMinhasPermissoesQuery', () => {
  it('antes da resposta do servidor, mostra o menu do último login (sem sidebar vazia)', async () => {
    entrarComo('doctor', ['dashboard', 'patients']);
    get.mockReturnValue(new Promise(() => {})); // nunca responde
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useMinhasPermissoesQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.menu).toEqual(['dashboard', 'patients']));
    expect(result.current.data?.role).toBe('doctor');
  });

  it('quando o servidor responde, o valor dele manda', async () => {
    entrarComo('doctor', ['dashboard']);
    get.mockResolvedValue({ data: { role: 'admin', permissions: ['x.read'], menu: ['dashboard', 'financeiro'] } });
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useMinhasPermissoesQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.menu).toEqual(['dashboard', 'financeiro']));
    expect(result.current.data?.role).toBe('admin');
  });

  it('se a rede falha, o menu do último login continua na tela', async () => {
    entrarComo('doctor', ['dashboard', 'patients']);
    get.mockImplementation(async () => {
      throw new Error('offline');
    });
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useMinhasPermissoesQuery(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data?.menu).toEqual(['dashboard', 'patients']);
  });

  it('sem sessão guardada, o menu é vazio', async () => {
    get.mockReturnValue(new Promise(() => {}));
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useMinhasPermissoesQuery(), { wrapper: Wrapper });
    expect(result.current.data).toBe(SEM_PERMISSOES);
  });

  it('o valor guardado tem identidade estável entre renders (senão o React entra em laço)', async () => {
    entrarComo('doctor', ['dashboard']);
    get.mockReturnValue(new Promise(() => {}));
    const { Wrapper } = envolver();
    const refs: unknown[] = [];
    const { rerender } = renderHook(
      () => {
        const { data } = useMinhasPermissoesQuery();
        refs.push(data);
        return data;
      },
      { wrapper: Wrapper },
    );
    rerender();
    rerender();
    const usadas = new Set(refs.filter((r) => r !== SEM_PERMISSOES));
    expect(usadas.size).toBe(1);
  });

  it('acompanha o login feito em outra aba (evento storage)', async () => {
    get.mockReturnValue(new Promise(() => {}));
    const { Wrapper } = envolver();
    const { result } = renderHook(() => useMinhasPermissoesQuery(), { wrapper: Wrapper });
    expect(result.current.data?.menu).toEqual([]);
    act(() => {
      entrarComo('admin', ['dashboard']);
      window.dispatchEvent(new StorageEvent('storage', { key: 'user' }));
    });
    await waitFor(() => expect(result.current.data?.menu).toEqual(['dashboard']));
  });
});

describe('permissoesDoLocalStorage', () => {
  it('mesma referência enquanto o texto guardado não muda', () => {
    entrarComo('admin', ['a']);
    const a = permissoesDoLocalStorage();
    expect(permissoesDoLocalStorage()).toBe(a);
    entrarComo('admin', ['a', 'b']);
    expect(permissoesDoLocalStorage()).not.toBe(a);
  });
  it('storage bloqueado devolve vazio sem lançar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(permissoesDoLocalStorage()).toBe(SEM_PERMISSOES);
  });
});
