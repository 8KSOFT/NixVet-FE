'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Tutor, TutorPayload } from '@/app/types/tutor';

export const tutorKeys = {
  all: ['tutors'] as const,
  lists: () => [...tutorKeys.all, 'list'] as const,
  list: (page: number, incomplete = false) =>
    [...tutorKeys.lists(), { page, incomplete }] as const,
  allFlat: () => [...tutorKeys.all, 'all'] as const,
  search: (term: string) => [...tutorKeys.all, 'search', term] as const,
};

/**
 * Lista paginada de tutores — usada na tela de gestão (CRUD).
 *
 * `incomplete` restringe aos cadastros a completar (chatbot ou atendimento de
 * campo). Entra na queryKey porque são duas listas distintas: sem isso, alternar
 * o filtro mostraria a lista anterior em cache como se fosse a filtrada.
 */
export function useTutorsQuery(page: number, options: { incomplete?: boolean } = {}) {
  const incomplete = options.incomplete ?? false;
  return useQuery({
    queryKey: tutorKeys.list(page, incomplete),
    queryFn: async () => {
      const { data } = await api.get('/tutors', {
        params: listQueryParams(page, undefined, incomplete ? { incomplete: true } : {}),
      });
      return parseListResponse<Tutor>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Lista completa de tutores (todas as páginas) — usada em selects (ex: paciente, orçamento).
 * `enabled` (default true) permite adiar a busca até o select que a consome realmente
 * aparecer (ex: só quando um modal abre) — ver mesmo raciocínio em usePatientsListQuery.
 */
export function useTutorsListQuery(enabled = true) {
  return useQuery({
    queryKey: tutorKeys.allFlat(),
    queryFn: () => fetchAllListPages<Tutor>('/tutors'),
    enabled,
  });
}

/** Busca por nome/CPF no backend — usada no Command Palette (Ctrl/Cmd+K). */
export function useSearchTutorsQuery(term: string, limit = 8) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: tutorKeys.search(trimmed),
    queryFn: async () => {
      const { data } = await api.get('/tutors', {
        params: listQueryParams(1, limit, { search: trimmed }),
      });
      return parseListResponse<Tutor>(data, 1, limit).items;
    },
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
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
      const { data } = await api.delete(`/tutors/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorKeys.all });
    },
  });
}
