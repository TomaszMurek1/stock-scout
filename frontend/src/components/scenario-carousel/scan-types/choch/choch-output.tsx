import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Link } from "react-router-dom";

export interface IChochData {
  ticker: string;
  name: string;
  price: number;
  broken_level: number;
  level_date: string;
  date: string;
  lowest_low?: number;
  lowest_low_date?: string;
  scan_start_date?: string;
  chart_data?: { date: string; close: number; high: number }[];
}

export const ChochOutput = ({ results }: { results: IChochData[] }) => {
  if (results.length === 0) return null;

  return (
    <div className="mt-8 bg-slate-100 p-6 rounded-lg border border-slate-200 shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">
        Scan Results (Bearish to Bullish CHoCH)
      </h3>
      <div className="flex flex-col space-y-6">
        {results.map((stock) => (
          <div
            key={stock.ticker}
            className="flex flex-col bg-white p-4 rounded-lg border border-slate-300 shadow-sm"
          >
            <Link
              to={`/stock-details/${stock.ticker}`}
              className="flex items-center justify-between mb-4 hover:opacity-80 transition"
            >
              <div>
                <div className="font-bold text-lg" title={stock.name}>
                    {stock.name} <span className="text-slate-500 font-normal text-base">({stock.ticker})</span>
                </div>
              </div>
              <div className="text-right text-sm">
                 <div className="font-semibold text-green-700">
                   +{(stock.price - stock.broken_level).toFixed(2)} ({((stock.price - stock.broken_level) / stock.broken_level * 100).toFixed(2)}%)
                 </div>
                 <div className="text-slate-500">
                   Price: <strong>{stock.price.toFixed(2)}</strong>
                 </div>
              </div>
            </Link>
            
            <div className="text-xs text-slate-500 mb-2 flex justify-between">
                 <span>Broke LH: <strong>{stock.broken_level.toFixed(2)}</strong> (from {stock.level_date})</span>
                 {stock.lowest_low && (
                    <span>Lowest Low: <strong>{stock.lowest_low.toFixed(2)}</strong> (from {stock.lowest_low_date})</span>
                 )}
            </div>

            {stock.chart_data && stock.chart_data.length > 0 && (
              <div className="h-64 w-full mt-4 relative">
                
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stock.chart_data} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`colorClose-${stock.ticker}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                        dataKey="date" 
                        hide 
                    />
                    <YAxis 
                        domain={['auto', 'auto']} 
                        hide 
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            borderColor: '#334155', 
                            color: '#f8fafc',
                            borderRadius: '6px',
                            fontSize: '11px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#f8fafc' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value: number) => [value.toFixed(2), "Price"]}
                    />
                    <ReferenceLine 
                        y={stock.broken_level} 
                        stroke="#ef4444" 
                        strokeDasharray="4 2" 
                        strokeWidth={1}
                        label={{ position: 'insideTopRight', value: 'RESISTANCE (LH)', fontSize: 11, fill: '#b62525ff', fontWeight: 600, dy: -3 }}
                    />
                    {stock.lowest_low && (
                      <ReferenceLine 
                          y={stock.lowest_low} 
                          stroke="#22c55e" 
                          strokeDasharray="4 2" 
                          strokeWidth={1}
                          label={{ position: 'insideBottomRight', value: 'SUPPORT (LL)', fontSize: 11, fill: '#22c55e', fontWeight: 600, dy: 3 }}
                      />
                    )}
                     {stock.scan_start_date && (
                      <ReferenceLine 
                          x={stock.scan_start_date} 
                          stroke="#94a3b8" 
                          strokeDasharray="3 3" 
                          label={{ position: 'insideTopLeft', value: 'SCAN START', fontSize: 11, fill: '#94a3b8', angle: -90, dx: 5, dy: 75 }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#colorClose-${stock.ticker})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
