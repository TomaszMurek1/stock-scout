import { Portfolio } from "@/components/portfolio-management/types";
import { apiClient } from "@/services/apiClient";
import {
  HoldingItem,
  Transaction,
  CurrencyRate,
  WatchlistStock,
} from "@/components/portfolio-management/types";
import { string } from "zod";
type Holding = { quantity: number; currency: string };
type Holdings = Record<string, Holding>;

export type CurrencyPoint = { date: string; close: number };
type CurrencyPair = Record<string, CurrencyPoint[]>;

export interface PortfolioSlice {
  portfolio: Portfolio | null;
  transactions: Transaction[];
  currencyRates: Record<string, CurrencyPair>;
  holdings: Holdings;
  refreshPortfolio: () => Promise<void>;
  buy: (payload: any) => Promise<void>;
  sell: (payload: any) => Promise<void>;
}

const computeHoldings = (transactions: Transaction[]): Holdings => {
  const holdings: Holdings = {};
  transactions.forEach((tx) => {
    if (!tx.ticker) return;
    const tkr = tx.ticker;
    const sign = tx.transaction_type === "buy" ? 1 : tx.transaction_type === "sell" ? -1 : 0;
    if (sign === 0) return;

    // If first transaction for ticker, initialize
    if (!holdings[tkr]) {
      holdings[tkr] = {
        quantity: 0,
        currency: tx.currency || "USD", // fallback if missing
      };
    }
    holdings[tkr].quantity += sign * Number(tx.shares ?? tx.shares ?? 0);

    // Optionally: if currency can differ, update to last seen
    holdings[tkr].currency = tx.currency || holdings[tkr].currency || "USD";
  });
  return holdings;
};

export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => ({
  portfolio: null,
  transactions: [],
  currencyRates: {},
  holdings: {},

  refreshPortfolio: async () => {
    const { data } = await apiClient.get<{
      portfolio: Portfolio;
      watchlist: WatchlistStock[];
      transactions: Transaction[];
      currency_rates: Record<string, CurrencyRate>;
      price_history?: Record<string, { date: string; close: number }[]>;
    }>("/portfolio/dashboard");
    set(
      {
        portfolio: data.portfolio,
        transactions: data.transactions,
        currencyRates: data.currency_rates,
        priceHistory: data.price_history || {},
      },
      false,
      "refreshPortfolio"
    );
    const holdings = computeHoldings(data.transactions);
    set({ holdings }, false, "refreshHoldings");
    get().setWatchlist(data.watchlist);
  },

  buy: async (payload: any) => {
    await apiClient.post("/portfolio-management/buy", payload);
    await get().refreshPortfolio();
  },

  sell: async (payload: any) => {
    await apiClient.post("/portfolio-management/sell", payload);
    await get().refreshPortfolio();
  },
});
