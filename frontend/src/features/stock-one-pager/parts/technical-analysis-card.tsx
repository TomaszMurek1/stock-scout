import { FC, useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/Layout";
import { RefreshedCard, RefreshedHeader } from "../components/refreshed-card";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import StockChart from "../components/stock-chart";
import type { StockData } from "../stock-one-pager.types";
import { subMonths, subYears, startOfYear, isAfter, parseISO } from "date-fns";
import { PeriodSelector, Period } from "../components/period-selector";
import { ChartMetrics } from "../components/chart-metrics";
import { GmmaSqueezeChart } from "@/features/scenario-carousel/scan-types/gmma-squeeze/gmma-squeeze-chart";
import { IGmmaChartDataPoint } from "@/features/scenario-carousel/scan-types/gmma-squeeze/gmma-squeeze-form.types";
import { apiClient } from "@/services/apiClient";
import { Loader2 } from "lucide-react";

type ChartMode = "sma" | "gmma";

interface TechnicalAnalysisChartCardProps {
  technicalAnalysis: StockData["technical_analysis"];
  riskMetrics: StockData["risk_metrics"];
  shortWindow?: number;
  longWindow?: number;
  isRefreshed?: boolean;
  ticker?: string;
}

const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const r = (prices[i] - prices[i - 1]) / prices[i - 1];
    returns.push(r);
  }

  const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
  const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize (assuming 252 trading days)
  return stdDev * Math.sqrt(252);
};

