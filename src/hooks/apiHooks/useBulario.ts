'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { BularioItem } from '@/app/types/bulario';

export const bularioKeys = {
  all: ['bulario'] as const,
  search: (query: string, page: number) => [...bularioKeys.all, 'search', { query, page }] as const,
  detail: (id: string) => [...bularioKeys.all, 'detail', id] as const,
};

/** Busca no bulário sob demanda (autocomplete ao digitar) — não é dado de tela persistente. */
export function useBularioSearchMutation() {
  return useMutation({
    mutationFn: async (query: string) => {
      const { data } = await api.get('/bulario', { params: { q: query, ...listQueryParams(1, 20) } });
      return parseListResponse<BularioItem>(data, 1, 20).items;
    },
  });
}

/** Busca paginada no bulário — usada na página de consulta (lista com paginação). */
export function useBularioSearchQuery(query: string, page: number) {
  return useQuery({
    queryKey: bularioKeys.search(query, page),
    queryFn: async () => {
      const { data } = await api.get('/bulario', { params: { q: query || undefined, ...listQueryParams(page) } });
      return parseListResponse<BularioItem>(data, page);
    },
    enabled: query.trim().length >= 2,
  });
}

export function useBularioItemQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: bularioKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<BularioItem>(`/bulario/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
