'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type {
  CreatePrescriptionPayload,
  Prescription,
  PrescriptionSignature,
  SignPrescriptionPayload,
} from '@/app/types/prescription';

export const prescriptionKeys = {
  all: ['prescriptions'] as const,
  lists: () => [...prescriptionKeys.all, 'list'] as const,
  list: (page: number) => [...prescriptionKeys.lists(), { page }] as const,
};

export function usePrescriptionsQuery(page: number) {
  return useQuery({
    queryKey: prescriptionKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/prescriptions', { params: listQueryParams(page) });
      return parseListResponse<Prescription>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreatePrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePrescriptionPayload) => {
      const { data } = await api.post('/prescriptions', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prescriptionKeys.all });
    },
  });
}

/** Baixa/pré-visualiza o PDF da prescrição — retorna o Blob para o chamador decidir o que fazer. */
export function useDownloadPrescriptionPdfMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' });
      return data as Blob;
    },
  });
}

export function useSendPrescriptionEmailMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/prescriptions/${id}/email`);
      return data;
    },
  });
}

/** Assina digitalmente uma prescrição, definindo o modelo legal do receituário (SIMPLE/SPECIAL_CONTROL/VET_NOTIFICATION). */
export function useSignPrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SignPrescriptionPayload }) => {
      const { data } = await api.post(`/prescriptions/${id}/sign`, payload);
      return data as PrescriptionSignature;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'signature', variables.id] });
    },
  });
}

/**
 * Busca pontual (fora de hook) do status de assinatura — usada pelo preview/"olho" do PDF na
 * listagem para decidir se mostra o PDF assinado (3 vias) ou o rascunho não assinado. Retorna
 * `null` quando ainda não há assinatura (404) em vez de propagar o erro.
 */
export async function fetchPrescriptionSignatureStatus(id: string): Promise<PrescriptionSignature | null> {
  try {
    const { data } = await api.get(`/prescriptions/${id}/signature`);
    return data as PrescriptionSignature;
  } catch {
    return null;
  }
}

/** Status atual da assinatura de uma prescrição — busca sob demanda (evita N+1 na listagem). */
export function useSignatureStatusQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['prescriptions', 'signature', id],
    queryFn: async () => {
      const { data } = await api.get(`/prescriptions/${id}/signature`);
      return data as PrescriptionSignature;
    },
    enabled: enabled && !!id,
  });
}

export function useRevokeSignatureMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post(`/prescriptions/${id}/signature/revoke`, { reason });
      return data as PrescriptionSignature;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', 'signature', variables.id] });
    },
  });
}

/** Baixa o PDF já assinado (3 vias) via endpoint autenticado — não exige token público. */
export function useDownloadSignedPrescriptionPdfMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get(`/prescriptions/${id}/signature/pdf`, { responseType: 'blob' });
      return data as Blob;
    },
  });
}
