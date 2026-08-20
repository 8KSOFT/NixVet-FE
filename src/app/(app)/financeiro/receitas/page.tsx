'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';
import { useCurrencyFormatter } from '@/lib/i18n/currency';

interface RevenueBySource {
  particular: number;
  health_plan: number;
}

const COLORS = ['#3b82f6', '#22c55e'];

type PieLabelPayload = {
  name?: string;
  percent?: number;
};

function formatPieLabel(payload: PieLabelPayload): string {
  return `${payload.name ?? ''} (${((payload.percent ?? 0) * 100).toFixed(0)}%)`;
}

function ReceitasPageContent() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const now = new Date();
  const [period, setPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [data, setData] = useState<RevenueBySource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<RevenueBySource>(`/financial-reports/receitas?period=${period}`)
      .then((r) => setData(r.data))
      .catch((error: unknown) => toast.error(getApiErrorMessage(error, t('financeiroReceitas.loadError'))))
      .finally(() => setLoading(false));
  }, [period, t]);

  const total = (data?.particular ?? 0) + (data?.health_plan ?? 0);
  const chartData = data
    ? [
        { name: t('financeiroReceitas.particular'), value: data.particular },
        { name: t('financeiroReceitas.healthPlan'), value: data.health_plan },
      ]
    : [];

  const periods = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('financeiroReceitas.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('financeiroReceitas.subtitle')}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              {period} <ChevronDown className="ml-2 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {periods.map((p) => (
              <DropdownMenuItem key={p} onClick={() => setPeriod(p)}>{p}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('financeiroReceitas.total'), value: total, color: 'text-foreground' },
          { label: t('financeiroReceitas.particular'), value: data?.particular ?? 0, color: 'text-blue-600' },
          { label: t('financeiroReceitas.healthPlan'), value: data?.health_plan ?? 0, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-7 w-32" /> : <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('financeiroReceitas.distribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" outerRadius="70%" dataKey="value" label={formatPieLabel}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReceitasPage() {
  const { t } = useTranslation();
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature={t('financeiroReceitas.title')}>
      <ReceitasPageContent />
    </PlanUpgradeGate>
  );
}
