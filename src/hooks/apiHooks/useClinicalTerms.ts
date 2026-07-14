'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ClinicalTerm, ClinicalTermPayload } from '@/app/types/clinical-term';

export const clinicalTermKeys = {
  all: ['clinical-terms'] as const,
};

export function useClinicalTermsQuery() {
  return useQuery({
    queryKey: clinicalTermKeys.all,
    queryFn: async () => {
      const { data } = await api.get<ClinicalTerm[]>('/clinical-terms');
      return Array.isArray(data) ? data : [];
    },
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
