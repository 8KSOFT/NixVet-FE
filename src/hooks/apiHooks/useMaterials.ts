'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Material, MaterialPayload } from '@/app/types/material';

export const materialKeys = {
  all: ['materials'] as const,
  lists: () => [...materialKeys.all, 'list'] as const,
  list: (page: number) => [...materialKeys.lists(), { page }] as const,
};

export function useMaterialsPagedQuery(page: number) {
  return useQuery({
    queryKey: materialKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/catalog/materials', { params: listQueryParams(page) });
      return parseListResponse<Material>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateMaterialMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MaterialPayload) => {
      const { data } = await api.post('/catalog/materials', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.all });
    },
  });
}

export function useUpdateMaterialMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: MaterialPayload }) => {
      const { data } = await api.put(`/catalog/materials/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.all });
    },
  });
}

export function useDeleteMaterialMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/catalog/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialKeys.all });
    },
  });
}
