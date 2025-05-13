import { create } from "zustand"
import { apiClient } from "@/services/apiClient"
import { devtools } from "zustand/middleware"

export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All"

export interface TransactionItem {
    ticker: string
    quantity: number
    price: number
    fee: number
    total_value: number
    timestamp: string               // ISO timestamp
    transaction_type?: "BUY" | "SELL"
}

export interface PriceHistoryItem {
    ticker: string
    date: string                    // YYYY-MM-DD
    close: number
}

export interface PerformancePoint {
    date: string                    // YYYY-MM-DD
    value: number
}
const rangeDays: Record<Exclude<TimeRange, "All">, number> = {
    "1M": 30, "3M": 90, "6M": 180, "1Y": 365,
}
function getCutoffDate(range: TimeRange): string | null {
    if (range === "All") return null
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - rangeDays[range])
    return d.toISOString().slice(0, 10)
}

interface PortfolioPerformanceState {
    masterPerformance: PerformancePoint[]
    fetchMaster: (tickers: string[]) => Promise<void>
}

export const usePortfolioPerformanceStore = create<PortfolioPerformanceState>()(
    devtools((set, get) => ({
        masterPerformance: [],

        async fetchMaster(tickers) {
            if (get().masterPerformance.length) return

            // 1) fetch ALL transactions
            const { data: txs } = await apiClient.get<TransactionItem[]>(
                "/portfolio-performace/transactions",
                { params: { period: "All" } }
            )
            // 2) fetch ALL price history
            const keyAll = tickers.sort().join(",") + ":All"
            const { data: prices } = await apiClient.post<PriceHistoryItem[]>(
                "/portfolio-performace/price-history",
                { tickers, period: "All" }
            )

            // 3) build master timeline (bucket deltas, forward-fill prices, accumulate)
            //    you can extract this into a helper function if you like
            const deltaByDate: Record<string, Record<string, number>> = {}
            txs.forEach((tx) => {
                const day = tx.timestamp.slice(0, 10)
                const sign = tx.transaction_type === "SELL" ? -1 : 1
                deltaByDate[day] = deltaByDate[day] || {}
                deltaByDate[day][tx.ticker] = (deltaByDate[day][tx.ticker] || 0) + sign * tx.quantity
            })

            const dates = Array.from(new Set(prices.map((p) => p.date))).sort()
            const priceMap: Record<string, PriceHistoryItem[]> = {}
            tickers.forEach((t) => (priceMap[t] = []))
            prices.forEach((p) => priceMap[p.ticker].push(p))
            Object.values(priceMap).forEach(arr =>
                arr.sort((a, b) => a.date.localeCompare(b.date))
            )

            const pos: Record<string, number> = {}
            const last: Record<string, number> = {}
            tickers.forEach((t) => { pos[t] = 0; last[t] = 0 })

            const master: PerformancePoint[] = dates.map((d) => {
                const deltas = deltaByDate[d] || {}
                Object.entries(deltas).forEach(([t, q]) => pos[t] += q)
                tickers.forEach((t) => {
                    const row = priceMap[t].find((r) => r.date === d)
                    if (row) last[t] = row.close
                })
                const pv = tickers.reduce((s, t) => s + (pos[t] || 0) * (last[t] || 0), 0)
                return { date: d, value: pv }
            })

            set({ masterPerformance: master })
        },
    }), { name: "⚡ portfolioPerformance" })
)