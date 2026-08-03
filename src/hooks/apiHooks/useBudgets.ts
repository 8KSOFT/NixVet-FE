'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Budget, BudgetPayload, CancelBudgetResult } from '@/app/types/budget';
import { financialReportKeys } from './useFinancialReports';

export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
};

export function useBudgetsQuery() {
  return useQuery({
    queryKey: budgetKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Budget[]>('/budgets');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BudgetPayload) => {
      const { data } = await api.post<Budget>('/budgets', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useApproveBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<Budget>(`/budgets/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useCancelBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data } = await api.patch<CancelBudgetResult>(`/budgets/${id}/cancel`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      // O cancelamento reflete no financeiro (lançamentos sugeridos são baixados).
      queryClient.invalidateQueries({ queryKey: financialReportKeys.all });
    },
  });
}

/** Baixa o PDF do orçamento — retorna o Blob para o chamador decidir como salvar/abrir. */
export function useDownloadBudgetPdfMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get(`/budgets/${id}/pdf`, { responseType: 'blob' });
      return data as Blob;
    },
  });
}
