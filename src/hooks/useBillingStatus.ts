'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
  getLastBillingBlock,
  subscribeBillingBlock,
  type BillingBlockCode,
} from '@/lib/billing-block';

export type BillingStatus =
  | 'active'
  | 'trial'
  | 'trial_expired'
  | 'onboarding_expired'
  | 'overdue'
  /** Inadimplente há mais de 7 dias: lê e exporta, não escreve. */
  | 'read_only'
  | 'suspended'
  | 'exempt'
  | 'cancelled';

/** Código do 402 → estado que o banner sabe desenhar. */
const STATUS_POR_BLOQUEIO: Record<BillingBlockCode, BillingStatus> = {
  SUBSCRIPTION_READ_ONLY: 'read_only',
  SUBSCRIPTION_CANCELLED: 'cancelled',
  SUBSCRIPTION_SUSPENDED: 'suspended',
  TRIAL_EXPIRED: 'trial_expired',
  ONBOARDING_EXPIRED: 'onboarding_expired',
};

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

  /**
   * O `GET /billing/status` roda uma vez, na abertura. Quem passou dos 7 dias
   * com a tela aberta continuaria vendo "pagamento em atraso" enquanto o
   * backend já recusa toda edição — o banner precisa acompanhar o 402 que o
   * interceptor recebeu, sem esperar um F5.
   */
  useEffect(() => {
    const bloqueioAnterior = getLastBillingBlock();
    if (bloqueioAnterior) setStatus(STATUS_POR_BLOQUEIO[bloqueioAnterior.code]);
    return subscribeBillingBlock((bloqueio) => {
      setStatus(STATUS_POR_BLOQUEIO[bloqueio.code]);
      setLoading(false);
    });
  }, []);

  const daysLeft =
    trialEndsAt
      ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
      : null;

  return { status, trialEndsAt, billingPlan, daysLeft, loading };
}
