import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHasPermission } from './useHasPermission';

const entrarComo = (role: string) => localStorage.setItem('user', JSON.stringify({ role }));

describe('useHasPermission', () => {
  it('veterinário não passa no gate de venda; recepção passa', async () => {
    entrarComo('veterinarian');
    const medico = renderHook(() => useHasPermission('products.sell'));
    await waitFor(() => expect(medico.result.current).toBe(false));

    entrarComo('reception');
    const recepcao = renderHook(() => useHasPermission('products.sell'));
    await waitFor(() => expect(recepcao.result.current).toBe(true));
  });

  it('enquanto o papel não foi lido a resposta é false (a requisição não sai antes da hora)', async () => {
    entrarComo('admin');
    const respostas: boolean[] = [];
    const { result } = renderHook(() => {
      const v = useHasPermission('patients.read');
      respostas.push(v);
      return v;
    });
    // O primeiro render acontece antes do efeito que lê o localStorage.
    expect(respostas[0]).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('sem sessão o papel é desconhecido e cai aberto', async () => {
    const { result } = renderHook(() => useHasPermission('patients.read'));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('aceita várias chaves (E)', async () => {
    entrarComo('veterinarian');
    const { result } = renderHook(() => useHasPermission('patients.read', 'products.sell'));
    // Dá tempo do efeito ler o papel: a resposta final continua false porque falta products.sell.
    await act(async () => {});
    expect(result.current).toBe(false);
  });
});
