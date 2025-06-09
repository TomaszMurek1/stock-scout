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

function getLatestFxRate(
    base: string,
    quote: string,
    fxRates: Record<string, { base: string; quote: string; historicalData: any[] }>
): number | null {
    const key = `${base}-${quote}`;
    const fxObj = fxRates[key];
    if (!fxObj || !fxObj.historicalData?.length) return null;
    // Find the latest date (or just last item if sorted)
    const latest = fxObj.historicalData[fxObj.historicalData.length - 1];
    return latest?.close ?? null;
}


/**
 * Group transactions by ticker and calculate total shares and average cost.
 */
export function buildHoldings(transactions: Transaction[]): Holding[] {
    const grouped: { [ticker: string]: { shares: number, cost: number } } = {}

    transactions.forEach(tx => {
        if (tx.transaction_type === "buy") {
            const shares = Number(tx.shares)
            const price = Number(tx.price)
            const fx = Number(tx.currency_rate)
            if (!grouped[tx.ticker]) grouped[tx.ticker] = { shares: 0, cost: 0 }
            grouped[tx.ticker].shares += shares
            grouped[tx.ticker].cost += shares * price * fx
        }
        // You could handle 'sell' etc here, subtracting shares & cost
    })

    // Calculate avg cost per share for each holding
    return Object.entries(grouped).map(([ticker, { shares, cost }]) => ({
        ticker,
        shares,
        avg_cost: shares > 0 ? cost / shares : 0
    }))
}

/**
 * Total invested = sum of (shares * price * transaction FX rate) for all buys.
 */
export function calculateTotalInvested(transactions: Transaction[]): number {
    return transactions
        .filter(tx => tx.transaction_type === "buy")
        .reduce((sum, tx) => {
            const shares = Number(tx.shares)
            const price = Number(tx.price)
            const rate = Number(tx.currency_rate)
            return sum + shares * price * rate
        }, 0)
}

/**
 * Total current value using latest prices & latest FX rates.
 */
