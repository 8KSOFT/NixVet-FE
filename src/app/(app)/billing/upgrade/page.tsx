'use client';

import { urlDePagamentoSegura } from '@/lib/url-pagamento';
import React, { useState } from 'react';
import { GA_EVENTS, readGaClientId, trackEvent } from '@/lib/analytics';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { useActivateBillingMutation, useBillingStatusQuery } from '@/hooks/apiHooks/useBilling';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLANS, PLAN_BY_ID, type PlanId } from '@/lib/plans';
import { usePlanText } from '@/lib/i18n/plans';

type PlanName = PlanId;
type BillingType = 'CREDIT_CARD' | 'BOLETO' | 'PIX';

function formatCpfCnpj(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

const BILLING_TYPES: BillingType[] = ['CREDIT_CARD', 'BOLETO', 'PIX'];

export default function BillingUpgradePage() {
  const { t } = useTranslation();
  const planText = usePlanText();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const activateMutation = useActivateBillingMutation();
  const { data: billing } = useBillingStatusQuery();
  const loading = activateMutation.isPending;

  const isChangingPlan = billing?.status === 'active';
  const currentPlanId = billing?.billingPlan ?? null;

  const handleActivate = async () => {
    if (!selectedPlan) { toast.error(t('billingUpgrade.selectPlanError')); return; }
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
      toast.error(t('billingUpgrade.cpfRequiredError'));
      return;
    }
    // Antes da chamada, não depois: daqui em diante a pessoa sai do NixVet
    // para o checkout do Asaas, e uma falha de rede no meio deixaria a
    // intenção de assinar sem nenhum registro. `begin_checkout` é intenção —
    // quem paga de fato vira `purchase`, e esse sai do webhook do Asaas no
    // backend (NixVet-BE `billing.service.ts`), nunca daqui: PIX e boleto
    // levam o cliente ao checkout e ele pode nunca concluir.
    trackEvent(GA_EVENTS.BEGIN_CHECKOUT, {
      plan: selectedPlan,
      value: PLAN_BY_ID[selectedPlan]?.price ?? 0,
      currency: 'BRL',
      forma: billingType,
    });

    try {
      const data = await activateMutation.mutateAsync({
        plan: selectedPlan,
        billingType,
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        gaClientId: readGaClientId() ?? undefined,
      });

      const paymentUrl = urlDePagamentoSegura(data?.paymentUrl);
      if (paymentUrl) {
        // Redireciona para o checkout seguro da Asaas (PIX, boleto ou cartão).
        window.location.href = paymentUrl;
        return;
      }
      if (data?.paymentUrl) {
        // Veio um destino, mas fora do Asaas: não segue (lib/url-pagamento.ts).
        toast.error(t('billingUpgrade.paymentOpenError'));
        return;
      }
      router.push(isChangingPlan ? '/settings/billing' : '/dashboard');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('billingUpgrade.activateError')));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {isChangingPlan ? t('billingUpgrade.changeTitle') : t('billingUpgrade.chooseTitle')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isChangingPlan
            ? t('billingUpgrade.changeSubtitle')
            : t('billingUpgrade.chooseSubtitle')}
        </p>
      </div>

      <p className="mb-3 text-center text-sm text-muted-foreground">
        {t('billingUpgrade.clickHint')}
      </p>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={cn(
              'relative cursor-pointer p-6 transition-all duration-200',
              selectedPlan === plan.id
                ? 'border-primary ring-2 ring-primary shadow-lg'
                : plan.highlight
                  ? 'border-primary/40 bg-primary/5 hover:border-primary/60 hover:shadow-md'
                  : 'border-border hover:border-primary/40 hover:shadow-md',
            )}
          >
            {plan.id === currentPlanId ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-0.5 text-xs font-bold text-white shadow">
                {t('billingUpgrade.current')}
              </span>
            ) : plan.highlight ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-white shadow">
                {t('billingUpgrade.popular')}
              </span>
            ) : null}
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{planText(plan).name}</h2>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-foreground">
                    R${plan.price}
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">{t('billingUpgrade.perMonth')}</span>
                </div>
              </div>
              {selectedPlan === plan.id ? (
                <CheckCircle2 className="size-6 shrink-0 text-primary" />
              ) : (
                <Circle className="size-6 shrink-0 text-muted-foreground/30" />
              )}
            </div>
            <ul className="space-y-2">
              {planText(plan).features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex w-full max-w-md flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t('billingUpgrade.cpfCnpj')} <span className="text-red-500">*</span>
          </label>
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={t('billingUpgrade.cpfPlaceholder')}
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('billingUpgrade.cpfHint')}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t('billingUpgrade.paymentMethod')}
          </label>
          <Select
            value={billingType}
            onValueChange={(v: string) => setBillingType(v as BillingType)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('billingUpgrade.select')} />
            </SelectTrigger>
            <SelectContent>
              {BILLING_TYPES.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`billingUpgrade.methods.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          size="lg"
          onClick={handleActivate}
          disabled={!selectedPlan || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {isChangingPlan ? t('billingUpgrade.changing') : t('billingUpgrade.activating')}
            </>
          ) : (
            selectedPlan
              ? t(isChangingPlan ? 'billingUpgrade.confirmChangeTo' : 'billingUpgrade.activatePlan', { plan: planText(selectedPlan).name })
              : t(isChangingPlan ? 'billingUpgrade.confirmChange' : 'billingUpgrade.activate')
          )}
        </Button>
      </div>
    </div>
  );
}
