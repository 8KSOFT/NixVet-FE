'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Resource, ResourcePayload } from '@/app/types/resource';

export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (page: number) => [...resourceKeys.lists(), { page }] as const,
};

/** Lista completa de recursos físicos (salas, equipamentos) — usada no agendamento. */
export function useResourcesListQuery() {
  return useQuery({
    queryKey: resourceKeys.lists(),
    queryFn: () => fetchAllListPages<Resource>('/resources'),
  });
}

/** Lista paginada — usada em Settings/Recursos. */
export function useResourcesPagedQuery(page: number) {
  return useQuery({
    queryKey: resourceKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/resources', { params: listQueryParams(page) });
      return parseListResponse<Resource>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateResourceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ResourcePayload) => {
      const { data } = await api.post('/resources', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}
