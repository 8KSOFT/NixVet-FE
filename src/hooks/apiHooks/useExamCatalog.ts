'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Exam, ExamAreaOption, ExamOption, ExamPayload } from '@/app/types/exam-request';
import type { CatalogPlanPrice, CatalogPlanPricePayload } from '@/app/types/health-plan';

export const examCatalogKeys = {
  all: ['exam-catalog'] as const,
  exams: () => [...examCatalogKeys.all, 'exams'] as const,
  list: (page: number) => [...examCatalogKeys.exams(), 'list', { page }] as const,
  areas: () => [...examCatalogKeys.all, 'areas'] as const,
  planPrices: (examId: number) => [...examCatalogKeys.all, 'plan-prices', examId] as const,
};

export function useExamCatalogQuery() {
  return useQuery({
    queryKey: examCatalogKeys.exams(),
    queryFn: () => fetchAllListPages<ExamOption>('/catalog/exams'),
  });
}

export function useExamAreasQuery() {
  return useQuery({
    queryKey: examCatalogKeys.areas(),
    queryFn: () => fetchAllListPages<ExamAreaOption>('/catalog/exam-areas'),
  });
}

export function useCreateExamCatalogItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, areaId }: { name: string; areaId: number }) => {
      const { data } = await api.post('/catalog/exams', { name, area_id: areaId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examCatalogKeys.exams() });
    },
  });
}

/** Lista paginada — usada em Settings/Exames. */
export function useExamsPagedQuery(page: number) {
  return useQuery({
    queryKey: examCatalogKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/catalog/exams', { params: listQueryParams(page) });
      return parseListResponse<Exam>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateExamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ExamPayload) => {
      const { data } = await api.post('/catalog/exams', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examCatalogKeys.exams() });
    },
  });
}

export function useUpdateExamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: ExamPayload }) => {
      const { data } = await api.put(`/catalog/exams/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examCatalogKeys.exams() });
    },
  });
}

export function useDeleteExamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/catalog/exams/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examCatalogKeys.exams() });
    },
  });
}

export function useExamPlanPricesQuery(examId: number, enabled: boolean) {
  return useQuery({
    queryKey: examCatalogKeys.planPrices(examId),
    queryFn: async () => {
      const { data } = await api.get<CatalogPlanPrice[]>(`/catalog/exams/${examId}/plan-prices`);
      return data;
    },
    enabled,
  });
}

export function useSaveExamPlanPriceMutation(examId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CatalogPlanPricePayload) => {
      const { data } = await api.put(`/catalog/exams/${examId}/plan-prices`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examCatalogKeys.planPrices(examId) });
    },
  });
}

export function useDeleteExamPlanPriceMutation(examId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (healthPlanId: string) => {
      const { data } = await api.delete(`/catalog/exams/${examId}/plan-prices/${healthPlanId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examCatalogKeys.planPrices(examId) });
    },
  });
}
