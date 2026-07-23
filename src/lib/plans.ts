/**
 * Catálogo único dos planos de assinatura (NixVet SaaS — cobrança via Asaas).
 * Fonte da verdade para nome/preço/features exibidos no front. O `id` precisa
 * bater com as chaves de PLAN_VALUES em NixVet-BE `billing.service.ts`.
 */
export type PlanId = 'essencial' | 'clinica' | 'hospital';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number;
  highlight?: boolean;
  tagline: string;
  features: readonly string[];
}

export const PLANS: readonly PlanDefinition[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: 179,
    tagline: 'Para clínicas pequenas começando a organizar a rotina.',
    features: [
      'Prontuário eletrônico',
      'Cadastro ilimitado de pacientes',
      'Agendamento online',
      'Emissão de receitas e pedidos',
      'WhatsApp básico',
    ],
  },
  {
    id: 'clinica',
    name: 'Clínica',
    price: 299,
    highlight: true,
    tagline: 'Para clínicas em crescimento com equipe e financeiro ativos.',
    features: [
      'Tudo do Essencial',
      'Múltiplos veterinários',
      'Relatórios financeiros avançados',
      'Internações',
      'Chatbot WhatsApp',
      'Lembretes automáticos',
    ],
  },
  {
    id: 'hospital',
    name: 'Hospital',
    price: 499,
    tagline: 'Para hospitais e clínicas de grande porte com casos complexos.',
    features: [
      'Tudo do Clínica',
      'Registros anestésicos',
      'IA clínica integrada',
      'Multi-unidades',
      'API dedicada',
      'Suporte prioritário 24/7',
    ],
  },
] as const;

export const PLAN_BY_ID: Record<PlanId, PlanDefinition> = PLANS.reduce(
  (acc, plan) => ({ ...acc, [plan.id]: plan }),
  {} as Record<PlanId, PlanDefinition>,
);

/** Opções prontas para <Select>/<select> — inclui "Enterprise" (plano manual, fora do catálogo). */
export const PLAN_SELECT_OPTIONS: readonly { value: string; label: string }[] = [
  ...PLANS.map((p) => ({ value: p.id, label: `${p.name} — R$${p.price}/mês` })),
  { value: 'enterprise', label: 'Enterprise (manual)' },
];

/** Rótulo curto ("Clínica"), usado em tabelas administrativas. */
export function planShortLabel(planId: string | null | undefined): string {
  if (!planId) return '—';
  return PLAN_BY_ID[planId as PlanId]?.name ?? planId;
}

/** Rótulo completo com preço ("Clínica — R$299/mês"), com fallback p/ planos fora do catálogo (ex: enterprise). */
export function planFullLabel(planId: string | null | undefined): string {
  if (!planId) return '—';
  const plan = PLAN_BY_ID[planId as PlanId];
  if (plan) return `${plan.name} — R$${plan.price}/mês`;
  if (planId === 'enterprise') return 'Enterprise';
  return planId;
}
