'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { AppointmentType, AppointmentTypePayload } from '@/app/types/appointment-type';

export const appointmentTypeKeys = {
  all: ['appointment-types'] as const,
  lists: () => [...appointmentTypeKeys.all, 'list'] as const,
  list: (page: number) => [...appointmentTypeKeys.lists(), { page }] as const,
};

/** Lista paginada — usada em Settings/Tipos de Procedimento. */
export function useAppointmentTypesPagedQuery(page: number) {
  return useQuery({
    queryKey: appointmentTypeKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/appointment-types', { params: listQueryParams(page) });
      return parseListResponse<AppointmentType>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateAppointmentTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AppointmentTypePayload) => {
      const { data } = await api.post('/appointment-types', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentTypeKeys.all });
    },
  });
}

export function useUpdateAppointmentTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AppointmentTypePayload }) => {
      const { data } = await api.put(`/appointment-types/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentTypeKeys.all });
    },
  });
}

export function useDeleteAppointmentTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/appointment-types/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentTypeKeys.all });
    },
  });
}

/**
 * Tipos de agendamento — tenta primeiro `consultation_types` da config da agenda do tenant;
 * cai para o catálogo `/appointment-types` se a config não trouxer nada.
 */
export function useAppointmentTypesQuery() {
  return useQuery({
    queryKey: appointmentTypeKeys.lists(),
    queryFn: async () => {
      try {
        const { data } = await api.get<{ consultation_types?: AppointmentType[] }>('/tenants/me/schedule-config');
        const ct = data?.consultation_types;
        if (Array.isArray(ct) && ct.length > 0) return ct;
      } catch {
        /* fallback abaixo */
      }
      try {
        return await fetchAllListPages<AppointmentType>('/appointment-types');
      } catch {
        return [];
      }
    },
  });
}
