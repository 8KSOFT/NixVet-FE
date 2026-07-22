'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { CreatePatientFilePayload, PatientFile, PatientFileUploadUrlResponse } from '@/app/types/patient-file';

export const patientFileKeys = {
  all: ['patient-files'] as const,
  byPatient: (patientId: string) => [...patientFileKeys.all, 'by-patient', patientId] as const,
};

export function usePatientFilesQuery(patientId: string | null | undefined) {
  return useQuery({
    queryKey: patientFileKeys.byPatient(patientId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<PatientFile[]>('/patient-files', { params: { patient_id: patientId } });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!patientId,
  });
}

export function useRequestPatientFileUploadUrlMutation() {
  return useMutation({
    mutationFn: async (payload: { patient_id: string; category: string; filename: string; mime_type: string }) => {
      const { data } = await api.post<PatientFileUploadUrlResponse>('/patient-files/upload-url', payload);
      return data;
    },
  });
}

export function useCreatePatientFileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePatientFilePayload) => {
      const { data } = await api.post('/patient-files', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: patientFileKeys.byPatient(variables.patient_id) });
    },
  });
}

export function useDownloadPatientFileUrlMutation() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      const { data } = await api.get<{ download_url: string }>(`/patient-files/${fileId}/download-url`);
      return data.download_url;
    },
  });
}
