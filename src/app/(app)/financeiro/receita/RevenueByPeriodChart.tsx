'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function RevenueByPeriodChart({
  data,
  fmt,
  currencySymbol,
  grossLabel,
  netLabel,
}: {
  data: { date: string; gross: number; net: number }[];
  fmt: (value: number) => string;
  currencySymbol: string;
  grossLabel: string;
  netLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${currencySymbol}${Number(v).toFixed(0)}`} />
        <Tooltip
          allowEscapeViewBox={{ x: false, y: false }}
          wrapperStyle={{ zIndex: 10 }}
          formatter={(value) => fmt(Number(value))}
        />
        <Legend />
        <Bar dataKey="gross" name={grossLabel} fill="#3b82f6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="net" name={netLabel} fill="#22c55e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
