import { FC } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";
import { formatCompactCurrencyValue } from "./metric-helpers";
import type { FinancialTrends } from "./stock-one-pager.types";

interface GrowthChartProps {
  trends: FinancialTrends;
  currency?: string | null;
}

export const GrowthChart: FC<GrowthChartProps> = ({ trends, currency }) => {
  const data = (trends?.revenue || [])
    .map((rev, idx) => ({
      year: rev.year,
      revenue: rev.value,
      net_income: trends.net_income?.[idx]?.value,
      fcf: trends.free_cash_flow?.[idx]?.value,
      ebitda: trends.ebitda?.[idx]?.value,
    }))
    .sort((a, b) => a.year - b.year);

  if (!data.length) return <div className="text-slate-300">No history available.</div>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-slate-600">Growth over time</p>
          <p className="text-lg font-semibold text-slate-900">Profitability & Growth Trend</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" stroke="#475569" />
          <YAxis
            stroke="#475569"
            tickFormatter={(v) => formatCompactCurrencyValue(v, currency)}
            width={80}
          />
          <ReTooltip
            labelFormatter={(label) => `Year ${label}`}
            formatter={(value: number, name) => [formatCompactCurrencyValue(value, currency), name]}
            contentStyle={{ background: "#fff", border: "1px solid #cbd5e1", color: "#0f172a" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Revenue"
          />
          <Line
            type="monotone"
            dataKey="net_income"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            name="Net Income"
          />
          <Line
            type="monotone"
            dataKey="fcf"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={false}
            name="Free Cash Flow"
          />
          <Line
            type="monotone"
            dataKey="ebitda"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name="EBITDA"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
