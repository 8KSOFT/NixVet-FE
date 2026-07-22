'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { VaccineReminder, VaccineReminderPayload } from '@/app/types/vaccine-reminder';

export const vaccineReminderKeys = {
  all: ['vaccine-reminders'] as const,
  lists: () => [...vaccineReminderKeys.all, 'list'] as const,
  list: (page: number) => [...vaccineReminderKeys.lists(), { page }] as const,
  due: (page: number, days: number) => [...vaccineReminderKeys.all, 'due', { page, days }] as const,
};

export function useVaccineRemindersQuery(page: number) {
  return useQuery({
    queryKey: vaccineReminderKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/vaccine/reminders', { params: listQueryParams(page) });
      return parseListResponse<VaccineReminder>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useDueVaccineRemindersQuery(page: number, days = 30) {
  return useQuery({
    queryKey: vaccineReminderKeys.due(page, days),
    queryFn: async () => {
      const { data } = await api.get('/vaccine/reminders/due', { params: { days, ...listQueryParams(page) } });
      return parseListResponse<VaccineReminder>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateVaccineReminderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VaccineReminderPayload) => {
      const { data } = await api.post('/vaccine/reminders', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaccineReminderKeys.all });
    },
  });
}
