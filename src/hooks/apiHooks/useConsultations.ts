'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages } from '@/lib/pagination';
import type { AvailabilitySlot, Consultation, ConsultationPayload } from '@/app/types/consultation';

export const consultationKeys = {
  all: ['consultations'] as const,
  lists: () => [...consultationKeys.all, 'list'] as const,
  detail: (id: string) => [...consultationKeys.all, 'detail', id] as const,
  availableSlots: (date: string, veterinarianId: string, appointmentTypeId: string) =>
    [...consultationKeys.all, 'available-slots', { date, veterinarianId, appointmentTypeId }] as const,
};

/** Lista completa de consultas (todas as páginas) — alimenta as visões do calendário. */
export function useConsultationsQuery() {
  return useQuery({
    queryKey: consultationKeys.lists(),
    queryFn: () => fetchAllListPages<Consultation>('/consultations'),
  });
}

export function useConsultationQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: consultationKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Consultation>(`/consultations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

/** Horários disponíveis — usada ao abrir o modal de agendamento, reage a data/vet/tipo. */
export function useAvailableSlotsQuery(
  date: string,
  veterinarianId: string,
  appointmentTypeId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: consultationKeys.availableSlots(date, veterinarianId, appointmentTypeId),
    queryFn: async () => {
      const params: Record<string, string> = { date };
      if (veterinarianId) params.vet_id = veterinarianId;
      if (appointmentTypeId) params.appointment_type_id = appointmentTypeId;
      const { data } = await api.get<AvailabilitySlot[] | { veterinarians?: AvailabilitySlot[] }>(
        '/consultations/available-slots',
        { params },
      );
      const list = Array.isArray(data) ? data : (data?.veterinarians ?? []);
      return Array.isArray(list) ? list : [];
    },
    enabled,
  });
}

export function useCreateConsultationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConsultationPayload) => {
      const { data } = await api.post('/consultations', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    },
  });
}

export function useUpdateConsultationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Consultation> }) => {
      const { data } = await api.put(`/consultations/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    },
  });
}

export function useRescheduleConsultationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) => {
      const { data } = await api.put(`/consultations/${id}/reschedule`, {
        start_time: startTime,
        end_time: endTime,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
    },
  });
}
