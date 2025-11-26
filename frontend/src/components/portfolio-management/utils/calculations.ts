import {
  HistoricalRate,
  InvestedPerHolding,
  PriceHistoryEntry,
  Transaction,
} from "../types";

/**
 * Get FX rate at or before a given date from historical rates array.
 */
export function getFXRateAtDate(ratesArr: HistoricalRate[], date: string): number | undefined {
  const targetDate = new Date(date);
  const closest = ratesArr
    .filter((r) => new Date(r.date) <= targetDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return closest ? closest.close : undefined;
}

/**
 * Calculate total amount invested based on buy transactions.
 */
export function calculateTotalInvested(transactions: Transaction[]): number {
  let total = 0;
  for (const tx of transactions) {
    if (!tx.ticker || !tx.shares) continue;
    if (tx.transaction_type !== "buy") continue;
    total += Number(tx.shares) * Number(tx.price) * Number(tx.currency_rate);
  }
  return total;
}

/**
 * Calculate invested amount per holding based on buy transactions.
 */
export function calculateInvestedPerHolding(transactions: Transaction[]): InvestedPerHolding {
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
