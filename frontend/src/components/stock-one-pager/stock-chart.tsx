import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";

// Formatting date for better readability
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

// Dynamically format price labels based on value range
const getPriceFormatter = (prices) => {
  const maxPrice = Math.max(...prices);
  if (maxPrice < 5) return (price) => price.toFixed(2); // 2 decimals if all values < 5
  if (maxPrice < 10) return (price) => price.toFixed(1); // 1 decimal if all values < 10
  return (price) => price.toFixed(0); // No decimals otherwise
};

// Function to filter historical data (default to last year)
const filterLastYearData = (data, showLastYear = true) => {
  if (!showLastYear) return data; // Show all if parameter is false
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return data.filter((d) => new Date(d.date) >= oneYearAgo);
};

const StockChart = ({ historicalData, showLastYear = true }) => {
  if (!historicalData || historicalData.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  // Filter data if showLastYear is enabled
  const filteredData = filterLastYearData(historicalData, showLastYear);

  // Extract price values & determine decimal formatting
  const prices = filteredData.map((d) => d.price);
  const priceFormatter = getPriceFormatter(prices);

  // Calculate min & max prices
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const yAxisMin = Math.floor(minPrice * 0.98);
  const yAxisMax = Math.ceil(maxPrice * 1.02);

  return (
    <div className="w-full h-80 bg-gray-50 p-4 rounded-lg border">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
          {/* Grid for better readability */}
          <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.5} />
          
          {/* X-Axis with properly formatted dates */}
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate} 
            angle={-20} 
            textAnchor="end" 
            tick={{ fontSize: 12, fill: "#555" }}
          />
          
          {/* Y-Axis with dynamic decimal formatting */}
          <YAxis 
            domain={[yAxisMin, yAxisMax]} 
            tickFormatter={priceFormatter} 
            tick={{ fontSize: 12, fill: "#555" }} 
          />
          
          {/* Tooltip for interactive data display */}
          <Tooltip formatter={priceFormatter} />
          
          {/* Legend to identify different lines */}
          <Legend verticalAlign="top" />

          {/* Area below price line (transparent) */}
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#2563eb" 
            fill="rgba(37, 99, 235, 0.2)" // Blue with 20% transparency
            fillOpacity={0.3} 
          />

          {/* Stock Price Line - Polished */}
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#2563eb" 
            strokeWidth={2}  
            dot={{ r: 0 }}  
            activeDot={{ r: 4 }}  
            name="Stock Price"
          />

          {/* SMA 50 Line - Dashed for subtle difference */}
          <Line 
            type="monotone" 
            dataKey="sma50" 
            stroke="#16a34a" 
            strokeWidth={1.8} 
            strokeDasharray="5 5"
            dot={false}  
            name="SMA 50"
          />

          {/* SMA 200 Line - Dashed for subtle difference */}
          <Line 
            type="monotone" 
            dataKey="sma200" 
            stroke="#dc2626" 
            strokeWidth={1.8} 
            strokeDasharray="3 3"
            dot={false}  
            name="SMA 200"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
