'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { PatientDetail, PatientRow, PatientTimelineEvent } from '@/app/types/patient';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (page: number, tutorId?: string, search?: string) =>
    [...patientKeys.lists(), { page, tutorId: tutorId || undefined, search: search || undefined }] as const,
  allFlat: (tutorId?: string) => [...patientKeys.all, 'all', { tutorId: tutorId || undefined }] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  timeline: (id: string) => [...patientKeys.all, 'timeline', id] as const,
  search: (term: string) => [...patientKeys.all, 'search', term] as const,
};

export interface PatientPayload {
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  chip_number?: string;
  tutor_id: string | null;
  no_tutor_reason: string | null;
}

/** Lista paginada de pacientes, com filtro opcional por tutor e busca por nome/chip_number. */
export function usePatientsQuery(page: number, tutorId?: string, search?: string) {
  return useQuery({
    queryKey: patientKeys.list(page, tutorId, search),
    queryFn: async () => {
      const { data } = await api.get('/patients', {
        params: listQueryParams(page, API_PAGE_SIZE, {
          tutor_id: tutorId || undefined,
          search: search || undefined,
        }),
      });
      return parseListResponse<PatientRow>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Lista completa de pacientes (todas as páginas) — usada em selects (ex: orçamento, agenda).
 * Filtro opcional por tutor. `enabled` (default true) permite adiar a busca até o
 * select que a consome realmente aparecer (ex: só quando um modal abre) — sem isso,
 * telas como a Agenda disparavam essa busca "todas as páginas" a cada carregamento,
 * mesmo com o modal de agendamento fechado.
 */
export function usePatientsListQuery(tutorId?: string, enabled = true) {
  return useQuery({
    queryKey: patientKeys.allFlat(tutorId),
    queryFn: () => fetchAllListPages<PatientRow>('/patients', tutorId ? { tutor_id: tutorId } : {}),
    enabled,
  });
}

/** Busca por nome/chip_number no backend — usada no Command Palette (Ctrl/Cmd+K). */
export function useSearchPatientsQuery(term: string, limit = 8) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: patientKeys.search(trimmed),
    queryFn: async () => {
      const { data } = await api.get('/patients', {
        params: listQueryParams(1, limit, { search: trimmed }),
      });
      return parseListResponse<PatientRow>(data, 1, limit).items;
    },
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function usePatientQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<PatientDetail>(`/patients/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientTimelineQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: patientKeys.timeline(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<PatientTimelineEvent[]>(`/patients/${id}/timeline`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!id,
  });
}

export function useCreatePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PatientPayload) => {
      const { data } = await api.post<PatientRow>('/patients', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}

export function useUpdatePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PatientPayload }) => {
      const { data } = await api.put(`/patients/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}

export function useDeletePatientMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/patients/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}
