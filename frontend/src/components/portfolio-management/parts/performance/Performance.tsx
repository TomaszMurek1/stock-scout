import { useState, useEffect, useMemo, lazy, Suspense } from "react"
import { TimeRange } from "./performance-chart"
import { useAppStore, AppState } from "@/store/appStore"
const PerformanceChart = lazy(() => import("./performance-chart"))
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
    const [timeRange, setTimeRange] = useState<TimeRange>("All")

    // raw holdings
    const transactions = useAppStore((state: AppState) => state.transactions)

    const getPerformance = useAppStore((state: AppState) => state.getPriceHistory)

    // load performance when holdings exist or range changes
    useEffect(() => {
        if (transactions.length) {
            getPerformance(["AAPL", "GOOG", "MSFT"], getCutoffDate(timeRange)!)
        }
    }, [transactions.length, timeRange])

    //TODO: the way chart is created must be redisgned based on new api response
    let masterPerformance: any[] = []
    // slice data for current range
    const data = useMemo(() => {
        if (!masterPerformance.length) return []
        if (timeRange === "All") return masterPerformance
        const cutoff = getCutoffDate(timeRange)!
        return masterPerformance.filter((p) => p.date >= cutoff)
    }, [masterPerformance, timeRange])
    if (!data.length) return <div className="py-10 text-center">No data available</div>

    return (
        <Suspense fallback={<div className="py-10 text-center">Loading chart…</div>}>
            <PerformanceChart
                data={data}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
            />
        </Suspense>
    )
}
