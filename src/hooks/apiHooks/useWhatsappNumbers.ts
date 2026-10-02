'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type {
  RegisterBaileysNumberPayload,
  WhatsappNumberRow,
  WhatsappNumberStatus,
} from '@/app/types/whatsapp-number';

export const whatsappNumberKeys = {
  all: ['whatsapp-numbers'] as const,
  lists: () => [...whatsappNumberKeys.all, 'list'] as const,
  list: (page: number) => [...whatsappNumberKeys.lists(), { page }] as const,
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

/** Verificação de status sob demanda (chamada por número, inclusive em polling do modal de QR). */
export function useWhatsappNumberStatusMutation() {
  return useMutation({
    mutationFn: async (numberId: string) => {
      const { data } = await api.get<WhatsappNumberStatus>(`/whatsapp/numbers/${numberId}/status`);
      return data;
    },
    // silent: verificacao de status chamada em polling — um toast a cada tick seria ruido.
    meta: { silent: true },
  });
}

/**
 * Busca do QR Code sob demanda — repetida via polling enquanto o modal estiver aberto.
 * `null` = o worker ainda não gerou o QR, ou o número já conectou (o status diferencia).
 */
export function useWhatsappQrCodeMutation() {
  return useMutation({
    mutationFn: async (numberId: string) => {
      const { data } = await api.get<{ qrCode: string | null }>(`/whatsapp/numbers/${numberId}/qr-code`);
      return data.qrCode;
    },
    // silent: recarregado em polling — um toast a cada tick seria ruido.
    meta: { silent: true },
  });
}

/**
 * Cadastra um número Baileys. Não leva credencial: o worker abre a sessão e a
 * clínica pareia lendo o QR Code em seguida.
 */
export function useRegisterBaileysNumberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterBaileysNumberPayload) => {
      const { data } = await api.post<WhatsappNumberRow>('/whatsapp/numbers/baileys', payload);
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
      const { data } = await api.delete(`/whatsapp/numbers/${numberId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappNumberKeys.lists() });
    },
  });
}
