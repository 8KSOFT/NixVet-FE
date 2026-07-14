'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { PatientDetail, PatientRow, PatientTimelineEvent } from '@/app/types/patient';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (page: number, tutorId?: string) => [...patientKeys.lists(), { page, tutorId: tutorId || undefined }] as const,
  allFlat: (tutorId?: string) => [...patientKeys.all, 'all', { tutorId: tutorId || undefined }] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  timeline: (id: string) => [...patientKeys.all, 'timeline', id] as const,
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

/** Lista paginada de pacientes, com filtro opcional por tutor. */
export function usePatientsQuery(page: number, tutorId?: string) {
  return useQuery({
    queryKey: patientKeys.list(page, tutorId),
    queryFn: async () => {
      const { data } = await api.get('/patients', {
        params: listQueryParams(page, API_PAGE_SIZE, { tutor_id: tutorId || undefined }),
      });
      return parseListResponse<PatientRow>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/** Lista completa de pacientes (todas as páginas) — usada em selects (ex: orçamento, agenda). Filtro opcional por tutor. */
export function usePatientsListQuery(tutorId?: string) {
  return useQuery({
    queryKey: patientKeys.allFlat(tutorId),
    queryFn: () => fetchAllListPages<PatientRow>('/patients', tutorId ? { tutor_id: tutorId } : {}),
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
      const { data } = await api.post('/patients', payload);
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
      await api.delete(`/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.all });
    },
  });
}
