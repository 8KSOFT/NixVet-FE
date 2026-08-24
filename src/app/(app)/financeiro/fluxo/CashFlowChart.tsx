'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { TFunction } from 'i18next';

interface CashFlowChartPoint {
  name: string;
  entrada: number;
  saida: number;
  saldo: number;
}

export default function CashFlowChart({
  chartData,
  fmt,
  t,
  currencySymbol,
}: {
  chartData: CashFlowChartPoint[];
  fmt: (value: number) => string;
  t: TFunction;
  currencySymbol: string;
}) {
  /**
   * Tooltip compacta e com largura travada — a caixa padrão do Recharts
   * calcula a posição só depois de medir o próprio tamanho, então
   * `allowEscapeViewBox` sozinho ainda deixa escapar por um frame perto da
   * borda. Largura fixa pequena + o wrapper com overflow-hidden (abaixo)
   * garantem que nunca force scroll horizontal da página, mesmo perto do
   * canto direito do gráfico.
   */
  const renderTooltip = ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div className="w-40 rounded-md border border-slate-200 bg-white p-2 text-xs shadow-md">
        <p className="mb-1 font-semibold text-slate-700">{label}</p>
        {payload.map((entry) => {
          const key = entry.name === 'entrada' ? 'tooltipInflow' : entry.name === 'saida' ? 'tooltipOutflow' : 'tooltipCumulativeBalance';
          return (
            <p key={String(entry.name)} className="flex justify-between gap-2" style={{ color: entry.color }}>
              <span className="truncate">{t(`financeiroFluxo.${key}`)}</span>
              <span className="shrink-0 tabular-nums">{fmt(Math.abs(Number(entry.value)))}</span>
            </p>
          );
        })}
      </div>
    );
  };

  return (
    // overflow-hidden é a trava final: mesmo se o Recharts calcular mal a
    // posição perto da borda, o vazamento fica clipado aqui dentro em vez
    // de forçar scroll horizontal da página.
    <div className="overflow-hidden">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} stackOffset="sign" margin={{ left: 0, right: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currencySymbol}${(Number(v) / 1000).toFixed(0)}k`} />
          <Tooltip allowEscapeViewBox={{ x: false, y: false }} content={renderTooltip} />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
          <Bar dataKey="entrada" stackId="mov" fill="#22c55e" name="entrada" />
          <Bar dataKey="saida" stackId="mov" fill="#ef4444" name="saida" />
          <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={false} name="saldo" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
