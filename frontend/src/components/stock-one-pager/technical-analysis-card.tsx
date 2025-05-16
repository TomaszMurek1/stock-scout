import { FC } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import StockChart from "./stock-chart";
import { formatPercentage } from "@/utils/formatting";
import type { StockData } from "./stock-one-pager.types";

interface TechnicalAnalysisChartCardProps {
  technicalAnalysis: StockData["technical_analysis"];
  executiveSummary: StockData["executive_summary"];
  riskMetrics: StockData["risk_metrics"];
  shortWindow?: number;
  longWindow?: number;
}

const TechnicalAnalysisChartCard: FC<TechnicalAnalysisChartCardProps> = ({
  technicalAnalysis,
  executiveSummary,
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
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-primary" />
            Price Chart
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {`SMA ${shortWindow}`}
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              {`SMA ${longWindow}`}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <StockChart historicalData={chartData} shortWindow={shortWindow} longWindow={longWindow} />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-gray-500 border-t pt-4">
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
      </CardFooter>
    </Card>
  );
};

export default TechnicalAnalysisChartCard;
