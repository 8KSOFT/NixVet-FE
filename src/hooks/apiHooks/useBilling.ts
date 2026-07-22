'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  ActivateBillingPayload,
  ActivateBillingResponse,
  BillingStatus,
  CancelBillingResponse,
  Invoice,
} from '@/app/types/billing';

export const billingKeys = {
  all: ['billing'] as const,
  status: () => [...billingKeys.all, 'status'] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
};

export function useBillingStatusQuery() {
  return useQuery({
    queryKey: billingKeys.status(),
    queryFn: async () => {
      const { data } = await api.get<BillingStatus>('/billing/status');
      return data;
    },
  });
}

export function useBillingInvoicesQuery() {
  return useQuery({
    queryKey: billingKeys.invoices(),
    queryFn: async () => {
      const { data } = await api.get<Invoice[]>('/billing/invoices');
      return data ?? [];
    },
  });
}

/** Cobrança pendente — busca sob demanda o link de pagamento e redireciona o navegador. */
export function usePaymentLinkMutation() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ paymentUrl?: string | null }>('/billing/payment-link');
      return data;
    },
  });
}

export function useCancelBillingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CancelBillingResponse>('/billing/cancel');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.status() });
    },
  });
}

export function useActivateBillingMutation() {
  return useMutation({
    mutationFn: async (payload: ActivateBillingPayload) => {
      const { data } = await api.post<ActivateBillingResponse>('/billing/activate', payload);
      return data;
    },
  });
}
