'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  ClinicTermTemplate,
  ClinicTermTemplateUploadUrlResponse,
  CreateClinicTermTemplatePayload,
} from '@/app/types/clinic-term-template';

export const clinicTermTemplateKeys = {
  all: ['clinic-term-templates'] as const,
};

export function useClinicTermTemplatesQuery() {
  return useQuery({
    queryKey: clinicTermTemplateKeys.all,
    queryFn: async () => {
      const { data } = await api.get<ClinicTermTemplate[]>('/clinic-term-templates');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useRequestClinicTermUploadUrlMutation() {
  return useMutation({
    mutationFn: async (payload: { filename: string; mime_type: string }) => {
      const { data } = await api.post<ClinicTermTemplateUploadUrlResponse>(
        '/clinic-term-templates/upload-url',
        payload,
      );
      return data;
    },
  });
}

export function useCreateClinicTermTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateClinicTermTemplatePayload) => {
      const { data } = await api.post('/clinic-term-templates', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicTermTemplateKeys.all });
    },
  });
}

export function useToggleClinicTermTemplateActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data } = await api.put(`/clinic-term-templates/${id}`, { is_active });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicTermTemplateKeys.all });
    },
  });
}

export function useClinicTermDownloadUrlMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get<{ download_url: string }>(`/clinic-term-templates/${id}/download-url`);
      return data.download_url;
    },
  });
}

export function useDeleteClinicTermTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/clinic-term-templates/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clinicTermTemplateKeys.all });
    },
  });
}
