'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PlanName = 'essencial' | 'clinica' | 'hospital';
type BillingType = 'CREDIT_CARD' | 'BOLETO' | 'PIX';

interface Plan {
  id: PlanName;
  name: string;
  price: number;
  highlight?: boolean;
  features: readonly string[];
}

const PLANS: Plan[] = [
  {
    id: 'essencial' as PlanName,
    name: 'Essencial',
    price: 179,
    features: [
      'Prontuário eletrônico',
      'Cadastro ilimitado de pacientes',
      'Agendamento online',
      'Emissão de receitas e pedidos',
      'WhatsApp básico',
    ],
  },
  {
    id: 'clinica' as PlanName,
    name: 'Clínica',
    price: 299,
    highlight: true,
    features: [
      'Tudo do Essencial',
      'Múltiplos veterinários',
      'Relatórios avançados',
      'Chatbot WhatsApp',
      'Lembretes automáticos',
    ],
  },
  {
    id: 'hospital' as PlanName,
    name: 'Hospital',
    price: 499,
    features: [
      'Tudo do Clínica',
      'IA clínica integrada',
      'Multi-unidades',
      'API dedicada',
      'Suporte prioritário 24/7',
    ],
  },
] as const;

const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  CREDIT_CARD: 'Cartão de crédito',
  BOLETO: 'Boleto bancário',
  PIX: 'PIX',
};

export default function BillingUpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!selectedPlan) {
      toast.error('Selecione um plano para continuar.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/billing/activate', { plan: selectedPlan, billingType });
      toast.success('Assinatura ativada com sucesso!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao ativar plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Escolha seu plano
        </h1>
        <p className="mt-2 text-muted-foreground">
          Selecione o plano ideal para a sua clínica e continue usando o NixVet.
        </p>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`relative cursor-pointer p-6 transition-all duration-200 ${
              selectedPlan === plan.id
                ? 'border-primary ring-2 ring-primary shadow-lg'
                : 'border-border hover:border-primary/40 hover:shadow-md'
            } ${plan.highlight ? 'border-primary/40 bg-primary/5' : ''}`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-white shadow">
                Mais popular
              </span>
            )}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-foreground">
                  R${plan.price}
                </span>
                <span className="mb-1 text-sm text-muted-foreground">/mês</span>
              </div>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f) => (
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
            Forma de pagamento
          </label>
          <Select
            value={billingType}
            onValueChange={(v: string) => setBillingType(v as BillingType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BILLING_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
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
              Ativando...
            </>
          ) : (
            `Ativar plano${selectedPlan ? ' ' + PLANS.find((p) => p.id === selectedPlan)?.name : ''}`
          )}
        </Button>
      </div>
    </div>
  );
}
