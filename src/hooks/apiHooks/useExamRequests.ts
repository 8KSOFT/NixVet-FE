'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { CreateExamRequestPayload, ExamRequest } from '@/app/types/exam-request';

export const examRequestKeys = {
  all: ['exam-requests'] as const,
  lists: () => [...examRequestKeys.all, 'list'] as const,
  list: (page: number) => [...examRequestKeys.lists(), { page }] as const,
  allFlat: () => [...examRequestKeys.all, 'all'] as const,
};

/** Lista completa de solicitações de exame (todas as páginas) — usada em selects. */
export function useExamRequestsListQuery() {
  return useQuery({
    queryKey: examRequestKeys.allFlat(),
    queryFn: () => fetchAllListPages<ExamRequest>('/exam-requests'),
  });
}

export function useExamRequestsQuery(page: number) {
  return useQuery({
    queryKey: examRequestKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/exam-requests', { params: listQueryParams(page) });
      return parseListResponse<ExamRequest>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateExamRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExamRequestPayload) => {
      const { data } = await api.post('/exam-requests', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examRequestKeys.all });
    },
  });
}

export function useDownloadExamRequestPdfMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get(`/exam-requests/${id}/pdf`, { responseType: 'blob' });
      return data as Blob;
    },
  });
}

export function useSendExamRequestEmailMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/exam-requests/${id}/email`);
      return data;
    },
  });
}
