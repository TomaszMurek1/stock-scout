import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { apiClient } from "@/services/apiClient"

export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All"

export interface TransactionItem {
    ticker: string
    quantity: number
    price: number
    fee: number
    total_value: number
    timestamp: string        // ISO timestamp
    transaction_type?: "BUY" | "SELL"
}

export interface PriceHistoryItem {
    ticker: string
    date: string             // YYYY-MM-DD
    close: number
}

export interface PerformancePoint {
    date: string             // YYYY-MM-DD
    value: number
}

interface PortfolioPerformanceState {
    /** Full portfolio-value timeline */
    masterPerformance: PerformancePoint[]
    /** Load all trades & prices starting at first trade */
    fetchMaster: (tickers: string[]) => Promise<void>
}

export const usePortfolioPerformanceStore = create<PortfolioPerformanceState>()(
    devtools(
        (set, get) => ({
            masterPerformance: [],

            async fetchMaster(tickers) {
                if (get().masterPerformance.length) return

                // 1) Fetch ALL transactions
                const { data: txs } = await apiClient.get<TransactionItem[]>(
                    "/portfolio-performace/transactions",
                    { params: { period: "All" } }
                )

                // 2) Determine oldest trade date
                const tradeDates = txs.map((tx) => tx.timestamp.slice(0, 10))
                const oldest = tradeDates.sort()[0]

                // 3) Fetch price history from oldest date
                const { data: prices } = await apiClient.post<PriceHistoryItem[]>(
                    "/portfolio-performace/price-history",
                    { tickers, start_date: oldest }
                )

                // 4) Build date-indexed trade deltas
                const deltaByDate: Record<string, Record<string, number>> = {}
                txs.forEach((tx) => {
                    const d = tx.timestamp.slice(0, 10)
                    const sign = tx.transaction_type === "SELL" ? -1 : 1
                    deltaByDate[d] = deltaByDate[d] || {}
                    deltaByDate[d][tx.ticker] =
                        (deltaByDate[d][tx.ticker] || 0) + sign * tx.quantity
                })

                // 5) Build and sort priceMap per ticker
                const priceMap: Record<string, PriceHistoryItem[]> = {}
                tickers.forEach((t) => (priceMap[t] = []))
                prices.forEach((p) => priceMap[p.ticker].push(p))
                Object.values(priceMap).forEach((arr) =>
                    arr.sort((a, b) => a.date.localeCompare(b.date))
                )

                // 6) Union dates: price dates + trade dates
                const dateSet = new Set<string>()
                prices.forEach((p) => dateSet.add(p.date))
                tradeDates.forEach((d) => dateSet.add(d))
                const dates = Array.from(dateSet).sort()

                // 7) Roll through dates: apply deltas, forward-fill prices, compute value
                const positions: Record<string, number> = {}
                const lastPrice: Record<string, number> = {}
                tickers.forEach((t) => {
                    positions[t] = 0
                    lastPrice[t] = 0
                })

                const master: PerformancePoint[] = dates.map((date) => {
                    // apply any trades on this date
                    const deltas = deltaByDate[date] || {}
                    Object.entries(deltas).forEach(([tkr, change]) => {
                        positions[tkr] = (positions[tkr] || 0) + change
                    })
                    // update price if available
                    tickers.forEach((tkr) => {
                        const row = priceMap[tkr].find((r) => r.date === date)
                        if (row) lastPrice[tkr] = row.close
                    })
                    // compute portfolio value
                    const value = tickers.reduce(
                        (sum, t) => sum + (positions[t] || 0) * (lastPrice[t] || 0),
                        0
                    )
                    return { date, value }
                })

                set({ masterPerformance: master })
            },
        }),
        { name: "⚡ portfolioPerformance" }
    )
)
