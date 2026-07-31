'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface TeamInvite {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

export interface CreateInvitePayload {
  name: string;
  email: string;
  role: string;
  /** Aplicados ao usuário de verdade só quando o convite for aceito. */
  accessProfileIds?: string[];
}

export const teamInviteKeys = {
  all: ['team-invites'] as const,
  pending: () => [...teamInviteKeys.all, 'pending'] as const,
};

export function usePendingInvitesQuery() {
  return useQuery({
    queryKey: teamInviteKeys.pending(),
    queryFn: async () => {
      const { data } = await api.get<TeamInvite[]>('/users/invite');
      return data ?? [];
    },
  });
}

export function useCreateInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInvitePayload) => {
      const { data } = await api.post('/users/invite', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamInviteKeys.pending() });
    },
  });
}

export function useResendInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/users/invite/${id}/resend`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamInviteKeys.pending() });
    },
  });
}

export function useCancelInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/users/invite/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamInviteKeys.pending() });
    },
  });
}

export interface TeamInvitePreview {
  name: string;
  email: string;
  clinicName: string;
}

/** Rota pública — usada em /convite/[token], sem sessão nenhuma. */
export function usePreviewInviteQuery(token: string) {
  return useQuery({
    queryKey: [...teamInviteKeys.all, 'preview', token],
    queryFn: async () => {
      const { data } = await api.get<TeamInvitePreview>('/users/invite/preview', {
        params: { token },
      });
      return data;
    },
    enabled: !!token,
    retry: false,
  });
}

export interface AcceptInviteResponse {
  tenantCode: string;
  access_token: string;
  user: {
    tenant_id: string;
    name: string;
    [key: string]: unknown;
  };
}

/** Rota pública — usada em /convite/[token], sem sessão nenhuma. Já loga automático. */
export function useAcceptInviteMutation() {
  return useMutation({
    mutationFn: async (payload: { token: string; password: string }) => {
      const { data } = await api.post<AcceptInviteResponse>('/users/invite/accept', payload);
      return data;
    },
  });
}
