'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { ClinicalTerm, ClinicalTermPayload } from '@/app/types/clinical-term';

export const clinicalTermKeys = {
  all: ['clinical-terms'] as const,
  list: (page: number) => [...clinicalTermKeys.all, 'list', { page }] as const,
};

/** Termos paginados no servidor (mais recentes primeiro). */
export function useClinicalTermsPagedQuery(page: number) {
  return useQuery({
    queryKey: clinicalTermKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/clinical-terms', { params: listQueryParams(page) });
      return parseListResponse<ClinicalTerm>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateClinicalTermMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClinicalTermPayload) => {
      const { data } = await api.post<ClinicalTerm>('/clinical-terms', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicalTermKeys.all });
    },
  });
}

/** Baixa o PDF do termo — retorna o Blob puro, o componente decide como salvar. */
export function useClinicalTermPdfMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get(`/clinical-terms/${id}/pdf`, { responseType: 'blob' });
      return data as Blob;
    },
  });
}
