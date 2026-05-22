'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BillingStatusData } from '@/hooks/useBillingStatus';

interface TrialBannerProps {
  billing: BillingStatusData;
}

export function TrialBanner({ billing }: TrialBannerProps) {
  const { status, daysLeft, loading } = billing;

  if (loading) return null;

  if (status === 'overdue') {
    return (
      <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
        <AlertTriangle className="size-4 shrink-0 text-red-500" />
        <span className="flex-1">
          Pagamento em atraso. Regularize para evitar suspensão.
        </span>
        <Link
          href="/dashboard/billing/upgrade"
          className="shrink-0 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
        >
          Regularizar
        </Link>
      </div>
    );
  }

  if (status === 'trial' && daysLeft !== null && daysLeft <= 7) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 border-b px-5 py-3 text-sm',
          daysLeft <= 2
            ? 'border-orange-200 bg-orange-50 text-orange-900'
            : 'border-yellow-200 bg-yellow-50 text-yellow-900',
        )}
      >
        <CreditCard className="size-4 shrink-0" />
        <span className="flex-1">
          Seu trial expira em <strong>{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</strong>. Escolha um plano para continuar.
        </span>
        <Link
          href="/dashboard/billing/upgrade"
          className="shrink-0 rounded-md bg-yellow-600 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-700"
        >
          Ver planos
        </Link>
      </div>
    );
  }

  return null;
}
