"use client"

import { create } from "zustand";
import { createWatchlistSlice, WatchlistSlice } from "./watchlist";
import { createPortfolioSlice, PortfolioSlice } from "./portfolio";
import { devtools } from "zustand/middleware";
import { createPerformanceSlice as createPortfolioPerformanceSlice, PerformanceSlice } from "./portfolioPerformance";
import { createFxRatesSlice, FxRatesSlice } from "./fxRates.slice";
export type AppState = PerformanceSlice & PortfolioSlice & WatchlistSlice & FxRatesSlice;

export const useAppStore = create<AppState>()(
    devtools(
        (set, get) => ({
            ...createPortfolioPerformanceSlice(set, get),
            ...createPortfolioSlice(set, get),
            ...createWatchlistSlice(set),
            ...createFxRatesSlice(set, get),
        }),
        { name: "AppStore" }
    )
)