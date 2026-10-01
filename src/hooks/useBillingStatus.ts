'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { billingKeys, useBillingStatusQuery } from '@/hooks/apiHooks/useBilling';
import type { BillingStatus as BillingStatusResponse } from '@/app/types/billing';
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
  | 'cancelled'
  /**
   * `GET /billing/status` falhou (ou ainda não respondeu). Antes a falha virava
   * 'trial' em silêncio — clínica pagante via "período de teste" na barra.
   * Desconhecido não bloqueia e não mostra banner: quem barra de verdade é o
   * 402 do backend, que chega aqui pelo `subscribeBillingBlock`.
   */
  | 'unknown';

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
  /** A consulta falhou e não há nada em cache — `status` fica 'unknown'. */
  error: boolean;
}

const STATUS_CONHECIDOS: ReadonlySet<string> = new Set<BillingStatus>([
  'active',
  'trial',
  'trial_expired',
  'onboarding_expired',
  'overdue',
  'read_only',
  'suspended',
  'exempt',
  'cancelled',
]);

/** O tipo da API é `string`; valor que o front não conhece não vira 'trial'. */
function normalizarStatus(valor: string | undefined): BillingStatus {
  return valor && STATUS_CONHECIDOS.has(valor) ? (valor as BillingStatus) : 'unknown';
}

/**
 * Leitura do status de cobrança para o layout e o banner.
 *
 * Deriva de `useBillingStatusQuery` em vez de buscar por conta própria: antes
 * eram dois `GET /billing/status` por carga (este hook e as telas de
 * billing/whatsapp/PlanUpgradeGate), sem cache em comum.
 */
export function useBillingStatus(): BillingStatusData {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useBillingStatusQuery();

  /**
   * O `GET /billing/status` roda uma vez, na abertura. Quem passou dos 7 dias
   * com a tela aberta continuaria vendo "pagamento em atraso" enquanto o
   * backend já recusa toda edição — o banner precisa acompanhar o 402 que o
   * interceptor recebeu, sem esperar um F5.
   *
   * O 402 é gravado no próprio cache da query: assim a tela de billing e o
   * `PlanUpgradeGate`, que leem a mesma chave, enxergam o bloqueio também.
   */
  useEffect(() => {
    const aplicarBloqueio = (code: BillingBlockCode) => {
      queryClient.setQueryData<BillingStatusResponse>(billingKeys.status(), (anterior) => ({
        trialEndsAt: null,
        billingPlan: null,
        ...anterior,
        status: STATUS_POR_BLOQUEIO[code],
      }));
    };
    // Bloqueio visto sem nenhum assinante montado: o cache pode ser anterior a
    // ele. Aplica já (o banner não espera) e pede a versão do servidor, que
    // continua sendo a palavra final — como antes, quando o GET da abertura
    // sobrescrevia o bloqueio lembrado.
    const bloqueioAnterior = getLastBillingBlock();
    if (bloqueioAnterior) {
      aplicarBloqueio(bloqueioAnterior.code);
      queryClient.invalidateQueries({ queryKey: billingKeys.status() });
    }
    return subscribeBillingBlock((bloqueio) => aplicarBloqueio(bloqueio.code));
  }, [queryClient]);

  const status = normalizarStatus(data?.status);
  const trialEndsAt = data?.trialEndsAt ?? null;
  const daysLeft =
    trialEndsAt
      ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
      : null;

  return {
    status,
    trialEndsAt,
    billingPlan: data?.billingPlan ?? null,
    daysLeft,
    loading: isLoading,
    error: isError && !data,
  };
}
