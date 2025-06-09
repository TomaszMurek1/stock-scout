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

function getPriceAtDate(priceHistoryArr: { date: string, close: number }[], date: string) {
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
    portfolioCurrency: string
) {
    let total = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const [ticker, { quantity, currency }] of Object.entries(holdings)) {
        if (quantity <= 0) continue;
        const phArr = priceHistory[ticker] || [];
        // get last available price
        const price = phArr.length
            ? phArr[phArr.length - 1].close
            : undefined;
        // FX rate today
        let fx = 1;
        if (currency !== portfolioCurrency) {
            const pair = `${currency}-${portfolioCurrency}`;
            const ratesArr = currencyRates[pair]?.historicalData || [];
            fx = getFXRateAtDate(ratesArr, today) || 1;
        }
        if (price !== undefined) {
            total += quantity * price * fx;
        }
    }
    return total;
}
