'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, DollarSign, TrendingDown, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { useRevenueAnalysisQuery } from '@/hooks/apiHooks/useFinancialReports';
import { useHealthPlansListQuery } from '@/hooks/apiHooks/useHealthPlans';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';
import { useCurrencyFormatter, CURRENCY_BY_LANGUAGE, resolveAppLanguage } from '@/lib/i18n/currency';

function today() {
  return new Date().toISOString().substring(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
}

function ReceitaLiquidaPageContent() {
  const { t, i18n } = useTranslation();
  const fmt = useCurrencyFormatter();
  const currencySymbol = CURRENCY_BY_LANGUAGE[resolveAppLanguage(i18n.language)].symbol;
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [healthPlanId, setHealthPlanId] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({ from: firstOfMonth(), to: today(), healthPlanId: 'all' });
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: plans = [] } = useHealthPlansListQuery();
  const {
    data,
    isLoading: loading,
    error,
  } = useRevenueAnalysisQuery(appliedFilters.from, appliedFilters.to, appliedFilters.healthPlanId);

  useEffect(() => {
    if (error) toast.error(getApiErrorMessage(error, t('financeiroReceita.loadError')));
  }, [error, t]);

  const fetchData = () => {
    setAppliedFilters({ from, to, healthPlanId });
  };

  const sortedItems = data
    ? [...data.items].sort((a, b) => (sortDir === 'desc' ? b.net_amount - a.net_amount : a.net_amount - b.net_amount))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('financeiroReceita.title')}</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="w-full sm:w-auto">
              <p className="text-xs text-muted-foreground mb-1">{t('financeiroReceita.fromLabel')}</p>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div className="w-full sm:w-auto">
              <p className="text-xs text-muted-foreground mb-1">{t('financeiroReceita.toLabel')}</p>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div className="w-full sm:w-auto">
              <p className="text-xs text-muted-foreground mb-1">{t('financeiroReceita.healthPlanLabel')}</p>
              <Select value={healthPlanId} onValueChange={setHealthPlanId}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('financeiroReceita.allOption')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('financeiroReceita.allOption')}</SelectItem>
                  <SelectItem value="particular">{t('financeiroReceita.particularOption')}</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-primary sm:w-auto" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('financeiroReceita.applyButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {data && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {t('financeiroReceita.grossRevenue')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(data.summary.gross_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> {t('financeiroReceita.cost')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{fmt(data.summary.total_cost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" /> {t('financeiroReceita.netRevenue')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{fmt(data.summary.net_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-500" /> {t('financeiroReceita.margin')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-500">{data.summary.margin_pct.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico por período */}
          {data.by_period.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('financeiroReceita.chartTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.by_period}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currencySymbol}${Number(v).toFixed(0)}`} />
                    <Tooltip
                      allowEscapeViewBox={{ x: false, y: false }}
                      wrapperStyle={{ zIndex: 10 }}
                      formatter={(value) => fmt(Number(value))}
                    />
                    <Legend />
                    <Bar dataKey="gross" name={t('financeiroReceita.grossRevenue')} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="net" name={t('financeiroReceita.netRevenue')} fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabela breakdown */}
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">{t('financeiroReceita.tableTitle')}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:self-auto"
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              >
                {t('financeiroReceita.netRevenue')} {sortDir === 'desc' ? '↓' : '↑'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {sortedItems.length === 0 ? (
                <p className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                  {t('financeiroReceita.emptyState')}
                </p>
              ) : (
                <>
                  {/* Desktop: tabela de 6 colunas */}
                  <div className="hidden md:block">
                    <Table className="min-w-full border-collapse bg-white text-sm">
                      <TableHeader>
                        <TableRow className="border-b border-gray-300 h-15">
                          <TableHead>{t('financeiroReceita.tableHeaderItem')}</TableHead>
                          <TableHead>{t('financeiroReceita.tableHeaderType')}</TableHead>
                          <TableHead className="text-right">{t('financeiroReceita.tableHeaderCharged')}</TableHead>
                          <TableHead className="text-right">{t('financeiroReceita.tableHeaderCost')}</TableHead>
                          <TableHead className="text-right">{t('financeiroReceita.tableHeaderNet')}</TableHead>
                          <TableHead>{t('financeiroReceita.tableHeaderSource')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedItems.map((item, i) => (
                          <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={i}>
                            <TableCell className="font-medium">{item.description ?? '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.item_type}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{fmt(item.charged_amount)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{fmt(item.cost_amount)}</TableCell>
                            <TableCell
                              className={`text-right font-semibold ${item.net_amount >= 0 ? 'text-green-600' : 'text-red-500'}`}
                            >
                              {fmt(item.net_amount)}
                            </TableCell>
                            <TableCell>
                              {item.payment_source === 'particular' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  {t('financeiroReceita.particularOption')}
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                  {item.health_plan_name ?? t('financeiroReceita.healthPlanLabel')}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="space-y-2 p-4 md:hidden">
                    {sortedItems.map((item, i) => (
                      <div key={i} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.description ?? '—'}</span>
                          <Badge variant="outline" className="shrink-0">{item.item_type}</Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {item.payment_source === 'particular' ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              {t('financeiroReceita.particularOption')}
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                              {item.health_plan_name ?? t('financeiroReceita.healthPlanLabel')}
                            </Badge>
                          )}
                          <span className={`text-sm font-semibold tabular-nums ${item.net_amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {fmt(item.net_amount)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t('financeiroReceita.tableHeaderCharged')}: {fmt(item.charged_amount)}</span>
                          <span>{t('financeiroReceita.tableHeaderCost')}: {fmt(item.cost_amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ReceitaLiquidaPage() {
  const { t } = useTranslation();
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature={t('financeiroReceita.featureName')}>
      <ReceitaLiquidaPageContent />
    </PlanUpgradeGate>
  );
}
