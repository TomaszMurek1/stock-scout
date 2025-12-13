import {
  ApiHolding,
  Portfolio,
  PortfolioPerformance,
} from "@/components/portfolio-management/types";
import { apiClient } from "@/services/apiClient";
import {
  Transaction,
  WatchlistStock,
} from "@/components/portfolio-management/types";
export type Holding = { shares: number; average_cost_currency: string };

export type CurrencyPoint = { date: string; close: number };
type CurrencyPair = Record<string, CurrencyPoint[]>;

export interface PortfolioSlice {
  portfolio: Portfolio;
  performance: PortfolioPerformance;
  transactions: Transaction[];
  currencyRates: Record<string, CurrencyPair>;
  holdings: ApiHolding[];
  refreshPortfolio: () => Promise<void>;
  buy: (payload: any) => Promise<void>;
  sell: (payload: any) => Promise<void>;
}

export const createPortfolioSlice = (set: any, get: any): PortfolioSlice => {
  const applyDashboardData = (
    data: {
      portfolio: Portfolio;
      performance: PortfolioPerformance;
      watchlist: WatchlistStock[];
      transactions: Transaction[];
      holdings: ApiHolding[];
    },
    actionPrefix = "portfolio/dashboard"
  ) => {
    set(
      {
        portfolio: data.portfolio,
        performance: data.performance,
        transactions: data.transactions,
      },
      false,
      `${actionPrefix}/core`
    );
    set({ holdings: data.holdings }, false, `${actionPrefix}/holdings`);
    get().completeWatchlistLoad(data.watchlist, "watchlist/dashboardFulfilled");
  };

  const fetchDashboard = async () => {
    const setWatchlistLoadingState = get().setWatchlistLoadingState;
    setWatchlistLoadingState(true, "watchlist/dashboardPending");
    try {
      const { data } = await apiClient.get<{
        portfolio: Portfolio;
        performance: PortfolioPerformance;
        watchlist: WatchlistStock[];
        transactions: Transaction[];
        holdings: ApiHolding[];
      }>("/portfolio/dashboard");
      applyDashboardData(data);
    } catch (error) {
      setWatchlistLoadingState(false, "watchlist/dashboardRejected");
      throw error;
    }
  };

  return {
    portfolio: {
      id: 0,
      name: "",
      currency: "USD",
      cash_available: 0,
      total_value: 0,
      invested_value_current: 0,
      net_invested_cash: 0,
    },
    performance: {
      portfolio_id: 0,
      as_of_date: "",
      unit: "fraction",
      performance: {
        ttwr: {},
        ttwr_invested: {},
        mwrr: {},
      },
      period_meta: {
        start_date: {},
        end_date: {},
      },
    },
    transactions: [],
    currencyRates: {},
    holdings: [],

    refreshPortfolio: fetchDashboard,

    buy: async (payload: any) => {
      await apiClient.post("/portfolio-management/buy", payload);
      await get().refreshPortfolio();
    },

    sell: async (payload: any) => {
      await apiClient.post("/portfolio-management/sell", payload);
      await get().refreshPortfolio();
    },
  };
};
