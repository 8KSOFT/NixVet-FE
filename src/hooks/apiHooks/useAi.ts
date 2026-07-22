'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { AiUsageResponse } from '@/app/types/ai-usage';

export const aiKeys = {
  all: ['ai'] as const,
  usage: (from: string, to: string) => [...aiKeys.all, 'usage', { from, to }] as const,
};

/** Consumo de tokens/custo de IA no período — usado em Settings/Custos de IA. */
export function useAiUsageQuery(from: string, to: string) {
  return useQuery({
    queryKey: aiKeys.usage(from, to),
    queryFn: async () => {
      const { data } = await api.get<AiUsageResponse>('/ai/usage', {
        params: { from: `${from}T00:00:00`, to: `${to}T23:59:59`, group_by: 'day' },
      });
      return data;
    },
  });
}

export function useSummarizeMutation() {
  return useMutation({
    mutationFn: async (notes: string) => {
      const { data } = await api.post<{ summary?: string }>('/ai/summarize', { notes });
      return data;
    },
  });
}

export function useStructureObservationsMutation() {
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<{ symptoms?: string[]; possible_diagnosis?: string[] }>(
        '/ai/structure-observations',
        { text },
      );
      return data;
    },
  });
}

export function useFormatTextMutation() {
  return useMutation({
    mutationFn: async ({ text, context }: { text: string; context: string }) => {
      const { data } = await api.post<{ formatted: string }>('/ai/format-text', { text, context });
      return data;
    },
  });
}
