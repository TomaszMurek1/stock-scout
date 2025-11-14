import { Portfolio, PortfolioPerformance } from "@/components/portfolio-management/types";
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
  portfolio: Portfolio;
  performance: PortfolioPerformance;
  transactions: Transaction[];
  currencyRates: Record<string, CurrencyPair>;
  holdings: Holdings;
  refreshPortfolio: () => Promise<void>;
  buy: (payload: any) => Promise<void>;
  sell: (payload: any) => Promise<void>;
}

export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => ({
  portfolio: {
    id: 0,
    name: "",
    currency: "USD",
    total_invested: 0,
    cash_available: 0,
  },
  performance: {
    portfolio_id: 0,
    performance: 0,
  },
  transactions: [],
  currencyRates: {},
  holdings: [],

  refreshPortfolio: async () => {
    const { data } = await apiClient.get<{
      portfolio: Portfolio;
      performance: PortfolioPerformance;
      watchlist: WatchlistStock[];
      transactions: Transaction[];
      holdings: Holdings;
    }>("/portfolio/dashboard");
    set(
      {
        portfolio: data.portfolio,
        performance: data.performance,
        transactions: data.transactions,
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
