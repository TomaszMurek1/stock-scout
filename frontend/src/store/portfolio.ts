
import { apiClient } from "@/services/apiClient";
import type {
    CurrencyRate,
    HoldingItem,
    WatchlistItem,
} from "@/components/portfolio-management/types";


export interface PortfolioSlice {
    portfolio: { id: number; name: string; currency: string } | null
    holdings: HoldingItem[]
    portfolioWatchlist: WatchlistItem[]
    currencyRates: CurrencyRate[]
    refreshPortfolio: () => Promise<void>
    buy: (payload: any) => Promise<void>
    sell: (payload: any) => Promise<void>
}


export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => ({
    portfolio: null as { id: number; name: string; currency: string } | null,
    holdings: [] as HoldingItem[],
    portfolioWatchlist: [] as WatchlistItem[],
    currencyRates: [] as CurrencyRate[],

    // Unified refresh against single endpoint:
    refreshPortfolio: async () => {
        const { data } = await apiClient.get<{
            portfolio: { id: number; name: string; currency: string };
            holdings: HoldingItem[];
            watchlist: WatchlistItem[];
            currency_rates: CurrencyRate[];
        }>("/portfolio-management");
        set(
            {
                portfolio: data.portfolio,
                holdings: data.holdings,
                portfolioWatchlist: data.watchlist,
                currencyRates: data.currency_rates,
            },
            false,
            "refreshPortfolio"
        );
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
