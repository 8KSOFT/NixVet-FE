'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Save, X, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/axios';
import { toast } from 'sonner';

interface PaymentSetting {
  id: string;
  method: string;
  fee_percentage: number;
  settlement_days: number;
  active: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  debit: 'Débito',
  credit_1x: 'Crédito 1x',
  credit_2_6x: 'Crédito 2–6x',
  credit_7_12x: 'Crédito 7–12x',
  boleto: 'Boleto',
};

export default function PagamentosSettingsPage() {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { fee_percentage: string; settlement_days: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaymentSetting[]>('/financial-reports/payment-settings');
      setSettings(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const startEdit = (s: PaymentSetting) => {
    setEditing((e) => ({
      ...e,
      [s.method]: {
        fee_percentage: String(s.fee_percentage),
        settlement_days: String(s.settlement_days),
      },
    }));
  };

  const cancelEdit = (method: string) => {
    setEditing((e) => { const n = { ...e }; delete n[method]; return n; });
  };

  const saveEdit = async (method: string) => {
    const data = editing[method];
    if (!data) return;
    setSaving(method);
    try {
      await api.patch(`/financial-reports/payment-settings/${method}`, {
        fee_percentage: Number(data.fee_percentage),
        settlement_days: Number(data.settlement_days),
      });
      toast.success('Salvo');
      cancelEdit(method);
      fetchSettings();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Taxas de Pagamento</h2>
        <p className="text-sm text-muted-foreground">Configure as taxas e prazos de liquidação por forma de pagamento</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações por Método</CardTitle>
          <CardDescription>Clique em um campo para editar. Salve linha por linha.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead>Taxa (%)</TableHead>
                  <TableHead>Liquidação (dias)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((s) => {
                  const isEditing = s.method in editing;
                  const row = editing[s.method];
                  return (
                    <TableRow className="border-b border-gray-300 h-15" key={s.id}>
                      <TableCell className="font-medium">{METHOD_LABELS[s.method] ?? s.method}</TableCell>
                      <TableCell>
                        {row ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24 h-8"
                            value={row.fee_percentage}
                            onChange={(e) => setEditing((ed) => ({ ...ed, [s.method]: { ...ed[s.method], fee_percentage: e.target.value } }))}
                          />
                        ) : (
                          <span className="tabular-nums">{Number(s.fee_percentage).toFixed(2)}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row ? (
                          <Input
                            type="number"
                            className="w-20 h-8"
                            value={row.settlement_days}
                            onChange={(e) => setEditing((ed) => ({ ...ed, [s.method]: { ...ed[s.method], settlement_days: e.target.value } }))}
                          />
                        ) : (
                          <span>D+{s.settlement_days}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.active ? 'default' : 'secondary'}>
                          {s.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {row ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="p-0"
                                title={saving === s.method ? 'Salvando...' : 'Salvar'}
                                aria-label="Salvar"
                                disabled={saving === s.method}
                                onClick={() => saveEdit(s.method)}
                              >
                                {saving === s.method ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Save className="size-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="p-0"
                                title="Cancelar"
                                aria-label="Cancelar"
                                onClick={() => cancelEdit(s.method)}
                              >
                                <X className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="p-0"
                              title="Editar"
                              aria-label="Editar"
                              onClick={() => startEdit(s)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
