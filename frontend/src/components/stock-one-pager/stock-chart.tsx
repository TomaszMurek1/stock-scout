import { useMemo } from "react"
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
} from "recharts"
import { addDays, format, parseISO, startOfMonth, subYears } from "date-fns"

interface HistoricalData {
  date: string
  price: number
  sma50?: number
  sma200?: number
}

interface StockChartProps {
  historicalData: HistoricalData[]
  showLastYear?: boolean
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
  else if (range <= 5) step = 0.25;
  else if (range <= 10) step = 1;
  else if (range <= 25) step = 2.5;
  else if (range <= 50) step = 5
  else if (range <= 100) step = 10;
  else if (range <= 250) step = 25
  else step = 50;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  return { niceMin, niceMax, step };
};

const generateYAxisTicks = (min: number, max: number, step: number) => {
  const ticks = [];
  for (let tick = min; tick < max; tick += step) {
    ticks.push(Number(tick.toFixed(2)));
  }
  console.log(ticks)
  return ticks;
};

const getMonthlyTicks = (data: HistoricalData[]) => {
  const months = new Set();
  const monthlyTicks = data
    .filter((entry) => {
      const month = format(new Date(entry.date), "yyyy-MM");
      if (!months.has(month)) {
        months.add(month);
        return true;
      }
      return false;
    })
    .map((entry) => format(startOfMonth(new Date(entry.date)), "yyyy-MM-dd"));
  return monthlyTicks;
};
/**
 * Detect SMA50 / SMA200 crossovers and mark them.
 * If SMA50 crosses above SMA200 → Green dot (bullish)
 * If SMA50 crosses below SMA200 → Red dot (bearish)
 */
const detectCrossovers = (data: HistoricalData[]) => {
  const crossovers: { date: string; bullish?: number; bearish?: number }[] = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    if (prev.sma50 !== undefined && prev.sma200 !== undefined && curr.sma50 !== undefined && curr.sma200 !== undefined) {
      // Detect crossovers
      const wasBelow = prev.sma50 < prev.sma200;
      const isAbove = curr.sma50 > curr.sma200;

      const wasAbove = prev.sma50 > prev.sma200;
      const isBelow = curr.sma50 < curr.sma200;

      if (wasBelow && isAbove) {
        // Bullish crossover (Golden Cross)
        crossovers.push({ date: curr.date, bullish: curr.sma50 });
      } else if (wasAbove && isBelow) {
        // Bearish crossover (Death Cross)
        crossovers.push({ date: curr.date, bearish: curr.sma50 });
      }
    }
  }

  return crossovers;
};

const fillHistoricalData = (data: HistoricalData[]): HistoricalData[] => {
  if (data.length === 0) return [];

  const filledData: HistoricalData[] = [];
  let lastKnownPrice = data[0].price;
  let lastKnownSMA50 = data[0].sma50;
  let lastKnownSMA200 = data[0].sma200;

  let currentDate = parseISO(data[0].date);
  let lastIndex = 0;

  while (lastIndex < data.length) {
    const entry = data[lastIndex];
    const entryDate = parseISO(entry.date);

    while (currentDate < entryDate) {
      // Fill missing day with last known data
      filledData.push({
        date: format(currentDate, "yyyy-MM-dd"),
        price: lastKnownPrice,
        sma50: lastKnownSMA50,
        sma200: lastKnownSMA200,
      });

      // Move to next day
      currentDate = addDays(currentDate, 1);
    }

    // Add actual stock data entry
    filledData.push(entry);
    lastKnownPrice = entry.price;
    lastKnownSMA50 = entry.sma50;
    lastKnownSMA200 = entry.sma200;

    currentDate = addDays(entryDate, 1)
    lastIndex++
  }
  return filledData;
};

export default function StockChart({
  historicalData,
  showLastYear = true,
}: StockChartProps) {

  const finalData = fillHistoricalData(historicalData)

  const filteredData = useMemo(
    () => filterLastYearData(finalData, showLastYear),
    [finalData, showLastYear]
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
  console.log('yAxisTicks', yAxisTicks)

  const monthlyTicks = useMemo(() => getMonthlyTicks(filteredData), [filteredData]);

  const crossoverPoints = useMemo(() => detectCrossovers(filteredData), [filteredData]);

  const mergedData = filteredData.map((item) => {
    const crossover = crossoverPoints.find((c) => c.date === item.date);
    return {
      ...item,
      bullish: crossover?.bullish || null,
      bearish: crossover?.bearish || null, 
    };
  });

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={mergedData} margin={{ top: 20, right: 0, bottom: 20, left: 40 }}>
          <CartesianGrid strokeOpacity={0.3} stroke="#99a1af" />
          <XAxis
            interval={0}
            dataKey="date"
            ticks={monthlyTicks}
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: "#334155" }}
            axisLine={{ stroke: "#CBD5E1" }}
          />
          <YAxis
            interval={0}
            domain={[yAxisMin, yAxisMax]}
            ticks={yAxisTicks}
            //tickFormatter={priceFormatter}
            tick={{ fontSize: 12, fill: "#334155" }}
            axisLine={{ stroke: "#CBD5E1" }}
            orientation="right"
          />
          <Tooltip
            formatter={(value) => [`$${priceFormatter(Number(value))}`, ""]}
            labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#CBD5E1",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              color: "#1E293B", // Tailwind slate-800
              fontSize: "13px",
              padding: "8px 12px",
            }}
          />

          {/* Stock Price Area - Blue */}
          <Area
            type="monotone"
            dataKey="price"
            fill="rgba(59,130,246,0.15)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            name="Stock Price"
            activeDot={{ r: 6, stroke: "#2563EB", strokeWidth: 1, fill: "#3b82f6" }}
          />

          {/* SMA 50 - Teal */}
          <Area
            type="monotone"
            dataKey="sma50"
            stroke="#0d9488"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            fill="none"
            name="SMA 50"
            dot={false}
            activeDot={false}
          />

          {/* SMA 200 - Orange */}
          <Area
            type="monotone"
            dataKey="sma200"
            stroke="#ea580c"
            strokeDasharray="7 4"
            strokeWidth={1.5}
            fill="none"
            name="SMA 200"
            dot={false}
            activeDot={false}
          />

          <Scatter
            dataKey="bullish"
            fill="#22c55e"
            stroke="#ffffff"
            strokeWidth={1.5}
            name="Golden Cross"
            shape="circle"
            r={6}
          />
          <Scatter
            dataKey="bearish"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={1.5}
            name="Death Cross"
            shape="circle"
            r={6}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconSize={10}
            iconType="circle"
            wrapperStyle={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#334155",
              paddingBottom: "12px",
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

