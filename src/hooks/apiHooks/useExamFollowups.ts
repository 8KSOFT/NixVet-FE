'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { ExamFollowup, FollowupFormValues } from '@/app/types/exam-followup';

export const examFollowupKeys = {
  all: ['exam-followups'] as const,
  lists: () => [...examFollowupKeys.all, 'list'] as const,
  list: (page: number) => [...examFollowupKeys.lists(), { page }] as const,
  awaiting: (page: number) => [...examFollowupKeys.all, 'awaiting', { page }] as const,
};

export function useAwaitingFollowupsQuery(page: number) {
  return useQuery({
    queryKey: examFollowupKeys.awaiting(page),
    queryFn: async () => {
      const { data } = await api.get('/exam-followups/awaiting-followup', { params: listQueryParams(page) });
      return parseListResponse<ExamFollowup>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useFollowupsQuery(page: number) {
  return useQuery({
    queryKey: examFollowupKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/exam-followups', { params: listQueryParams(page) });
      return parseListResponse<ExamFollowup>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateFollowupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FollowupFormValues) => {
      const { data } = await api.post('/exam-followups', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examFollowupKeys.all });
    },
  });
}

export function useUpdateFollowupStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, followupStatus }: { id: string; followupStatus: string }) => {
      const { data } = await api.put(`/exam-followups/${id}`, { followup_status: followupStatus });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examFollowupKeys.all });
    },
  });
}

export function useMarkFollowupResultAvailableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/exam-followups/${id}/result-available`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examFollowupKeys.all });
    },
  });
}
