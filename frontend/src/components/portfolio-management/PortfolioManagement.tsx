"use client"

import { useEffect, useState } from "react"
import Header from "./parts/Header"
import Summary from "./parts/summary/Summary"
import Performance from "./parts/performance/Performance"
import AddStockModal from "./modals/AddStockModal"
import { usePortfolioData } from "./hooks/usePortfolioData"
import PortfolioTabs from "./tabs/PortfolioTabs"
import { useEnsureFxRatesUpToDate } from "./hooks/useEnsureFxRatesUpToDate"

export default function PortfolioManagement() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const {
        portfolio,
        uiStocks,
        currencyRates,
        totals: { totalValue, totalInvested, totalGainLoss, percentageChange },
        removeHolding,
        refresh,
    } = usePortfolioData()

    const ensureFxRatesUpToDate = useEnsureFxRatesUpToDate(
        uiStocks,
        portfolio?.currency
    );

    useEffect(() => {
        if (portfolio && uiStocks.length) {
            ensureFxRatesUpToDate();
        }
    }, [portfolio, uiStocks, ensureFxRatesUpToDate]);

    if (!portfolio) return <div>Loading…</div>

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <Header onAdd={() => setIsAddModalOpen(true)} />
            <Summary
                totalValue={totalValue}
                totalInvested={totalInvested}
                totalGainLoss={totalGainLoss}
                percentageChange={percentageChange}
                currency={portfolio.currency}
                currencyRates={currencyRates}
            />
            <Performance />
            <PortfolioTabs
                stocks={uiStocks} onRemove={removeHolding}
                onRefresh={refresh}
            />
            <AddStockModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    )
}
