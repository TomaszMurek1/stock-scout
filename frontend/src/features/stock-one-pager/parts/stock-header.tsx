"use client"
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  HeartIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Layout";
import { formatCurrency, formatPercentage } from "@/utils/formatting";
import { API_URL } from "@/services/apiClient";
import type { StockData, MetricConfig, FinancialPerformance } from "../stock-one-pager.types";
import { useWatchlistActions, useStockMetrics } from "../hooks/stock-header.hooks";
import { MetricTooltipContent } from "../components/metric-tooltip-content";
import { RefreshedCard, RefreshedHeader } from "../components/refreshed-card";

interface StockHeaderProps {
  ticker: string | undefined;
  executiveSummary: StockData["executive_summary"];
  companyOverview: StockData["company_overview"];
  technicalAnalysis: StockData["technical_analysis"];
  sharesOutstanding?: FinancialPerformance["shares_outstanding"];
  onBuyClick?: () => void;
  onSellClick?: () => void;
  isRefreshed?: boolean;
}


const StockHeader: FC<StockHeaderProps> = ({
  ticker,
  executiveSummary,
  companyOverview,
  technicalAnalysis,
  sharesOutstanding,
  onBuyClick,
  onSellClick,
  isRefreshed = false,
}) => {
  const logoUrl = `${API_URL}/stock-details/${ticker}/logo`;
  const [isLogoAvailable, setIsLogoAvailable] = useState<boolean>(true);
  const { t } = useTranslation();

  const { isFavorite, handleWatchlistClick } = useWatchlistActions(ticker, executiveSummary?.name || undefined);
  
  const {
    latestPrice,
    priceChange,
    min52Week,
    max52Week,
    currentInRange,
    marketCap
  } = useStockMetrics(technicalAnalysis.historical, sharesOutstanding || undefined);

  return (
    <div 
      className={`mb-6 p-6 rounded-xl transition-all duration-1000 ${
        isRefreshed 
          ? "bg-emerald-50 shadow-lg border border-emerald-200 ring-1 ring-emerald-300" 
          : "bg-white shadow-md border border-gray-100"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Company Info */}
        <div className="flex items-center gap-6">
          {isLogoAvailable && (
            <div className="flex-shrink-0 hidden md:block">
              <img
                src={logoUrl}
                alt={`${executiveSummary.name} logo`}
                className="w-20 h-20 object-contain bg-gray-300 rounded-lg p-2"
                onError={() => setIsLogoAvailable(false)}
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {executiveSummary.name}
              </h1>
              <Button
                variant="ghost"
                className={isFavorite ? "text-green-700" : "text-gray-400"}
                onClick={handleWatchlistClick}
                aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
              >
                <HeartIcon className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge>{executiveSummary.ticker}</Badge>
              <Badge variant="neutral">{companyOverview.sector}</Badge>
              <Badge variant="neutral">{companyOverview.industry}</Badge>
            </div>
            
            <div className="flex flex-wrap gap-6 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <GlobeAltIcon className="h-4 w-4" />
                <a
                  href={companyOverview.website || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {companyOverview.website?.replace("https://", "")}
                </a>
              </div>
              <div className="flex items-center gap-1">
                <BuildingOfficeIcon className="h-4 w-4" />
                <span>{companyOverview.country}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Market Data & Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl font-bold text-gray-900">
              {latestPrice != null &&
                formatCurrency({
                  value: latestPrice,
                  currency: executiveSummary.currency,
                })}
            </div>
            <Badge
              variant={priceChange.value >= 0 ? "success" : "danger"}
              className="flex gap-2 text-base"
            >
              <span>
                {latestPrice != null &&
                  formatCurrency({
                    value: priceChange.value,
                    currency: executiveSummary.currency,
                    signDisplay: "always",
                  })}
              </span>
              <span>({priceChange.percentage.toFixed(2)}%)</span>
            </Badge>
          </div>

          <div className="text-sm text-gray-600 text-right">
            {t("stock_one_pager.header.market_cap")}:{" "}
            {marketCap != null
              ? formatCurrency({
                  value: marketCap,
                  currency: executiveSummary.currency,
                  notation: "compact",
                  maximumFractionDigits: 3,
                })
              : "N/A"}
          </div>

          <div className="mt-1 w-full max-w-[240px]">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>
                {formatCurrency({
                  value: min52Week,
                  currency: executiveSummary.currency,
                })}
              </span>
              <span>{t("stock_one_pager.header.range_52w")}</span>
              <span>
                {formatCurrency({
                  value: max52Week,
                  currency: executiveSummary.currency,
                })}
              </span>
            </div>
            <div className="relative h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-gradient-to-r from-blue-500 to-primary rounded-full"
                style={{ width: `${currentInRange}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              className="w-24 bg-teal-600 hover:bg-teal-700 text-white border-none"
              onClick={onBuyClick}
            >
              {t("stock_one_pager.header.buy")}
            </Button>
            <Button
              className="w-24 bg-blue-600 hover:bg-blue-700 text-white border-none"
              onClick={onSellClick}
            >
              {t("stock_one_pager.header.sell")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockHeader;
