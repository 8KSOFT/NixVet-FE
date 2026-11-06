import { useTranslation } from 'react-i18next';
import { PLANS, PLAN_BY_ID, type PlanDefinition, type PlanId } from '@/lib/plans';

/**
 * Nome, descrição e recursos de um plano no idioma ativo.
 *
 * `lib/plans.ts` continua sendo a fonte do id, do preço e da ordem; o texto
 * exibido vem de `plans.<id>.*` nos locales. O texto em português do catálogo
 * é só o último recurso, caso falte a chave.
 */
export function usePlanText() {
  const { t } = useTranslation();
  return (plano: PlanDefinition | PlanId) => {
    const p = typeof plano === 'string' ? PLAN_BY_ID[plano] : plano;
    return {
      name: t(`plans.${p.id}.name`, { defaultValue: p.name }),
      tagline: t(`plans.${p.id}.tagline`, { defaultValue: p.tagline }),
      features: p.features.map((f, i) => t(`plans.${p.id}.features.${i}`, { defaultValue: f })),
    };
  };
}

/** Opções de plano para <Select> (nome traduzido + preço), com o Enterprise manual no fim. */
export function usePlanOptions() {
  const { t } = useTranslation();
  const planText = usePlanText();
  return [
    ...PLANS.map((p) => ({
      value: p.id as string,
      label: `${planText(p).name}: R$${p.price}${t('billingUpgrade.perMonth')}`,
    })),
    { value: 'enterprise', label: t('plans.enterpriseManual') },
  ];
}

/** Rótulo curto do plano ("Clínica") para tabelas; id desconhecido volta como veio. */
export function usePlanShortLabel() {
  const { t } = useTranslation();
  const planText = usePlanText();
  return (planId: string | null | undefined) => {
    if (!planId) return '—';
    if (planId in PLAN_BY_ID) return planText(planId as PlanId).name;
    if (planId === 'enterprise') return t('plans.enterprise');
    return planId;
  };
}

/** Rótulo com preço ("Clínica: R$299/mês"), com fallback para planos fora do catálogo. */
export function usePlanFullLabel() {
  const { t } = useTranslation();
  const planText = usePlanText();
  return (planId: string | null | undefined) => {
    if (!planId) return '—';
    if (planId in PLAN_BY_ID) {
      const plan = PLAN_BY_ID[planId as PlanId];
      return `${planText(plan).name}: R$${plan.price}${t('billingUpgrade.perMonth')}`;
    }
    if (planId === 'enterprise') return t('plans.enterprise');
    return planId;
  };
}
