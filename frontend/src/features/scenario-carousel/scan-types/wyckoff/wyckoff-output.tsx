import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export interface IWyckoffScore {
  criterion: string;
  score: number;
  narrative: string;
}

export interface IWyckoffData {
  ticker: string;
  name: string;
  overall_score: number;
  scores: IWyckoffScore[];
  current_price: number;
  range_low: number;
  range_high: number;
  phase_detected: string;
  chart_data: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}

const ScoreBar = ({ label, score, narrative }: { label: string; score: number; narrative: string }) => {
  const getColorClass = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    if (score >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <span className="text-xs font-bold text-slate-800">{score.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`${getColorClass(score)} h-2 rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-slate-600 mt-1 italic">{narrative}</p>
    </div>
  );
};

const WyckoffCard = ({ stock }: { stock: IWyckoffData }) => {
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when card is in viewport
  useEffect(() => {
    const currentRef = cardRef.current;
    if (!currentRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Only observe once
          }
        });
      },
      { rootMargin: '100px' } // Start loading 100px before entering viewport
    );

    observer.observe(currentRef);
    return () => observer.disconnect();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  // Only render chart when card is visible OR expanded
  const shouldRenderChart = isVisible || expanded;

  return (
    <div ref={cardRef} className="flex flex-col bg-white p-6 rounded-lg border border-slate-300 shadow-sm">
      {/* Header */}
      <Link
        to={`/stock-details/${stock.ticker}`}
        className="flex items-center justify-between mb-4 hover:opacity-80 transition"
      >
        <div>
          <div className="font-bold text-xl" title={stock.name}>
            {stock.name} <span className="text-slate-500 font-normal text-lg">({stock.ticker})</span>
          </div>
          <div className="text-sm text-slate-600 mt-1">
            Phase: <span className="font-semibold">{stock.phase_detected}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor(stock.overall_score)}`}>
            {stock.overall_score.toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500">Overall Score</div>
        </div>
      </Link>

      {/* Price Info */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="text-slate-500 text-xs">Current Price</div>
          <div className="font-semibold">${stock.current_price.toFixed(2)}</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="text-slate-500 text-xs">Support</div>
          <div className="font-semibold text-green-600">${stock.range_low?.toFixed(2) || 'N/A'}</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="text-slate-500 text-xs">Resistance</div>
          <div className="font-semibold text-red-600">${stock.range_high?.toFixed(2) || 'N/A'}</div>
        </div>
      </div>

      {/* Score Details Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3 font-medium"
      >
        {expanded ? (
          <>
            <ChevronUp size={16} /> Hide Score Details
          </>
        ) : (
          <>
            <ChevronDown size={16} /> Show Score Details
          </>
        )}
      </button>

      {/* Expandable Score Details */}
      {expanded && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-semibold text-sm mb-3 text-slate-800">Individual Criterion Scores</h4>
          {stock.scores.map((scoreItem, idx) => (
            <ScoreBar
              key={idx}
              label={scoreItem.criterion}
              score={scoreItem.score}
              narrative={scoreItem.narrative}
            />
          ))}
        </div>
      )}

      {/* Chart - Only render when visible or expanded */}
      {shouldRenderChart && stock.chart_data && stock.chart_data.length > 0 && (
        <div className="h-80 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stock.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`colorPrice-${stock.ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <YAxis 
                yAxisId="price"
                domain={['auto', 'auto']}
                tick={{ fontSize: 11 }}
                stroke="#64748b"
              />
              <YAxis 
                yAxisId="volume"
                orientation="right"
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  borderColor: '#334155', 
                  color: '#f8fafc',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              
              {/* Support Level */}
              {stock.range_low && (
                <ReferenceLine 
                  yAxisId="price"
                  y={stock.range_low} 
                  stroke="#22c55e" 
                  strokeDasharray="4 2"
                  strokeWidth={2}
                  label={{ 
                    position: 'insideBottomLeft', 
                    value: `Support: $${stock.range_low.toFixed(2)}`, 
                    fontSize: 11, 
                    fill: '#22c55e', 
                    fontWeight: 600 
                  }}
                />
              )}
              
              {/* Resistance Level */}
              {stock.range_high && (
                <ReferenceLine 
                  yAxisId="price"
                  y={stock.range_high} 
                  stroke="#ef4444" 
                  strokeDasharray="4 2"
                  strokeWidth={2}
                  label={{ 
                    position: 'insideTopLeft', 
                    value: `Resistance: $${stock.range_high.toFixed(2)}`, 
                    fontSize: 11, 
                    fill: '#ef4444', 
                    fontWeight: 600 
                  }}
                />
              )}

              {/* Volume Bars */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#94a3b8"
                opacity={0.3}
                name="Volume"
              />
              
              {/* Price Area */}
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#colorPrice-${stock.ticker})`}
                name="Price"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Show placeholder when chart not loaded yet */}
      {!shouldRenderChart && stock.chart_data && stock.chart_data.length > 0 && (
        <div className="h-80 w-full mt-4 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
          <p>Chart will load when scrolled into view</p>
        </div>
      )}
    </div>
  );
};

export const WyckoffOutput = ({ results }: { results: IWyckoffData[] }) => {
  if (results.length === 0) return null;

  return (
    <div className="mt-8 bg-slate-100 p-6 rounded-lg border border-slate-200 shadow">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">
        Accumulation Candidates ({results.length} found)
      </h3>
      <div className="flex flex-col space-y-6">
        {results.map((stock) => (
          <WyckoffCard key={stock.ticker} stock={stock} />
        ))}
      </div>
    </div>
  );
};
