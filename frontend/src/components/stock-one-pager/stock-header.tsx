"use client"
import { FC, useEffect, useState } from "react";

import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  HeartIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MouseEvent } from 'react'
import type { FinancialPerformance, StockData } from "./stock-one-pager.types";
import { formatCurrency } from "@/utils/formatting";
import { fetchWatchlist, toggleWatchlist } from "@/services/api/watchlist";

import { apiClient } from "@/services/apiClient";
import { string } from "zod";
import { AppState, useAppStore } from "@/store/appStore";


interface StockHeaderProps {
  ticker: string | undefined;
  executiveSummary: StockData["executive_summary"];
  companyOverview: StockData["company_overview"];
  technicalAnalysis: StockData["technical_analysis"];
  riskMetrics: StockData["risk_metrics"];
  sharesOutstanding?: FinancialPerformance["shares_outstanding"];
}

const StockHeader: FC<StockHeaderProps> = ({
  ticker,
  executiveSummary,
  companyOverview,
  technicalAnalysis,
  riskMetrics,
  sharesOutstanding,
}) => {

  const logoUrl = `https://financialmodelingprep.com/image-stock/${ticker}.png`;
  const [isLogoAvailable, setIsLogoAvailable] = useState<boolean>(true);
  const watchlist = useAppStore((state: AppState) => state.watchlist)
  const setWatchlist = useAppStore(
    (state: AppState) => state.setWatchlist
  )
  const toggleWatchlist = useAppStore(
    (state: AppState) => state.toggleWatchlist
  )

  const isFavorite = watchlist.some(w => w.ticker === ticker)

  useEffect(() => {
    if (!ticker) return
    fetchWatchlist().then((list) => {
      setWatchlist(list)
    })
  }, [ticker, setWatchlist])

  const handleWatchlistClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const stock: any = {
      ticker: ticker as string,
      name: executiveSummary.name as string,
    }

    // Optimistically update UI + store
    toggleWatchlist(stock)

    try {
      // Mirror it server-side
      if (isFavorite) {
        await apiClient.delete(`/watchlist/${ticker}`)
      } else {
        await apiClient.post(`/watchlist/${ticker}`)
      }
    } catch (err) {
      console.error("Watchlist toggle failed:", err)
      // Revert on error
      toggleWatchlist(stock)
    }
  }

  // Use `close` property from historical
  const prices = technicalAnalysis.historical;
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
    latestPrice != null && max52Week - min52Week !== 0
      ? ((latestPrice - min52Week) / (max52Week - min52Week)) * 100
      : 0;

  // Calculate Market Cap using shares_outstanding prop
  const marketCap =
    latestPrice != null && sharesOutstanding != null
      ? latestPrice * sharesOutstanding
      : null;

  return (
    <div className="mb-6 p-6 rounded-xl bg-white shadow-md border border-gray-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: logo and basic info */}
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
                size="icon"
                className={isFavorite ? "text-green-700" : "text-gray-400"}
                onClick={handleWatchlistClick}
              >
                <HeartIcon className={isFavorite ? "h-5 w-5 fill-current" : "h-5 w-5"} />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="font-medium text-gray-700">
                {executiveSummary.ticker}
              </Badge>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                {companyOverview.sector}
              </Badge>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                {companyOverview.industry}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-6 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <GlobeAltIcon className="h-4 w-4" />
                <a
                  href={companyOverview.website ? companyOverview.website : "#"}
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

        {/* Right: price, market cap, change and range */}
        <div className="flex flex-col items-end">
          {/* Latest price */}
          <div className="text-3xl md:text-4xl font-bold text-gray-900">
            {latestPrice != null &&
              formatCurrency({ value: latestPrice, currency: executiveSummary.currency, notation: "compact" })}
          </div>



          {/* Price change */}
          <div className={`flex items-center gap-1 text-lg ${priceChange.value >= 0 ? "text-green-600" : "text-red-600"}`}>
            {priceChange.value >= 0 ? (
              <ArrowTrendingUpIcon className="h-5 w-5" />
            ) : (
              <ArrowTrendingDownIcon className="h-5 w-5" />
            )}
            <span>
              {latestPrice != null &&
                formatCurrency({ value: priceChange.value, currency: executiveSummary.currency })}
            </span>
            <span>({priceChange.percentage.toFixed(2)}%)</span>
          </div>

          {/* Market Cap */}
          <div className="text-sm text-gray-600 mt-1">
            Market Cap:{" "}
            {marketCap != null
              ? formatCurrency({ value: marketCap, currency: executiveSummary.currency, notation: "compact", maximumFractionDigits: 3 })
              : "N/A"}
          </div>

          {/* 52-week range bar */}
          <div className="mt-3 w-full max-w-[200px]">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{formatCurrency({ value: min52Week, currency: executiveSummary.currency })}</span>
              <span>52W Range</span>
              <span>{formatCurrency({ value: max52Week, currency: executiveSummary.currency })}</span>
            </div>
            <div className="relative h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-gradient-to-r from-blue-500 to-primary rounded-full"
                style={{ width: `${currentInRange}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockHeader;
