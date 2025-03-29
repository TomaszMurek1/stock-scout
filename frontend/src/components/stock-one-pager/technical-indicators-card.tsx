import { FC } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import type { StockData } from "./stock-one-pager.types";

interface TechnicalIndicatorsCardProps {
  technicalAnalysis: StockData["technical_analysis"];
}

const TechnicalIndicatorsCard: FC<TechnicalIndicatorsCardProps> = ({ technicalAnalysis }) => (
  <Card className="border-gray-200 shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
        <ChartBarIcon className="h-5 w-5 text-primary" />
        Technical Indicators
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Momentum (30d)</span>
            <span className={`text-sm font-medium ${technicalAnalysis.momentum_30d >= 0 ? "text-green-600" : "text-red-600"}`}>
              {technicalAnalysis.momentum_30d}%
            </span>
          </div>
          <Progress
            value={50 + technicalAnalysis.momentum_30d}
            className="h-2"
            indicatorClassName={technicalAnalysis.momentum_30d >= 0 ? "bg-green-500" : "bg-red-500"}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Momentum (90d)</span>
            <span className={`text-sm font-medium ${technicalAnalysis.momentum_90d >= 0 ? "text-green-600" : "text-red-600"}`}>
              {technicalAnalysis.momentum_90d}%
            </span>
          </div>
          <Progress
            value={50 + technicalAnalysis.momentum_90d / 2}
            className="h-2"
            indicatorClassName={technicalAnalysis.momentum_90d >= 0 ? "bg-green-500" : "bg-red-500"}
          />
        </div>

        <div className="space-y-2">
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
            <Badge variant={technicalAnalysis.golden_cross ? "success" : "outline"}>
              {technicalAnalysis.golden_cross ? "Yes" : "No"}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Death Cross</span>
            <Badge variant={technicalAnalysis.death_cross ? "destructive" : "outline"}>
              {technicalAnalysis.death_cross ? "Yes" : "No"}
            </Badge>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default TechnicalIndicatorsCard;
