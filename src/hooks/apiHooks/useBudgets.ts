'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Budget, BudgetPayload, CancelBudgetResult } from '@/app/types/budget';
import { financialReportKeys } from './useFinancialReports';

export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  list: (page: number) => [...budgetKeys.lists(), { page }] as const,
};

/** Orçamentos paginados no servidor (mais recentes primeiro). */
export function useBudgetsPagedQuery(page: number) {
  return useQuery({
    queryKey: budgetKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/budgets', { params: listQueryParams(page) });
      return parseListResponse<Budget>(data, page);
    },
    placeholderData: keepPreviousData,
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
