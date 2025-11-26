import { FC } from "react";
import { Card, Badge } from "@/components/ui/Layout";
import { CalendarIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import StockChart from "./stock-chart";
import { formatPercentage } from "@/utils/formatting";
import type { StockData } from "./stock-one-pager.types";

interface TechnicalAnalysisChartCardProps {
  technicalAnalysis: StockData["technical_analysis"];
  riskMetrics: StockData["risk_metrics"];
  shortWindow?: number;
  longWindow?: number;
}

const TechnicalAnalysisChartCard: FC<TechnicalAnalysisChartCardProps> = ({
  technicalAnalysis,
  riskMetrics,
  shortWindow = 50,
  longWindow = 200,
}) => {
  const chartData = technicalAnalysis.historical.map(point => ({
    date: point.date,
    price: point.close,
    sma_short: point.sma_short,
    sma_long: point.sma_long,
  }))

  return (
    <Card>
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-primary" />
          Price Chart
        </h3>
        <div className="flex gap-2">
          <Badge variant="neutral">
            {`SMA ${shortWindow}`}
          </Badge>
          <Badge variant="neutral">
            {`SMA ${longWindow}`}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <div className="h-[400px]">
          <StockChart historicalData={chartData} shortWindow={shortWindow} longWindow={longWindow} />
        </div>
      </div>
      <div className="p-4 border-t border-slate-100 flex justify-between text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          <span>1 Year Historical Data</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="font-medium">Volatility:</span>
            <span>{formatPercentage(riskMetrics.annual_volatility)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">Max Drawdown:</span>
            <span>{formatPercentage(riskMetrics.max_drawdown)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TechnicalAnalysisChartCard;
