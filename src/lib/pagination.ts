import type { AxiosInstance } from 'axios';
import api from '@/lib/axios';

/** Tamanho máximo por página (API + UI). */
export const API_PAGE_SIZE = 50;

export type PagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};

export function listQueryParams(
  page: number,
  limit: number = API_PAGE_SIZE,
  extra: Record<string, string | number | boolean | undefined> = {},
) {
  const p = Math.max(1, page);
  const l = Math.min(Math.max(1, limit), API_PAGE_SIZE);
  return { page: p, limit: l, ...extra };
}

/**
 * Normaliza a resposta de listas: array cru, ou objeto com { data, total, page, ... }.
 * Se a API ainda retornar array completo, aplica fatiamento no cliente.
 */
export function parseListResponse<T>(body: unknown, requestedPage: number, limit: number = API_PAGE_SIZE): PagedResult<T> {
  const L = Math.min(Math.max(1, limit), API_PAGE_SIZE);
  const req = Math.max(1, requestedPage);

  if (Array.isArray(body)) {
    const total = body.length;
    const totalPages = Math.max(1, Math.ceil(total / L) || 1);
    const page = Math.min(req, totalPages);
    const start = (page - 1) * L;
    return {
      items: body.slice(start, start + L) as T[],
      total,
      page,
      totalPages,
    };
  }

  if (body && typeof body === 'object') {
    const o = body as {
      data?: unknown;
      items?: unknown;
      results?: unknown;
      total?: unknown;
      count?: unknown;
      page?: unknown;
      totalPages?: unknown;
      limit?: unknown;
    };
    const list = (Array.isArray(o.data) ? o.data : Array.isArray(o.items) ? o.items : Array.isArray(o.results) ? o.results : []) as T[];
    const total = Number(o.total ?? o.count ?? 0) || 0;
    const explicitPage = o.page != null && o.page !== undefined ? Number(o.page) : null;
    const hasMeta = o.total != null || o.count != null || o.totalPages != null;
    const serverSliced = hasMeta && (explicitPage != null || (total > 0 && list.length < total) || o.totalPages != null);

    if (serverSliced) {
      const totalPages = Math.max(1, Number(o.totalPages) || Math.ceil((total || list.length) / L) || 1);
      const page = explicitPage != null ? Math.min(Math.max(1, explicitPage), totalPages) : Math.min(req, totalPages);
      return {
        items: list,
        total: total || list.length,
        page,
        totalPages,
      };
    }

    // Objeto { data: T[] } legado: lista completa aninhada
    const t = total || list.length;
    const totalPages = Math.max(1, Math.ceil(t / L) || 1);
    const page = Math.min(req, totalPages);
    const start = (page - 1) * L;
    return {
      items: list.slice(start, start + L),
      total: t,
      page,
      totalPages,
    };
  }

  return { items: [] as T[], total: 0, page: 1, totalPages: 1 };
}

/** Quantas páginas buscar em paralelo de cada vez em `fetchAllListPages`. */
const FETCH_ALL_CONCURRENCY = 6;

/**
 * Para selects/modais: busca todas as páginas quando a API pagina; se ainda for array único, retorna de uma vez.
 *
 * As páginas 2+ são buscadas em lotes paralelos (não uma de cada vez) — o loop
 * sequencial original esperava cada página terminar pra pedir a próxima, então
 * a latência de UMA página multiplicava pelo número de páginas (visto ao vivo:
 * catálogo de exames com 6 páginas a ~1s cada = ~7s só pra popular um select,
 * mesmo a tela em si não tendo nenhum item pra mostrar). Em paralelo (por
 * lotes, pra não disparar centenas de requests de uma vez numa lista muito
 * grande), o tempo cai pro tempo da página mais lenta do lote.
 */
export async function fetchAllListPages<T>(
  path: string,
  extraParams: Record<string, string | number | boolean | undefined> = {},
  client: AxiosInstance = api,
  maxPages = 200,
): Promise<T[]> {
  const { data: first } = await client.get(path, {
    params: listQueryParams(1, API_PAGE_SIZE, extraParams),
  });

  if (Array.isArray(first)) {
    return first as T[];
  }

  const firstPage = parseListResponse<T>(first, 1, API_PAGE_SIZE);
  if (firstPage.total <= firstPage.items.length || firstPage.items.length < API_PAGE_SIZE) {
    return firstPage.items;
  }

  const totalPages = Math.min(firstPage.totalPages, maxPages);
  const all: T[] = [...firstPage.items];

  const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
  for (let i = 0; i < remainingPages.length; i += FETCH_ALL_CONCURRENCY) {
    const batch = remainingPages.slice(i, i + FETCH_ALL_CONCURRENCY);
    const responses = await Promise.all(
      batch.map((page) => client.get(path, { params: listQueryParams(page, API_PAGE_SIZE, extraParams) })),
    );

    let batchExhausted = false;
    for (let j = 0; j < responses.length; j += 1) {
      const body = responses[j].data;
      if (Array.isArray(body)) {
        // A API parou de paginar no meio do caminho — mesmo fallback do loop antigo.
        return body as T[];
      }
      const p = parseListResponse<T>(body, batch[j], API_PAGE_SIZE);
      if (!p.items.length) {
        batchExhausted = true;
        break;
      }
      all.push(...p.items);
      if (p.items.length < API_PAGE_SIZE) batchExhausted = true;
    }
    if (batchExhausted) break;
  }

  return all;
}
