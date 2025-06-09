// src/hooks/usePortfolioData.ts
import { useEffect, useMemo } from "react";

import {
    calculateTotalValue,
    calculateTotalInvested,

    Transaction,
    buildHoldings,
} from "../utils/calculations";
import { useShallow } from "zustand/react/shallow";
import { AppState, useAppStore } from "@/store/appStore";

function getTickerToCurrency(transactions: Transaction[]): Record<string, string> {
    const map: Record<string, string> = {};
    transactions.forEach(tx => { map[tx.ticker] = tx.currency; });
    return map;
}

export function usePortfolioData() {
    const {
        portfolio,
        transactions = [],
        currencyRates = {},       // { USD: 3.85, PLN: 1, GBP: 5.1, ... }
        latestPrices = {},        // { AAPL: 203.2, "11B.WA": 123, ... } <- ensure you have this in store!
        refreshPortfolio,
        sell,
    } = useAppStore(
        useShallow((state: AppState) => ({
            portfolio: state.portfolio,
            transactions: state.transactions,
            currencyRates: state.currencyRates,
            latestPrices: state.latestPrices,
            refreshPortfolio: state.refreshPortfolio,
            sell: state.sell,
        }))
    );

    debugger

    // Calculate derived data
    const tickerToCurrency = useMemo(
        () => getTickerToCurrency(transactions),
        [transactions]
    );

    const holdings = useMemo(
        () => buildHoldings(transactions),
        [transactions]
    );

    const totalInvested = useMemo(
        () => calculateTotalInvested(transactions),
        [transactions]
    );


    // This is the new way:
    function getNetSharesByTicker(transactions: Transaction[]): Record<string, number> {
        const netShares: Record<string, number> = {};
        transactions.forEach(tx => {
            const shares = Number(tx.shares);
            if (!netShares[tx.ticker]) netShares[tx.ticker] = 0;
            if (tx.transaction_type === "buy") netShares[tx.ticker] += shares;
            else if (tx.transaction_type === "sell") netShares[tx.ticker] -= shares;
        });
        return netShares;
    }
    const CURRENT_FX_RATES = {
        PLN: 1,
        USD: 3.8,
        GBP: 5.2
    };

    const totalValue = useMemo(() => {
        const netShares = getNetSharesByTicker(transactions);
        let sum = 0;
        for (const ticker in netShares) {
            const shares = netShares[ticker];
            if (shares <= 0) continue;
            const price = latestPrices[ticker] ?? 0;
            const currency = tickerToCurrency[ticker] ?? "PLN";
            const fx = (currencyRates[currency]?.rate ?? CURRENT_FX_RATES[currency] ?? 1);
            sum += shares * price * fx;
        }
        return sum;
    }, [transactions, latestPrices, tickerToCurrency, currencyRates]);



    const totalGainLoss = totalValue - totalInvested;
    const percentageChange =
        totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
        portfolio,
        transactions,
        holdings,
        totals: {
            totalValue,
            totalInvested,
            totalGainLoss,
            percentageChange,
        },
        refreshPortfolio,
        sell,
    };
}