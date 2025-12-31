import { FC, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  Area,
} from "recharts";
import { formatCompactCurrencyValue } from "./metric-helpers";
import type { FinancialTrends } from "./stock-one-pager.types";
import { format, parseISO } from "date-fns";

interface GrowthChartProps {
  trends: FinancialTrends;
  currency?: string | null;
}

export const GrowthChart: FC<GrowthChartProps> = ({ trends, currency }) => {
  const data = useMemo(() => {
    // Prefer quarterly data for better granularity, fallback to annual
    const source = trends.quarterly?.revenue?.length ? trends.quarterly : trends.annual;
    if (!source || !source.revenue) return [];

    // Create a map to merge metrics by date
    const merged = new Map<string, any>();

    // Helper to add metric to the map
    const addMetric = (key: string, items: any[]) => {
      if (!items) return;
      items.forEach((item) => {
        const dateKey = item.date || String(item.year);
        if (!merged.has(dateKey)) {
          merged.set(dateKey, { date: dateKey, originalDate: item.date, year: item.year });
        }
        const entry = merged.get(dateKey);
        entry[key] = item.value;
      });
    };

    addMetric("revenue", source.revenue);
    addMetric("net_income", source.net_income);
    addMetric("fcf", source.free_cash_flow);
    addMetric("ebitda", source.ebitda);

    // Convert to array and sort
    return Array.from(merged.values()).sort((a, b) => {
        if (a.originalDate && b.originalDate) {
            return new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime();
        }
        return a.year - b.year;
    });
  }, [trends]);

  if (!data.length) return <div className="text-slate-300 text-center py-10">No growth data available.</div>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Growth Trend</p>
          <h3 className="text-xl font-bold text-slate-900">Revenue & Profitability</h3>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#64748b" 
            fontSize={12}
            tickFormatter={(val) => {
                // If it looks like a date (YYYY-MM-DD), format it
                if (val.includes("-")) {
                    try {
                        return format(parseISO(val), "MMM yy");
                    } catch { return val; }
                }
                return val;
            }}
            tickMargin={10}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(v) => formatCompactCurrencyValue(v, currency)}
            width={60}
            axisLine={false}
            tickLine={false}
          />
          <ReTooltip
            labelFormatter={(label) => {
                 if (String(label).includes("-")) {
                    try {
                        return format(parseISO(String(label)), "MMMM d, yyyy");
                    } catch { return label; }
                }
                return `Year ${label}`;
            }}
            formatter={(value: number, name: string) => [
                formatCompactCurrencyValue(value, currency),
                name === "revenue" ? "Revenue" :
                name === "net_income" ? "Net Income" :
                name === "fcf" ? "Free Cash Flow" :
                name === "ebitda" ? "EBITDA" : name
            ]}
            contentStyle={{ 
                backgroundColor: "#ffffff", 
                borderRadius: "8px", 
                border: "1px solid #e2e8f0", 
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" 
            }}
            cursor={{ fill: "#f8fafc" }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          
          {/* Revenue as Area/Bar for background context */}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Revenue"
          />

          {/* Profitability metrics as lines */}
          <Line
            type="monotone"
            dataKey="ebitda"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            name="EBITDA"
          />
          <Line
            type="monotone"
            dataKey="net_income"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Net Income"
          />
          <Line
            type="monotone"
            dataKey="fcf"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            name="Free Cash Flow"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
