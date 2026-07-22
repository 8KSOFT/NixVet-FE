'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { ClinicalTask, ClinicalTaskPayload } from '@/app/types/clinical-task';

export const clinicalTaskKeys = {
  all: ['clinical-tasks'] as const,
  lists: () => [...clinicalTaskKeys.all, 'list'] as const,
  list: (page: number) => [...clinicalTaskKeys.lists(), { page }] as const,
};

export function useClinicalTasksQuery(page: number) {
  return useQuery({
    queryKey: clinicalTaskKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/clinical-tasks', { params: listQueryParams(page) });
      return parseListResponse<ClinicalTask>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateClinicalTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClinicalTaskPayload) => {
      const { data } = await api.post('/clinical-tasks', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalTaskKeys.all });
    },
  });
}

export function useMarkClinicalTaskDoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/clinical-tasks/${id}/status`, { status: 'completed' });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalTaskKeys.all });
    },
  });
}
