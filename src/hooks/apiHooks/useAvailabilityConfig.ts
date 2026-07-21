'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  BusinessHour,
  BusinessHourBatchPayload,
  EmergencyHour,
  EmergencyHourPayload,
  VetSchedule,
  VetSchedulePayload,
} from '@/app/types/availability';

export const availabilityKeys = {
  all: ['availability-config'] as const,
  businessHours: () => [...availabilityKeys.all, 'business-hours'] as const,
  emergencyHours: () => [...availabilityKeys.all, 'emergency-hours'] as const,
  vetSchedules: () => [...availabilityKeys.all, 'vet-schedules'] as const,
};

export function useBusinessHoursQuery() {
  return useQuery({
    queryKey: availabilityKeys.businessHours(),
    queryFn: async () => {
      const { data } = await api.get<BusinessHour[]>('/availability/config/business-hours');
      return data ?? [];
    },
  });
}

export function useSaveBusinessHoursBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BusinessHourBatchPayload) => {
      const { data } = await api.post('/availability/config/business-hours/batch', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.businessHours() });
    },
  });
}

export function useEmergencyHoursQuery() {
  return useQuery({
    queryKey: availabilityKeys.emergencyHours(),
    queryFn: async () => {
      const { data } = await api.get<EmergencyHour[]>('/availability/config/emergency-hours');
      return data ?? [];
    },
  });
}

export function useCreateEmergencyHourMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmergencyHourPayload) => {
      const { data } = await api.post('/availability/config/emergency-hours', payload);
      return data;
    },
    // silent: chamada em loop (um dia por vez) em settings/hours/page.tsx, que já mostra
    // um toast agregado ao final — um toast por dia seria ruído.
    meta: { silent: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.emergencyHours() });
    },
  });
}

export function useVetSchedulesQuery() {
  return useQuery({
    queryKey: availabilityKeys.vetSchedules(),
    queryFn: async () => {
      const { data } = await api.get<VetSchedule[]>('/availability/config/veterinarian-schedules');
      return data ?? [];
    },
  });
}

export function useCreateVetScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VetSchedulePayload) => {
      const { data } = await api.post('/availability/config/veterinarian-schedules', payload);
      return data;
    },
    // silent: chamada em loop (um dia por vez) em settings/hours/page.tsx, que já mostra
    // um toast agregado ao final — um toast por dia seria ruído.
    meta: { silent: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.vetSchedules() });
    },
  });
}

export function useDeleteVetScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/availability/config/veterinarian-schedules/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.vetSchedules() });
    },
  });
}
