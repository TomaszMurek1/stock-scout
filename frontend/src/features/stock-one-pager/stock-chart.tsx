import { useMemo } from "react";
import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import {
  calculateYAxisDomain,
  generateYAxisTicks,
  getMonthlyTicks,
  detectCrossovers,
  fillHistoricalData,
  formatDate,
  type HistoricalData,
} from "./stock-chart.helpers";
import { StockChartLegend } from "./stock-chart-legend";
import { StockChartTooltip } from "./stock-chart-tooltip";

interface StockChartProps {
  historicalData: HistoricalData[];
  shortWindow?: number;
  longWindow?: number;
}

export default function StockChart({
  historicalData,
  shortWindow = 50,
  longWindow = 200,
}: StockChartProps) {

  const finalData = fillHistoricalData(historicalData);

  const filteredData = useMemo(() => finalData, [finalData]);

  const { maxPrice, minPrice } = useMemo(() => {
    if (!filteredData.length) return { maxPrice: 0, minPrice: 0 };
    
    let min = Infinity;
    let max = -Infinity;

    for (const d of filteredData) {
      const values = [d.price];
      if (d.sma_short !== undefined) values.push(d.sma_short);
      if (d.sma_long !== undefined) values.push(d.sma_long);
      
      for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }

    return {
      maxPrice: max === -Infinity ? 0 : max,
      minPrice: min === Infinity ? 0 : min,
    };
  }, [filteredData]);

  const { niceMin: yAxisMin, niceMax: yAxisMax, step: yAxisStep } = calculateYAxisDomain(
    minPrice,
    maxPrice
  );

  const yAxisTicks = useMemo(
    () => generateYAxisTicks(yAxisMin, yAxisMax, yAxisStep),
    [yAxisMin, yAxisMax, yAxisStep]
  );

  const monthlyTicks = useMemo(
    () => getMonthlyTicks(filteredData),
    [filteredData]
  );

  const crossoverPoints = useMemo(
    () => detectCrossovers(filteredData),
    [filteredData]
  );

  const mergedData = filteredData.map((item) => {
    const crossover = crossoverPoints.find((c) => c.date === item.date);
    return {
      ...item,
      bullish: crossover?.bullish || null,
      bearish: crossover?.bearish || null,
    };
  });

  if (!filteredData.length) {
    return <div className="text-gray-500">No data available</div>;
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={mergedData}
          margin={{ top: 20, right: 0, bottom: 30, left: 10 }}
        >
          <CartesianGrid strokeOpacity={0.3} stroke="#99a1af" />
          <XAxis
            interval="preserveStartEnd"
            dataKey="date"
            ticks={monthlyTicks}
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: "#334155" }}
            axisLine={{ stroke: "#CBD5E1" }}
            tickMargin={10}
          />
          <YAxis
            interval={0}
            domain={[yAxisMin, yAxisMax]}
            ticks={yAxisTicks}
            tick={{ fontSize: 12, fill: "#334155" }}
            axisLine={{ stroke: "#CBD5E1" }}
            orientation="right"
            type="number"
          />
          <Tooltip content={<StockChartTooltip />} />
          <Legend content={<StockChartLegend />} verticalAlign="top" />

          {/* Stock Price Area - Blue */}
          <Area
            type="monotone"
            dataKey="price"
            fill="rgba(59,130,246,0.15)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            name="Stock Price"
            activeDot={{
              r: 6,
              stroke: "#2563EB",
              strokeWidth: 1,
              fill: "#3b82f6",
            }}
          />

          {/* SMA 50 - Teal */}
          <Area
            type="monotone"
            dataKey="sma_short"
            stroke="#0d9488"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            fill="none"
            name={`SMA ${shortWindow}`}
            dot={false}
            activeDot={false}
          />

          {/* SMA 200 - Orange */}
          <Area
            type="monotone"
            dataKey="sma_long"
            stroke="#ea580c"
            strokeDasharray="7 4"
            strokeWidth={1.5}
            fill="none"
            name={`SMA ${longWindow}`}
            dot={false}
            activeDot={false}
          />

          <Scatter
            dataKey="bullish"
            fill="#FFD700"
            stroke="#000000"
            strokeWidth={1.5}
            name="Golden Cross"
            shape="circle"
            r={6}
          />
          <Scatter
            dataKey="bearish"
            fill="#000000"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            name="Death Cross"
            shape="circle"
            r={6}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}