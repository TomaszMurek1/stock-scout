"use client"
import { apiClient } from "@/services/apiClient"
import { CurrencyPoint } from "./portfolio";



export interface PerformanceSlice {
    priceHistory: Record<string, CurrencyPoint[]>;
    getPriceHistory: any;
}

export const createPerformanceSlice = (set: any, get: any): PerformanceSlice => ({
    priceHistory: {},
    getPriceHistory: async (tickers: string[], start_date: string) => {
        // Only step 3: fetch price history
        const { data: prices } = await apiClient.post<string[]>(
            "/portfolio-performace/price-history",
            { tickers, start_date }
        );
        // Directly set state with backend response (adapt if your state needs different shape)
        set({ priceHistory: prices }, false, "priceHistory");
    },
});

