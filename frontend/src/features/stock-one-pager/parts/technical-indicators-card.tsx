import { FC } from "react";
import { Card } from "@/components/ui/Layout";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { StockData } from "../stock-one-pager.types";
import { RefreshedCard, RefreshedHeader } from "../components/refreshed-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface TechnicalIndicatorsCardProps {
  technicalAnalysis: StockData["technical_analysis"];
  isRefreshed?: boolean;
}

const TechnicalIndicatorsCard: FC<TechnicalIndicatorsCardProps> = ({
  technicalAnalysis,
  isRefreshed = false,
}) => (
  <RefreshedCard isRefreshed={isRefreshed}>
    <RefreshedHeader isRefreshed={isRefreshed} className="p-4 border-b border-slate-100">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <ChartBarIcon className="h-5 w-5 text-primary" />
        Technical Indicators
      </h3>
    </RefreshedHeader>
    <div className="p-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Volatility (30d)</span>
            <span className="text-sm font-medium">
              {technicalAnalysis.volatility_30d}%
            </span>
          </div>
          <Progress
            value={Math.min(technicalAnalysis.volatility_30d * 5, 100)}
            className="h-2"
            indicatorClassName="bg-amber-500"
          />
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Golden Cross</span>
            <Badge variant={technicalAnalysis.golden_cross ? "success" : "default"}>
              {technicalAnalysis.golden_cross ? "Yes" : "No"}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Death Cross</span>
            <Badge variant={technicalAnalysis.death_cross ? "danger" : "default"}>
              {technicalAnalysis.death_cross ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

  </RefreshedCard>
);

export default TechnicalIndicatorsCard;
