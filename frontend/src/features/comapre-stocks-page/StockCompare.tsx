"use client"
import { FC } from "react"
import { useParams } from "react-router-dom"
import { useCompareData } from "./useCompareData"
import {
    mergeTimeSeries,
} from "../../utils/compareUtils"
import StockValuationRow from "./StockValuationRow"
import { FinancialRatiosRow } from "./FinancialRatiosRow"
import { StockCompareFooter } from "./StockCompareFooter"
import { CompareStocksHeader } from "./CompareStocksHeader"
import { PerformanceRow } from "./PerformanceRow"
import LoadingScreen from "@/components/shared/loading-screen"
import ErrorScreen from "@/components/shared/error-screen"

export const StockCompare: FC = () => {
    const { tickerA, tickerB } = useParams<"tickerA" | "tickerB">()
    const { data, isLoading, error } = useCompareData(tickerA!, tickerB!)

    if (isLoading) return <LoadingScreen />
    if (error || !data) return <ErrorScreen error={error as Error} />

    const { a, b } = data

    // prepare all your slices here once…
    const revenueData = mergeTimeSeries(a.revenue_growth, b.revenue_growth)
    const dilutionData = mergeTimeSeries(a.dilution, b.dilution)
    const fcfGrowthData = mergeTimeSeries(a.fcf_growth, b.fcf_growth)
    const priceDataA = (a.price_performance ?? []).filter((d: any) => d.value != null)
    const priceDataB = (b.price_performance ?? []).filter((d: any) => d.value != null)
    const stockData = mergeTimeSeries(priceDataA, priceDataB, "date", "value")
    const lastA = priceDataA.at(-1)?.value ?? null
    const lastB = priceDataB.at(-1)?.value ?? null
    const debtEquityData = mergeTimeSeries(a.debt_equity, b.debt_equity)
    const marginsData = [
        a.margins?.gross ?? null, b.margins?.gross ?? null
    ].every(v => v == null) ? [] : [
        { category: "Gross margin", a: a.margins?.gross, b: b.margins?.gross },
        { category: "FCF margin", a: a.margins?.fcf, b: b.margins?.fcf }
    ]
    const rocData = mergeTimeSeries(a.return_on_capital, b.return_on_capital)

    // find latest year
    const years = revenueData.concat(dilutionData, fcfGrowthData, debtEquityData, rocData)
        .map(d => d.label).filter(l => l !== "LTM").map(l => parseInt(l)).filter(n => !isNaN(n))
    const latestYear = String(Math.max(...years))

    return (
        <div className="min-h-screen bg-[#f8f4ef] text-gray-800">
            <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
                <CompareStocksHeader tickerA={a.ticker} tickerB={b.ticker} latestYear={latestYear} />

                <PerformanceRow
                    tickerA={a.ticker} tickerB={b.ticker}
                    revenueData={revenueData}
                    dilutionData={dilutionData}
                    fcfData={fcfGrowthData}
                />

                <StockValuationRow
                    tickerA={a.ticker} tickerB={b.ticker}
                    stockData={stockData}
                    lastA={lastA} lastB={lastB}
                    pfcfA={a.valuation?.pfcf ?? null}
                    pfcfB={b.valuation?.pfcf ?? null}
                />

                <FinancialRatiosRow
                    tickerA={a.ticker} tickerB={b.ticker}
                    debtEquity={debtEquityData}
                    margins={marginsData}
                    roc={rocData}
                />

                <StockCompareFooter />
            </div>
        </div>
    )
}