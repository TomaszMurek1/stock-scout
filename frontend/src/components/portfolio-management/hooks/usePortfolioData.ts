import { useEffect, useMemo } from "react"
import type { PortfolioStock, HoldingItem } from "../types"
import {
    calculateTotalValue,
    calculateTotalInvested,
    calculateGainLoss,
    calculatePercentageChange,
} from "../utils/calculations"

// Switched to centralized store and memoized selector using useShallow

import { useShallow } from "zustand/react/shallow"
import { AppState, useAppStore } from "@/store/appStore"

export function usePortfolioData() {
    // useShallow wraps the selector to avoid unnecessary rerenders and infinite loops
    const { portfolio, holdings, fxRates, refreshPortfolio, sell } = useAppStore(
        useShallow((state: AppState) => ({
            portfolio: state.portfolio,
            holdings: state.holdings,
            fxRates: state.fxRates,
            refreshPortfolio: state.refreshPortfolio,
            sell: state.sell,
        }))
    )

    // Refresh portfolio on mount
    useEffect(() => {
        refreshPortfolio()
    }, [refreshPortfolio])

    // Map holdings to UI-friendly shape, memoized for performance
    const uiStocks: PortfolioStock[] = useMemo(
        () =>
            holdings.map((h: HoldingItem) => ({
                shares_number: h.shares,
                ticker: h.ticker,
                name: h.name,
                purchasePrice: Number(h.average_price),
                currentPrice: h.last_price,
                currency: h.currency,
            })),
        [holdings]
    )

    // Handler to remove a holding
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

    // Calculated totals
    debugger
    const totalValue = portfolio ? calculateTotalValue(holdings, portfolio.currency, fxRates) : 0;
    const totalInvested = portfolio ? calculateTotalInvested(holdings, portfolio?.currency, fxRates) : 0;
    const totalGainLoss = calculateGainLoss(totalValue, totalInvested)
    const percentageChange = calculatePercentageChange(totalGainLoss, totalInvested)
    console.log("uiStocks", uiStocks)

    return {
        portfolio,
        uiStocks,
        fxRates,
        totals: { totalValue, totalInvested, totalGainLoss, percentageChange },
        removeHolding,
        refresh: refreshPortfolio,
    }
}