import { useMemo } from "react";
import { calculateTotalInvested, calculateTotalValue, Transaction } from "../utils/calculations";
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

        const totalInvested = calculateTotalInvested(transactions);
        const totalValue = calculateTotalValue(
            holdings,
            priceHistory,
            currencyRates,
            portfolioCurrency
        );
        const totalGainLoss = totalValue - totalInvested;
        const percentageChange =
            totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        return {
            totalValue,
            totalInvested,
            totalGainLoss,
            percentageChange,
        };
    }, [transactions, holdings, priceHistory, currencyRates, portfolioCurrency, isPriceHistoryReady]);

    return totals;
}
