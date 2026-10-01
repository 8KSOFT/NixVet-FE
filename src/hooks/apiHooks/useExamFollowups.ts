'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { ExamFollowup, FollowupFormValues } from '@/app/types/exam-followup';

export const examFollowupKeys = {
  all: ['exam-followups'] as const,
  lists: () => [...examFollowupKeys.all, 'list'] as const,
  list: (page: number) => [...examFollowupKeys.lists(), { page }] as const,
  allFlat: (patientId?: string) => [...examFollowupKeys.all, 'all', { patientId: patientId || undefined }] as const,
  awaiting: (page: number) => [...examFollowupKeys.all, 'awaiting', { page }] as const,
};

/**
 * `GET /exam-followups/awaiting-followup` exige `exam_requests.read` — a
 * recepção não tem (e nem enxerga "Acompanhamentos" no menu). Telas que a
 * recepção alcança, como a agenda, precisam passar `enabled`.
 */
export function useAwaitingFollowupsQuery(page: number, enabled = true) {
  return useQuery({
    queryKey: examFollowupKeys.awaiting(page),
    queryFn: async () => {
      const { data } = await api.get('/exam-followups/awaiting-followup', { params: listQueryParams(page) });
      return parseListResponse<ExamFollowup>(data, page);
    },
    placeholderData: keepPreviousData,
    enabled,
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

/**
 * Lista completa de acompanhamentos (todas as páginas) — usada no Prontuário.
 *
 * `patientId` filtra no backend (`GET /exam-followups?patient_id=`): sem ele a
 * tela varria os acompanhamentos da clínica inteira (até 200 páginas) só pra
 * filtrar um animal no cliente. Opcional para não quebrar quem ainda chama sem.
 */
export function useFollowupsListQuery(patientId?: string | null) {
  return useQuery({
    queryKey: examFollowupKeys.allFlat(patientId ?? undefined),
    queryFn: () =>
      fetchAllListPages<ExamFollowup>('/exam-followups', patientId ? { patient_id: patientId } : {}),
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
