"use client"

import { useEffect, useState } from "react"
import Header from "./parts/Header"
import Summary from "./parts/summary/Summary"
import Performance from "./parts/performance/Performance"
import AddStockModal from "./modals/AddStockModal"
import { usePortfolioBaseData, usePortfolioData } from "./hooks/usePortfolioBaseData"
import PortfolioTabs from "./tabs/PortfolioTabs"
import { useEnsureFxRatesUpToDate } from "./hooks/useEnsureFxRatesUpToDate"
import { AppState, useAppStore } from "@/store/appStore";
import { TimeRange } from "./parts/performance/performance-chart"
import { usePortfolioTotals } from "./hooks/usePortfolioTotals"

const rangeDays: Record<Exclude<TimeRange, "All">, number> = {
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
}


export default function PortfolioManagement() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [timeRange, setTimeRange] = useState<TimeRange>("All")
    const {
        portfolio,
        holdings,
        transactions,
        currencyRates,
        priceHistory,
        refreshPortfolio,
        sell,
    } = usePortfolioBaseData();

    const portfolioCurrency = portfolio?.currency || "PLN";
    const totals = usePortfolioTotals({
        transactions,
        holdings,
        priceHistory,
        currencyRates,
        portfolioCurrency,
    });

    useEffect(() => {
        refreshPortfolio();
    }, [refreshPortfolio]);

    function getCutoffDate(range: TimeRange): string | null {
        if (range === "All") return null
        const d = new Date()
        d.setUTCDate(d.getUTCDate() - rangeDays[range])
        return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
    }

    const activeTickers = Object.keys(holdings)
        .filter(ticker => holdings[ticker].quantity > 0);
    const getPriceHistory = useAppStore((state: AppState) => state.getPriceHistory)

    useEffect(() => {
        if (activeTickers.length) {
            getPriceHistory(activeTickers, getCutoffDate(timeRange)!)
        }
    }, [transactions.length, timeRange])

    if (!portfolio || !totals) return <div>Loading…</div>

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <Header onAdd={() => setIsAddModalOpen(true)} />
            <Summary
                totalValue={totals.totalValue}
                totalInvested={totals.totalInvested}
                totalGainLoss={totals.totalGainLoss}
                percentageChange={totals.percentageChange}
                currency={portfolio.currency}
            />
            <Performance />
            {/* <PortfolioTabs
                stocks={uiStocks} onRemove={removeHolding}
                onRefresh={refreshPortfolio}
            /> */}
            <AddStockModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    )
}
