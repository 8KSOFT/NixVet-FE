'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e'];

type PieLabelPayload = {
  name?: string;
  percent?: number;
};

function formatPieLabel(payload: PieLabelPayload): string {
  return `${payload.name ?? ''} (${((payload.percent ?? 0) * 100).toFixed(0)}%)`;
}

export default function RevenueDistributionChart({
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
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="60%"
            dataKey="value"
            label={isMobile ? false : formatPieLabel}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
