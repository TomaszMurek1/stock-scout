"use client"
import { TimeRange } from "@/components/portfolio-management/parts/performance/performance-chart";
import { apiClient } from "@/services/apiClient"

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

export interface PerformanceSlice {
    masterPerformance: PerformancePoint[];
    //timeRange: TimeRange;
    getPerformance: (range: TimeRange) => Promise<void>;
}



export const createPerformanceSlice = (set: any, get: any): PerformanceSlice => ({
    masterPerformance: [],
    getPerformance: async () => {
        // 1) Fetch all transactions
        const { data: txs } = await apiClient.get<TransactionItem[]>(
            "/portfolio-performace/transactions",
            { params: { period: "All" } }
        )
        const tickers = Array.from(new Set(txs.map((tx) => tx.ticker)))

        // 2) Determine oldest trade date
        const tradeDates = txs.map((tx) => tx.timestamp.slice(0, 10))
        const oldest = tradeDates.sort()[0]

        // 3) Fetch price history
        const { data: prices } = await apiClient.post<PriceHistoryItem[]>(
            "/portfolio-performace/price-history",
            { tickers, start_date: oldest }
        )

        // 4) Build deltas by date
        const deltaByDate: Record<string, Record<string, number>> = {}
        txs.forEach((tx) => {
            const date = tx.timestamp.slice(0, 10)
            const sign = tx.transaction_type === "SELL" ? -1 : 1
            deltaByDate[date] = deltaByDate[date] || {}
            deltaByDate[date][tx.ticker] = (deltaByDate[date][tx.ticker] || 0) + sign * tx.quantity
        })

        // 5) Organize price history per ticker
        const priceMap: Record<string, PriceHistoryItem[]> = {}
        tickers.forEach((t) => (priceMap[t] = []))
        prices.forEach((p) => priceMap[p.ticker].push(p))
        Object.values(priceMap).forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)))

        // 6) Union and sort dates
        const dateSet = new Set<string>()
        prices.forEach((p) => dateSet.add(p.date))
        tradeDates.forEach((d) => dateSet.add(d))
        const dates = Array.from(dateSet).sort()

        // 7) Compute performance over time
        const positions: Record<string, number> = {}
        const lastPrice: Record<string, number> = {}
        tickers.forEach((t) => {
            positions[t] = 0
            lastPrice[t] = 0
        })

        const master: PerformancePoint[] = dates.map((date) => {
            // apply trades
            const deltas = deltaByDate[date] || {}
            Object.entries(deltas).forEach(([tkr, change]) => {
                positions[tkr] = (positions[tkr] || 0) + change
            })
            // update prices
            tickers.forEach((tkr) => {
                const rec = priceMap[tkr].find((r) => r.date === date)
                if (rec) lastPrice[tkr] = rec.close
            })
            // calculate value
            const value = tickers.reduce((sum, tkr) => sum + (positions[tkr] || 0) * (lastPrice[tkr] || 0), 0)
            return { date, value }
        })

        set({ masterPerformance: master }, false, "setMasterPerformance")
    },
})
