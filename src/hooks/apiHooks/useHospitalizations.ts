'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  DischargePayload,
  Hospitalization,
  HospitalizationCost,
  HospitalizationCostPayload,
  HospitalizationCostSummary,
  HospitalizationCreatePayload,
  HospitalizationEvolution,
  HospitalizationEvolutionPayload,
  HospitalizationMedicationPayload,
  HospitalizationMedSchedule,
  HospitalizationSbarPayload,
  HospitalizationSbarReport,
  HospitalizationVisit,
  HospitalizationVisitPayload,
} from '@/app/types/hospitalization';

export const hospitalizationKeys = {
  all: ['hospitalizations'] as const,
  lists: () => [...hospitalizationKeys.all, 'list'] as const,
  active: (patientId: string) => [...hospitalizationKeys.all, 'active', patientId] as const,
  activeList: () => [...hospitalizationKeys.all, 'active-list'] as const,
  detail: (id: string) => [...hospitalizationKeys.all, 'detail', id] as const,
  costs: (id: string) => [...hospitalizationKeys.all, 'costs', id] as const,
  costSummary: (id: string) => [...hospitalizationKeys.all, 'cost-summary', id] as const,
  evolutions: (id: string) => [...hospitalizationKeys.all, 'evolutions', id] as const,
  medications: (id: string) => [...hospitalizationKeys.all, 'medications', id] as const,
  reports: (id: string) => [...hospitalizationKeys.all, 'reports', id] as const,
  visits: (id: string) => [...hospitalizationKeys.all, 'visits', id] as const,
};

/** Internação ativa de um paciente (se houver) — usada no banner de alerta da ficha médica. */
export function useActiveHospitalizationQuery(patientId: string | null | undefined) {
  return useQuery({
    queryKey: hospitalizationKeys.active(patientId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Hospitalization[] | { data: Hospitalization[] }>('/hospitalizations', {
        params: { patient_id: patientId, status: 'active' },
      });
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      return list.length > 0 ? list[0] : null;
    },
    enabled: !!patientId,
  });
}

