'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import api from '@/lib/axios';

interface BillingStatus {
  status: string;
  trialEndsAt: string | null;
  billingPlan: string | null;
  cancelAt?: string | null;
}

interface Invoice {
  date: string;
  value: number;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  status: string;
}

const PLAN_LABELS: Record<string, string> = {
  essencial: 'Essencial — R$179/mês',
  clinica: 'Clínica — R$299/mês',
  hospital: 'Hospital — R$499/mês',
  enterprise: 'Enterprise',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Ativo', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  trial: { label: 'Período de teste', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Clock },
  trial_expired: { label: 'Trial expirado', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: AlertTriangle },
  overdue: { label: 'Pagamento em atraso', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertTriangle },
  suspended: { label: 'Suspenso', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'text-slate-600 bg-slate-50 border-slate-200', icon: XCircle },
};

export default function BillingSettingsPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    api.get('/billing/status')
      .then((r) => setBilling(r.data))
      .catch(() => toast.error('Erro ao carregar status do plano.'))
      .finally(() => setLoadingStatus(false));

    api.get('/billing/invoices')
      .then((r) => setInvoices(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingInvoices(false));
  }, []);

  const handleCancel = async () => {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    setCancelling(true);
    try {
      const { data } = await api.post('/billing/cancel');
      toast.success(data.message ?? 'Plano cancelado com sucesso.');
      setBilling((prev) => prev ? { ...prev, cancelAt: data.cancelAt } : prev);
      setConfirmCancel(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao cancelar plano.');
    } finally {
      setCancelling(false);
    }
  };

  const cfg = billing ? (STATUS_CONFIG[billing.status] ?? STATUS_CONFIG.suspended) : null;

  const daysLeft = billing?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const cancelAtDate = billing?.cancelAt ? new Date(billing.cancelAt).toLocaleDateString('pt-BR') : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Assinatura e Faturamento</h1>
        <p className="mt-1 text-sm text-slate-500">Gerencie seu plano, forma de pagamento e notas fiscais.</p>
      </div>

      {/* Status card */}
      {loadingStatus ? (
        <Card className="flex items-center justify-center p-8">
          <Loader2 className="size-5 animate-spin text-slate-400" />
        </Card>
      ) : billing && cfg ? (
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color}`}>
                <cfg.icon className="size-3.5" />
                {cfg.label}
              </div>

              {billing.billingPlan && (
                <p className="text-base font-semibold text-slate-800">
                  {PLAN_LABELS[billing.billingPlan] ?? billing.billingPlan}
                </p>
              )}

              {billing.status === 'trial' && daysLeft !== null && (
                <p className="text-sm text-slate-600">
                  Trial expira em <strong>{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</strong>
                  {billing.trialEndsAt && ` (${new Date(billing.trialEndsAt).toLocaleDateString('pt-BR')})`}
                </p>
              )}

              {cancelAtDate && (
                <p className="text-sm text-orange-700">
                  ⚠️ Cancelamento agendado — acesso até <strong>{cancelAtDate}</strong>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {(billing.status === 'trial' || billing.status === 'trial_expired' || billing.status === 'overdue') && (
                <Link href="/dashboard/billing/upgrade">
                  <Button size="sm" className="w-full sm:w-auto">
                    <CreditCard className="mr-2 size-4" />
                    {billing.status === 'overdue' ? 'Regularizar pagamento' : 'Escolher plano'}
                  </Button>
                </Link>
              )}

              {billing.status === 'active' && !cancelAtDate && (
                <>
                  {!confirmCancel ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancelar assinatura
                    </Button>
                  ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <p className="mb-3 font-medium">Confirmar cancelamento?</p>
                      <p className="mb-3 text-xs text-red-700">
                        Seu acesso continuará ativo até o fim do período pago. Após isso, a conta será suspensa.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setConfirmCancel(false)}
                          disabled={cancelling}
                        >
                          Manter plano
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-red-600 hover:bg-red-700"
                          onClick={handleCancel}
                          disabled={cancelling}
                        >
                          {cancelling ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                          Confirmar cancelamento
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Invoices */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-800">Notas fiscais e pagamentos</h2>
        {loadingInvoices ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Carregando...
          </div>
        ) : invoices.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <FileText className="size-8 text-slate-200" />
            <p className="text-sm text-slate-400">Nenhum pagamento registrado ainda.</p>
          </Card>
        ) : (
          <Card className="divide-y overflow-hidden">
            {invoices.map((inv, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(inv.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {inv.status === 'DONE' ? '✅ NFS-e emitida' : inv.status === 'PENDING' ? '⏳ Nota pendente' : inv.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">
                    R${inv.value.toFixed(2).replace('.', ',')}
                  </span>
                  {(inv.invoiceUrl || inv.pdfUrl) && (
                    <a
                      href={inv.pdfUrl ?? inv.invoiceUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      NFS-e <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
