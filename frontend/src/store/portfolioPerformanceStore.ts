// src/store/portfolioPerformanceStore.ts
import { apiClient } from "@/services/apiClient"
import { create } from "zustand"
// adjust path as needed

// ——— Types ———
export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All"

export interface TransactionItem {
    ticker: string
    quantity: number
    price: number
    fee: number
    total_value: number
    timestamp: string
}

export interface PriceHistoryItem {
    ticker: string
    date: string
    close: number
}

export interface PerformancePoint {
    date: string
    value: number
}

interface PortfolioPerformanceState {
    // caches
    transactions: Record<TimeRange, TransactionItem[]>
    priceHistory: Record<string, PriceHistoryItem[]>     // key = `${tickers.join(",")}:${period}`
    performance: Record<TimeRange, PerformancePoint[]>

    // actions
    fetchTransactions: (period: TimeRange) => Promise<void>
    fetchPriceHistory: (tickers: string[], period: TimeRange) => Promise<void>
    computePerformance: (tickers: string[], period: TimeRange) => void
    fetchPerformance: (tickers: string[], period: TimeRange) => Promise<void>
}

export const usePortfolioPerformanceStore = create<PortfolioPerformanceState>(
    (set, get) => ({
        // initial state
        transactions: {} as any,
        priceHistory: {} as any,
        performance: {} as any,

        // fetch trades via apiClient
        fetchTransactions: async (period) => {
            if (!get().transactions[period]) {
                const res = await apiClient.get<TransactionItem[]>(
                    "/portfolio-performace/transactions",
                    { params: { period } }
                )
                set((s) => ({
                    transactions: { ...s.transactions, [period]: res.data },
                }))
            }
        },

        // fetch close prices via apiClient
        fetchPriceHistory: async (tickers, period) => {
            const key = `${tickers.join(",")}:${period}`
            if (!get().priceHistory[key]) {
                const res = await apiClient.post<PriceHistoryItem[]>(
                    "/portfolio-performace/price-history",
                    { tickers, period }
                )
                set((s) => ({
                    priceHistory: { ...s.priceHistory, [key]: res.data },
                }))
            }
        },

        // compute in-memory time-series (dummy FX = 1)
        computePerformance: (tickers, period) => {
            const key = `${tickers.join(",")}:${period}`
            const txs = get().transactions[period] || []
            const prices = get().priceHistory[key] || []

            // map date → { ticker: shareDelta }
            const deltas: Record<string, Record<string, number>> = {}
            txs.forEach((tx) => {
                const date = tx.timestamp.split("T")[0]
                // assume positive quantity for BUY, negative for SELL
                const change = tx.quantity
                deltas[date] = {
                    ...(deltas[date] || {}),
                    [tx.ticker]: (deltas[date]?.[tx.ticker] || 0) + change,
                }
            })

            // roll up holdings day-by-day
            const sortedDates = Array.from(new Set(prices.map((p) => p.date))).sort()
            const positions: Record<string, number> = {}
            const perf: PerformancePoint[] = []

            sortedDates.forEach((date) => {
                if (deltas[date]) {
                    Object.entries(deltas[date]).forEach(([tkr, d]) => {
                        positions[tkr] = (positions[tkr] || 0) + d
                    })
                }
                const dayValue = prices
                    .filter((p) => p.date === date)
                    .reduce((sum, p) => sum + (positions[p.ticker] || 0) * p.close, 0)
                perf.push({ date, value: dayValue })
            })

            set((s) => ({
                performance: { ...s.performance, [period]: perf },
            }))
        },

        // orchestration: fetch trades + prices, then compute
        fetchPerformance: async (tickers, period) => {
            await get().fetchTransactions(period)
            await get().fetchPriceHistory(tickers, period)
            get().computePerformance(tickers, period)
        },
    })
)
