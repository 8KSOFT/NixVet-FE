'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { ProfilePayload, TeamUserRow } from '@/app/types/team-user';
import type { UserAccessProfiles } from '@/app/types/access-profile';

export const userKeys = {
  all: ['users'] as const,
  staffLists: () => [...userKeys.all, 'staff-list'] as const,
  staffList: (page: number) => [...userKeys.staffLists(), { page }] as const,
  staffListAll: () => [...userKeys.all, 'staff-list-all'] as const,
  veterinarians: () => [...userKeys.all, 'veterinarians'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  accessProfiles: (userId: string) => [...userKeys.all, 'access-profiles', userId] as const,
};

/** Perfil do usuário logado — usado na tela Meu Perfil. */
export function useProfileQuery() {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      const { data } = await api.get<TeamUserRow>('/users/profile');
      return data;
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProfilePayload) => {
      const { data } = await api.put<TeamUserRow>('/users/profile', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.profile(), data);
    },
  });
}

export interface UserPayload {
  name: string;
  email: string;
  role: string;
  password?: string;
  crmv?: string;
  specialty?: string;
}

/** Lista paginada da equipe (staff) — usada na tela de gestão de Time. */
export function useStaffUsersQuery(page: number) {
  return useQuery({
    queryKey: userKeys.staffList(page),
    queryFn: async () => {
      const { data } = await api.get('/users/staff', { params: listQueryParams(page) });
      return parseListResponse<TeamUserRow>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/** Lista completa de veterinários — usada em selects (ex: orçamento). */
export function useVeterinariansQuery() {
  return useQuery({
    queryKey: userKeys.veterinarians(),
    queryFn: () => fetchAllListPages<TeamUserRow>('/users/veterinarians'),
  });
}

/** Lista completa da equipe (staff) — usada como fallback quando a lista de veterinários vem vazia. */
export function useStaffUsersListQuery() {
  return useQuery({
    queryKey: userKeys.staffListAll(),
    queryFn: () => fetchAllListPages<TeamUserRow>('/users/staff'),
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserPayload) => {
      const { data } = await api.post('/users', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<UserPayload> }) => {
      const { data } = await api.put(`/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/** Perfis de acesso vinculados a um usuário. */
export function useUserAccessProfilesQuery(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: userKeys.accessProfiles(userId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<UserAccessProfiles>(`/users/${userId}/access-profiles`);
      return data;
    },
    enabled: enabled && !!userId,
  });
}

/** Substitui completamente os perfis de acesso de um usuário (sincronização). */
export function useSyncUserAccessProfilesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, profileIds }: { id: string; profileIds: string[] }) => {
      const { data } = await api.put<UserAccessProfiles>(`/users/${id}/access-profiles`, { profileIds });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.accessProfiles(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
