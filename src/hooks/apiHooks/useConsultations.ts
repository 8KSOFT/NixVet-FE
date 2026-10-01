'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { dashboardMetricsKeys } from './useDashboardMetrics';
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

/**
 * Consultas de um intervalo de dias (YYYY-MM-DD, inclusivo). Para quem só
 * precisa de uma janela — o dashboard (hoje) e a agenda (período visível) —
 * em vez da lista completa da clínica, que cresce sem limite.
 */
export function useConsultationsRangeQuery(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: [...consultationKeys.lists(), { from, to }] as const,
    queryFn: () => fetchAllListPages<Consultation>('/consultations', { from, to }),
    enabled: enabled && !!from && !!to,
    // Trocar de mês/semana mantém a grade anterior até a nova chegar, em vez
    // de piscar vazia.
    placeholderData: keepPreviousData,
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
      // KPIs do dashboard (novos pacientes, consultas de hoje, cancelamentos).
      queryClient.invalidateQueries({ queryKey: dashboardMetricsKeys.all });
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
      // KPIs do dashboard (novos pacientes, consultas de hoje, cancelamentos).
      queryClient.invalidateQueries({ queryKey: dashboardMetricsKeys.all });
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
      // KPIs do dashboard (novos pacientes, consultas de hoje, cancelamentos).
      queryClient.invalidateQueries({ queryKey: dashboardMetricsKeys.all });
    },
  });
}

/** Cancelamento suave — preserva histórico (status vira 'cancelled'). */
export function useCancelConsultationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/consultations/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
      // KPIs do dashboard (novos pacientes, consultas de hoje, cancelamentos).
      queryClient.invalidateQueries({ queryKey: dashboardMetricsKeys.all });
    },
  });
}

/**
 * Marca não comparecimento — libera recursos, registra ficha de não
 * comparecimento no prontuário (histórico legal) e dispara WhatsApp de
 * reagendamento pro tutor.
 */
export function useMarkNoShowConsultationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/consultations/${id}/no-show`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.all });
      // KPIs do dashboard (novos pacientes, consultas de hoje, cancelamentos).
      queryClient.invalidateQueries({ queryKey: dashboardMetricsKeys.all });
    },
  });
}
