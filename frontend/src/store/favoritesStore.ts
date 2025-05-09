
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface FavoritesStock {
    company_id: number
    ticker: string
    name: string

}


interface FavoritesState {
    favorites: FavoritesStock[]
    setFavorites: (list: FavoritesStock[]) => void
    toggleFavorite: (stock: FavoritesStock) => void
}
export const useFavoritesStore = create<FavoritesState>()(
    devtools(
        persist(
            (set) => ({
                favorites: [],
                setFavorites: (list) => set({ favorites: list }),
                toggleFavorite: (stock) =>
                    set(
                        (state) => {
                            const exists = state.favorites.some(f => f.company_id === stock.company_id)
                            return {
                                favorites: exists
                                    ? state.favorites.filter(f => f.company_id !== stock.company_id)
                                    : [...state.favorites, stock],
                            }
                        },
                        false,                    // don't replace the state object, just merge
                        `toggleFavorite(${stock.ticker})`  // action name shown in DevTools
                    )
            }),
            {
                name: 'favorites-storage',
            }
        ),
        { name: 'ZustandStore' }
    )
)
