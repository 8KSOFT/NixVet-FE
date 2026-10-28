import type { AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from './pagination';

// O módulo importa o axios configurado da aplicação (interceptors, cookies); aqui só importa o contrato.
vi.mock('@/lib/axios', () => ({ default: {} }));

const itens = (de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => ({ id: de + i }));

describe('listQueryParams', () => {
  it('limita a página mínima e o tamanho máximo', () => {
    expect(listQueryParams(0)).toEqual({ page: 1, limit: API_PAGE_SIZE });
    expect(listQueryParams(3, 500)).toEqual({ page: 3, limit: API_PAGE_SIZE });
    expect(listQueryParams(2, 0)).toEqual({ page: 2, limit: 1 });
  });
  it('repassa filtros extras', () => {
    expect(listQueryParams(1, 10, { q: 'maria' })).toEqual({ page: 1, limit: 10, q: 'maria' });
  });
});

describe('parseListResponse', () => {
  it('array cru: fatia no cliente', () => {
    const r = parseListResponse(itens(1, 120), 2);
    expect(r.items).toHaveLength(API_PAGE_SIZE);
    expect(r.items[0]).toEqual({ id: 51 });
    expect(r).toMatchObject({ total: 120, page: 2, totalPages: 3 });
  });
  it('página pedida além do fim volta para a última', () => {
    expect(parseListResponse(itens(1, 10), 9).page).toBe(1);
  });
  it('objeto paginado pelo servidor: respeita total, page e totalPages', () => {
    const r = parseListResponse({ data: itens(1, 50), total: 120, page: 1, totalPages: 3 }, 1);
    expect(r).toMatchObject({ total: 120, page: 1, totalPages: 3 });
    expect(r.items).toHaveLength(50);
  });
  it('aceita items, results e count no lugar de data e total', () => {
    expect(parseListResponse({ items: itens(1, 2), count: 2, page: 1 }, 1).items).toHaveLength(2);
    expect(parseListResponse({ results: itens(1, 3), total: 3, totalPages: 1 }, 1).items).toHaveLength(3);
  });
  it('objeto legado { data: [...] } sem metadados: lista completa aninhada, fatiada no cliente', () => {
    const r = parseListResponse({ data: itens(1, 70) }, 2);
    expect(r.items).toHaveLength(20);
    expect(r).toMatchObject({ total: 70, page: 2, totalPages: 2 });
  });
  it('lixo vira lista vazia', () => {
    for (const lixo of [null, undefined, 'x', 42]) {
      expect(parseListResponse(lixo, 1)).toEqual({ items: [], total: 0, page: 1, totalPages: 1 });
    }
  });
});

function clientePaginado(total: number) {
  const get = vi.fn(async (_path: string, cfg: { params: { page: number; limit: number } }) => {
    const { page, limit } = cfg.params;
    const de = (page - 1) * limit + 1;
    const ate = Math.min(page * limit, total);
    return { data: { data: de > total ? [] : itens(de, ate), total, page, totalPages: Math.ceil(total / limit) } };
  });
  return { get, cliente: { get } as unknown as AxiosInstance };
}

describe('fetchAllListPages', () => {
  it('uma página só: não pede mais nada', async () => {
    const { get, cliente } = clientePaginado(30);
    const todos = await fetchAllListPages('/patients', {}, cliente);
    expect(todos).toHaveLength(30);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('junta todas as páginas, na ordem', async () => {
    const { get, cliente } = clientePaginado(230);
    const todos = await fetchAllListPages<{ id: number }>('/patients', {}, cliente);
    expect(todos).toHaveLength(230);
    expect(todos.map((x) => x.id)).toEqual(Array.from({ length: 230 }, (_, i) => i + 1));
    expect(get).toHaveBeenCalledTimes(5);
  });

  it('busca as páginas 2 em diante em paralelo, não uma de cada vez', async () => {
    let emVoo = 0;
    let pico = 0;
    const get = vi.fn(async (_p: string, cfg: { params: { page: number; limit: number } }) => {
      emVoo += 1;
      pico = Math.max(pico, emVoo);
      await new Promise((r) => setTimeout(r, 5));
      emVoo -= 1;
      const { page, limit } = cfg.params;
      return { data: { data: itens((page - 1) * limit + 1, page * limit), total: 400, page, totalPages: 8 } };
    });
    await fetchAllListPages('/exams', {}, { get } as unknown as AxiosInstance);
    expect(pico).toBeGreaterThan(1);
    expect(pico).toBeLessThanOrEqual(6);
  });

  it('respeita maxPages', async () => {
    const { get, cliente } = clientePaginado(1000);
    const todos = await fetchAllListPages('/patients', {}, cliente, 3);
    expect(todos).toHaveLength(150);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('API que devolve array cru já na primeira resposta', async () => {
    const get = vi.fn(async () => ({ data: itens(1, 7) }));
    expect(await fetchAllListPages('/x', {}, { get } as unknown as AxiosInstance)).toHaveLength(7);
  });

  it('manda os filtros em toda página', async () => {
    const { get, cliente } = clientePaginado(120);
    await fetchAllListPages('/patients', { q: 'maria' }, cliente);
    for (const [, cfg] of get.mock.calls) expect((cfg.params as Record<string, unknown>).q).toBe('maria');
  });
});
