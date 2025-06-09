"use client"
import { TimeRange } from "@/components/portfolio-management/parts/performance/performance-chart";
import { apiClient } from "@/services/apiClient"
export interface PerformancePoint {
    close: string             // YYYY-MM-DD
    value: number
}



export interface PriceHistoryItem {
    ticker: string
    date: string             // YYYY-MM-DD
    close: number
}


export interface PerformanceSlice {
    priceHistory: Record<string, PerformancePoint[]>; // { ticker: PerformancePoint[] }
    //timeRange: TimeRange;
    getPriceHistory: any;
}

export const createPerformanceSlice = (set: any, get: any): PerformanceSlice => ({
    priceHistory: {},
    getPriceHistory: async (tickers: string[], start_date: string) => {
        // Only step 3: fetch price history
        const { data: prices } = await apiClient.post<PriceHistoryItem[]>(
            "/portfolio-performace/price-history",
            { tickers, start_date }
        );
        // Directly set state with backend response (adapt if your state needs different shape)
        set({ priceHistory: prices }, false, "priceHistory");
    },
});

