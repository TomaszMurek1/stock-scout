import { Portfolio } from "@/components/portfolio-management/types"
import { apiClient } from "@/services/apiClient"
import { HoldingItem, Transaction, CurrencyRate, WatchlistStock } from "@/components/portfolio-management/types"

export interface PortfolioSlice {
    portfolio: Portfolio | null
    transactions: Transaction[]
    currencyRates: Record<string, CurrencyRate>
    refreshPortfolio: () => Promise<void>
    buy: (payload: any) => Promise<void>
    sell: (payload: any) => Promise<void>
}

export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => ({
    portfolio: null,
    transactions: [],
    currencyRates: {},

    refreshPortfolio: async () => {
        const { data } = await apiClient.get<{
            portfolio: Portfolio
            watchlist: WatchlistStock[]
            transactions: Transaction[]
            currency_rates: Record<string, CurrencyRate>
        }>("/portfolio-management")
        set(
            {
                portfolio: data.portfolio,
                transactions: data.transactions,
                currencyRates: data.currency_rates,
            },
            false,
            "refreshPortfolio"
        )
        get().setWatchlist(data.watchlist)
    },

    buy: async (payload: any) => {
        await apiClient.post("/portfolio-management/buy", payload)
        await get().refreshPortfolio()
    },

    sell: async (payload: any) => {
        await apiClient.post("/portfolio-management/sell", payload)
        await get().refreshPortfolio()
    }
})