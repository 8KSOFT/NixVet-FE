'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';

export type BillingStatus = 'active' | 'trial' | 'trial_expired' | 'overdue' | 'suspended' | 'exempt' | 'cancelled';

export interface BillingStatusData {
  status: BillingStatus;
  trialEndsAt: string | null;
  billingPlan: string | null;
  daysLeft: number | null;
  loading: boolean;
}

interface BillingStatusResponse {
  status: BillingStatus;
  trialEndsAt: string | null;
  billingPlan: string | null;
}

export function useBillingStatus(): BillingStatusData {
  const [status, setStatus] = useState<BillingStatus>('trial');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [billingPlan, setBillingPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<BillingStatusResponse>('/billing/status')
      .then((r) => {
        setStatus(r.data.status);
        setTrialEndsAt(r.data.trialEndsAt);
        setBillingPlan(r.data.billingPlan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const daysLeft =
    trialEndsAt
      ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
      : null;

  return { status, trialEndsAt, billingPlan, daysLeft, loading };
}
