'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Disease, DiseaseCategory, DiseasePayload } from '@/app/types/disease';

export const diseaseKeys = {
  all: ['diseases'] as const,
  lists: () => [...diseaseKeys.all, 'list'] as const,
  list: (page: number) => [...diseaseKeys.lists(), { page }] as const,
  categories: () => [...diseaseKeys.all, 'categories'] as const,
};

export function useDiseaseCategoriesQuery() {
  return useQuery({
    queryKey: diseaseKeys.categories(),
    queryFn: () => fetchAllListPages<DiseaseCategory>('/catalog/disease-categories'),
  });
}

export function useDiseasesPagedQuery(page: number) {
  return useQuery({
    queryKey: diseaseKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/catalog/diseases', { params: listQueryParams(page) });
      return parseListResponse<Disease>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateDiseaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DiseasePayload) => {
      const { data } = await api.post('/catalog/diseases', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diseaseKeys.all });
    },
  });
}

export function useUpdateDiseaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: DiseasePayload }) => {
      const { data } = await api.put(`/catalog/diseases/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diseaseKeys.all });
    },
  });
}

export function useDeleteDiseaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/catalog/diseases/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: diseaseKeys.all });
    },
  });
}
