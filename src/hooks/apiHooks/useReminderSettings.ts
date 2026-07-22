'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ReminderSettings } from '@/app/types/reminder-settings';

export const reminderSettingsKeys = {
  all: ['reminder-settings'] as const,
  effective: () => [...reminderSettingsKeys.all, 'effective'] as const,
  system: () => [...reminderSettingsKeys.all, 'system'] as const,
};

export function useReminderSettingsQuery() {
  return useQuery({
    queryKey: reminderSettingsKeys.effective(),
    queryFn: async () => {
      const { data } = await api.get<ReminderSettings>('/settings/reminders');
      return data;
    },
  });
}

export function useSystemReminderDefaultsQuery() {
  return useQuery({
    queryKey: reminderSettingsKeys.system(),
    queryFn: async () => {
      const { data } = await api.get<ReminderSettings>('/settings/reminders/system');
      return data;
    },
  });
}

export function useSaveReminderSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReminderSettings) => {
      const { data } = await api.put<ReminderSettings>('/settings/reminders', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(reminderSettingsKeys.effective(), data);
    },
  });
}

export function useResetReminderSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/settings/reminders');
      const { data } = await api.get<ReminderSettings>('/settings/reminders');
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(reminderSettingsKeys.effective(), data);
    },
  });
}
