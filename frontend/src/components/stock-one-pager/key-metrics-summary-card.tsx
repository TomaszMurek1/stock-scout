import { FC } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TagIcon } from "@heroicons/react/24/outline";
import type { StockData } from "./stock-one-pager.types";
import { formatPercentage } from "@/utils/formatting";

interface KeyMetricsSummaryCardProps {
  valuationMetrics: StockData["valuation_metrics"];
  investorMetrics: StockData["investor_metrics"];
  financialPerformance: StockData["financial_performance"];
}

const KeyMetricsSummaryCard: FC<KeyMetricsSummaryCardProps> = ({
  valuationMetrics,
  investorMetrics,
  financialPerformance,
}) => (
  <Card className="border-gray-200 shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
        <TagIcon className="h-5 w-5 text-primary" />
        Key Metrics
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">P/E Ratio</p>
          <p className="text-lg font-semibold">
            {valuationMetrics.pe_ratio?.toFixed(2) || "N/A"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">EV/EBITDA</p>
          <p className="text-lg font-semibold">
            {valuationMetrics.ev_ebitda?.toFixed(2) || "N/A"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Revenue Growth</p>
          <p className={`text-lg font-semibold ${investorMetrics.revenue_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
            {investorMetrics.revenue_growth.toFixed(2)}%
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Gross Margin</p>
          <p className="text-lg font-semibold">
            {formatPercentage(financialPerformance.gross_margin)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Net Margin</p>
          <p className="text-lg font-semibold">
            {formatPercentage(financialPerformance.net_margin)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">Rule of 40</p>
          <p className={`text-lg font-semibold ${investorMetrics.rule_of_40 >= 40 ? "text-green-600" : "text-amber-600"}`}>
            {investorMetrics.rule_of_40.toFixed(2)}%
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default KeyMetricsSummaryCard;
