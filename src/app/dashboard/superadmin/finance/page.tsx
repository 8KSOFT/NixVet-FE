'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  DollarSign,
  Cpu,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { getStoredUserRole } from '@/lib/role-permissions';
import { API_PAGE_SIZE, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

type FinanceFilter =
  | 'all'
  | 'active'
  | 'overdue'
  | 'trial'
  | 'trial_expiring'
  | 'trial_expired'
  | 'suspended';

interface DashboardData {
  period: { from: string; to: string };
  kpis: {
    mrr_brl: number;
    revenue_period_brl: number;
    ai_cost_usd: number;
    ai_tokens: number;
    ai_calls: number;
    ai_cost_usd_period?: number;
    ai_calls_period?: number;
    ai_cost_usd_all_time?: number;
    ai_calls_all_time?: number;
    tenants_total: number;
    active: number;
    overdue: number;
    trial: number;
    trial_expiring: number;
    trial_expired: number;
    suspended: number;
  };
  monthly_revenue: Array<{ month: string; value_brl: number; payments: number }>;
  monthly_ai_cost: Array<{ month: string; cost_usd: number; tokens: number; calls: number }>;
  ai_by_operation: Array<{ operation: string; tokens: number; cost_usd: number; calls: number }>;
  top_ai_tenants: Array<{
    tenant_id: string;
    tenant_name: string;
    tenant_code: string;
    cost_usd: number;
    tokens: number;
    calls: number;
  }>;
}

interface FinanceTenantRow {
  id: string;
  name: string;
  code: string;
  admin_email: string | null;
  subscription_status: string | null;
  billing_plan: string | null;
  plan_value_brl: number;
  trial_ends_at: string | null;
  ai_cost_usd: number;
  ai_tokens: number;
  ai_calls: number;
  access_status: string;
}

const FILTER_TABS: { key: FinanceFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Pagantes' },
  { key: 'overdue', label: 'Inadimplentes' },
  { key: 'trial_expiring', label: 'Trial a vencer' },
  { key: 'trial', label: 'Em trial' },
  { key: 'trial_expired', label: 'Trial expirado' },
  { key: 'suspended', label: 'Suspensos' },
];

const PLAN_LABELS: Record<string, string> = {
  essencial: 'Essencial',
  clinica: 'Clínica',
  hospital: 'Hospital',
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  overdue: { label: 'Inadimplente', variant: 'destructive' },
  trial: { label: 'Trial', variant: 'secondary' },
  trial_expired: { label: 'Trial expirado', variant: 'destructive' },
  suspended: { label: 'Suspenso', variant: 'outline' },
};

const OP_LABELS: Record<string, string> = {
  'classify-intent': 'Classificação',
  'chatbot-reply': 'Chatbot',
  'suggest-replies': 'Sugestões',
  'summarize-notes': 'Resumo',
  'structure-observations': 'Estruturação',
};

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatUsd(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '$0.0000';
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(m) - 1]}/${y}`;
}

export default function SuperadminFinancePage() {
  const router = useRouter();
  const [from, setFrom] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(() => dayjs().endOf('month').format('YYYY-MM-DD'));
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(true);

  const [filter, setFilter] = useState<FinanceFilter>('all');
  const [tenants, setTenants] = useState<FinanceTenantRow[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const dateParams = {
    from: `${from}T00:00:00`,
    to: `${to}T23:59:59`,
  };

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const { data } = await api.get<DashboardData>('/superadmin/finance/dashboard', {
        params: dateParams,
      });
      setDashboard(data);
    } catch {
      toast.error('Falha ao carregar dashboard financeiro');
      setDashboard(null);
    } finally {
      setLoadingDash(false);
    }
  }, [from, to]);

  const loadTenants = useCallback(async () => {
    setLoadingTenants(true);
    try {
      const { data } = await api.get('/superadmin/finance/tenants', {
        params: listQueryParams(listPage, API_PAGE_SIZE, {
          filter,
          ...dateParams,
        }),
      });
      const p = parseListResponse<FinanceTenantRow>(data, listPage);
      setTenants(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch {
      toast.error('Falha ao carregar clínicas');
      setTenants([]);
    } finally {
      setLoadingTenants(false);
    }
  }, [filter, from, to, listPage]);

  useEffect(() => {
    if (getStoredUserRole() !== 'superadmin') {
      toast.error('Apenas superadmin pode acessar.');
      router.replace('/dashboard');
      return;
    }
    loadDashboard();
  }, [loadDashboard, router]);

  useEffect(() => {
    if (getStoredUserRole() !== 'superadmin') return;
    loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    setListPage(1);
  }, [filter, from, to]);

  const kpis = dashboard?.kpis;
  const refreshing = loadingDash || loadingTenants;
  const aiUsingAllTime =
    (kpis?.ai_calls_period ?? kpis?.ai_calls ?? 0) === 0 &&
    (kpis?.ai_calls_all_time ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <Wallet className="size-5" />
            Financeiro da plataforma
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assinaturas, receitas Asaas, custos de IA e status das clínicas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => {
            loadDashboard();
            loadTenants();
          }}
        >
          <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard
          icon={TrendingUp}
          label="MRR"
          value={formatBrl(kpis?.mrr_brl ?? 0)}
          sub="assinaturas ativas"
          color="text-green-600 bg-green-100"
        />
        <KpiCard
          icon={DollarSign}
          label="Recebido no período"
          value={formatBrl(kpis?.revenue_period_brl ?? 0)}
          sub="pagamentos Asaas"
          color="text-emerald-600 bg-emerald-100"
        />
        <KpiCard
          icon={Users}
          label="Pagantes"
          value={String(kpis?.active ?? 0)}
          sub={`de ${kpis?.tenants_total ?? 0} clínicas`}
          color="text-primary bg-primary/10"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Inadimplentes"
          value={String(kpis?.overdue ?? 0)}
          color="text-red-600 bg-red-100"
        />
        <KpiCard
          icon={Clock}
          label="Trial a vencer"
          value={String(kpis?.trial_expiring ?? 0)}
          sub="próx. 7 dias"
          color="text-amber-600 bg-amber-100"
        />
        <KpiCard
          icon={Cpu}
          label="Custo IA"
          value={formatUsd(kpis?.ai_cost_usd ?? 0)}
          sub={
            aiUsingAllTime
              ? `${formatTokens(kpis?.ai_tokens ?? 0)} tokens · ${kpis?.ai_calls ?? 0} chamadas (total histórico — fora do filtro)`
              : `${formatTokens(kpis?.ai_tokens ?? 0)} tokens · ${kpis?.ai_calls ?? 0} chamadas no período`
          }
          color="text-purple-600 bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">Entradas por mês (Asaas)</h2>
            {(dashboard?.monthly_revenue?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento no período.</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Pagamentos</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard!.monthly_revenue.map((r) => (
                    <TableRow className="border-b border-gray-300 h-15" key={r.month}>
                      <TableCell>{formatMonth(r.month)}</TableCell>
                      <TableCell className="text-right">{r.payments}</TableCell>
                      <TableCell className="text-right font-medium">{formatBrl(r.value_brl)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">Custo IA por mês</h2>
            {(dashboard?.monthly_ai_cost?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum uso de IA no período.</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard!.monthly_ai_cost.map((r) => (
                    <TableRow className="border-b border-gray-300 h-15" key={r.month}>
                      <TableCell>{formatMonth(r.month)}</TableCell>
                      <TableCell className="text-right">{r.calls}</TableCell>
                      <TableCell className="text-right">{formatTokens(r.tokens)}</TableCell>
                      <TableCell className="text-right">{formatUsd(r.cost_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">IA por operação</h2>
            {(dashboard?.ai_by_operation?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Operação</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard!.ai_by_operation.map((op) => (
                    <TableRow className="border-b border-gray-300 h-15" key={op.operation}>
                      <TableCell>{OP_LABELS[op.operation] || op.operation}</TableCell>
                      <TableCell className="text-right">{op.calls}</TableCell>
                      <TableCell className="text-right">{formatUsd(op.cost_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">Top clínicas — custo IA</h2>
            {(dashboard?.top_ai_tenants?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Clínica</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard!.top_ai_tenants.map((t) => (
                    <TableRow className="border-b border-gray-300 h-15" key={t.tenant_id}>
                      <TableCell>
                        <div className="font-medium">{t.tenant_name}</div>
                        <div className="text-xs text-muted-foreground">{t.tenant_code}</div>
                      </TableCell>
                      <TableCell className="text-right">{t.calls}</TableCell>
                      <TableCell className="text-right">{formatUsd(t.cost_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-sm font-semibold">Clínicas por status</h2>
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={filter === tab.key ? 'default' : 'outline'}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Clínica</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Trial até</TableHead>
                  <TableHead className="text-right">Chamadas IA</TableHead>
                  <TableHead className="text-right">Custo IA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTenants ? (
                  <TableRow>
                    <TableCell colSpan={7} className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                      Nenhuma clínica neste filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((row) => {
                    const st = STATUS_LABELS[row.access_status] ?? {
                      label: row.access_status,
                      variant: 'outline' as const,
                    };
                    return (
                      <TableRow className="border-b border-gray-300 h-15" key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.code}</div>
                        </TableCell>
                        <TableCell className="text-xs">{row.admin_email ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {row.billing_plan ? (
                            <span>
                              {PLAN_LABELS[row.billing_plan] || row.billing_plan}
                              {row.plan_value_brl > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({formatBrl(row.plan_value_brl)}/mês)
                                </span>
                              )}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {row.trial_ends_at
                            ? dayjs(row.trial_ends_at).format('DD/MM/YYYY')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">{row.ai_calls}</TableCell>
                        <TableCell className="text-right">{formatUsd(row.ai_cost_usd)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination
            page={listPage}
            totalPages={listTotalPages}
            total={listTotal}
            pageSize={API_PAGE_SIZE}
            onPageChange={setListPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  const [textColor, bgColor] = color.split(' ');
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`size-4 ${textColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight truncate">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
