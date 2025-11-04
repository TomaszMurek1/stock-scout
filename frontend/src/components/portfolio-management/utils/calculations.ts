import { CurrencyRates, HistoricalRate, IByHolding, InvestedPerHolding, PriceHistoryEntry, TotalValueResult, Transaction } from "../types";

/**
 * Get FX rate at or before a given date from historical rates array.
 */
export function getFXRateAtDate(
    ratesArr: HistoricalRate[],
    date: string
): number | undefined {
    const targetDate = new Date(date);
    const closest = ratesArr
        .filter((r) => new Date(r.date) <= targetDate)
        .sort(
            (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
    return closest ? Number(closest.close) : undefined;
}

/**
 * Get price at or before a given date from price history array.
 */
export function getPriceAtDate(
    priceHistoryArr: PriceHistoryEntry[],
    date: string
): number | undefined {
    const targetDate = new Date(date);
    const closest = priceHistoryArr
        .filter((p) => new Date(p.date) <= targetDate)
        .sort(
            (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
    return closest ? closest.close : undefined;
}

/**
 * Calculate total amount invested based on buy transactions.
 */
export function calculateTotalInvested(
    transactions: Transaction[]
): number {
    let total = 0;
    for (const tx of transactions) {
        if (!tx.ticker || !tx.shares) continue;
        if (tx.transaction_type !== "buy") continue;
        total += Number(tx.shares) * Number(tx.price) * Number(tx.currency_rate);
    }
    return total;
}

/**
 * Calculate total portfolio value and detailed valuation per holding.
 */
export function calculateTotalValue(
    holdings: Record<string, { quantity: number; currency: string }>,
    priceHistory: Record<string, PriceHistoryEntry[]>,
    currencyRates: CurrencyRates,
    portfolioCurrency: string,
    investedPerHolding: InvestedPerHolding
): TotalValueResult {
    let totalValueBase = 0;
    const today = new Date().toISOString().slice(0, 10);

    const byHolding: IByHolding = {};

    for (const [ticker, { quantity, currency }] of Object.entries(holdings)) {
        if (quantity <= 0) continue;

        const phArr = priceHistory[ticker] || [];
        const price = phArr.length ? phArr[phArr.length - 1].close : undefined;

        let fx = 1;
        if (currency !== portfolioCurrency) {
            const pair = `${currency}-${portfolioCurrency}`;
            const ratesArr = currencyRates[pair]?.historicalData || [];
            fx = getFXRateAtDate(ratesArr, today) ?? 1;
        }

        if (price !== undefined) {
            const currentValueInHolding = quantity * price;
            const currentValueInPortfolio = currentValueInHolding * fx;

            const investedValueInHolding = investedPerHolding[ticker]?.investedInHolding ?? 0;
            const investedValueInPortfolio = investedPerHolding[ticker]?.investedInPortfolio ?? 0;

            const gainLossInHolding = currentValueInHolding - investedValueInHolding;
            const gainLossInPortfolio = currentValueInPortfolio - investedValueInPortfolio;

            totalValueBase += currentValueInPortfolio;

            byHolding[ticker] = {
                currentValueInHolding,
                currentValueInPortfolio,
                investedValueInHolding,
                investedValueInPortfolio,
                gainLossInHolding,
                gainLossInPortfolio,
                isPositive: gainLossInPortfolio > 0,
                quantity,
                price,
                fx,
                holdingCurrency: currency,
            };
        }
    }

    return { totalValueBase, byHolding };
}

/**
 * Calculate invested amount per holding based on buy transactions.
 */
export function calculateInvestedPerHolding(
    transactions: Transaction[]
): InvestedPerHolding {
    const invested: InvestedPerHolding = {};

    for (const tx of transactions) {
        if (!tx.ticker || !tx.shares) continue;
        if (tx.transaction_type !== "buy") continue;

        const shares = Number(tx.shares);
        const price = Number(tx.price);
        const fx = Number(tx.currency_rate);

        if (!invested[tx.ticker]) {
            invested[tx.ticker] = { investedInHolding: 0, investedInPortfolio: 0 };
        }

        invested[tx.ticker].investedInHolding += shares * price;
        invested[tx.ticker].investedInPortfolio += shares * price * fx;
    }

    return invested;
}
