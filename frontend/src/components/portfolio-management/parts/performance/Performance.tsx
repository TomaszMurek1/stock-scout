import { lazy, Suspense } from "react"
const PerformanceChart = lazy(() => import("./performance-chart"))

export default function Performance() {
    return (
        <Suspense fallback={<div className="py-10 text-center">Loading chart…</div>}>
            <PerformanceChart

            />
        </Suspense>
    )
}
