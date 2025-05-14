
import { WatchlistStock2 } from "@/components/portfolio-management/tabs/watchlist/types"



export interface WatchlistSlice {
    watchlist: WatchlistStock2[];
    setWatchlist: (list: WatchlistStock2[]) => void;
    toggleWatchlist: (stock: WatchlistStock2) => void;
}

export const createWatchlistSlice = (set: any): WatchlistSlice => ({
    watchlist: [],
    setWatchlist: (list) =>
        set({ watchlist: list }, false, "setWatchlist"),
    toggleWatchlist: (stock) =>
        set(
            (state: any) => {
                const exists = state.watchlist.some(
                    (w: WatchlistStock2) => w.ticker === stock.ticker
                )
                return {
                    watchlist: exists
                        ? state.watchlist.filter(
                            (w: WatchlistStock2) => w.ticker !== stock.ticker
                        )
                        : [...state.watchlist, stock],
                }
            },
            false,
            `toggleWatchlist(${stock.ticker})`
        ),
})

