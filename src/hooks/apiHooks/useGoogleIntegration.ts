'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  GoogleCalendarOption,
  GoogleCalendarSettingsPayload,
  GoogleEvent,
  GoogleIntegrationStatus,
} from '@/app/types/google-integration';

export const googleIntegrationKeys = {
  all: ['google-integration'] as const,
  status: () => [...googleIntegrationKeys.all, 'status'] as const,
  calendars: () => [...googleIntegrationKeys.all, 'calendars'] as const,
  events: (from: string, to: string) => [...googleIntegrationKeys.all, 'events', { from, to }] as const,
};

export function useGoogleStatusQuery() {
  return useQuery({
    queryKey: googleIntegrationKeys.status(),
    queryFn: async () => {
      const { data } = await api.get<GoogleIntegrationStatus>('/integrations/google/status');
      return data ?? { connected: false };
    },
  });
}

/** Lista de calendários Google da conta conectada — só faz sentido quando `status.connected`. */
export function useGoogleCalendarsQuery(enabled: boolean) {
  return useQuery({
    queryKey: googleIntegrationKeys.calendars(),
    queryFn: async () => {
      const { data } = await api.get<GoogleCalendarOption[]>('/integrations/google/calendars');
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}

/** Inicia o fluxo OAuth — retorna a URL para abrir em nova aba. */
export function useGoogleConnectMutation() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ url?: string }>('/integrations/google/connect');
      return data?.url ?? null;
    },
  });
}

export function useGoogleDisconnectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/integrations/google/disconnect');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleIntegrationKeys.all });
    },
  });
}

export function useSaveGoogleCalendarSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GoogleCalendarSettingsPayload) => {
      const { data } = await api.put('/integrations/google/settings', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleIntegrationKeys.status() });
    },
  });
}

export function useGoogleForceSyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/integrations/google/force-sync');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleIntegrationKeys.status() });
    },
  });
}

export function useGoogleEventsQuery(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: googleIntegrationKeys.events(from, to),
    queryFn: async () => {
      const { data } = await api.get<GoogleEvent[]>('/integrations/google/events', { params: { from, to } });
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}