export function useActiveHospitalizationsListQuery() {
  return useQuery({
    queryKey: hospitalizationKeys.activeList(),
    queryFn: async () => {
      const { data } = await api.get<Hospitalization[]>('/hospitalizations/active');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHospitalizationsQuery() {
  return useQuery({
    queryKey: hospitalizationKeys.lists(),
    queryFn: async () => {
      const { data } = await api.get<Hospitalization[]>('/hospitalizations');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHospitalizationQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: hospitalizationKeys.detail(id ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Hospitalization>(`/hospitalizations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateHospitalizationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HospitalizationCreatePayload) => {
      const { data } = await api.post<Hospitalization>('/hospitalizations', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.all });
    },
  });
}

export function useDischargeHospitalizationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: DischargePayload }) => {
      const { data } = await api.patch(`/hospitalizations/${id}/discharge`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.all });
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.detail(variables.id) });
    },
  });
}

export function useLinkMedicalRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, medicalRecordId }: { id: string; medicalRecordId: string }) => {
      const { data } = await api.patch(`/hospitalizations/${id}`, { medical_record_id: medicalRecordId });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.detail(variables.id) });
    },
  });
}

/* ---- Custos ---- */

export function useHospitalizationCostsQuery(hospitalizationId: string) {
  return useQuery({
    queryKey: hospitalizationKeys.costs(hospitalizationId),
    queryFn: async () => {
      const { data } = await api.get<HospitalizationCost[]>(`/hospitalizations/${hospitalizationId}/costs`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useHospitalizationCostSummaryQuery(hospitalizationId: string) {
  return useQuery({
    queryKey: hospitalizationKeys.costSummary(hospitalizationId),
    queryFn: async () => {
      const { data } = await api.get<HospitalizationCostSummary>(`/hospitalizations/${hospitalizationId}/costs/summary`);
      return data;
    },
  });
}

export function useAddHospitalizationCostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, payload }: { hospitalizationId: string; payload: HospitalizationCostPayload }) => {
      const { data } = await api.post(`/hospitalizations/${hospitalizationId}/costs`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.costs(variables.hospitalizationId) });
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.costSummary(variables.hospitalizationId) });
    },
  });
}

export function useDeleteHospitalizationCostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, costId }: { hospitalizationId: string; costId: string }) => {
      const { data } = await api.delete(`/hospitalizations/${hospitalizationId}/costs/${costId}`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.costs(variables.hospitalizationId) });
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.costSummary(variables.hospitalizationId) });
    },
  });
}

export function useGenerateHospitalizationInvoiceMutation() {
  return useMutation({
    mutationFn: async (hospitalizationId: string) => {
      const { data } = await api.post(`/hospitalizations/${hospitalizationId}/costs/invoice`, {}, { responseType: 'blob' });
      return data as Blob;
    },
  });
}

/* ---- Ocorrências (evoluções) ---- */

export function useHospitalizationEvolutionsQuery(hospitalizationId: string) {
  return useQuery({
    queryKey: hospitalizationKeys.evolutions(hospitalizationId),
    queryFn: async () => {
      const { data } = await api.get<HospitalizationEvolution[]>(`/hospitalizations/${hospitalizationId}/evolutions`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateHospitalizationEvolutionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, payload }: { hospitalizationId: string; payload: HospitalizationEvolutionPayload }) => {
      const { data } = await api.post(`/hospitalizations/${hospitalizationId}/evolutions`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.evolutions(variables.hospitalizationId) });
    },
  });
}

export function useDownloadHospitalizationProntuarioPdfMutation() {
  return useMutation({
    mutationFn: async (hospitalizationId: string) => {
      const { data } = await api.get(`/hospitalizations/${hospitalizationId}/evolutions/prontuario/pdf`, {
        responseType: 'blob',
      });
      return data as Blob;
    },
  });
}

/* ---- Medicações ---- */

export function useHospitalizationMedicationsQuery(hospitalizationId: string) {
  return useQuery({
    queryKey: hospitalizationKeys.medications(hospitalizationId),
    queryFn: async () => {
      const { data } = await api.get<HospitalizationMedSchedule[]>(`/hospitalizations/${hospitalizationId}/medications`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function usePrescribeHospitalizationMedicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, payload }: { hospitalizationId: string; payload: HospitalizationMedicationPayload }) => {
      const { data } = await api.post(`/hospitalizations/${hospitalizationId}/medications`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.medications(variables.hospitalizationId) });
    },
  });
}

export function useConfirmMedicationAdministrationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, adminId }: { hospitalizationId: string; adminId: string }) => {
      const { data } = await api.patch(
        `/hospitalizations/${hospitalizationId}/medications/administrations/${adminId}/confirm`,
        {},
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.medications(variables.hospitalizationId) });
    },
  });
}

export function useDownloadHospitalizationKardexPdfMutation() {
  return useMutation({
    mutationFn: async (hospitalizationId: string) => {
      const { data } = await api.get(`/hospitalizations/${hospitalizationId}/medications/kardex/pdf`, {
        responseType: 'blob',
      });
      return data as Blob;
    },
  });
}

/* ---- Relatório SBAR ---- */

export function useHospitalizationSbarReportsQuery(hospitalizationId: string) {
  return useQuery({
    queryKey: hospitalizationKeys.reports(hospitalizationId),
    queryFn: async () => {
      const { data } = await api.get<HospitalizationSbarReport[]>(`/hospitalizations/${hospitalizationId}/reports`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateHospitalizationSbarReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, payload }: { hospitalizationId: string; payload: HospitalizationSbarPayload }) => {
      const { data } = await api.post(`/hospitalizations/${hospitalizationId}/reports`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.reports(variables.hospitalizationId) });
    },
  });
}

export function useAiReviewSbarReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, reportId }: { hospitalizationId: string; reportId: string }) => {
      const { data } = await api.post(`/hospitalizations/${hospitalizationId}/reports/${reportId}/ai-review`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.reports(variables.hospitalizationId) });
    },
  });
}

/* ---- Visitas ---- */

export function useHospitalizationVisitsQuery(hospitalizationId: string) {
  return useQuery({
    queryKey: hospitalizationKeys.visits(hospitalizationId),
    queryFn: async () => {
      const { data } = await api.get<HospitalizationVisit[]>(`/hospitalizations/${hospitalizationId}/visits`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateHospitalizationVisitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hospitalizationId, payload }: { hospitalizationId: string; payload: HospitalizationVisitPayload }) => {
      const { data } = await api.post(`/hospitalizations/${hospitalizationId}/visits`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: hospitalizationKeys.visits(variables.hospitalizationId) });
    },
  });
}
