
import { WatchlistStock } from "@/components/portfolio-management/tabs/watchlist/types"



export interface WatchlistSlice {
    watchlist: WatchlistStock[];
    setWatchlist: (list: WatchlistStock[]) => void;
    toggleWatchlist: (stock: WatchlistStock) => void;
}

export const createWatchlistSlice = (set: any): WatchlistSlice => ({
    watchlist: [],

    // 2) replace entire list
    setWatchlist: (list) =>
        set(
            { watchlist: list },
            false,
            "setWatchlist"
        ),

    // 3) add/remove a single ticker
    toggleWatchlist: (stock) =>
        set(
            (state: any) => {
                const exists = state.watchlist.some(
                    (w: WatchlistStock) => w.ticker === stock.ticker
                )
                return {
                    watchlist: exists
                        ? state.watchlist.filter(
                            (w: WatchlistStock) => w.ticker !== stock.ticker
                        )
                        : [...state.watchlist, stock],
                }
            },
            false,
            `toggleWatchlist(${stock.ticker})`
        ),
})

