'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import { medicalRecordKeys } from '@/hooks/apiHooks/useMedicalRecords';
import { consultationKeys } from '@/hooks/apiHooks/useConsultations';
import type { Consultation } from '@/app/types/consultation';
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
  signature: (id: string | null) => [...prescriptionKeys.all, 'signature', id] as const,
  // PDF simples e PDF assinado ficam sob o mesmo prefixo `pdf/id`: invalidar/remover
  // `pdf(id)` derruba os dois de uma vez quando a assinatura muda.
  pdf: (id: string) => [...prescriptionKeys.all, 'pdf', id] as const,
  signedPdf: (id: string) => [...prescriptionKeys.pdf(id), 'signed'] as const,
};

/**
 * O PDF é gerado no backend a cada chamada (caro). Cache curto pra "Ver" seguido de "Baixar"
 * não gerar o mesmo arquivo duas vezes; gcTime igual pra não segurar blobs na memória.
 */
const PDF_CACHE_MS = 60_000;

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

/**
 * Consultas de UM paciente — alimenta o select "Consulta" do formulário de prescrição.
 * Antes a tela baixava a agenda inteira (todas as páginas de /consultations) só pra filtrar
 * no cliente; o backend já aceita `patient_id`. Mais recente primeiro (padrão das listagens).
 * Fica sob a raiz de consultationKeys pra ser invalidada junto quando uma consulta muda.
 */
export function usePatientConsultationsQuery(patientId: string | null | undefined) {
  return useQuery({
    queryKey: [...consultationKeys.all, 'by-patient', patientId ?? ''] as const,
    queryFn: () =>
      fetchAllListPages<Consultation>('/consultations', { patient_id: patientId ?? '', sort: 'desc' }),
    enabled: !!patientId,
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
      // O prontuário/ficha lista as prescrições do paciente sob as chaves de medical-records
      // (related-prescriptions) — sem isso a nova prescrição só aparecia lá após recarregar.
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.all });
    },
  });
}

/**
 * PDF simples (rascunho de 1 via / cirurgia / vacina) via cache do React Query: chamadas
 * repetidas dentro de PDF_CACHE_MS (ou simultâneas, por duplo clique) reaproveitam o mesmo Blob.
 */
export function fetchPrescriptionPdf(queryClient: QueryClient, id: string): Promise<Blob> {
  return queryClient.fetchQuery({
    queryKey: prescriptionKeys.pdf(id),
    queryFn: async () => {
      const { data } = await api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' });
      return data as Blob;
    },
    staleTime: PDF_CACHE_MS,
    gcTime: PDF_CACHE_MS,
  });
}

/** PDF assinado (3 vias) com o mesmo cache curto — a chave é removida ao assinar/revogar. */
export function fetchSignedPrescriptionPdf(queryClient: QueryClient, id: string): Promise<Blob> {
  return queryClient.fetchQuery({
    queryKey: prescriptionKeys.signedPdf(id),
    queryFn: async () => {
      const { data } = await api.get(`/prescriptions/${id}/signature/pdf`, { responseType: 'blob' });
      return data as Blob;
    },
    staleTime: PDF_CACHE_MS,
    gcTime: PDF_CACHE_MS,
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

/**
 * Assinatura mudou: o status, a listagem e qualquer PDF em cache daquela prescrição ficam
 * velhos. O PDF é removido (não só invalidado) pra não servir o rascunho/assinado anterior
 * e liberar o Blob da memória.
 */
function onSignatureChanged(queryClient: QueryClient, id: string) {
  queryClient.invalidateQueries({ queryKey: prescriptionKeys.signature(id) });
  queryClient.invalidateQueries({ queryKey: prescriptionKeys.lists() });
  queryClient.removeQueries({ queryKey: prescriptionKeys.pdf(id) });
  queryClient.invalidateQueries({ queryKey: medicalRecordKeys.all });
}

/** Assina digitalmente uma prescrição, definindo o modelo legal do receituário (SIMPLE/SPECIAL_CONTROL/VET_NOTIFICATION). */
export function useSignPrescriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SignPrescriptionPayload }) => {
      const { data } = await api.post(`/prescriptions/${id}/sign`, payload);
      return data as PrescriptionSignature;
    },
    onSuccess: (_data, variables) => onSignatureChanged(queryClient, variables.id),
  });
}

/**
 * Status da assinatura; `null` quando ainda não há assinatura (404). Mesma função para o hook
 * e para a busca pontual — as duas compartilham a chave, então o formato do dado tem que bater.
 */
async function getSignatureStatus(id: string): Promise<PrescriptionSignature | null> {
  try {
    const { data } = await api.get(`/prescriptions/${id}/signature`);
    return data as PrescriptionSignature;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Busca pontual (fora de hook) do status de assinatura — usada pelo preview/"olho" do PDF na
 * listagem para decidir se mostra o PDF assinado (3 vias) ou o rascunho não assinado. Passa
 * pelo cache (mesma chave de useSignatureStatusQuery) pra cliques repetidos não refazerem a
 * consulta. Retorna `null` em qualquer falha em vez de propagar o erro (cai no fluxo de assinar).
 */
export async function fetchPrescriptionSignatureStatus(
  queryClient: QueryClient,
  id: string,
): Promise<PrescriptionSignature | null> {
  try {
    return await queryClient.fetchQuery({
      queryKey: prescriptionKeys.signature(id),
      queryFn: () => getSignatureStatus(id),
    });
  } catch {
    return null;
  }
}

/** Status atual da assinatura de uma prescrição — busca sob demanda (evita N+1 na listagem). */
export function useSignatureStatusQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: prescriptionKeys.signature(id),
    queryFn: () => getSignatureStatus(id as string),
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
    onSuccess: (_data, variables) => onSignatureChanged(queryClient, variables.id),
  });
}

