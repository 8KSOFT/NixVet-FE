'use client';

import React, { useState } from 'react';
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
import { toast } from 'sonner';
import { usePaymentSettingsQuery, useUpdatePaymentSettingMutation } from '@/hooks/apiHooks/useFinancialReports';
import type { PaymentSetting } from '@/app/types/financial-report';

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
  const [editing, setEditing] = useState<Record<string, { fee_percentage: string; settlement_days: string }>>({});

  const { data: settings = [], isLoading: loading } = usePaymentSettingsQuery();
  const updateMutation = useUpdatePaymentSettingMutation();
  const saving = updateMutation.isPending ? (updateMutation.variables?.method ?? null) : null;

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
    try {
      await updateMutation.mutateAsync({
        method,
        payload: {
          fee_percentage: Number(data.fee_percentage),
          settlement_days: Number(data.settlement_days),
        },
      });
      cancelEdit(method);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Taxas de Pagamento</h2>
        <p className="text-sm text-muted-foreground">Configure as taxas e prazos de liquidação por forma de pagamento</p>
      </div>

      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
        <CardHeader className="px-0 sm:px-6">
          <CardTitle className="text-base">Configurações por Método</CardTitle>
          <CardDescription>Clique em um campo para editar. Salve linha por linha.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 px-0 py-6 sm:px-6">
              {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto md:block">
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

              {/* Mobile: cards */}
              <div className="space-y-2 md:hidden">
                {settings.map((s) => {
                  const row = editing[s.method];
                  return (
                    <div key={s.id} className="rounded-lg border border-gray-300 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{METHOD_LABELS[s.method] ?? s.method}</p>
                        <Badge variant={s.active ? 'default' : 'secondary'} className="shrink-0">
                          {s.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                      {row ? (
                        <div className="mt-3 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground">Taxa (%)</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={row.fee_percentage}
                                onChange={(e) => setEditing((ed) => ({ ...ed, [s.method]: { ...ed[s.method], fee_percentage: e.target.value } }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground">Liquidação (dias)</label>
                              <Input
                                type="number"
                                value={row.settlement_days}
                                onChange={(e) => setEditing((ed) => ({ ...ed, [s.method]: { ...ed[s.method], settlement_days: e.target.value } }))}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => cancelEdit(s.method)}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              disabled={saving === s.method}
                              onClick={() => saveEdit(s.method)}
                              className="bg-primary"
                            >
                              {saving === s.method && <Loader2 className="mr-2 size-4 animate-spin" />}
                              Salvar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex gap-4 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Taxa</p>
                              <p className="tabular-nums">{Number(s.fee_percentage).toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Liquidação</p>
                              <p>D+{s.settlement_days}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => startEdit(s)} title="Editar" aria-label="Editar">
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
