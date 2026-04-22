'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Cpu, MessageSquare, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import api from '@/lib/axios';
import dayjs from 'dayjs';

interface UsageSummary {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_calls: number;
}

interface ByOperation {
  operation: string;
  tokens: number;
  cost_usd: number;
  calls: number;
}

interface RecentLog {
  id: string;
  operation: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  conversation_id: string | null;
  created_at: string;
}

interface UsageResponse {
  summary: UsageSummary;
  by_operation: ByOperation[];
  daily: Array<{ date: string; tokens: number; cost_usd: number; calls: number }>;
  recent: RecentLog[];
}

const OP_LABELS: Record<string, string> = {
  'classify-intent': 'Classificação de intenção',
  'chatbot-reply': 'Resposta automática (chatbot)',
  'suggest-replies': 'Sugestões de resposta',
  'summarize-notes': 'Resumo de consulta',
  'structure-observations': 'Estruturação médica',
  unknown: 'Outro',
};

function formatCost(usd: number): string {
  return `$${Number(usd).toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AiCostsPage() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(() => dayjs().endOf('month').format('YYYY-MM-DD'));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<UsageResponse>('/ai/usage', {
        params: { from: `${from}T00:00:00`, to: `${to}T23:59:59`, group_by: 'day' },
      });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const totalCost = Number(summary?.total_cost_usd ?? 0);
  const totalTokens = Number(summary?.total_tokens ?? 0);
  const totalCalls = Number(summary?.total_calls ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">Custos de IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o consumo de tokens e custos estimados da OpenAI
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-100">
              <DollarSign className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCost(totalCost)}</p>
              <p className="text-xs text-muted-foreground">Custo estimado (USD)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Cpu className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatTokens(totalTokens)}</p>
              <p className="text-xs text-muted-foreground">Tokens consumidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100">
              <MessageSquare className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCalls}</p>
              <p className="text-xs text-muted-foreground">Chamadas à API</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {(data?.by_operation?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="size-4" />
              Consumo por operação
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operação</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.by_operation.map((op) => (
                  <TableRow key={op.operation}>
                    <TableCell className="font-medium">
                      {OP_LABELS[op.operation] || op.operation}
                    </TableCell>
                    <TableCell className="text-right">{Number(op.calls)}</TableCell>
                    <TableCell className="text-right">{formatTokens(Number(op.tokens))}</TableCell>
                    <TableCell className="text-right">{formatCost(Number(op.cost_usd))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(data?.daily?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Consumo diário</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.daily.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell>{dayjs(d.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell className="text-right">{Number(d.calls)}</TableCell>
                    <TableCell className="text-right">{formatTokens(Number(d.tokens))}</TableCell>
                    <TableCell className="text-right">{formatCost(Number(d.cost_usd))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(data?.recent?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Últimas chamadas</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Prompt</TableHead>
                    <TableHead className="text-right">Resposta</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data!.recent.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {dayjs(log.created_at).format('DD/MM HH:mm')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {OP_LABELS[log.operation] || log.operation}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.model}</TableCell>
                      <TableCell className="text-right text-xs">{log.prompt_tokens}</TableCell>
                      <TableCell className="text-right text-xs">{log.completion_tokens}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{log.total_tokens}</TableCell>
                      <TableCell className="text-right text-xs">{formatCost(Number(log.estimated_cost_usd))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum dado de consumo encontrado para o período selecionado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
