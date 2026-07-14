'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type {
  ProvisionWhatsappPayload,
  RegisterWhatsappNumberPayload,
  WhatsappNumberRow,
  WhatsappNumberStatus,
} from '@/app/types/whatsapp-number';

export const whatsappNumberKeys = {
  all: ['whatsapp-numbers'] as const,
  lists: () => [...whatsappNumberKeys.all, 'list'] as const,
  list: (page: number) => [...whatsappNumberKeys.lists(), { page }] as const,
  provisionAvailable: () => [...whatsappNumberKeys.all, 'provision-available'] as const,
};

export function useWhatsappNumbersQuery(page: number) {
  return useQuery({
    queryKey: whatsappNumberKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/numbers', { params: listQueryParams(page) });
      return parseListResponse<WhatsappNumberRow>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useWhatsappProvisionAvailableQuery() {
  return useQuery({
    queryKey: whatsappNumberKeys.provisionAvailable(),
    queryFn: async () => {
      const { data } = await api.get<{ available: boolean }>('/whatsapp/provision/available');
      return data.available;
    },
  });
}

/** Verificação de status sob demanda (chamada por número, inclusive em polling do modal de QR). */
export function useWhatsappNumberStatusMutation() {
  return useMutation({
    mutationFn: async (numberId: string) => {
      const { data } = await api.get<WhatsappNumberStatus>(`/whatsapp/numbers/${numberId}/status`);
      return data;
    },
  });
}

/** Busca do QR Code sob demanda — repetida via polling enquanto o modal estiver aberto. */
export function useWhatsappQrCodeMutation() {
  return useMutation({
    mutationFn: async (numberId: string) => {
      const { data } = await api.get<{ qrCode: string | null }>(`/whatsapp/numbers/${numberId}/qr-code`);
      return data.qrCode;
    },
  });
}

export function useProvisionWhatsappMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload?: ProvisionWhatsappPayload) => {
      const { data } = await api.post('/whatsapp/provision', payload ?? {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappNumberKeys.lists() });
    },
  });
}

export function useRegisterWhatsappNumberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterWhatsappNumberPayload) => {
      const { data } = await api.post('/whatsapp/numbers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappNumberKeys.lists() });
    },
  });
}

export function useDisconnectWhatsappNumberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (numberId: string) => {
      await api.delete(`/whatsapp/numbers/${numberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappNumberKeys.lists() });
    },
  });
}
