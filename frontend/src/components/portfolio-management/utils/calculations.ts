import type { HoldingItem } from "../types"


export type Transaction = {
    ticker: string
    transaction_type: "buy" | "sell"
    shares: string | number
    price: string | number
    currency: string
    currency_rate: string | number // rate used when transaction was made
}

export type Holding = {
    ticker: string
    shares: number
    avg_cost: number      // in portfolio currency
}

export type LatestPriceMap = {
    [ticker: string]: number  // latest price in native currency
}

export type LatestFXMap = {
    [currency: string]: number // e.g. { USD: 3.95, PLN: 1, GBP: 5.1 }
}


function getFXRateAtDate(
    ratesArr: { date: string, close: string }[],
    date: string
) {
    const d = new Date(date);
    const closest = ratesArr
        .filter(r => new Date(r.date) <= d)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return closest ? Number(closest.close) : undefined;
}

export function getPriceAtDate(priceHistoryArr: { date: string, close: number }[], date: string) {
    // find the closest price on or before the date
    const d = new Date(date);
    const closest = priceHistoryArr
        .filter(p => new Date(p.date) <= d)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return closest ? closest.close : undefined;
}

export function calculateTotalInvested(transactions: Transaction[]) {
    let total = 0;
    for (const tx of transactions) {
        if (!tx.ticker || !tx.shares) continue;
        if (tx.transaction_type !== "buy") continue;
        // Assume these are numbers; otherwise, cast as needed
        total += Number(tx.shares) * Number(tx.price) * Number(tx.currency_rate);
    }
    return total;
}

export function calculateTotalValue(
    holdings: Record<string, { quantity: number; currency: string }>,
    priceHistory: Record<string, { date: string; close: number }[]>,
    currencyRates: any,
    portfolioCurrency: string,
    investedPerHolding: Record<string, { investedInHolding: number; investedInPortfolio: number }>
) {
    let totalValueBase = 0;
    const today = new Date().toISOString().slice(0, 10);
    const byHolding: Record<
        string,
        {
            currentValueInHolding: number;
            currentValueInPortfolio: number;
            investedValueInHolding: number;
            investedValueInPortfolio: number;
            gainLossInHolding: number;
            gainLossInPortfolio: number;
            isPositive: boolean;
            quantity: number;
            price: number | undefined;
            fx: number;
            holdingCurrency: string;
        }
    > = {};

    for (const [ticker, { quantity, currency }] of Object.entries(holdings)) {
        if (quantity <= 0) continue;
        const phArr = priceHistory[ticker] || [];
        const price = phArr.length ? phArr[phArr.length - 1].close : undefined;
        let fx = 1;
        if (currency !== portfolioCurrency) {
            const pair = `${currency}-${portfolioCurrency}`;
            const ratesArr = currencyRates[pair]?.historicalData || [];
            fx = getFXRateAtDate(ratesArr, today) || 1;
        }
        if (price !== undefined) {
            const currentValueInHolding = quantity * price;
            const currentValueInPortfolio = currentValueInHolding * fx;
            const investedValueInHolding = investedPerHolding[ticker]?.investedInHolding || 0;
            const investedValueInPortfolio = investedPerHolding[ticker]?.investedInPortfolio || 0;
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
                holdingCurrency: currency
            };
        }
    }
    return { totalValueBase, byHolding };
}

export function calculateInvestedPerHolding(
    transactions: Transaction[]
): Record<string, { investedInHolding: number; investedInPortfolio: number }> {
    const invested: Record<string, { investedInHolding: number; investedInPortfolio: number }> = {};
    for (const tx of transactions) {
        if (!tx.ticker || !tx.shares || tx.transaction_type !== "buy") continue;
        const shares = Number(tx.shares);
        const price = Number(tx.price);
        const fx = Number(tx.currency_rate);
        invested[tx.ticker] = invested[tx.ticker] || { investedInHolding: 0, investedInPortfolio: 0 };
        invested[tx.ticker].investedInHolding += shares * price;
        invested[tx.ticker].investedInPortfolio += shares * price * fx;
    }
    return invested;
}