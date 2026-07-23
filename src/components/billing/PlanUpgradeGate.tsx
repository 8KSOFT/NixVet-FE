'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBillingStatusQuery } from '@/hooks/apiHooks/useBilling';
import { getStoredUserRole } from '@/lib/role-permissions';
import { PLAN_BY_ID, planMeetsRequirement, type PlanId } from '@/lib/plans';

interface PlanUpgradeGateProps {
  /** Plano mínimo exigido — precisa bater com o @RequirePlan() do endpoint no backend. */
  requiredPlan: PlanId;
  /** Nome do recurso exibido na mensagem de bloqueio (ex: "Internações"). */
  feature: string;
  children: React.ReactNode;
}

/**
 * Bloqueia a renderização de uma página/seção quando o plano do tenant não atende
 * ao mínimo exigido pelo backend (@RequirePlan), mostrando uma tela de upsell em vez
 * de deixar a página tentar carregar dados e falhar com 402 silenciosamente.
 */
export function PlanUpgradeGate({ requiredPlan, feature, children }: PlanUpgradeGateProps) {
  const { data: billing, isLoading } = useBillingStatusQuery();

  if (getStoredUserRole() === 'superadmin') return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (planMeetsRequirement(billing?.billingPlan, requiredPlan)) {
    return <>{children}</>;
  }

  const requiredPlanName = PLAN_BY_ID[requiredPlan].name;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="size-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {feature} é um recurso do plano {requiredPlanName}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Faça upgrade para desbloquear {feature.toLowerCase()} e outros recursos avançados para a sua clínica.
          </p>
        </div>
        <Link href="/billing/upgrade">
          <Button>Ver planos</Button>
        </Link>
      </Card>
    </div>
  );
}
