// store/portfolioStore.ts
import { create } from 'zustand'
import { apiClient } from '@/services/apiClient'
import { CurrencyRate, HoldingItem, WatchlistItem } from '@/components/portfolio-management/types';

export interface PortfolioSlice {
    portfolio: { id: number; name: string; currency: string } | null
    holdings: HoldingItem[]
    watchlist: WatchlistItem[]
    currencyRates: CurrencyRate[]
    refresh: () => Promise<void>
    buy: (args: any) => Promise<void>
    sell: (args: any) => Promise<void>
}

export const usePortfolioStore = create<PortfolioSlice>((set, get) => ({
    portfolio: null,
    holdings: [],
    watchlist: [],
    currencyRates: [],

    async refresh() {
        const { data } = await apiClient.get<{
            portfolio: { id: number; name: string; currency: string }
            holdings: HoldingItem[]
            watchlist: WatchlistItem[]
            currency_rates: CurrencyRate[]
        }>('/portfolio-management')

        set({
            portfolio: data.portfolio,
            holdings: data.holdings,
            watchlist: data.watchlist,
            currencyRates: data.currency_rates,
        })
    },

    async buy(payload) {
        await apiClient.post('/portfolio-management/buy', payload)
        await get().refresh()
    },

    async sell(payload) {
        await apiClient.post('/portfolio-management/sell', payload)
        await get().refresh()
    },
}))
