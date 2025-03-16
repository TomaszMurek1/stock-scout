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
import { format, subYears, parseISO } from "date-fns";

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
//const formatMonth = (dateString: string) => format(new Date(dateString), "MMM");

// Single function for decimal formatting based on max price
const getPriceFormatter = (maxPrice: number) => {
  if (maxPrice < 5) return (price: number) => price.toFixed(2);
  if (maxPrice < 10) return (price: number) => price.toFixed(1);
  return (price: number) => price.toFixed(0);
};

// Filter data to last year
const filterLastYearData = (data: HistoricalData[], showLastYear: boolean) => {
  if (!showLastYear) return data;
  const oneYearAgo = subYears(new Date(), 1);
  return data.filter((d) => new Date(d.date) >= oneYearAgo);
};

// Calculate nice rounded Y-axis min/max and step
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


// Generate Y-axis ticks
const generateYAxisTicks = (min: number, max: number, step: number) => {
  const ticks = [];
  for (let tick = min; tick <= max; tick += step) {
    ticks.push(Number(tick.toFixed(2)));
  }
  return ticks;
};

// Ensure exactly one tick per month on X-axis
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

export default function StockChart({
  historicalData,
  showLastYear = true,
}: StockChartProps) {
  if (!historicalData.length) {
    return <div className="text-gray-500">No data available</div>;
  }

  // Filter data
  const filteredData = filterLastYearData(historicalData, showLastYear);

  // Extract price values
  const prices = filteredData.map((d) => d.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);

  const priceFormatter = getPriceFormatter(maxPrice);
  const [yAxisMin, yAxisMax, yAxisStep] = (() => {
    const domain = calculateYAxisDomain(minPrice, maxPrice);
    return [domain.niceMin, domain.niceMax, domain.step];
  })();

  const yAxisTicks = generateYAxisTicks(yAxisMin, yAxisMax, yAxisStep);
  const monthlyTicks = getMonthlyTicks(filteredData);

  return (
    <div className="w-full h-80 bg-gray-50 p-4 rounded-lg border">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />

          {/* X-Axis: Exactly one label per month */}
          <XAxis
            dataKey="date"
            ticks={monthlyTicks}
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: "#555" }}
          />

          {/* Dynamically scaled Y-axis with nice rounded increments */}
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            ticks={generateYAxisTicks(yAxisMin, yAxisMax, yAxisStep)}
            tickFormatter={priceFormatter}
            tick={{ fontSize: 12, fill: "#555" }}
          />

          <Tooltip formatter={(value) => priceFormatter(Number(value))} />
          <Legend verticalAlign="top" />

          {/* Price area */}
          <Area
            type="monotone"
            dataKey="price"
            fill="rgba(37,99,235,0.3)"
            stroke="#2563eb"
            strokeWidth={1.5}
            name="Stock Price"
          />

          <Area
            type="monotone"
            dataKey="sma50"
            stroke="#16a34a"
            strokeDasharray="5 5"
            strokeWidth={1.8}
            fill="none"
            dot={false}
            name="SMA 50"
          />

          <Area
            type="monotone"
            dataKey="sma200"
            stroke="#dc2626"
            strokeDasharray="3 3"
            strokeWidth={1.8}
            fill="none"
            dot={false}
            name="SMA 200"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}


