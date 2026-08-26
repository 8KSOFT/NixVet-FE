'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
import { getStoredUserRole } from '@/lib/role-permissions';
import { planShortLabel } from '@/lib/plans';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import {
  useSuperadminFinanceDashboardQuery,
  useSuperadminFinanceTenantsQuery,
} from '@/hooks/apiHooks/useSuperadminFinance';
import type { FinanceFilter } from '@/app/types/superadmin-finance';
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
import { useCurrencyFormatter } from '@/lib/i18n/currency';

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
  const label = dayjs(`${ym}-01`).format('MMM/YYYY');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function SuperadminFinancePage() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const router = useRouter();

  const FILTER_TABS: { key: FinanceFilter; label: string }[] = [
    { key: 'all', label: t('superadminFinance.filters.all') },
    { key: 'active', label: t('superadminFinance.filters.active') },
    { key: 'overdue', label: t('superadminFinance.filters.overdue') },
    { key: 'trial_expiring', label: t('superadminFinance.filters.trialExpiring') },
    { key: 'trial', label: t('superadminFinance.filters.trial') },
    { key: 'trial_expired', label: t('superadminFinance.filters.trialExpired') },
    { key: 'suspended', label: t('superadminFinance.filters.suspended') },
  ];

  const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    active: { label: t('superadminFinance.status.active'), variant: 'default' },
    overdue: { label: t('superadminFinance.status.overdue'), variant: 'destructive' },
    trial: { label: t('superadminFinance.status.trial'), variant: 'secondary' },
    trial_expired: { label: t('superadminFinance.status.trialExpired'), variant: 'destructive' },
    suspended: { label: t('superadminFinance.status.suspended'), variant: 'outline' },
  };

  const OP_LABELS: Record<string, string> = {
    'classify-intent': t('superadminFinance.operations.classifyIntent'),
    'chatbot-reply': t('superadminFinance.operations.chatbotReply'),
    'suggest-replies': t('superadminFinance.operations.suggestReplies'),
    'summarize-notes': t('superadminFinance.operations.summarizeNotes'),
    'structure-observations': t('superadminFinance.operations.structureObservations'),
  };

  const [from, setFrom] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(() => dayjs().endOf('month').format('YYYY-MM-DD'));
  const [filter, setFilter] = useState<FinanceFilter>('all');
  const [listPage, setListPage] = useState(1);

  const fromParam = `${from}T00:00:00`;
  const toParam = `${to}T23:59:59`;

  const {
    data: dashboard,
    isLoading: loadingDash,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useSuperadminFinanceDashboardQuery(fromParam, toParam);
  const {
    data: tenantsData,
    isLoading: loadingTenants,
    isError: tenantsError,
    refetch: refetchTenants,
  } = useSuperadminFinanceTenantsQuery(filter, fromParam, toParam, listPage);
  const tenants = tenantsData?.items ?? [];
  const listTotal = tenantsData?.total ?? 0;
  const listTotalPages = tenantsData?.totalPages ?? 1;

  useEffect(() => {
    if (getStoredUserRole() !== 'superadmin') {
      toast.error(t('superadminFinance.toasts.forbidden'));
      router.replace('/dashboard');
    }
  }, [router, t]);

  useEffect(() => {
    if (dashboardError) toast.error(t('superadminFinance.toasts.dashboardLoadError'));
  }, [dashboardError, t]);

  useEffect(() => {
    if (tenantsError) toast.error(t('superadminFinance.toasts.tenantsLoadError'));
  }, [tenantsError, t]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <Wallet className="size-5" />
            {t('superadminFinance.header.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('superadminFinance.header.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="w-full sm:w-auto"
          onClick={() => {
            void refetchDashboard();
            void refetchTenants();
          }}
        >
          <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t('superadminFinance.header.refresh')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="w-full space-y-1 sm:w-auto">
          <Label className="text-xs text-muted-foreground">{t('superadminFinance.filters.from')}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" />
        </div>
        <div className="w-full space-y-1 sm:w-auto">
          <Label className="text-xs text-muted-foreground">{t('superadminFinance.filters.to')}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          icon={TrendingUp}
          label={t('superadminFinance.kpis.mrr.label')}
          value={fmt(kpis?.mrr_brl ?? 0)}
          sub={t('superadminFinance.kpis.mrr.sub')}
          color="text-green-600 bg-green-100"
        />
        <KpiCard
          icon={DollarSign}
          label={t('superadminFinance.kpis.revenuePeriod.label')}
          value={fmt(kpis?.revenue_period_brl ?? 0)}
          sub={t('superadminFinance.kpis.revenuePeriod.sub')}
          color="text-emerald-600 bg-emerald-100"
        />
        <KpiCard
          icon={Users}
          label={t('superadminFinance.kpis.paying.label')}
          value={String(kpis?.active ?? 0)}
          sub={t('superadminFinance.kpis.paying.sub', { count: kpis?.tenants_total ?? 0 })}
          color="text-primary bg-primary/10"
        />
        <KpiCard
          icon={AlertTriangle}
          label={t('superadminFinance.kpis.overdue.label')}
          value={String(kpis?.overdue ?? 0)}
          color="text-red-600 bg-red-100"
        />
        <KpiCard
          icon={Clock}
          label={t('superadminFinance.kpis.trialExpiring.label')}
          value={String(kpis?.trial_expiring ?? 0)}
          sub={t('superadminFinance.kpis.trialExpiring.sub')}
          color="text-amber-600 bg-amber-100"
        />
        <KpiCard
          icon={Cpu}
          label={t('superadminFinance.kpis.aiCost.label')}
          value={formatUsd(kpis?.ai_cost_usd ?? 0)}
          sub={
            aiUsingAllTime
              ? t('superadminFinance.kpis.aiCost.subAllTime', {
                  tokens: formatTokens(kpis?.ai_tokens ?? 0),
                  calls: kpis?.ai_calls ?? 0,
                })
              : t('superadminFinance.kpis.aiCost.subPeriod', {
                  tokens: formatTokens(kpis?.ai_tokens ?? 0),
                  calls: kpis?.ai_calls ?? 0,
                })
          }
          color="text-purple-600 bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-3">{t('superadminFinance.monthlyRevenue.title')}</h2>
            {(dashboard?.monthly_revenue?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t('superadminFinance.monthlyRevenue.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t('superadminFinance.monthlyRevenue.columns.month')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.monthlyRevenue.columns.payments')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.monthlyRevenue.columns.value')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard!.monthly_revenue.map((r) => (
                    <TableRow className="border-b border-gray-300 h-15" key={r.month}>
                      <TableCell>{formatMonth(r.month)}</TableCell>
                      <TableCell className="text-right">{r.payments}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(r.value_brl)}</TableCell>
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
            <h2 className="text-sm font-semibold mb-3">{t('superadminFinance.monthlyAiCost.title')}</h2>
            {(dashboard?.monthly_ai_cost?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t('superadminFinance.monthlyAiCost.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t('superadminFinance.monthlyAiCost.columns.month')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.monthlyAiCost.columns.calls')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.monthlyAiCost.columns.tokens')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.monthlyAiCost.columns.usd')}</TableHead>
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
            <h2 className="text-sm font-semibold mb-3">{t('superadminFinance.aiByOperation.title')}</h2>
            {(dashboard?.ai_by_operation?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t('superadminFinance.aiByOperation.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t('superadminFinance.aiByOperation.columns.operation')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.aiByOperation.columns.calls')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.aiByOperation.columns.usd')}</TableHead>
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
            <h2 className="text-sm font-semibold mb-3">{t('superadminFinance.topAiTenants.title')}</h2>
            {(dashboard?.top_ai_tenants?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t('superadminFinance.topAiTenants.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t('superadminFinance.topAiTenants.columns.clinic')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.topAiTenants.columns.calls')}</TableHead>
                    <TableHead className="text-right">{t('superadminFinance.topAiTenants.columns.usd')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard!.top_ai_tenants.map((row) => (
                    <TableRow className="border-b border-gray-300 h-15" key={row.tenant_id}>
                      <TableCell>
                        <div className="font-medium">{row.tenant_name}</div>
                        <div className="text-xs text-muted-foreground">{row.tenant_code}</div>
                      </TableCell>
                      <TableCell className="text-right">{row.calls}</TableCell>
                      <TableCell className="text-right">{formatUsd(row.cost_usd)}</TableCell>
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
          <h2 className="text-sm font-semibold">{t('superadminFinance.clinicsByStatus')}</h2>
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

          {loadingTenants ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              {t('superadminFinance.loading')}
            </div>
          ) : tenants.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              {t('superadminFinance.emptyFilterList')}
            </div>
          ) : (
            <>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('superadminFinance.table.clinic')}</TableHead>
                      <TableHead>{t('superadminFinance.table.admin')}</TableHead>
                      <TableHead>{t('superadminFinance.table.status')}</TableHead>
                      <TableHead>{t('superadminFinance.table.plan')}</TableHead>
                      <TableHead>{t('superadminFinance.table.trialUntil')}</TableHead>
                      <TableHead className="text-right">{t('superadminFinance.table.aiCalls')}</TableHead>
                      <TableHead className="text-right">{t('superadminFinance.table.aiCost')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((row) => {
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
                                {planShortLabel(row.billing_plan)}
                                {row.plan_value_brl > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({fmt(row.plan_value_brl)}{t('superadminFinance.table.perMonthSuffix')})
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
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {tenants.map((row) => {
                  const st = STATUS_LABELS[row.access_status] ?? {
                    label: row.access_status,
                    variant: 'outline' as const,
                  };
                  return (
                    <div key={row.id} className="rounded-lg border border-gray-300 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.code}</p>
                        </div>
                        <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">{t('superadminFinance.table.admin')}</p>
                          <p className="truncate">{row.admin_email ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('superadminFinance.table.plan')}</p>
                          <p>
                            {row.billing_plan ? (
                              <>
                                {planShortLabel(row.billing_plan)}
                                {row.plan_value_brl > 0 && (
                                  <span className="text-xs text-muted-foreground"> ({fmt(row.plan_value_brl)}/mês)</span>
                                )}
                              </>
                            ) : (
                              '—'
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('superadminFinance.table.trialUntil')}</p>
                          <p>{row.trial_ends_at ? dayjs(row.trial_ends_at).format('DD/MM/YYYY') : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('superadminFinance.table.aiCalls')}</p>
                          <p>{row.ai_calls}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('superadminFinance.table.aiCost')}</p>
                          <p>{formatUsd(row.ai_cost_usd)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

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
          <p className="text-lg font-bold leading-tight wrap-break-word">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
