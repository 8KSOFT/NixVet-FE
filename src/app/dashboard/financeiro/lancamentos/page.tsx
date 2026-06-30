'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Clock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { toast } from 'sonner';

type Status = 'suggested' | 'confirmed' | 'cancelled';

interface FinancialEntry {
  id: string;
  entry_date: string;
  type: string;
  category: string;
  payment_source: string;
  payment_method: string;
  status: Status;
  base_amount: number | null;
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  discount_amount: number;
  reference_type: string | null;
  description: string | null;
}

interface PaymentOption {
  method: string;
  fee_percentage: number;
  settlement_days: number;
  modality: 'a_vista' | 'a_prazo';
  client_pays: number;
  fee_amount: number;
  clinic_receives: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  hospitalization: 'Internação',
  procedure: 'Procedimento',
  exam: 'Exame',
  vaccine: 'Vacina',
  product: 'Produto',
  medication: 'Medicamento',
  material: 'Material',
  other: 'Outro',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  debit: 'Débito',
  credit_1x: 'Crédito à vista',
  credit_2_6x: 'Crédito 2-6x',
  credit_7_12x: 'Crédito 7-12x',
  credit_installment: 'Crédito parcelado',
  boleto: 'Boleto',
};

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function methodLabel(m: string) {
  return METHOD_LABELS[m] ?? m;
}

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: 'suggested', label: 'Sugeridos' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'cancelled', label: 'Cancelados' },
];

export default function LancamentosPage() {
  const [status, setStatus] = useState<Status>('suggested');
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog de confirmação
  const [confirmEntry, setConfirmEntry] = useState<FinancialEntry | null>(null);
  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<FinancialEntry[]>(`/financial-reports/entries?status=${status}`);
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openConfirm = async (entry: FinancialEntry) => {
    setConfirmEntry(entry);
    setSelectedMethod('');
    setDiscount('');
    setOptions([]);
    try {
      const base = Number(entry.base_amount ?? entry.gross_amount);
      const res = await api.get<PaymentOption[]>(
        `/financial-reports/entries/payment-options?amount=${base}`,
      );
      setOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar formas de pagamento');
    }
  };

  const discountNum = Number(discount) || 0;
  const baseAmount = Number(confirmEntry?.base_amount ?? confirmEntry?.gross_amount ?? 0);
  const netBase = Math.max(0, baseAmount - discountNum);

  // Recalcula à vista/a prazo no cliente conforme o desconto (gross-up).
  const displayOptions = useMemo(() => {
    return options.map((o) => {
      const fee = o.fee_percentage / 100;
      const clientPays = fee > 0 ? netBase / (1 - fee) : netBase;
      return {
        ...o,
        client_pays: Math.round(clientPays * 100) / 100,
        fee_amount: Math.round((clientPays - netBase) * 100) / 100,
        clinic_receives: Math.round(netBase * 100) / 100,
      };
    });
  }, [options, netBase]);

  const submitConfirm = async () => {
    if (!confirmEntry || !selectedMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/financial-reports/entries/${confirmEntry.id}/confirm`, {
        payment_method: selectedMethod,
        discount_amount: discountNum,
      });
      toast.success('Lançamento confirmado');
      setConfirmEntry(null);
      fetchEntries();
    } catch {
      toast.error('Erro ao confirmar lançamento');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEntry = async (entry: FinancialEntry) => {
    try {
      await api.patch(`/financial-reports/entries/${entry.id}/cancel`, {});
      toast.success('Lançamento cancelado');
      fetchEntries();
    } catch {
      toast.error('Erro ao cancelar lançamento');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lançamentos Financeiros</h1>
        <p className="text-sm text-muted-foreground">
          Lançamentos sugeridos automaticamente; confirme a forma de pagamento usada para registrar o valor real.
        </p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={status === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(tab.key)}
          >
            {tab.key === 'suggested' && <Clock className="mr-2 size-4" />}
            {tab.key === 'confirmed' && <CheckCircle className="mr-2 size-4" />}
            {tab.key === 'cancelled' && <XCircle className="mr-2 size-4" />}
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {STATUS_TABS.find((t) => t.key === status)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento {status === 'suggested' ? 'sugerido' : status === 'confirmed' ? 'confirmado' : 'cancelado'}.
            </p>
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">
                    {status === 'confirmed' ? 'Recebido' : 'Valor à vista'}
                  </TableHead>
                  {status === 'confirmed' && <TableHead>Forma</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.entry_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">{e.description ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {status === 'confirmed' ? fmt(e.net_amount) : fmt(e.base_amount ?? e.gross_amount)}
                    </TableCell>
                    {status === 'confirmed' && <TableCell>{methodLabel(e.payment_method)}</TableCell>}
                    <TableCell className="text-right">
                      {status === 'suggested' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => openConfirm(e)}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelEntry(e)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmEntry} onOpenChange={(o) => !o && setConfirmEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar lançamento</DialogTitle>
          </DialogHeader>

          {confirmEntry && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {CATEGORY_LABELS[confirmEntry.category] ?? confirmEntry.category}
                  </span>
                  <span className="font-medium">{confirmEntry.description ?? '—'}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Valor base (à vista)</span>
                  <span className="font-semibold">{fmt(baseAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 items-end gap-3">
                <div>
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={discount}
                    onChange={(ev) => setDiscount(ev.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="text-right text-sm">
                  <span className="text-muted-foreground">Valor real (recebido): </span>
                  <span className="font-semibold">{fmt(netBase)}</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Forma de pagamento usada</Label>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {displayOptions.length === 0 ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    displayOptions.map((o) => (
                      <button
                        type="button"
                        key={o.method}
                        onClick={() => setSelectedMethod(o.method)}
                        className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition ${
                          selectedMethod === o.method
                            ? 'border-primary ring-1 ring-primary'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{methodLabel(o.method)}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.modality === 'a_vista' ? 'À vista' : `A prazo · taxa ${o.fee_percentage}%`}
                            {o.settlement_days > 0 ? ` · ${o.settlement_days}d p/ receber` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{fmt(o.client_pays)}</div>
                          <div className="text-xs text-muted-foreground">
                            Recebe {fmt(o.clinic_receives)}
                            {o.fee_amount > 0 ? ` · taxa ${fmt(o.fee_amount)}` : ''}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEntry(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitConfirm} disabled={submitting || !selectedMethod}>
              <Wallet className="mr-2 size-4" />
              Confirmar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
