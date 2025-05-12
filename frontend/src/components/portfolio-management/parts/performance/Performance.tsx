"use client"

import { useState, useEffect, useMemo } from "react"
import PerformanceChart, { TimeRange } from "./performance-chart"
import { usePortfolioStore } from "@/store/portfolioStore"                // your original store
import { usePortfolioPerformanceStore } from "@/store/portfolioPerformanceStore"

const EMPTY_PERFORMANCE: { date: string; value: number }[] = []

export default function Performance() {
    const [timeRange, setTimeRange] = useState<TimeRange>("1M")

    // 1) Pull the raw holdings array (stable unless holdings actually change)
    const holdings = usePortfolioStore((s) => s.holdings)

    // 2) Memoize the tickers list so it stays referentially equal if holdings don't change
    const tickers = useMemo(
        () => holdings.map((h) => h.ticker),
        [holdings]
    )

    // 3) Pull the performance array OR use our shared EMPTY_PERFORMANCE
    const performance = usePortfolioPerformanceStore(
        (s: any) => s.performance[timeRange] ?? EMPTY_PERFORMANCE
    )

    const fetchPerformance = usePortfolioPerformanceStore((s) => s.fetchPerformance)

    // 4) Only re‐run when the *content* of tickers or the timeRange changes
    const tickerKey = useMemo(() => tickers.join(","), [tickers])

    useEffect(() => {
        if (tickers.length) {
            fetchPerformance(tickers, timeRange)
        }
    }, [tickerKey, timeRange])  // <<< note: fetchPerformance is stable, so we omit it

    return (
        <PerformanceChart
            data={performance}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
        />
    )
}
