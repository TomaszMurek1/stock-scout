import {
  ApiHolding,
  Portfolio,
  PortfolioPerformance,
  Account,
} from "@/features/portfolio-management/types";
import { apiClient } from "@/services/apiClient";
import {
  Transaction,
  WatchlistStock,
} from "@/features/portfolio-management/types";
import { Alert } from "@/features/portfolio-management/types/alert.types";
export type Holding = { shares: number; average_cost_currency: string };

export type CurrencyPoint = { date: string; close: number };
type CurrencyPair = Record<string, CurrencyPoint[]>;

export interface PortfolioSlice {
  portfolio: Portfolio;
  accounts: Account[];
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
      accounts: Account[];
      alerts: Alert[];
    },
    actionPrefix = "portfolio/dashboard"
  ) => {
    set(
      {
        portfolio: data.portfolio,
        performance: data.performance,
        transactions: data.transactions,
        accounts: data.accounts || [],
      },
      false,
      `${actionPrefix}/core`
    );
    set({ holdings: data.holdings }, false, `${actionPrefix}/holdings`);
    get().setAlerts(data.alerts || []);
    get().completeWatchlistLoad(data.watchlist, "watchlist/dashboardFulfilled");
  };

  let dashboardPromise: Promise<void> | null = null;

  const fetchDashboard = async () => {
    if (dashboardPromise) {
        return dashboardPromise;
    }

    // Only show full loading state if we don't have data yet.
    // This prevents flickering on re-navigation.
    if (get().portfolio.id === 0) {
        set({ isLoading: true });
    }
    
    dashboardPromise = (async () => {
        const setWatchlistLoadingState = get().setWatchlistLoadingState;
        setWatchlistLoadingState(true, "watchlist/dashboardPending");
        
        try {
          // 1. Fetch Core Data (Fast Analysis)
          const { data: coreData } = await apiClient.get<{
            portfolio: Portfolio;
            performance: PortfolioPerformance; // will be empty initially
            watchlist: WatchlistStock[];
            transactions: Transaction[];
            holdings: ApiHolding[];
            accounts: Account[];
            alerts: Alert[];
          }>("/portfolio/dashboard/core");
          
          // Render initial state immediately
          
          // CRITICAL: Preserve existing performance data if we have it!
          // The /core endpoint returns empty performance, which causes the UI to flash 
          // to a skeleton state (because hasPerformance becomes false) before /performance finishes.
          // We also preserve net_invested_cash to prevent it jumping between Snapshot and ITD values.
          const currentState = get();
          const hasExistingPerf = currentState.performance && currentState.performance.portfolio_id !== 0;

          if (hasExistingPerf) {
              coreData.performance = currentState.performance;
              coreData.portfolio.net_invested_cash = currentState.portfolio.net_invested_cash;
          }

          applyDashboardData(coreData);
          set({ isLoading: false }); // Unblock UI
    
          // 2. Fetch Performance Metrics (Slow Analysis)
          try {
               const { data: perfData } = await apiClient.get<{
                 portfolio_id: number;
                 performance: PortfolioPerformance;
               }>("/portfolio/dashboard/performance");
               
               // Update performance data silently (or with separate loading indicator if we had one)
               set((state: PortfolioSlice) => ({
                 performance: perfData.performance,
                 // Update net invested cash if ITD flows available
                 portfolio: {
                    ...state.portfolio,
                    net_invested_cash: perfData.performance.breakdowns?.itd?.cash_flows?.net_external || state.portfolio.net_invested_cash
                 }
               }), false, "portfolio/dashboard/performanceFulfilled");
               
          } catch (perfError) {
              console.error("Failed to load performance metrics:", perfError);
              // Don't fail the whole dashboard if metrics fail
          }
    
          // Pre-load FX rates for all currency pairs (Background)
          const portfolioCurrency = coreData.portfolio.currency;
          const currencies = new Set<string>();
    
          // Collect currencies from holdings
          coreData.holdings.forEach((holding) => {
            if (holding.instrument_ccy && holding.instrument_ccy !== portfolioCurrency) {
              currencies.add(holding.instrument_ccy);
            }
          });
    
          // Collect currencies from watchlist
          coreData.watchlist.forEach((stock) => {
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
            } catch (fxError) {
              console.error("Failed to fetch FX rates:", fxError);
            }
          }
        } catch (error) {
          setWatchlistLoadingState(false, "watchlist/dashboardRejected");
          set({ isLoading: false });
          throw error;
        } finally {
            dashboardPromise = null;
        }
    })();

    return dashboardPromise;
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
    accounts: [],
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
