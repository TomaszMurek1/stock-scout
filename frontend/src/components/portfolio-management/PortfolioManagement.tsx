"use client"

import { useEffect, useState } from "react"
import Header from "./parts/Header"
import Summary from "./parts/summary/Summary"
import Performance from "./parts/performance/Performance"
import AddStockModal from "./modals/AddStockModal"
import { usePortfolioBaseData } from "./hooks/usePortfolioBaseData"
import { TimeRange } from "./parts/performance/performance-chart"
import { usePortfolioTotals } from "./hooks/usePortfolioTotals"
import PortfolioTabs from "./tabs/PortfolioTabs"

const rangeDays: Record<Exclude<TimeRange, "All">, number> = {
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
}


export default function PortfolioManagement() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
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
            <PortfolioTabs
                onRemove={sell}
                onRefresh={refreshPortfolio} byHolding={totals.byHolding}
            />
            <AddStockModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    )
}
