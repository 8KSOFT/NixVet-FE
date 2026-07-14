'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages } from '@/lib/pagination';
import type { SupportOption, SupportOptionsEnvelope, SupportOptionsListEnvelope } from '@/app/types/patient';

function normalizeSupportOptions(responseData: unknown): SupportOption[] {
  if (Array.isArray(responseData)) {
    return responseData as SupportOption[];
  }

  const responseEnvelope = responseData as SupportOptionsEnvelope;
  const firstLevelData = responseEnvelope?.data;

  if (Array.isArray(firstLevelData)) {
    return firstLevelData;
  }

  const listEnvelope = firstLevelData as SupportOptionsListEnvelope | undefined;

  if (Array.isArray(listEnvelope?.items)) {
    return listEnvelope.items;
  }

  if (Array.isArray(listEnvelope?.content)) {
    return listEnvelope.content;
  }

  return [];
}

export const catalogSupportKeys = {
  all: ['catalog-support'] as const,
  list: (discriminator: string) => [...catalogSupportKeys.all, discriminator] as const,
};

/** Opções de catálogo de página única (ex: espécie, sexo). */
export function useSupportOptionsQuery(discriminator: string) {
  return useQuery({
    queryKey: catalogSupportKeys.list(discriminator),
    queryFn: async () => {
      const { data } = await api.get('/catalog/support', { params: { discriminator } });
      return normalizeSupportOptions(data);
    },
  });
}

/** Opções de catálogo paginadas (ex: raças, ~500 itens) — busca todas as páginas. */
export function usePagedSupportOptionsQuery(discriminator: string | null) {
  return useQuery({
    queryKey: catalogSupportKeys.list(discriminator ?? ''),
    queryFn: () => fetchAllListPages<SupportOption>('/catalog/support', { discriminator: discriminator ?? '' }),
    enabled: !!discriminator,
  });
}

export function useCreateSupportOptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ discriminator, description }: { discriminator: string; description: string }) => {
      const { data } = await api.post('/catalog/support', { discriminator, description });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: catalogSupportKeys.list(variables.discriminator) });
    },
  });
}
