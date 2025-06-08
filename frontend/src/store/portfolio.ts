
import { apiClient } from "@/services/apiClient";
import type {
    CurrencyRate,
    HoldingItem,
} from "@/components/portfolio-management/types";
import { WatchlistStock } from "@/components/portfolio-management/tabs/watchlist/types";


export interface PortfolioSlice {
    portfolio: { id: number; name: string; currency: string } | null
    holdings: HoldingItem[]
    currencyRates: CurrencyRate[]
    refreshPortfolio: () => Promise<void>
    buy: (payload: any) => Promise<void>
    sell: (payload: any) => Promise<void>
}

export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => ({
    portfolio: null as { id: number; name: string; currency: string } | null,
    holdings: [] as HoldingItem[],
    currencyRates: [] as CurrencyRate[],

    // Unified refresh against single endpoint:
    refreshPortfolio: async () => {
        const { data } = await apiClient.get<{
            portfolio: { id: number; name: string; currency: string };
            holdings: HoldingItem[];
            watchlist: WatchlistStock[]
            currency_rates: CurrencyRate[];
        }>("/portfolio-management");
        set(
            {
                portfolio: data.portfolio,
                holdings: data.holdings,
                currencyRates: data.currency_rates,
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
