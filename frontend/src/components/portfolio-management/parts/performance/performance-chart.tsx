import { FC, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays, subMonths, subYears, startOfYear, parseISO } from "date-fns";
import { Card } from "@/components/ui/Layout";
import { useAppStore } from "@/store/appStore";
import { PeriodSelector } from "@/components/stock-one-pager/period-selector";
import { apiClient } from "@/services/apiClient";

// Reuse the Period type from existing selector
type Period = "1M" | "1Q" | "YTD" | "1Y" | "All";

interface ValuationPoint {
  date: string;
  total: string;
  by_stock: string;
  by_etf: string;
  by_bond: string;
  by_crypto: string;
  by_commodity: string;
  by_cash: string;
  net_contributions: string;
}

interface ValuationSeriesResponse {
  portfolio_id: number;
  points: ValuationPoint[];
}

const PerformanceChart: FC = () => {
  const portfolio = useAppStore((state) => state.portfolio);
  const [period, setPeriod] = useState<Period>("1Y");
  const [data, setData] = useState<ValuationPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!portfolio?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let start: Date;

        // Calculate start date based on period
        switch (period) {
          case "1M":
            start = subMonths(now, 1);
            break;
          case "1Q":
            start = subMonths(now, 3);
            break;
          case "YTD":
            start = startOfYear(now);
            break;
          case "1Y":
            start = subYears(now, 1);
            break;
          case "All":
            start = subYears(now, 10); // Or handled by backend logic if needed
            break;
          default:
            start = subMonths(now, 1);
        }

        const formattedStart = format(start, "yyyy-MM-dd");
        const formattedEnd = format(now, "yyyy-MM-dd");

        const res = await apiClient.get<ValuationSeriesResponse>(`valuation/series`, {
          params: {
            portfolio_id: portfolio.id,
            start: formattedStart,
            end: formattedEnd,
            carry_forward: true,
            include_breakdown: true,
          },
        });

        setData(res.data.points);
      } catch (error) {
        console.error("Failed to fetch valuation series:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [portfolio?.id, period]);

  // Transform data for Recharts (convert strings to numbers)
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateFormatted: format(parseISO(d.date), "MMM d"),
      total: parseFloat(d.total),
      Stocks: parseFloat(d.by_stock),
      ETFs: parseFloat(d.by_etf),
      Bonds: parseFloat(d.by_bond),
      Crypto: parseFloat(d.by_crypto),
      Commodities: parseFloat(d.by_commodity),
      Cash: parseFloat(d.by_cash),
    }));
  }, [data]);

  if (!portfolio) return null;

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Portfolio Value Over Time</h3>
          <p className="text-sm text-slate-500">Asset allocation history</p>
        </div>
        <PeriodSelector selectedPeriod={period} onSelect={setPeriod} />
      </div>

      <div className="h-[400px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">Loading chart data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStocks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                {/* Add gradients for others if needed */}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="dateFormatted" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: "#64748b", fontSize: 12 }} 
                minTickGap={30}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: "#64748b", fontSize: 12 }} 
                tickFormatter={(value) => `$${value.toLocaleString()}`} // Assuming USD, could use portfolio.currency
              />
              <Tooltip 
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                formatter={(value: number, name: string) => [`$${value.toLocaleString(undefined, {minimumFractionDigits: 2})}`, name]}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              
              {/* Dynamically render only active asset classes */}
              {[
                { key: "Cash", color: "#10b981", id: "colorCash" },
                { key: "Bonds", color: "#f59e0b" },
                { key: "Commodities", color: "#d97706" },
                { key: "Crypto", color: "#8b5cf6" },
                { key: "ETFs", color: "#6366f1" },
                { key: "Stocks", color: "#3b82f6", id: "colorStocks" },
              ].map((asset) => {
                 // Check if this asset has any non-zero value in the dataset
                 const hasData = chartData.some((point) => (point[asset.key as keyof typeof point] as number) > 0);
                 if (!hasData) return null;

                 return (
                    <Area
                      key={asset.key}
                      type="monotone"
                      dataKey={asset.key}
                      stackId="1"
                      stroke={asset.color}
                      fill={asset.id ? `url(#${asset.id})` : asset.color}
                      fillOpacity={asset.id ? 1 : 0.6}
                    />
                 );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default PerformanceChart;
