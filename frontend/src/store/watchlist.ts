
import { WatchlistStock } from "@/components/portfolio-management/tabs/watchlist/types"
import { fetchWatchlist } from "@/services/api/watchlist"

export interface WatchlistState {
    data: WatchlistStock[]
    isLoading: boolean
    isLoaded: boolean
}

export interface WatchlistSlice {
    watchlist: WatchlistState
    setWatchlist: (list: WatchlistStock[]) => void
    toggleWatchlist: (stock: WatchlistStock) => void
    loadWatchlist: () => Promise<void>
    refreshWatchlist: () => Promise<void>
}

export const createWatchlistSlice = (set: any, get: any): WatchlistSlice => ({
    watchlist: {
        data: [],
        isLoading: false,
        isLoaded: false,
    },

    setWatchlist: (list) =>
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
            "setWatchlist"
        ),

    toggleWatchlist: (stock) =>
        set(
            (state: any) => {
                const exists = state.watchlist.data.some(
                    (w: WatchlistStock) => w.ticker === stock.ticker
                )
                return {
                    watchlist: {
                        ...state.watchlist,
                        data: exists
                            ? state.watchlist.data.filter(
                                (w: WatchlistStock) => w.ticker !== stock.ticker
                            )
                            : [...state.watchlist.data, stock],
                    },
                }
            },
            false,
            `toggleWatchlist(${stock.ticker})`
        ),

    loadWatchlist: async () => {
        const { watchlist } = get()
        if (watchlist.isLoaded || watchlist.isLoading) {
            return
        }
        set(
            (state: any) => ({
                watchlist: { ...state.watchlist, isLoading: true },
            }),
            false,
            "loadWatchlist:start"
        )
        try {
            const list = await fetchWatchlist()
            set(
                (state: any) => ({
                    watchlist: {
                        ...state.watchlist,
                        data: list,
                        isLoading: false,
                        isLoaded: true,
                    },
                }),
                false,
                "loadWatchlist:success"
            )
        } catch (error) {
            set(
                (state: any) => ({
                    watchlist: { ...state.watchlist, isLoading: false },
                }),
                false,
                "loadWatchlist:error"
            )
            throw error
        }
    },

    refreshWatchlist: async () => {
        set(
            (state: any) => ({
                watchlist: { ...state.watchlist, isLoading: true },
            }),
            false,
            "refreshWatchlist:start"
        )
        try {
            const list = await fetchWatchlist()
            set(
                (state: any) => ({
                    watchlist: {
                        ...state.watchlist,
                        data: list,
                        isLoading: false,
                        isLoaded: true,
                    },
                }),
                false,
                "refreshWatchlist:success"
            )
        } catch (error) {
            set(
                (state: any) => ({
                    watchlist: { ...state.watchlist, isLoading: false },
                }),
                false,
                "refreshWatchlist:error"
            )
            throw error
        }
    },
})
