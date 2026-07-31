'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface OnboardingStatus {
  complete: boolean;
  missing: Array<'businessHours' | 'appointmentTypes'>;
  trialEndsAt: string | null;
}

export const onboardingKeys = {
  status: ['onboarding-status'] as const,
};

export function useOnboardingStatusQuery(enabled = true) {
  return useQuery({
    queryKey: onboardingKeys.status,
    queryFn: async () => {
      const { data } = await api.get<OnboardingStatus>('/tenants/me/onboarding');
      return data;
    },
    enabled,
  });
}

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/tenants/me/onboarding/complete');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.status });
    },
  });
}

export function useRequestEmailConfirmationMutation() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/email-confirmation/request');
      return data;
    },
  });
}

export function useConfirmEmailMutation() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/auth/email-confirmation/confirm', { code });
      return data;
    },
  });
}
