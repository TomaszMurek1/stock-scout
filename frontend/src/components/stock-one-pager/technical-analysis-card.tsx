import { FC, useState, useMemo } from "react";
import { Card, Badge } from "@/components/ui/Layout";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import StockChart from "./stock-chart";
import type { StockData } from "./stock-one-pager.types";
import { subMonths, subYears, startOfYear, isAfter, parseISO } from "date-fns";
import { PeriodSelector, Period } from "./period-selector";
import { ChartMetrics } from "./chart-metrics";

interface TechnicalAnalysisChartCardProps {
  technicalAnalysis: StockData["technical_analysis"];
  riskMetrics: StockData["risk_metrics"];
  shortWindow?: number;
  longWindow?: number;
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

const TechnicalAnalysisChartCard: FC<TechnicalAnalysisChartCardProps> = ({
  technicalAnalysis,
  shortWindow = 50,
  longWindow = 200,
}) => {
  const [period, setPeriod] = useState<Period>("1Y");

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

  const { volatility, maxDrawdown, percentFromMin, percentFromMax } = useMemo(() => {
    const prices = filteredData.map((d) => d.price);
    const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const pFromMin = minPrice > 0 ? (currentPrice - minPrice) / minPrice : 0;
    const pFromMax = maxPrice > 0 ? (currentPrice - maxPrice) / maxPrice : 0;

    return {
      volatility: calculateVolatility(prices),
      maxDrawdown: calculateMaxDrawdown(prices),
      percentFromMin: pFromMin,
      percentFromMax: pFromMax,
    };
  }, [filteredData]);

  return (
    <Card>
      {/* Header Section */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white rounded-t-xl">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-lg">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ChartBarIcon className="h-5 w-5 text-primary" />
          </div>
          Technical Analysis
        </h3>
        <PeriodSelector selectedPeriod={period} onSelect={setPeriod} />
      </div>

      {/* Chart Section */}
      <div className="px-5 bg-white">
        <div className="h-[400px] w-full">
          <StockChart
            historicalData={filteredData}
            shortWindow={shortWindow}
            longWindow={longWindow}
          />
        </div>
      </div>

      {/* Metrics Footer */}
      <div className="px-5 pb-5 bg-slate-50/50 border-t border-slate-100 rounded-b-xl">
        <ChartMetrics
          volatility={volatility}
          maxDrawdown={maxDrawdown}
          percentFromMin={percentFromMin}
          percentFromMax={percentFromMax}
        />
      </div>
    </Card>
  );
};

export default TechnicalAnalysisChartCard;
