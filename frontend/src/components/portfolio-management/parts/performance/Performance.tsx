import { useState, useEffect, useMemo, lazy, Suspense } from "react"
import { TimeRange } from "./performance-chart"
import { useAppStore, AppState } from "@/store/appStore"
const PerformanceChart = lazy(() => import("./performance-chart"))

// Turn a TimeRange into an ISO date string cutoff, or null for "All"


export default function Performance() {


    // raw holdings



    //TODO: the way chart is created must be redisgned based on new api response
    let masterPerformance: any[] = []
    // slice data for current range


    return (
        <Suspense fallback={<div className="py-10 text-center">Loading chart…</div>}>
            <PerformanceChart

            />
        </Suspense>
    )
}
