"use client"

import { useState, useEffect, useMemo } from "react"
import PerformanceChart, { TimeRange } from "./performance-chart"
import { usePortfolioStore } from "@/store/portfolioStore"
import { usePortfolioPerformanceStore } from "@/store/portfolioPerformanceStore"

const rangeDays: Record<Exclude<TimeRange, "All">, number> = {
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
}

// Turn a TimeRange into an ISO date string cutoff, or null for "All"
function getCutoffDate(range: TimeRange): string | null {
    if (range === "All") return null
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - rangeDays[range])
    return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

export default function Performance() {
    const [timeRange, setTimeRange] = useState<TimeRange>("1M")

    // raw holdings → stable tickers array
    const holdings = usePortfolioStore((s) => s.holdings)
    const tickers = useMemo(() => holdings.map((h) => h.ticker), [holdings])

    // pull in the master timeline and the loader
    const master = usePortfolioPerformanceStore((s) => s.masterPerformance)
    const fetchMaster = usePortfolioPerformanceStore((s) => s.fetchMaster)

    // load once (or whenever tickers change)
    const tickerKey = useMemo(() => tickers.join(","), [tickers])
    useEffect(() => {
        if (tickers.length) {
            fetchMaster(tickers)
        }
    }, [tickerKey, fetchMaster])

    // slice for the current range
    const data = useMemo(() => {
        if (!master.length) return []
        const cutoff = getCutoffDate(timeRange)
        if (!cutoff) return master
        return master.filter((p) => p.date >= cutoff)
    }, [master, timeRange])

    return (
        <PerformanceChart
            data={data}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
        />
    )
}
