import React, { lazy, Suspense } from "react"
const PerformanceChart = lazy(() => import("./performance-chart"))

const Performance = React.memo(function Performance() {
    return (
        <Suspense fallback={<div className="py-10 text-center animate-pulse text-gray-400">Loading chart...</div>}>
            <PerformanceChart />
        </Suspense>
    )
})

export default Performance;
