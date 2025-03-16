import React, { useMemo } from "react";
import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  ResponsiveContainer,
} from "recharts";
import { format, subYears } from "date-fns";

interface HistoricalData {
  date: string;
  price: number;
  sma50?: number;
  sma200?: number;
}

interface StockChartProps {
  historicalData: HistoricalData[];
  showLastYear?: boolean;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", { month: "short" });

const getPriceFormatter = (maxPrice: number) => {
  if (maxPrice < 5) return (price: number) => price.toFixed(2);
  if (maxPrice < 10) return (price: number) => price.toFixed(1);
  return (price: number) => price.toFixed(0);
};

const filterLastYearData = (data: HistoricalData[], showLastYear: boolean) => {
  if (!showLastYear) return data;
  const oneYearAgo = subYears(new Date(), 1);
  return data.filter((d) => new Date(d.date) >= oneYearAgo);
};

const calculateYAxisDomain = (min: number, max: number) => {
  const range = max - min;
  let step: number;

  if (range <= 1) step = 0.1;
  else if (range <= 5) step = 0.5;
  else if (range <= 10) step = 1;
  else if (range <= 25) step = 2.5;
  else if (range <= 50) step = 5;
  else if (range <= 100) step = 10;
  else if (range <= 250) step = 25;
  else step = 50;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  return { niceMin, niceMax, step };
};

const generateYAxisTicks = (min: number, max: number, step: number) => {
  const ticks = [];
  for (let tick = min; tick <= max; tick += step) {
    ticks.push(Number(tick.toFixed(2)));
  }
  return ticks;
};

const getMonthlyTicks = (data: HistoricalData[]) => {
  const months = new Set();
  return data
    .filter((entry) => {
      const month = format(new Date(entry.date), "yyyy-MM");
      if (!months.has(month)) {
        months.add(month);
        return true;
      }
      return false;
    })
    .map((entry) => entry.date);
};

export default function StockChart({
  historicalData,
  showLastYear = true,
}: StockChartProps) {
  const filteredData = useMemo(
    () => filterLastYearData(historicalData, showLastYear),
    [historicalData, showLastYear]
  );

  const { maxPrice, minPrice } = useMemo(() => {
    const prices = filteredData.map((d) => d.price);
    return {
      maxPrice: Math.max(...prices),
      minPrice: Math.min(...prices),
    };
  }, [filteredData]);

  if (!filteredData.length) {
    return <div className="text-gray-500">No data available</div>;
  }

  const priceFormatter = getPriceFormatter(maxPrice);
  const { niceMin: yAxisMin, niceMax: yAxisMax, step: yAxisStep } = calculateYAxisDomain(
    minPrice,
    maxPrice
  );

  const yAxisTicks = useMemo(() => generateYAxisTicks(yAxisMin, yAxisMax, yAxisStep), [
    yAxisMin,
    yAxisMax,
    yAxisStep,
  ]);

  const monthlyTicks = useMemo(() => getMonthlyTicks(filteredData), [filteredData]);

  return (
    <div className="w-full h-80 bg-gray-50 p-4 rounded-lg border shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            ticks={monthlyTicks}
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: "#374151" }} // Tailwind gray-700
          />
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            ticks={yAxisTicks}
            tickFormatter={priceFormatter}
            tick={{ fontSize: 12, fill: "#374151" }} // Tailwind gray-700
          />
          <Tooltip formatter={(value) => priceFormatter(Number(value))} />
          <Legend verticalAlign="top" />

          {/* Stock Price Area - Blue */}
          <Area
            type="monotone"
            dataKey="price"
            fill="rgba(59,130,246,0.3)" // Tailwind blue-500 (soft)
            stroke="#3b82f6" // Tailwind blue-500
            strokeWidth={2}
            name="Stock Price"
          />

          {/* SMA 50 - Teal (instead of green for accessibility) */}
          <Area
            type="monotone"
            dataKey="sma50"
            stroke="#0f766e" // Tailwind teal-600 (high contrast)
            strokeDasharray="5 5" // Dotted for differentiation
            strokeWidth={2}
            fill="none"
            dot={false}
            name="SMA 50"
          />

          {/* SMA 200 - Orange (instead of red for accessibility) */}
          <Area
            type="monotone"
            dataKey="sma200"
            stroke="#fb923c" // Tailwind orange-600
            strokeDasharray="7 4" // Dashed for differentiation
            strokeWidth={2}
            fill="none"
            dot={false}
            name="SMA 200"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
