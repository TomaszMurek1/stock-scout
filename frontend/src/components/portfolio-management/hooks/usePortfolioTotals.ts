import { useMemo } from "react";
import { calculateInvestedPerHolding, calculateTotalInvested, calculateTotalValue, Transaction } from "../utils/calculations";
import { PricePoint } from "@/store/portfolioPerformance";
export function usePortfolioTotals({
    transactions,
    holdings,
    priceHistory,
    currencyRates,
    portfolioCurrency,
}: {
    transactions: Transaction[];
    holdings: Record<string, { quantity: number; currency: string }>;
    priceHistory: Record<string, PricePoint[]>;
    currencyRates: any;
    portfolioCurrency: string;
}) {
    const isPriceHistoryReady = priceHistory && Object.keys(priceHistory).length > 0;
    const totals = useMemo(() => {
        if (!isPriceHistoryReady) return null;

        const investedPerHolding = calculateInvestedPerHolding(transactions);
        const { totalValueBase, byHolding } = calculateTotalValue(
            holdings,
            priceHistory,
            currencyRates,
            portfolioCurrency,
            investedPerHolding
        );
        const totalInvested: number = Object.values(investedPerHolding).reduce(
            (a, b) => a + b.investedInPortfolio, 0
        ) || 0;

        const totalGainLoss = totalValueBase - totalInvested;
        const percentageChange =
            totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        return {
            totalValue: totalValueBase,
            totalInvested,
            totalGainLoss,
            percentageChange,
            byHolding, // Now includes both currencies!
        };
    }, [
        transactions,
        holdings,
        priceHistory,
        currencyRates,
        portfolioCurrency,
        isPriceHistoryReady,
    ]);

    return totals;
}