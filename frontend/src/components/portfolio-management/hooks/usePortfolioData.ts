import { useEffect } from "react"
import { usePortfolioStore } from "@/store/portfolioStore"
import type { PortfolioStock, HoldingItem } from "../types"
import {
    calculateTotalValue,
    calculateTotalInvested,
    calculateGainLoss,
    calculatePercentageChange,
} from "../utils/calculations"

export function usePortfolioData() {
    const {
        portfolio,
        holdings,
        currencyRates,
        refresh,
        sell,
    } = usePortfolioStore()

    useEffect(() => {
        refresh()
    }, [refresh])

    const uiStocks: PortfolioStock[] = holdings.map((h: HoldingItem) => ({
        shares_number: h.shares,
        ticker: h.ticker,
        name: h.name,
        purchasePrice: Number(h.average_price),
        currentPrice: h.last_price,
    }))

    const removeHolding = async (ticker: string) => {
        const target = holdings.find((h) => h.ticker === ticker)
        if (!target) return
        await sell({
            ticker: target.ticker,
            shares: Number(target.shares),
            price: Number(target.last_price ?? target.average_price),
            fee: 0,
        })
    }

    const totalValue = calculateTotalValue(holdings)
    const totalInvested = calculateTotalInvested(holdings)
    const totalGainLoss = calculateGainLoss(totalValue, totalInvested)
    const percentageChange = calculatePercentageChange(totalGainLoss, totalInvested)

    return {
        portfolio,
        uiStocks,
        currencyRates,
        totals: { totalValue, totalInvested, totalGainLoss, percentageChange },
        removeHolding,
        refresh,
    }
}
