import { useMemo, useEffect, useCallback } from "react";
import type { MouseEvent } from 'react';
import { apiClient } from "@/services/apiClient";
import { AppState, useAppStore } from "@/store/appStore";
import type { StockData } from "./stock-one-pager.types";

export const useWatchlistActions = (ticker: string | undefined, companyName: string | undefined) => {
  const watchlist = useAppStore((state: AppState) => state.watchlist.data);
  const loadWatchlist = useAppStore((state: AppState) => state.loadWatchlist);
  const toggleWatchlist = useAppStore((state: AppState) => state.toggleWatchlist);
  const refreshWatchlist = useAppStore((state: AppState) => state.refreshWatchlist);

  const isFavorite = useMemo(() => 
    !!ticker && watchlist.some((w) => w.ticker === ticker),
    [watchlist, ticker]
  );

  useEffect(() => {
    loadWatchlist().catch(() => undefined);
  }, [loadWatchlist]);

  const handleWatchlistClick = useCallback(async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!ticker || !companyName) return;

    const stock = { ticker, name: companyName };

    // Optimistically update UI + store
    toggleWatchlist(stock);

    try {
      if (isFavorite) {
        await apiClient.delete(`/watchlist/${ticker}`);
      } else {
        await apiClient.post(`/watchlist`, { ticker });
      }
      await refreshWatchlist();
    } catch (err) {
      console.error("Watchlist toggle failed:", err);
      // Revert on error
      toggleWatchlist(stock);
    }
  }, [ticker, companyName, isFavorite, toggleWatchlist, refreshWatchlist]);

  return { isFavorite, handleWatchlistClick };
};

export const useStockMetrics = (
  historical: StockData["technical_analysis"]["historical"],
  sharesOutstanding?: number
) => {
  return useMemo(() => {
    // default return
    const emptyMetrics = {
      latestPrice: null,
      priceChange: { value: 0, percentage: 0 },
      min52Week: 0,
      max52Week: 0,
      currentInRange: 0,
      marketCap: null as number | null,
    };

    if (!historical || historical.length === 0) return emptyMetrics;

    // Determine the date 52 weeks ago from the latest historical date
    const latestDateStr = historical[historical.length - 1].date;
    const latestHistoricalDate = new Date(latestDateStr);
    const fiftyTwoWeeksAgo = new Date(latestHistoricalDate);
    fiftyTwoWeeksAgo.setDate(fiftyTwoWeeksAgo.getDate() - (52 * 7));

    // Filter prices to include only the last 52 weeks
    const pricesLast52Weeks = historical.filter((p) => {
      const priceDate = new Date(p.date);
      return priceDate >= fiftyTwoWeeksAgo;
    });

    if (pricesLast52Weeks.length === 0) return emptyMetrics;

    const latestPrice = pricesLast52Weeks[pricesLast52Weeks.length - 1].close;

    // Price Change
    let priceChange = { value: 0, percentage: 0 };
    if (pricesLast52Weeks.length >= 2) {
      const previous = pricesLast52Weeks[pricesLast52Weeks.length - 2].close;
      const change = latestPrice - previous;
      const percentage = (change / previous) * 100;
      priceChange = { value: change, percentage };
    }

    // 52 Week Range
    const closePrices = pricesLast52Weeks.map((p) => p.close);
    const min52Week = Math.min(...closePrices);
    const max52Week = Math.max(...closePrices);
    
    const rangeSpan = max52Week - min52Week;
    const currentInRange = rangeSpan !== 0 
      ? ((latestPrice - min52Week) / rangeSpan) * 100 
      : 0;

    // Market Cap
    const marketCap =
      latestPrice != null && sharesOutstanding != null
        ? latestPrice * sharesOutstanding
        : null;

    return {
      latestPrice,
      priceChange,
      min52Week,
      max52Week,
      currentInRange,
      marketCap,
    };
  }, [historical, sharesOutstanding]);
};
