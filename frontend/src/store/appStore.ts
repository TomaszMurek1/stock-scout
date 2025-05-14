"use client"

import { create } from "zustand";
import { createWatchlistSlice, WatchlistSlice } from "./watchlist";
import { createPortfolioSlice, PortfolioSlice } from "./portfolio";
import { devtools } from "zustand/middleware";
import { createPerformanceSlice as createPortfolioPerformanceSlice, PerformanceSlice } from "./portfolioPerformance";
export type AppState = PerformanceSlice & PortfolioSlice & WatchlistSlice;

export const useAppStore = create<AppState>()(
    devtools(
        (set, get) => ({
            ...createPortfolioPerformanceSlice(set, get),
            ...createPortfolioSlice(set, get),
            ...createWatchlistSlice(set),
        }),
        { name: "AppStore" }
    )
)