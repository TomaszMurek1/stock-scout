import { Portfolio } from "@/components/portfolio-management/types";
import { apiClient } from "@/services/apiClient";
import {
  HoldingItem,
  Transaction,
  CurrencyRate,
  WatchlistStock,
} from "@/components/portfolio-management/types";
import { string } from "zod";
export type Holding = { shares: number; average_cost_currency: string };
export type Holdings = Holding[];

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

export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => ({
  portfolio: null,
  transactions: [],
  currencyRates: {},
  holdings: [],

  refreshPortfolio: async () => {
    const { data } = await apiClient.get<{
      portfolio: Portfolio;
      watchlist: WatchlistStock[];
      transactions: Transaction[];
      holdings: Holdings;
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
    const holdings = data.holdings;
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
