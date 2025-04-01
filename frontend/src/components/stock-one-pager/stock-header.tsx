import { FC, useState } from "react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  HeartIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { StockData } from "./stock-one-pager.types";
import { formatCurrency } from "@/utils/formatting";

interface StockHeaderProps {
  ticker: string | undefined;
  executiveSummary: StockData["executive_summary"];
  companyOverview: StockData["company_overview"];
  technicalAnalysis: StockData["technical_analysis"];
  riskMetrics: StockData["risk_metrics"];
}

const StockHeader: FC<StockHeaderProps> = ({
  ticker,
  executiveSummary,
  companyOverview,
  technicalAnalysis,
  riskMetrics,
}) => {
  const logoUrl = `https://financialmodelingprep.com/image-stock/${ticker}.png`;
  const [isLogoAvailable, setIsLogoAvailable] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  const prices = technicalAnalysis.stock_prices;
  const latestPrice = prices.length ? prices[prices.length - 1].close : null;

  const getPriceChange = (): { value: number; percentage: number } => {
    if (prices.length < 2) return { value: 0, percentage: 0 };
    const latest = prices[prices.length - 1].close;
    const previous = prices[prices.length - 2].close;
    const change = latest - previous;
    const percentage = (change / previous) * 100;
    return { value: change, percentage };
  };

  const priceChange = getPriceChange();

  const closePrices = prices.map((p) => p.close);
  const min52Week = Math.min(...closePrices);
  const max52Week = Math.max(...closePrices);
  const currentInRange =
    latestPrice && max52Week - min52Week !== 0
      ? ((latestPrice - min52Week) / (max52Week - min52Week)) * 100
      : 0;

  return (
    <div className="mb-6 p-6 rounded-xl bg-white shadow-md border border-gray-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {isLogoAvailable && (
            <div className="flex-shrink-0 hidden md:block">
              <img
                src={logoUrl || "/placeholder.svg"}
                alt={`${executiveSummary?.name} logo`}
                className="w-20 h-20 object-contain bg-gray-100 rounded-lg p-2"
                onError={() => setIsLogoAvailable(false)}
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {executiveSummary?.name}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className={isFavorite ? "text-red-500" : "text-gray-400"}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <HeartIcon className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="font-medium text-gray-700">
                {executiveSummary?.ticker}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                {companyOverview?.sector}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              >
                {companyOverview?.industry}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-6 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <GlobeAltIcon className="h-4 w-4" />
                <a
                  href={companyOverview?.website ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {companyOverview?.website?.replace("https://", "")}
                </a>
              </div>
              <div className="flex items-center gap-1">
                <BuildingOfficeIcon className="h-4 w-4" />
                <span>{companyOverview?.country}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-3xl md:text-4xl font-bold text-gray-900">
            {latestPrice !== null &&
              formatCurrency(latestPrice, executiveSummary?.currency)}
          </div>
          <div
            className={`flex items-center gap-1 text-lg ${
              priceChange.value >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {priceChange.value >= 0 ? (
              <ArrowTrendingUpIcon className="h-5 w-5" />
            ) : (
              <ArrowTrendingDownIcon className="h-5 w-5" />
            )}
            <span>
              {latestPrice !== null &&
                formatCurrency(priceChange.value, executiveSummary?.currency)}
            </span>
            <span>({priceChange.percentage.toFixed(2)}%)</span>
          </div>
          <div className="mt-3 w-full max-w-[200px]">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{formatCurrency(min52Week, executiveSummary?.currency)}</span>
              <span>52W Range</span>
              <span>{formatCurrency(max52Week, executiveSummary?.currency)}</span>
            </div>
            <div className="relative h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-gradient-to-r from-blue-500 to-primary rounded-full"
                style={{ width: `${currentInRange}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockHeader;
