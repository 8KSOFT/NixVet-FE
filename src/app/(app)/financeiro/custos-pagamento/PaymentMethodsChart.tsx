'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

type PieLabelPayload = {
  name?: string;
  percent?: number;
};

function formatPieLabel(payload: PieLabelPayload): string {
  return `${payload.name ?? ''} (${((payload.percent ?? 0) * 100).toFixed(0)}%)`;
}

export default function PaymentMethodsChart({
  chartData,
  isMobile,
  fmt,
}: {
  chartData: { name: string; value: number }[];
  isMobile: boolean;
  fmt: (value: number) => string;
}) {
  return (
    <div className="overflow-hidden">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="60%"
            dataKey="value"
            label={isMobile ? false : formatPieLabel}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            allowEscapeViewBox={{ x: false, y: false }}
            wrapperStyle={{ zIndex: 10 }}
            formatter={(v) => fmt(Number(v))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
