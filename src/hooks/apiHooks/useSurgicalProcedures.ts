'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type {
  SurgicalProcedure,
  SurgicalProcedureCategory,
  SurgicalProcedureDeleteResponse,
  SurgicalProcedurePayload,
} from '@/app/types/surgical-procedure';
import type { CatalogPlanPrice, CatalogPlanPricePayload } from '@/app/types/health-plan';

export const surgicalProcedureKeys = {
  all: ['surgical-procedures'] as const,
  lists: () => [...surgicalProcedureKeys.all, 'list'] as const,
  list: (page: number) => [...surgicalProcedureKeys.lists(), { page }] as const,
  categories: () => [...surgicalProcedureKeys.all, 'categories'] as const,
  planPrices: (procedureId: number) => [...surgicalProcedureKeys.all, 'plan-prices', procedureId] as const,
};

/** Lista completa do catálogo de procedimentos cirúrgicos — usada em seletores. */
export function useSurgicalProceduresListQuery() {
  return useQuery({
    queryKey: surgicalProcedureKeys.lists(),
    queryFn: () => fetchAllListPages<SurgicalProcedure>('/catalog/surgical-procedures'),
  });
}

/** Lista paginada — usada em Settings/Procedimentos cirúrgicos. */
export function useSurgicalProceduresPagedQuery(page: number) {
  return useQuery({
    queryKey: surgicalProcedureKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/catalog/surgical-procedures', { params: listQueryParams(page) });
      return parseListResponse<SurgicalProcedure>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useSurgicalProcedureCategoriesQuery() {
  return useQuery({
    queryKey: surgicalProcedureKeys.categories(),
    queryFn: () => fetchAllListPages<SurgicalProcedureCategory>('/catalog/surgical-procedure-categories'),
  });
}

export function useCreateSurgicalProcedureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SurgicalProcedurePayload) => {
      const { data } = await api.post('/catalog/surgical-procedures', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surgicalProcedureKeys.all });
    },
  });
}

export function useUpdateSurgicalProcedureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: SurgicalProcedurePayload }) => {
      const { data } = await api.put(`/catalog/surgical-procedures/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surgicalProcedureKeys.all });
    },
  });
}

/** Para item personalizado da clínica, faz soft delete. Para item base, apenas oculta para o tenant atual. */
export function useDeleteSurgicalProcedureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<SurgicalProcedureDeleteResponse>(`/catalog/surgical-procedures/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surgicalProcedureKeys.all });
    },
  });
}

export function useSurgicalProcedurePlanPricesQuery(procedureId: number, enabled: boolean) {
  return useQuery({
    queryKey: surgicalProcedureKeys.planPrices(procedureId),
    queryFn: async () => {
      const { data } = await api.get<CatalogPlanPrice[]>(`/catalog/surgical-procedures/${procedureId}/plan-prices`);
      return data;
    },
    enabled,
  });
}

export function useSaveSurgicalProcedurePlanPriceMutation(procedureId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CatalogPlanPricePayload) => {
      const { data } = await api.put(`/catalog/surgical-procedures/${procedureId}/plan-prices`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surgicalProcedureKeys.planPrices(procedureId) });
    },
  });
}

export function useDeleteSurgicalProcedurePlanPriceMutation(procedureId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (healthPlanId: string) => {
      await api.delete(`/catalog/surgical-procedures/${procedureId}/plan-prices/${healthPlanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surgicalProcedureKeys.planPrices(procedureId) });
    },
  });
}
