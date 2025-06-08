
import { apiClient } from "@/services/apiClient";
import type {
    CurrencyRate,
    HoldingItem,
} from "@/components/portfolio-management/types";
import { WatchlistStock } from "@/components/portfolio-management/tabs/watchlist/types";


export interface PortfolioSlice {
    portfolio: { id: number; name: string; currency: string } | null
    holdings: HoldingItem[]
    transactions: any[] // Adjust type as needed
    refreshPortfolio: () => Promise<void>
    buy: (payload: any) => Promise<void>
    sell: (payload: any) => Promise<void>
}

export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => ({
    portfolio: null as { id: number; name: string; currency: string } | null,
    holdings: [] as HoldingItem[],
    transactions: [],


    // Unified refresh against single endpoint:
    refreshPortfolio: async () => {
        const { data } = await apiClient.get<{
            portfolio: { id: number; name: string; currency: string };
            holdings: HoldingItem[];
            watchlist: WatchlistStock[]
            transactions: any[]; // Adjust type as needed
        }>("/portfolio-management");
        set(
            {
                portfolio: data.portfolio,
                transactions: data.transactions,
                currencyRates: data.currency_rates as Record<string, CurrencyRate>,

            },
            false,
            "refreshPortfolio"
        );
        get().setWatchlist(data.watchlist)
    },

    buy: async (payload: any) => {
        await apiClient.post("/portfolio-management/buy", payload);
        await get().refreshPortfolio();
    },

    sell: async (payload: any) => {
        await apiClient.post("/portfolio-management/sell", payload);
        await get().refreshPortfolio();
    },
});
