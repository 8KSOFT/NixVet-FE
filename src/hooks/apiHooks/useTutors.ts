'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Tutor, TutorPayload } from '@/app/types/tutor';

export const tutorKeys = {
  all: ['tutors'] as const,
  lists: () => [...tutorKeys.all, 'list'] as const,
  list: (page: number) => [...tutorKeys.lists(), { page }] as const,
  allFlat: () => [...tutorKeys.all, 'all'] as const,
};

/** Lista paginada de tutores — usada na tela de gestão (CRUD). */
export function useTutorsQuery(page: number) {
  return useQuery({
    queryKey: tutorKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/tutors', { params: listQueryParams(page) });
      return parseListResponse<Tutor>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/** Lista completa de tutores (todas as páginas) — usada em selects (ex: paciente, orçamento). */
export function useTutorsListQuery() {
  return useQuery({
    queryKey: tutorKeys.allFlat(),
    queryFn: () => fetchAllListPages<Tutor>('/tutors'),
  });
}

export function useCreateTutorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TutorPayload) => {
      const { data } = await api.post<Tutor>('/tutors', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorKeys.all });
    },
  });
}

export function useUpdateTutorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TutorPayload }) => {
      const { data } = await api.put<Tutor>(`/tutors/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorKeys.all });
    },
  });
}

export function useDeleteTutorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tutors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorKeys.all });
    },
  });
}
