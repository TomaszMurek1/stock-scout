import { WatchlistStock } from "@/features/portfolio-management/tabs/watchlist/types";
import { fetchWatchlist } from "@/services/api/watchlist";

export interface WatchlistState {
  data: WatchlistStock[];
  isLoading: boolean;
  isLoaded: boolean;
}

export interface WatchlistSlice {
  watchlist: WatchlistState;
  setWatchlistLoadingState: (isLoading: boolean, action?: string) => void;
  completeWatchlistLoad: (list: WatchlistStock[], action?: string) => void;
  toggleWatchlist: (stock: WatchlistStock) => void;
  loadWatchlist: () => Promise<void>;
  refreshWatchlist: () => Promise<void>;
}

export const createWatchlistSlice = (set: any, get: any): WatchlistSlice => {
  const setWatchlistLoadingState = (isLoading: boolean, action = "watchlist/setLoading") =>
    set(
      (state: any) => ({
        watchlist: { ...state.watchlist, isLoading },
      }),
      false,
      action
    );

  const completeLoad = (list: WatchlistStock[], action: string) =>
    set(
      (state: any) => ({
        watchlist: {
          ...state.watchlist,
          data: list,
          isLoaded: true,
          isLoading: false,
        },
      }),
      false,
      action
    );

  const fetchAndCommit = async (
    actionPrefix: string,
    options: { skipIfLoaded?: boolean } = {}
  ) => {
    const { watchlist } = get();
    if (options.skipIfLoaded && (watchlist.isLoaded || watchlist.isLoading)) {
      return;
    }
    setWatchlistLoadingState(true, `${actionPrefix}/pending`);
    try {
      const list = await fetchWatchlist();
      completeLoad(list, `${actionPrefix}/fulfilled`);
    } catch (error) {
      setWatchlistLoadingState(false, `${actionPrefix}/rejected`);
      throw error;
    }
  };

  return {
    watchlist: {
      data: [],
      isLoading: false,
      isLoaded: false,
    },

    setWatchlistLoadingState,

    completeWatchlistLoad: (list, action = "watchlist/loadCompleted") => completeLoad(list, action),

    toggleWatchlist: (stock) =>
      set(
        (state: any) => {
          const exists = state.watchlist.data.some(
            (w: WatchlistStock) => w.ticker === stock.ticker
          );
          return {
            watchlist: {
              ...state.watchlist,
              data: exists
                ? state.watchlist.data.filter((w: WatchlistStock) => w.ticker !== stock.ticker)
                : [...state.watchlist.data, stock],
            },
          };
        },
        false,
        `watchlist/toggle(${stock.ticker})`
      ),

    loadWatchlist: () => fetchAndCommit("watchlist/load", { skipIfLoaded: true }),

    refreshWatchlist: () => fetchAndCommit("watchlist/refresh"),
  };
};
