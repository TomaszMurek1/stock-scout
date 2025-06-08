// src/hooks/usePortfolioData.ts
import { useEffect, useMemo } from "react";
import type { PortfolioStock } from "../types";
import {
    calculateTotalValue,
    calculateTotalInvested,
    calculateGainLoss,
    calculatePercentageChange,
} from "../utils/calculations";
import { useShallow } from "zustand/react/shallow";
import { AppState, useAppStore } from "@/store/appStore";

export function usePortfolioData() {
    // 1) pull portfolio, transactions, fxRates, etc. out of your store
    const {
        portfolio,
        transactions = [],    // ← default to [] so .map never blows up
        currency_rates = [],         // also safe-guard fxRates
        refreshPortfolio,
        sell,
    } = useAppStore(
        useShallow((state: AppState) => ({
            portfolio: state.portfolio,
            transactions: state.transactions,
            currencyRates: state.currency_rates,
            refreshPortfolio: state.refreshPortfolio,
            sell: state.sell,
        }))
    );

    // 2) on mount, load your portfolio
    useEffect(() => {
        refreshPortfolio();
    }, [refreshPortfolio]);

    // 3) roll up transactions into per-ticker “holdings”
    const uiStocks: PortfolioStock[] = useMemo(() => {
        type Acc = {
            ticker: string;
            name: string;
            currency: string;
            totalShares: number;
            totalCost: number;
        };
        const acc: Record<string, Acc> = {};


        for (const t of transactions) {
            if (!acc[t.ticker]) {
                acc[t.ticker] = {
                    ticker: t.ticker,
                    name: t.name,
                    currency: t.currency,
                    totalShares: 0,
                    totalCost: 0,
                };
            }
            const e = acc[t.ticker];
            const shares = Number(t.shares);
            const price = Number(t.price);
            const fee = Number(t.fee);

            if (t.transaction_type === "buy") {
                e.totalShares += shares;
                e.totalCost += shares * price + fee;
            } else {
                e.totalShares -= shares;
                // subtract cost basis proportionally, fee reduces proceeds
                e.totalCost -= shares * price - fee;
            }
        }
        const stocks = Object.values(acc)
            .filter((e) => e.totalShares > 0)
            .map((e) => ({
                ticker: e.ticker,
                name: e.name,
                shares_number: e.totalShares,
                // average cost
                purchasePrice: e.totalCost / e.totalShares,
                // placeholder — until you wire up real quotes, fall back to cost
                currentPrice: e.totalCost / e.totalShares,
                currency: e.currency,
            }));
        debugger
        return stocks
    }, [transactions]);

    // 4) “sell” handler works off of that uiStocks array
    const removeHolding = async (ticker: string) => {
        const h = uiStocks.find((s) => s.ticker === ticker);
        if (!h) return;
        await sell({
            ticker: h.ticker,
            shares: h.shares_number,
            price: h.currentPrice,
            fee: 0,
        });
    };

    // 5) compute your totals exactly as before
    const totalValue =
        portfolio != null
            ? calculateTotalValue(uiStocks, portfolio.currency, currency_rates)
            : 0;
    const totalInvested =
        portfolio != null
            ? calculateTotalInvested(uiStocks, portfolio.currency, currency_rates)
            : 0;
    const totalGainLoss = calculateGainLoss(totalValue, totalInvested);
    const percentageChange = calculatePercentageChange(totalGainLoss, totalInvested);

    return {
        portfolio,
        uiStocks,
        currency_rates,
        totals: { totalValue, totalInvested, totalGainLoss, percentageChange },
        removeHolding,
        refresh: refreshPortfolio,
    };
}
