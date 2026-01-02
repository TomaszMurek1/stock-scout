import {
  ApiHolding,
  Portfolio,
  PortfolioPerformance,
} from "@/features/portfolio-management/types";
import { apiClient } from "@/services/apiClient";
import {
  Transaction,
  WatchlistStock,
} from "@/features/portfolio-management/types";
export type Holding = { shares: number; average_cost_currency: string };

export type CurrencyPoint = { date: string; close: number };
type CurrencyPair = Record<string, CurrencyPoint[]>;

export interface PortfolioSlice {
  portfolio: Portfolio;
  performance: PortfolioPerformance;
  transactions: Transaction[];
  currencyRates: Record<string, CurrencyPair>;
  holdings: ApiHolding[];
  isLoading: boolean;
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
    set({ isLoading: true });
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

      // Pre-load FX rates for all currency pairs
      const portfolioCurrency = data.portfolio.currency;
      const currencies = new Set<string>();

      // Collect currencies from holdings
      data.holdings.forEach((holding) => {
        if (holding.instrument_ccy && holding.instrument_ccy !== portfolioCurrency) {
          currencies.add(holding.instrument_ccy);
        }
      });

      // Collect currencies from watchlist
      data.watchlist.forEach((stock) => {
        if (stock.market_data?.currency && stock.market_data.currency !== portfolioCurrency) {
          currencies.add(stock.market_data.currency);
        }
      });

      // Fetch FX rates for all unique currency pairs
      if (currencies.size > 0) {
        const pairs = Array.from(currencies).map((currency) => ({
          base: currency,
          quote: portfolioCurrency,
        }));

        try {
          const { data: fxData } = await apiClient.post<Record<string, { 
            base: string; 
            quote: string; 
            historicalData: { date: string; open: number; high: number; low: number; close: number }[] 
          }>>("/fx-rate/batch", { pairs });

          // Transform and store FX rates
          const fxRatesForStore: Record<string, any[]> = {};
          Object.entries(fxData).forEach(([pairKey, pairData]) => {
            if (pairData.historicalData) {
              fxRatesForStore[pairKey] = pairData.historicalData.map((item) => ({
                base: pairData.base,
                quote: pairData.quote,
                date: item.date,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
              }));
            }
          });

          // Update store with FX rates
          get().setFxRates(fxRatesForStore);
          console.log("Pre-loaded FX rates for pairs:", Object.keys(fxRatesForStore));
        } catch (fxError) {
          console.error("Failed to fetch FX rates:", fxError);
          // Dashboard still works even if FX rates fail
        }
      }
    } catch (error) {
      setWatchlistLoadingState(false, "watchlist/dashboardRejected");
      throw error;
    } finally {
      set({ isLoading: false });
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
    isLoading: false,

    refreshPortfolio: fetchDashboard,

    buy: async (payload: any) => {
      set({ isLoading: true });
      await apiClient.post("/portfolio-management/buy", payload);
      await get().refreshPortfolio();
      set({ isLoading: false });
    },

    sell: async (payload: any) => {
      set({ isLoading: true });
      await apiClient.post("/portfolio-management/sell", payload);
      await get().refreshPortfolio();
      set({ isLoading: false });
    },
  };
};
