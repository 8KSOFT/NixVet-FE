'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CreditCard, Info, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BillingStatusData } from '@/hooks/useBillingStatus';
import { getStoredUserRole } from '@/lib/role-permissions';

interface TrialBannerProps {
  billing: BillingStatusData;
}

export function TrialBanner({ billing }: TrialBannerProps) {
  const { status, daysLeft, loading } = billing;

  if (loading) return null;
  if (getStoredUserRole() === 'superadmin') return null;
  if (status === 'active') return null;

  // Suspenso
  if (status === 'suspended') {
    return (
      <div className="flex items-center gap-3 border-b border-slate-300 bg-slate-800 px-5 py-3 text-sm text-slate-100">
        <AlertTriangle className="size-4 shrink-0 text-slate-300" />
        <span className="flex-1">Conta suspensa. Entre em contato com o suporte.</span>
      </div>
    );
  }

  // Pagamento em atraso
  if (status === 'overdue') {
    return (
      <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
        <AlertTriangle className="size-4 shrink-0 text-red-500" />
        <span className="flex-1">Pagamento em atraso. Regularize para evitar suspensão.</span>
        <Link href="/dashboard/billing/upgrade" className="shrink-0 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">
          Regularizar
        </Link>
      </div>
    );
  }

  // Trial expirado
  if (status === 'trial_expired') {
    return (
      <div className="flex items-center gap-3 border-b border-red-300 bg-red-100 px-5 py-3 text-sm text-red-900">
        <AlertTriangle className="size-4 shrink-0 text-red-600" />
        <span className="flex-1">Seu período de teste expirou. Escolha um plano para recuperar o acesso.</span>
        <Link href="/dashboard/billing/upgrade" className="shrink-0 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">
          Escolher plano
        </Link>
      </div>
    );
  }

  // Isento (cortesia)
  if (status === 'exempt') {
    if (!daysLeft || daysLeft <= 0) return null;
    return (
      <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
        <Gift className="size-4 shrink-0 text-emerald-600" />
        <span className="flex-1">Acesso cortesia ativo — <strong>{daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}</strong>.</span>
      </div>
    );
  }

  // Trial ativo
  if (status === 'trial') {
    if (daysLeft === null || daysLeft <= 0) {
      return (
        <div className="flex items-center gap-3 border-b border-orange-200 bg-orange-50 px-5 py-3 text-sm text-orange-900">
          <AlertTriangle className="size-4 shrink-0 text-orange-500" />
          <span className="flex-1">Trial expira hoje. Escolha um plano para continuar.</span>
          <Link href="/dashboard/billing/upgrade" className="shrink-0 rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700">
            Ver planos
          </Link>
        </div>
      );
    }

    if (daysLeft <= 2) {
      return (
        <div className="flex items-center gap-3 border-b border-orange-200 bg-orange-50 px-5 py-3 text-sm text-orange-900">
          <CreditCard className="size-4 shrink-0" />
          <span className="flex-1">
            Seu trial expira em <strong>{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</strong>. Escolha um plano para continuar.
          </span>
          <Link href="/dashboard/billing/upgrade" className="shrink-0 rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700">
            Ver planos
          </Link>
        </div>
      );
    }

    if (daysLeft <= 7) {
      return (
        <div className="flex items-center gap-3 border-b border-yellow-200 bg-yellow-50 px-5 py-3 text-sm text-yellow-900">
          <CreditCard className="size-4 shrink-0" />
          <span className="flex-1">
            Seu trial expira em <strong>{daysLeft} dias</strong>. Escolha um plano para continuar.
          </span>
          <Link href="/dashboard/billing/upgrade" className="shrink-0 rounded-md bg-yellow-600 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-700">
            Ver planos
          </Link>
        </div>
      );
    }

    // > 7 dias — banner informativo azul
    return (
      <div className="flex items-center gap-3 border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800">
        <Info className="size-4 shrink-0 text-blue-500" />
        <span className="flex-1">
          Você está no período de teste — <strong>{daysLeft} dias restantes</strong>.
        </span>
        <Link href="/dashboard/billing/upgrade" className={cn('shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700')}>
          Ver planos
        </Link>
      </div>
    );
  }

  return null;
}
