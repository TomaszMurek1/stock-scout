"use client"

import { create } from "zustand";
import { createWatchlistSlice, WatchlistSlice } from "./watchlist";
import { createPortfolioSlice, PortfolioSlice } from "./portfolio";
import { devtools } from "zustand/middleware";
import { createPerformanceSlice as createPortfolioPerformanceSlice, PerformanceSlice } from "./portfolioPerformance";
import { createFxRatesSlice, FxRatesSlice } from "./fxRates.slice";
import { createAnalyticsSlice, AnalyticsSlice } from "./analytics.slice";
export type AppState = PerformanceSlice & PortfolioSlice & WatchlistSlice & FxRatesSlice & AnalyticsSlice;

export const useAppStore = create<AppState>()(
    devtools(
        (set, get, api) => ({
            ...createPortfolioPerformanceSlice(set),
            ...createPortfolioSlice(set, get),
            ...createWatchlistSlice(set, get),
            ...createFxRatesSlice(set),
            ...createAnalyticsSlice(set, get, api),
        }),
        { name: "AppStore" }
    )
)
