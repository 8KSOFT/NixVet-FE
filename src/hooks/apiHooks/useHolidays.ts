'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  AiHolidaySuggestPayload,
  AiHolidaySuggestion,
  Holiday,
  HolidayPayload,
  SaveHolidaySuggestionsPayload,
} from '@/app/types/holiday';

export const holidayKeys = {
  all: ['holidays'] as const,
  list: (year: number) => [...holidayKeys.all, 'list', { year }] as const,
};

export function useHolidaysQuery(year: number) {
  return useQuery({
    queryKey: holidayKeys.list(year),
    queryFn: async () => {
      const { data } = await api.get<Holiday[]>(`/availability/config/holidays?year=${year}`);
      return data ?? [];
    },
  });
}

export function useCreateHolidayMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HolidayPayload) => {
      const { data } = await api.post('/availability/config/holidays', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.list(year) });
    },
  });
}

export function useDeleteHolidayMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/availability/config/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.list(year) });
    },
  });
}

export function useAiSuggestHolidaysMutation() {
  return useMutation({
    mutationFn: async (payload: AiHolidaySuggestPayload) => {
      const { data } = await api.post<{ holidays?: AiHolidaySuggestion[] }>(
        '/availability/config/holidays/ai-suggest',
        payload,
      );
      return data?.holidays ?? [];
    },
  });
}

export function useSaveHolidaySuggestionsMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveHolidaySuggestionsPayload) => {
      const { data } = await api.post('/availability/config/holidays/batch', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.list(year) });
    },
  });
}