const calculateMaxDrawdown = (prices: number[]): number => {
  if (prices.length === 0) return 0;

  let maxPrice = prices[0];
  let maxDrawdown = 0;

  for (const price of prices) {
    if (price > maxPrice) {
      maxPrice = price;
    }
    const drawdown = (price - maxPrice) / maxPrice;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown; // This will be a negative number (e.g., -0.15 for 15% drop)
};

const ChartModeSelector: FC<{ mode: ChartMode; onSelect: (m: ChartMode) => void }> = ({ mode, onSelect }) => {
  const modes: { value: ChartMode; label: string }[] = [
    { value: "sma", label: "SMA" },
    { value: "gmma", label: "GMMA" },
  ];

  return (
    <div data-id="toggle-chart-mode" className="flex p-1 bg-slate-100 rounded-lg">
      {modes.map((m) => (
        <button
          key={m.value}
          data-id={`btn-chart-${m.value}`}
          onClick={() => onSelect(m.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
            mode === m.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};

const TechnicalAnalysisChartCard: FC<TechnicalAnalysisChartCardProps> = ({
  technicalAnalysis,
  shortWindow = 50,
  longWindow = 200,
  isRefreshed = false,
  ticker,
}) => {
  const [period, setPeriod] = useState<Period>("1Y");
  const [chartMode, setChartMode] = useState<ChartMode>("sma");

  // GMMA data — lazy-loaded on first switch
  const [gmmaData, setGmmaData] = useState<IGmmaChartDataPoint[] | null>(null);
  const [gmmaLoading, setGmmaLoading] = useState(false);
  const [gmmaError, setGmmaError] = useState<string | null>(null);

  useEffect(() => {
    if (chartMode !== "gmma" || !ticker || gmmaData) return;

    setGmmaLoading(true);
    setGmmaError(null);

    apiClient
      .get(`/technical-analysis/gmma-squeeze/chart/${ticker}`)
      .then((res) => setGmmaData(res.data.data))
      .catch((err) =>
        setGmmaError(err?.response?.data?.detail || "Failed to load GMMA chart data")
      )
      .finally(() => setGmmaLoading(false));
  }, [chartMode, ticker, gmmaData]);

  const fullData = useMemo(
    () =>
      technicalAnalysis.historical.map((point) => ({
        date: point.date,
        price: point.close,
        sma_short: point.sma_short,
        sma_long: point.sma_long,
      })),
    [technicalAnalysis.historical]
  );

  const filteredData = useMemo(() => {
    if (period === "All") return fullData;

    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case "1M":
        cutoffDate = subMonths(now, 1);
        break;
      case "1Q":
        cutoffDate = subMonths(now, 3);
        break;
      case "YTD":
        cutoffDate = startOfYear(now);
        break;
      case "1Y":
        cutoffDate = subYears(now, 1);
        break;
      default:
        cutoffDate = subYears(now, 1);
    }

    return fullData.filter((d) => isAfter(parseISO(d.date), cutoffDate));
  }, [fullData, period]);

  const { volatility, maxDrawdown, percentFromMin, percentFromMax, periodPerformance } = useMemo(() => {
    const prices = filteredData.map((d) => d.price);
    const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const startingPrice = prices.length > 0 ? prices[0] : 0;

    const pFromMin = minPrice > 0 ? (currentPrice - minPrice) / minPrice : 0;
    const pFromMax = maxPrice > 0 ? (currentPrice - maxPrice) / maxPrice : 0;
    const performance = startingPrice > 0 ? (currentPrice - startingPrice) / startingPrice : 0;

    return {
      volatility: calculateVolatility(prices),
      maxDrawdown: calculateMaxDrawdown(prices),
      percentFromMin: pFromMin,
      percentFromMax: pFromMax,
      periodPerformance: performance,
    };
  }, [filteredData]);

  const showGmma = chartMode === "gmma";

  return (
    <RefreshedCard isRefreshed={isRefreshed}>
      {/* Header Section */}
      <RefreshedHeader isRefreshed={isRefreshed} className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-t-xl transition-colors duration-1000">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-lg">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ChartBarIcon className="h-5 w-5 text-primary" />
          </div>
          Technical Analysis
        </h3>
        <div className="flex items-center gap-3">
          <ChartModeSelector mode={chartMode} onSelect={setChartMode} />
          {!showGmma && <PeriodSelector selectedPeriod={period} onSelect={setPeriod} />}
        </div>
      </RefreshedHeader>

      {/* Chart Section */}
      <div className={`px-5 transition-colors duration-1000 ${isRefreshed ? "bg-emerald-50/30" : "bg-white"}`}>
        {showGmma ? (
          /* GMMA Chart */
          <div className="py-4">
            {gmmaLoading && (
              <div data-id="gmma-loading" className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="animate-spin mr-3" size={24} />
                <span className="text-lg">Loading GMMA chart…</span>
              </div>
            )}
            {gmmaError && (
              <div data-id="gmma-error" className="text-center py-16">
                <p className="text-red-500 text-lg mb-2">⚠ {gmmaError}</p>
              </div>
            )}
            {gmmaData && ticker && <GmmaSqueezeChart data={gmmaData} ticker={ticker} />}
          </div>
        ) : (
          /* SMA Chart */
          <>
            <div className="flex gap-2 mb-4 justify-end">
              <Badge variant="neutral" className="bg-teal-50 text-teal-700 border-teal-100">
                {`SMA ${shortWindow}`}
              </Badge>
              <Badge variant="neutral" className="bg-orange-50 text-orange-700 border-orange-100">
                {`SMA ${longWindow}`}
              </Badge>
            </div>
            <div className="h-[400px] w-full">
              <StockChart
                historicalData={filteredData}
                shortWindow={shortWindow}
                longWindow={longWindow}
              />
            </div>
          </>
        )}
      </div>

      {/* Metrics Footer — only shown for SMA mode */}
      {!showGmma && (
        <div className={`px-5 pt-3 pb-5 border-t border-slate-100 rounded-b-xl transition-colors duration-1000 ${
            isRefreshed ? "bg-emerald-100/30" : "bg-slate-50/50"
        }`}>
          <ChartMetrics
            volatility={volatility}
            maxDrawdown={maxDrawdown}
            percentFromMin={percentFromMin}
            percentFromMax={percentFromMax}
            periodPerformance={periodPerformance}
          />
        </div>
      )}
    </RefreshedCard>
  );
};

export default TechnicalAnalysisChartCard;
