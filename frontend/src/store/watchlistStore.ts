
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface WatchlistStock {
    ticker: string
    name: string

}


interface WatchilstState {
    watchlist: WatchlistStock[]
    setWatchlist: (list: WatchlistStock[]) => void
    toggleWatchlist: (stock: WatchlistStock) => void
}
export const useWatchlistStore = create<WatchilstState>()(
    devtools(
        (set) => ({
            watchlist: [],
            setWatchlist: (list) => set(
                () => ({ watchlist: list }),
                false,
                'setWatchlist'
            ),
            toggleWatchlist: (stock) =>
                set(
                    (state) => {
                        const exists = state.watchlist.some((w) => w.ticker === stock.ticker)
                        return {
                            watchlist: exists
                                ? state.watchlist.filter((w) => w.ticker !== stock.ticker)
                                : [...state.watchlist, stock],
                        }
                    },
                    false,
                    `toggleWatchlist(${stock.ticker})`
                ),
        }),
        { name: 'WatchlistStore' } // your DevTools label
    )
)