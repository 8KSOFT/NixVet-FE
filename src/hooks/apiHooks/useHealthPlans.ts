'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { HealthPlan, HealthPlanPayload } from '@/app/types/health-plan';

export const healthPlanKeys = {
  all: ['health-plans'] as const,
  lists: () => [...healthPlanKeys.all, 'list'] as const,
  list: (includeInactive: boolean) => [...healthPlanKeys.lists(), { includeInactive }] as const,
};

/** Lista de convênios/planos de saúde — usada em filtros e selects. */
export function useHealthPlansListQuery() {
  return useQuery({
    queryKey: healthPlanKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get('/health-plans', { params: { limit: 200 } });
      const envelope = data as { items?: HealthPlan[]; data?: HealthPlan[] } | HealthPlan[];
      if (Array.isArray(envelope)) return envelope;
      return envelope?.items ?? envelope?.data ?? [];
    },
  });
}

/** Lista com opção de incluir inativos — usada em Settings/Planos de Saúde. */
export function useHealthPlansQuery(includeInactive: boolean) {
  return useQuery({
    queryKey: healthPlanKeys.list(includeInactive),
    queryFn: async () => {
      const { data } = await api.get<HealthPlan[]>(`/health-plans?includeInactive=${includeInactive}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateHealthPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HealthPlanPayload) => {
      const { data } = await api.post('/health-plans', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthPlanKeys.all });
    },
  });
}

export function useUpdateHealthPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: HealthPlanPayload }) => {
      const { data } = await api.patch(`/health-plans/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthPlanKeys.all });
    },
  });
}

export function useDeactivateHealthPlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/health-plans/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthPlanKeys.all });
    },
  });
}
