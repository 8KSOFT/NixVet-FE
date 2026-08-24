'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DreChart({
  chartData,
  fmt,
  currencySymbol,
  grossRevenueLabel,
  ebitdaLabel,
}: {
  chartData: { name: string; receita: number; ebitda: number }[];
  fmt: (value: number) => string;
  currencySymbol: string;
  grossRevenueLabel: string;
  ebitdaLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          allowEscapeViewBox={{ x: false, y: false }}
          wrapperStyle={{ zIndex: 10 }}
          formatter={(v, name) => [fmt(Number(v)), name === 'receita' ? grossRevenueLabel : ebitdaLabel]}
        />
        <Bar dataKey="receita" fill="#3b82f6" radius={[3, 3, 0, 0]} name="receita" />
        <Bar dataKey="ebitda" fill="#22c55e" radius={[3, 3, 0, 0]} name="ebitda" />
      </BarChart>
    </ResponsiveContainer>
  );
}
