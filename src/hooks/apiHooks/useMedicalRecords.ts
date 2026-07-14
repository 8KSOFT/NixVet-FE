'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type {
  AddVaccinePayload,
  MedicalRecord,
  MedicalRecordCreatePayload,
  MedicalRecordUpdatePayload,
  RecordExamRequestSummary,
  RecordPrescriptionSummary,
  RecordVaccineHistoryItem,
} from '@/app/types/medical-record';

export const medicalRecordKeys = {
  all: ['medical-records'] as const,
  lists: () => [...medicalRecordKeys.all, 'list'] as const,
  list: (page: number, patientId?: string) => [...medicalRecordKeys.lists(), { page, patientId }] as const,
  byPatient: (patientId: string) => [...medicalRecordKeys.all, 'by-patient', patientId] as const,
  detail: (id: string) => [...medicalRecordKeys.all, 'detail', id] as const,
  relatedPrescriptions: (patientId: string) => [...medicalRecordKeys.all, 'related-prescriptions', patientId] as const,
  relatedExamRequests: (patientId: string) => [...medicalRecordKeys.all, 'related-exam-requests', patientId] as const,
  relatedVaccines: (patientId: string) => [...medicalRecordKeys.all, 'related-vaccines', patientId] as const,
};

export function useMedicalRecordsQuery(page: number, patientId?: string) {
  return useQuery({
    queryKey: medicalRecordKeys.list(page, patientId),
    queryFn: async () => {
      const params: Record<string, string | number> = { ...listQueryParams(page) };
      if (patientId) params.patient_id = patientId;
      const { data } = await api.get('/medical-records', { params });
      return parseListResponse<MedicalRecord>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/** Todas as fichas de um paciente (todas as páginas) — usada no prontuário do animal. */
export function useMedicalRecordsByPatientQuery(patientId: string | null | undefined) {
  return useQuery({
    queryKey: medicalRecordKeys.byPatient(patientId ?? ''),
    queryFn: () => fetchAllListPages<MedicalRecord>('/medical-records', { patient_id: patientId ?? '' }),
    enabled: !!patientId,
  });
}

export function useMedicalRecordQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: medicalRecordKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<MedicalRecord>(`/medical-records/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMedicalRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MedicalRecordCreatePayload) => {
      const { data } = await api.post<MedicalRecord>('/medical-records', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.all });
    },
  });
}

export function useUpdateMedicalRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: MedicalRecordUpdatePayload }) => {
      const { data } = await api.put<MedicalRecord>(`/medical-records/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.all });
    },
  });
}

export function useAddVaccineToRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AddVaccinePayload }) => {
      const { data } = await api.post(`/medical-records/${id}/vaccines`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.all });
    },
  });
}

/** Prescrições do paciente — visão resumida usada na aba "Prescrições" da ficha. */
export function useRecordPrescriptionsQuery(patientId: string | null | undefined) {
  return useQuery({
    queryKey: medicalRecordKeys.relatedPrescriptions(patientId ?? ''),
    queryFn: () => fetchAllListPages<RecordPrescriptionSummary>('/prescriptions', { patient_id: patientId ?? '' }),
    enabled: !!patientId,
  });
}

/** Exames do paciente — visão resumida usada na aba "Exames" da ficha. */
export function useRecordExamRequestsQuery(patientId: string | null | undefined) {
  return useQuery({
    queryKey: medicalRecordKeys.relatedExamRequests(patientId ?? ''),
    queryFn: () => fetchAllListPages<RecordExamRequestSummary>('/exam-requests', { patient_id: patientId ?? '' }),
    enabled: !!patientId,
  });
}

/** Histórico de vacinas aplicadas ao paciente — usada na aba "Vacinas" da ficha. */
export function useRecordVaccineHistoryQuery(patientId: string | null | undefined) {
  return useQuery({
    queryKey: medicalRecordKeys.relatedVaccines(patientId ?? ''),
    queryFn: () => fetchAllListPages<RecordVaccineHistoryItem>('/vaccines', { patient_id: patientId ?? '' }),
    enabled: !!patientId,
  });
}
